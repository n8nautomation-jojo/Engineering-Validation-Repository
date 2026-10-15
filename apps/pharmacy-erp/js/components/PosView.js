/**
 * PharmaTech — Point of Sale (POS) View Component
 * Modular Orchestrator coordinating sub-components:
 * - PosHeaderBanner: Session & Cashier Info, Offline Safety Quota Meter & Simulation
 * - PosSearchBar: Fast Barcode Scanner (F2, Enter-to-add) & Category Pills
 * - PosCatalogGrid: Responsive Medication Cards with FEFO Priority & SDG Pricing
 * - PosCartPanel: Touch Quantity Steppers, Line Totals & Empty State
 * - PosPaymentSelector: Single & Split Payment (Cash + Bankak) with live balance validation
 */

import { posService } from '../services/posService.js';
import { appStore } from '../state/store.js';
import { showToast } from './Toast.js';
import { PosHeaderBanner } from './pos/PosHeaderBanner.js';
import { PosSearchBar } from './pos/PosSearchBar.js';
import { PosCatalogGrid } from './pos/PosCatalogGrid.js';
import { PosCartPanel } from './pos/PosCartPanel.js';
import { PosPaymentSelector } from './pos/PosPaymentSelector.js';
import { OfflineQueueModal } from './pos/OfflineQueueModal.js';
import { PosCustomerSelectModal } from './pos/PosCustomerSelectModal.js';
import { salesOrderService } from '../services/salesOrderService.js';
import { customerService } from '../services/customerService.js';

export class PosView {
  constructor() {
    this.container = document.getElementById('pos-terminal-view');
    this.searchQuery = '';
    this.selectedCategory = 'ALL';
    this.activeCustomer = null;

    // Mobile Sheet & Bar Elements
    this.cartPanel = document.getElementById('pos-cart-panel');
    this.openCartSheetBtn = document.getElementById('btn-open-cart-sheet');
    this.closeCartSheetBtn = document.getElementById('btn-close-cart-sheet');
    this.mobileCartBadge = document.getElementById('mobile-cart-badge');
    this.mobileCartTotal = document.getElementById('mobile-cart-total');

    // Offline Outbox Inspection Modal
    this.queueModal = new OfflineQueueModal();

    // Fast Customer Selection Modal
    this.customerSelectModal = new PosCustomerSelectModal('dialog-pos-customer-select', {
      onSelectCustomer: (cust) => this.handleCustomerChange(cust),
      onRegisterNew: (initialName) => {
        window.dispatchEvent(new CustomEvent('OPEN_CUSTOMER_ADD_MODAL', { detail: { name: initialName } }));
      }
    });

    // Instantiate Decomposed Sub-components
    this.headerBanner = new PosHeaderBanner('pos-header-banner-container', {
      onToggleOffline: () => this.handleToggleOffline(),
      onOpenQueue: () => this.queueModal.open(),
      onToggleFocusMode: (isFocus) => this.handleToggleFocusMode(isFocus)
    });

    this.searchBar = new PosSearchBar('pos-search-bar-container', {
      onSearch: (query) => this.handleSearch(query),
      onCategorySelect: (cat) => this.handleCategorySelect(cat),
      onBarcodeEnter: (barcode) => this.handleBarcodeEnter(barcode),
      onQuickPick: (name, generic) => this.handleQuickPick(name, generic)
    });

    this.catalogGrid = new PosCatalogGrid('pos-catalog-grid-container', {
      onSelectProduct: (med) => this.handleSelectProduct(med)
    });

    this.cartPanelComponent = new PosCartPanel('pos-cart-panel-container', {
      onUpdateQty: (idx, q) => this.handleUpdateQty(idx, q),
      onRemoveItem: (idx) => this.handleRemoveItem(idx),
      onClearCart: () => this.handleClearCart(),
      onCloseMobileSheet: () => this.closeMobileSheet(),
      onOpenCustomerSelector: () => this.customerSelectModal.open(),
      onClearCustomer: () => this.handleCustomerChange(null)
    });

    this.paymentSelector = new PosPaymentSelector('pos-payment-selector-container', {
      onMethodChange: (method) => this.handlePaymentMethodChange(method),
      onSplitChange: () => this.handleSplitChange(),
      onCheckout: () => this.handleCheckout()
    });

    this.init();
  }

