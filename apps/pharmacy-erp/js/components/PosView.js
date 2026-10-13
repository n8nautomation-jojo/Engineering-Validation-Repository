/**
 * PharmaTech — Point of Sale (POS) View Component
 * Provides instant medication dispensing with FEFO batch priority,
 * Bankak split payment verification, and official CompleteSale backend processing.
 */

import { posService } from '../services/posService.js';
import { appStore } from '../state/store.js';
import { showToast } from './Toast.js';

export class PosView {
  constructor() {
    this.container = document.getElementById('pos-terminal-view');
    this.catalogGrid = document.getElementById('pos-catalog-grid');
    this.cartList = document.getElementById('pos-cart-items-list');
    this.subtotalEl = document.getElementById('pos-subtotal-val');
    this.grandTotalEl = document.getElementById('pos-grandtotal-val');
    this.barcodeInput = document.getElementById('product-search-input');
    this.clearBtn = document.getElementById('btn-pos-clear-cart');
    this.checkoutBtn = document.getElementById('btn-pos-checkout');
    this.allocationMeterBar = document.getElementById('allocation-meter-bar-fill');
    this.allocationValEl = document.getElementById('allocation-meter-val');
    this.categoryTabs = document.querySelectorAll('.pos-tab-btn');
    this.bankakRefInput = document.getElementById('pos-bankak-ref-input');

    this.selectedCategory = 'ALL';

    this.init();
  }

