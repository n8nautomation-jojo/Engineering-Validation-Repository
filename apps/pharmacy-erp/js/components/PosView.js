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

export class PosView {
  constructor() {
    this.container = document.getElementById('pos-terminal-view');
    this.searchQuery = '';
    this.selectedCategory = 'ALL';

    // Mobile Sheet & Bar Elements
    this.cartPanel = document.getElementById('pos-cart-panel');
    this.openCartSheetBtn = document.getElementById('btn-open-cart-sheet');
    this.closeCartSheetBtn = document.getElementById('btn-close-cart-sheet');
    this.mobileCartBadge = document.getElementById('mobile-cart-badge');
    this.mobileCartTotal = document.getElementById('mobile-cart-total');

    // Instantiate Decomposed Sub-components
    this.headerBanner = new PosHeaderBanner('pos-header-banner-container', {
      onToggleOffline: () => this.handleToggleOffline()
    });

    this.searchBar = new PosSearchBar('pos-search-bar-container', {
      onSearch: (query) => this.handleSearch(query),
      onCategorySelect: (cat) => this.handleCategorySelect(cat),
      onBarcodeEnter: (barcode) => this.handleBarcodeEnter(barcode)
    });

    this.catalogGrid = new PosCatalogGrid('pos-catalog-grid-container', {
      onSelectProduct: (med) => this.handleSelectProduct(med)
    });

    this.cartPanelComponent = new PosCartPanel('pos-cart-panel-container', {
      onUpdateQty: (idx, q) => this.handleUpdateQty(idx, q),
      onRemoveItem: (idx) => this.handleRemoveItem(idx),
      onClearCart: () => this.handleClearCart(),
      onCloseMobileSheet: () => this.closeMobileSheet()
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

    // Keyboard Shortcuts (F2: Barcode focus, F4: Checkout)
    document.addEventListener('keydown', (e) => {
      if (appStore.activeView !== 'pos') return;

      if (e.key === 'F2') {
        e.preventDefault();
        this.searchBar.focus();
      }

      if (e.key === 'F4') {
        e.preventDefault();
        this.handleCheckout();
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

    // Initial Full Render
    this.render();
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
    this.cartPanelComponent.render(posService.cart, posService.grandTotal);
    this.updateMobileCartBar();
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
        posService.addItem(foundMed, null, 1);
        showToast(
          'تمت الإضافة عبر الباركود',
          `${foundMed.name} · أولوية FEFO تشغيلة ${foundMed.batch || 'معتمدة'}`,
          'success'
        );
        this.searchQuery = '';
        this.searchBar.clear();
        this.renderCatalog();
        this.renderCart();
        this.renderPayment();
      } catch (err) {
        showToast('تنبيه السلامة الدوائية', err.message, 'danger');
      }
    } else {
      showToast('الرمز غير مسجل', `لم يتم العثور على دواء بالرمز: ${barcode}`, 'warning');
    }
  }

  handleSelectProduct(med) {
    try {
      posService.addItem(med, null, 1);
      showToast(
        'تمت الإضافة للسلة',
        `${med.name} · أولوية FEFO تشغيلة ${med.batch || 'معتمدة'}`,
        'success'
      );
      this.renderCart();
      this.renderPayment();
    } catch (err) {
      showToast('تنبيه السلامة الدوائية', err.message, 'danger');
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
        'وضع الأوفلاين نشط (محاكاة)',
        'يتم الاعتماد على الحصة المحجوزة (Offline Quota) لتأمين الصرف ومنع تجاوز الرصيد',
        'warning'
      );
    } else {
      showToast(
        'تمت استعادة الاتصال بالسحابة',
        'النظام متزامن كلياً مع قاعدة البيانات السحابية',
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
        جاري معالجة الفاتورة مع الباك إند...
      `;
    }

    try {
      // Execute official CompleteSale via Core Backend API or Offline Quota Engine
      const responseDto = await posService.completeSale();

      // Close mobile sheet if open
      this.closeMobileSheet();

      // Trigger 80mm thermal receipt modal with real sale data
      window.dispatchEvent(new CustomEvent('OPEN_RECEIPT_MODAL', { detail: responseDto }));

      // Notify Sales history view to refresh
      window.dispatchEvent(new CustomEvent('SALES_UPDATED'));

      showToast(
        'تم صرف الفاتورة بنجاح',
        `فاتورة رقم ${responseDto.invoice_number} بمبلغ ${Number(responseDto.totals.total).toLocaleString()} ج.س`,
        'success'
      );

      this.render();
    } catch (err) {
      console.error('[POS Checkout Error]:', err);
      showToast('خطأ في إتمام الفاتورة', err.message || 'فشلت معالجة الفاتورة مع الباك إند', 'danger');
    } finally {
      if (checkoutBtn) {
        checkoutBtn.disabled = posService.cart.length === 0;
        checkoutBtn.innerHTML = originalText;
      }
    }
  }
}