  init() {
    if (!this.container) return;

    // Mobile Bottom Sheet Listeners
    this.openCartSheetBtn?.addEventListener('click', () => this.openMobileSheet());
    this.closeCartSheetBtn?.addEventListener('click', () => this.closeMobileSheet());

    // React to store updates (e.g. backend catalog refresh or batch additions)
    appStore.subscribe((event) => {
      if (event === 'MEDICINES_LOADED' || event === 'MEDICINE_ADDED' || event === 'MEDICINE_DELETED') {
        this.renderCatalog();
      }
    });

    // POS 2.0 Ergonomic Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
      if (appStore.activeView !== 'pos') return;

      if (e.key === 'F1') {
        e.preventDefault();
        this.headerBanner.showKeyboardHelpModal();
      } else if (e.key === 'F2') {
        e.preventDefault();
        this.searchBar.focus();
      } else if (e.key === 'F4') {
        e.preventDefault();
        this.handleCheckout();
      } else if (e.key === 'F8') {
        e.preventDefault();
        if (posService.cart.length > 0) this.handleClearCart();
      } else if (e.key === 'F9') {
        e.preventDefault();
        this.handlePaymentMethodChange('CASH');
      } else if (e.key === 'F10') {
        e.preventDefault();
        this.handlePaymentMethodChange('BANKAK');
      }
    });

    // Global bridges for card/action compatibility
    window.posAddToCart = (id) => {
      const med = appStore.medicines.find(m => m.id === id);
      if (med) this.handleSelectProduct(med);
    };

    window.posUpdateQty = (idx, q) => this.handleUpdateQty(idx, q);
    window.posRemoveItem = (idx) => this.handleRemoveItem(idx);

    // React to auth state changes to keep cashier name in sync
    window.addEventListener('AUTH_STATE_CHANGED', () => {
      this.renderHeader();
    });

    // React to offline queue updates to keep header sync badge live
    window.addEventListener('OFFLINE_QUEUE_UPDATED', () => {
      this.renderHeader();
    });

    // Allow opening offline queue modal from anywhere
    window.addEventListener('OPEN_OFFLINE_QUEUE_MODAL', () => {
      this.queueModal.open();
    });
    window.openOfflineQueue = () => this.queueModal.open();

    // React to POS patient selection from Customers registry
    window.addEventListener('POS_SET_CUSTOMER', (e) => {
      this.handleCustomerChange(e.detail);
    });

    // React to POS Sales Order / Prescription 1-click fulfillment trigger
    window.addEventListener('POS_LOAD_SALES_ORDER', (e) => {
      this.handleLoadSalesOrder(e.detail);
    });

    // Initial Full Render
    this.render();
  }

  handleLoadSalesOrder(order) {
    if (!order) return;

    // Reset current cart
    posService.clearCart();
    posService.setActiveSalesOrder(order.id);

    // Link customer
    let targetCustomer = null;
    if (order.customerId && Array.isArray(customerService.customersCache) && customerService.customersCache.length > 0) {
      targetCustomer = customerService.customersCache.find(c => c.id === order.customerId);
    }
    if (!targetCustomer && (order.customerId || order.customerName)) {
      targetCustomer = {
        id: order.customerId || 'WALK-IN',
        name: order.customerName || 'عميل حجز مسبق',
        phone: order.customerPhone || '',
        allergies: order.customerAllergies || []
      };
    }
    if (targetCustomer) {
      this.handleCustomerChange(targetCustomer);
    }

    // Populate items
    let addedCount = 0;
    if (Array.isArray(order.items)) {
      for (const item of order.items) {
        const med = appStore.medicines.find(m => 
          m.id === item.productId || 
          (m.name && item.name && m.name.toLowerCase() === item.name.toLowerCase()) ||
          (m.nameAr && item.nameAr && m.nameAr === item.nameAr)
        );

        if (med) {
          try {
            posService.addItem(med, null, item.quantity || 1);
            addedCount++;
          } catch (err) {
            console.warn(`[PosView] Failed to add item ${med.name}:`, err.message);
          }
        } else {
          // Fallback if medicine isn't in local store
          const fallbackProduct = {
            id: item.productId || `MED-FALLBACK-${Date.now()}`,
            name: item.name || 'دواء روشتة',
            nameAr: item.nameAr || item.name || 'دواء روشتة',
            price: Number(item.unitPrice || 0),
            batches: [{ batchNumber: 'PRE-RX', expiryDate: '2027-12-31', availableQuantity: 999 }]
          };
          try {
            posService.addItem(fallbackProduct, null, item.quantity || 1);
            addedCount++;
          } catch (err) {
            console.warn(`[PosView] Failed to add fallback item:`, err.message);
          }
        }
      }
    }

    // Switch view to POS if not currently on POS
    const posNavBtn = document.querySelector('.nav-button[data-view="pos"]');
    if (posNavBtn && appStore.activeView !== 'pos') {
      posNavBtn.click();
    }

    this.render();
    showToast(
      'تم استدعاء الروشتة في نقطة البيع',
      `تم تجهيز السلة (${addedCount} أصناف) للمريض ${order.customerName || ''} - أمر حجز ${order.orderNumber}`,
      'success'
    );
  }

  openMobileSheet() {
    this.cartPanel?.classList.add('mobile-sheet-open');
  }

  closeMobileSheet() {
    this.cartPanel?.classList.remove('mobile-sheet-open');
  }

  render() {
    this.renderHeader();
    this.searchBar.render(this.searchQuery);
    this.renderCatalog();
    this.renderCart();
    this.renderPayment();
  }

  renderHeader() {
    this.headerBanner.render(posService);
  }

  renderCatalog() {
    const query = this.searchQuery.trim().toLowerCase();
    const medicines = appStore.medicines.filter(m => {
      const matchQuery = !query ||
        (m.name && m.name.toLowerCase().includes(query)) ||
        (m.nameAr && m.nameAr.toLowerCase().includes(query)) ||
        (m.generic && m.generic.toLowerCase().includes(query)) ||
        (m.batch && m.batch.toLowerCase().includes(query)) ||
        (m.barcode && m.barcode.toLowerCase().includes(query));

      const matchCat = this.selectedCategory === 'ALL' || m.category === this.selectedCategory;
      return matchQuery && matchCat;
    });

    this.catalogGrid.render(medicines);
  }

  renderCart() {
    this.cartPanelComponent.render(posService.cart, posService.grandTotal, this.activeCustomer);
    this.updateMobileCartBar();
  }

  handleCustomerChange(customer) {
    this.activeCustomer = customer;
    this.renderCart();
  }

  checkAllergyContraindication(med) {
    if (!this.activeCustomer || !Array.isArray(this.activeCustomer.allergies) || this.activeCustomer.allergies.length === 0) {
      return null;
    }

    const medText = `${med.name} ${med.generic || ''} ${med.nameAr || ''}`.toLowerCase();
    
    // Penicillin check
    const hasPenicillinAllergy = this.activeCustomer.allergies.some(a => 
      a.includes('بنسلين') || a.toLowerCase().includes('penicillin')
    );
    if (hasPenicillinAllergy) {
      const penicillinKeywords = ['augmentin', 'أوجمنتين', 'amoxicillin', 'أموكسيسيلين', 'penicillin', 'بنسلين', 'ampicillin', 'أمبيسيلين', 'clavam', 'كلافام'];
      if (penicillinKeywords.some(kw => medText.includes(kw))) {
        return `تحذير سريري حرج: المريض مسجل بحساسية البنسلين (Penicillin Allergy)، والصنف (${med.name}) يحتوي على مشتقات البنسلين والأموكسيسيلين!`;
      }
    }

    // Aspirin & NSAIDs check
    const hasNsaidAllergy = this.activeCustomer.allergies.some(a => 
      a.includes('أسبرين') || a.includes('مسكنات') || a.toLowerCase().includes('nsaid') || a.toLowerCase().includes('aspirin')
    );
    if (hasNsaidAllergy) {
      const nsaidKeywords = ['aspirin', 'أسبرين', 'ibuprofen', 'بروفين', 'diclofenac', 'ديكلوفيناك', 'cataflam', 'كتافلام', 'voltaren', 'فولتارين'];
      if (nsaidKeywords.some(kw => medText.includes(kw))) {
        return `تحذير سريري حرج: المريض مسجل بحساسية الأسبرين والمسكنات (NSAIDs)، والصنف (${med.name}) قد يسبب مضاعفات خطيرة!`;
      }
    }

    return null;
  }

  renderPayment() {
    this.paymentSelector.render(posService);
  }

  updateMobileCartBar() {
    const totalQty = posService.cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
    const grand = posService.grandTotal;

    const mobileBadge = document.getElementById('mobile-cart-badge');
    const mobileTotal = document.getElementById('mobile-cart-total');

    if (mobileBadge) mobileBadge.textContent = totalQty;
    if (mobileTotal) mobileTotal.textContent = `${Number(grand).toLocaleString()} ج.س`;
  }

  handleSearch(query) {
    this.searchQuery = query;
    this.renderCatalog();
  }

  handleCategorySelect(category) {
    this.selectedCategory = category;
    this.renderCatalog();
  }

  handleBarcodeEnter(barcode) {
    const cleaned = barcode.trim().toLowerCase();
    if (!cleaned) return;

    // Search by exact barcode, batch, id, or exact name
    const foundMed = appStore.medicines.find(m => 
      (m.barcode && m.barcode.toLowerCase() === cleaned) ||
      (m.batch && m.batch.toLowerCase() === cleaned) ||
      m.id.toLowerCase() === cleaned ||
      m.name.toLowerCase() === cleaned ||
      (m.generic && m.generic.toLowerCase() === cleaned)
    );

    if (foundMed) {
      try {
        const contraindication = this.checkAllergyContraindication(foundMed);
        if (contraindication) {
          showToast('تحذير سريري عالي الخطورة', contraindication, 'danger');
        }

        posService.addItem(foundMed, null, 1);
        showToast(
          'تمت الإضافة عبر الباركود',
          `${foundMed.name} (تشغيلة: ${foundMed.batch || 'معتمدة'})`,
          'success'
        );
        this.searchQuery = '';
        this.searchBar.clear();
        this.renderCatalog();
        this.renderCart();
        this.renderPayment();
      } catch (err) {
        showToast('تنبيه المخزون', err.message, 'danger');
      }
    } else {
      showToast('الرمز غير مسجل', `لم يتم العثور على دواء بالرمز: ${barcode}`, 'warning');
    }
  }

  handleSelectProduct(med) {
    try {
      const contraindication = this.checkAllergyContraindication(med);
      if (contraindication) {
        showToast('تحذير سريري عالي الخطورة', contraindication, 'danger');
      }

      posService.addItem(med, null, 1);
      showToast(
        'تمت الإضافة للسلة',
        `${med.name} (تشغيلة: ${med.batch || 'معتمدة'})`,
        'success'
      );
      this.renderCart();
      this.renderPayment();
    } catch (err) {
      showToast('تنبيه السلامة الدوائية', err.message, 'danger');
    }
  }

  handleQuickPick(name, generic) {
    const term = name.toLowerCase();
    const gen = (generic || '').toLowerCase();

    const found = appStore.medicines.find(m => {
      const mName = m.name.toLowerCase();
      const mAr = (m.nameAr || '').toLowerCase();
      const mGen = (m.generic || '').toLowerCase();
      return mName.includes(term) || mAr.includes(term) || (gen && mGen.includes(gen));
    });

    if (found) {
      this.handleSelectProduct(found);
    } else {
      // Fallback: search in catalog directly
      this.searchBar.focus();
      this.handleSearch(name.split(' ')[0]);
    }
  }

  handleToggleFocusMode(isFocus) {
    document.body.classList.toggle('pos-focus-mode', isFocus);
    if (isFocus) {
      showToast('شاشة الكاشير الكاملة', 'تم تفعيل وضع التركيز وإخفاء القوائم الجانبية لتسهيل البيع السريع', 'info');
    } else {
      showToast('الوضع القياسي', 'تمت استعادة القوائم الجانبية للنظام', 'info');
    }
  }

  handleUpdateQty(index, newQty) {
    posService.updateQuantity(index, newQty);
    this.renderCart();
    this.renderPayment();
  }

  handleRemoveItem(index) {
    posService.removeItem(index);
    this.renderCart();
    this.renderPayment();
  }

  handleClearCart() {
    posService.clearCart();
    this.renderCart();
    this.renderPayment();
    showToast('تم إفراغ السلة', 'جاهز لعملية بيع جديدة', 'info');
  }

  handlePaymentMethodChange(method) {
    posService.activePaymentMethod = method;
    this.renderPayment();
  }

  handleSplitChange() {
    this.renderPayment();
  }

  handleToggleOffline() {
    const isNowOffline = posService.toggleOfflineMode();
    if (isNowOffline) {
      showToast(
        'وضع العمل بدون إنترنت نشط',
        'يمكنك الاستمرار في البيع كالمعتاد، وسيتم حفظ الفواتير تلقائياً وإرسالها لاحقاً',
        'warning'
      );
    } else {
      showToast(
        'تمت العودة للوضع المتصل',
        'النظام متصل الآن بالسحابة وكافة البيانات محدثة',
        'success'
      );
    }
    this.renderHeader();
  }

  async handleCheckout() {
    const validation = posService.validateForCompletion();
    if (!validation.valid) {
      showToast('تنبيه السداد', validation.reason, 'warning');
      return;
    }

    const checkoutBtn = document.getElementById('btn-pos-checkout');
    const originalText = checkoutBtn ? checkoutBtn.innerHTML : '';

    if (checkoutBtn) {
      checkoutBtn.disabled = true;
      checkoutBtn.innerHTML = `
        <span class="spinner" style="display:inline-block; width:14px; height:14px; border:2px solid #fff; border-top-color:transparent; border-radius:50%; animation:spin 0.6s linear infinite; margin-left:6px;"></span>
        جاري إصدار الفاتورة وتحديث الحساب...
      `;
    }

    try {
      // Execute official CompleteSale via Core Backend API or Offline Outbox Engine
      const customerId = this.activeCustomer ? this.activeCustomer.id : null;
      const responseDto = await posService.completeSale(customerId);

      // Close mobile sheet if open
      this.closeMobileSheet();

      // Reset active customer after completed dispensation
      this.activeCustomer = null;

      // Trigger 80mm thermal receipt modal with real sale data
      window.dispatchEvent(new CustomEvent('OPEN_RECEIPT_MODAL', { detail: responseDto }));

      // Notify Sales history view to refresh
      window.dispatchEvent(new CustomEvent('SALES_UPDATED'));

      // Check if this sale fulfills an advance Prescription Reservation / Sales Order
      const linkedOrderId = posService.activeSalesOrderId;
      if (linkedOrderId) {
        try {
          await salesOrderService.fulfillOrder(linkedOrderId, responseDto.invoice_number);
          showToast('اكتمل صرف الروشتة', `تم إقفال أمر الحجز (${linkedOrderId}) وتحديث حالته لمصروف بنجاح`, 'success');
        } catch (fulfillErr) {
          console.warn('[POS Checkout] Failed to mark sales order fulfilled:', fulfillErr.message);
        }
        posService.clearActiveSalesOrder();
      }

      showToast(
        'تم صرف الفاتورة بنجاح',
        `فاتورة رقم ${responseDto.invoice_number} بمبلغ ${Number(responseDto.totals.total).toLocaleString()} ج.س`,
        'success'
      );

      this.render();
    } catch (err) {
      console.error('[POS Checkout Error]:', err);
      showToast('تعذر إتمام الفاتورة', err.message || 'حدث خطأ أثناء حفظ الفاتورة، يرجى المحاولة مرة أخرى', 'danger');
    } finally {
      if (checkoutBtn) {
        checkoutBtn.disabled = posService.cart.length === 0;
        checkoutBtn.innerHTML = originalText;
      }
    }
  }
}