  init() {
    if (!this.container) return;

    // React to store updates (e.g. after backend sync)
    appStore.subscribe((event) => {
      if (event === 'MEDICINES_LOADED' || event === 'MEDICINE_ADDED' || event === 'MEDICINE_DELETED') {
        this.renderCatalog();
      }
    });

    // Barcode Search Filter
    if (this.barcodeInput) {
      this.barcodeInput.addEventListener('input', () => this.renderCatalog());
    }

    // Category Tabs
    this.categoryTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        this.selectedCategory = tab.dataset.category || 'ALL';
        this.categoryTabs.forEach(t => t.classList.toggle('active', t === tab));
        this.renderCatalog();
      });
    });

    // Clear Cart Button
    this.clearBtn?.addEventListener('click', () => {
      posService.clearCart();
      this.renderCart();
      showToast('تم إفراغ السلة', 'جاهز لعملية بيع جديدة', 'info');
    });

    // Checkout Button
    this.checkoutBtn?.addEventListener('click', () => this.handleCheckout());

    // Payment Method Selection
    document.querySelectorAll('.pay-method-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.pay-method-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        posService.activePaymentMethod = btn.dataset.method;
        this.updatePaymentUI();
      });
    });

    // Bankak Reference Input
    if (this.bankakRefInput) {
      this.bankakRefInput.addEventListener('input', (e) => {
        posService.bankakReference = e.target.value.trim();
      });
    }

    // Hotkeys
    document.addEventListener('keydown', (e) => {
      if (appStore.activeView !== 'pos') return;

      if (e.key === 'F2') {
        e.preventDefault();
        this.barcodeInput?.focus();
        this.barcodeInput?.select();
      }

      if (e.key === 'F4') {
        e.preventDefault();
        this.handleCheckout();
      }
    });

    // Initial Render
    this.render();
  }

  updatePaymentUI() {
    const isBankak = posService.activePaymentMethod === 'BANKAK';
    const wrap = document.getElementById('pos-bankak-ref-wrap');
    if (wrap) {
      wrap.style.display = isBankak ? 'block' : 'none';
    }
  }

  render() {
    this.renderCatalog();
    this.renderCart();
    this.renderAllocationMeter();
    this.updatePaymentUI();
  }

  renderAllocationMeter() {
    const remaining = posService.allocationRemaining;
    const total = posService.allocation.totalCapacity;
    const pct = Math.round((remaining / total) * 100);

    if (this.allocationValEl) this.allocationValEl.textContent = `${remaining} / ${total} وحدة`;
    if (this.allocationMeterBar) this.allocationMeterBar.style.width = `${pct}%`;
  }

  renderCatalog() {
    if (!this.catalogGrid) return;

    const query = this.barcodeInput?.value.trim().toLowerCase() || '';
    const medicines = appStore.medicines.filter(m => {
      const matchQuery = !query ||
        m.name.toLowerCase().includes(query) ||
        (m.generic && m.generic.toLowerCase().includes(query)) ||
        (m.batch && m.batch.toLowerCase().includes(query)) ||
        (m.barcode && m.barcode.includes(query));

      const matchCat = this.selectedCategory === 'ALL' || m.category === this.selectedCategory;
      return matchQuery && matchCat;
    });

    if (medicines.length === 0) {
      this.catalogGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--muted-foreground);">
          لم يتم العثور على أدوية مطابقة للبحث
        </div>
      `;
      return;
    }

    this.catalogGrid.innerHTML = medicines.map(m => {
      const isExpired = m.status === 'expired';
      const isOutOfStock = m.stock <= 0;

      return `
        <div class="pos-med-card ${isExpired || isOutOfStock ? 'expired-card' : ''}" onclick="window.posAddToCart('${m.id}')">
          <div class="pos-card-head">
            <div>
              <h4>${m.name}</h4>
              <small dir="ltr">${m.generic || m.name}</small>
            </div>
            <span class="fefo-badge" title="تشغيلة الأولوية FEFO">${m.batch || 'BATCH-01'}</span>
          </div>

          <div class="pos-card-footer">
            <div class="pos-card-price" dir="ltr">${Number(m.price).toLocaleString()} ج.س</div>
            <div class="pos-card-stock" style="${isOutOfStock ? 'color:var(--destructive); font-weight:700;' : ''}">
              ${isExpired ? 'محظور (منتهي)' : isOutOfStock ? 'نفد المخزون' : `المتوفر: ${m.stock}`}
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Global bridge for card click
    window.posAddToCart = (id) => {
      const med = appStore.medicines.find(m => m.id === id);
      if (!med) return;

      try {
        posService.addItem(med, null, 1);
        this.renderCart();
        showToast('تمت الإضافة للسلة', `${med.name} · أولوية FEFO تشغيلة ${med.batch || 'معتمدة'}`, 'success');
      } catch (err) {
        showToast('تنبيه السلامة الدوائية', err.message, 'danger');
      }
    };
  }

  renderCart() {
    if (!this.cartList) return;

    const cart = posService.cart;

    if (cart.length === 0) {
      this.cartList.innerHTML = `
        <div class="cart-empty-message">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" style="margin-bottom:8px; opacity:0.5;"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
          <p>السلة فارغة حالياً</p>
          <small>اختر دواء من القائمة أو امسح الباركود (F2)</small>
        </div>
      `;
      if (this.checkoutBtn) this.checkoutBtn.disabled = true;
    } else {
      this.cartList.innerHTML = cart.map((item, idx) => `
        <div class="cart-row">
          <div class="cart-row-title">
            <strong>${item.name}</strong>
            <small dir="ltr">${item.batchNumber} · ${Number(item.unitPrice).toLocaleString()} ج.س</small>
          </div>

          <div class="cart-qty-ctrl">
            <button class="cart-qty-btn" onclick="window.posUpdateQty(${idx}, ${item.quantity - 1})">-</button>
            <span class="cart-qty-num">${item.quantity}</span>
            <button class="cart-qty-btn" onclick="window.posUpdateQty(${idx}, ${item.quantity + 1})">+</button>
          </div>

          <div class="cart-row-total" dir="ltr">
            ${Number(item.lineTotal).toLocaleString()}
          </div>

          <button class="cart-qty-btn" style="color:var(--destructive);" onclick="window.posRemoveItem(${idx})" title="حذف">✕</button>
        </div>
      `).join('');

      if (this.checkoutBtn) this.checkoutBtn.disabled = false;
    }

    const grand = posService.grandTotal;
    if (this.subtotalEl) this.subtotalEl.textContent = `${Number(grand).toLocaleString()} ج.س`;
    if (this.grandTotalEl) this.grandTotalEl.textContent = `${Number(grand).toLocaleString()} ج.س`;

    // Global bridges
    window.posUpdateQty = (idx, q) => {
      posService.updateQuantity(idx, q);
      this.renderCart();
    };

    window.posRemoveItem = (idx) => {
      posService.removeItem(idx);
      this.renderCart();
    };
  }

  async handleCheckout() {
    if (posService.cart.length === 0) {
      showToast('تنبيه', 'يرجى إضافة أدوية للسلة أولاً', 'warning');
      return;
    }

    const btn = this.checkoutBtn;
    const originalText = btn ? btn.innerHTML : '';
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span class="spinner" style="display:inline-block; width:14px; height:14px; border:2px solid #fff; border-top-color:transparent; border-radius:50%; animation:spin 0.6s linear infinite; margin-left:6px;"></span> جاري معالجة الفاتورة مع الباك إند...`;
    }

    try {
      // Execute official CompleteSale via Core Backend API
      const responseDto = await posService.completeSale();

      // Trigger 80mm thermal receipt modal with real sale data
      window.dispatchEvent(new CustomEvent('OPEN_RECEIPT_MODAL', { detail: responseDto }));

      // Notify Sales history view
      window.dispatchEvent(new CustomEvent('SALES_UPDATED'));

      showToast(
        'تم صرف الفاتورة بنجاح',
        `فاتورة رقم ${responseDto.invoice_number} بمبلغ ${Number(responseDto.totals.total).toLocaleString()} ج.س`,
        'success'
      );

      this.renderCart();
      this.renderCatalog();
      this.renderAllocationMeter();
    } catch (err) {
      console.error('[POS Checkout Error]:', err);
      showToast('خطأ في إتمام الفاتورة', err.message || 'فشلت معالجة الفاتورة مع الباك إند', 'danger');
    } finally {
      if (btn) {
        btn.disabled = posService.cart.length === 0;
        btn.innerHTML = originalText;
      }
    }
  }
}
