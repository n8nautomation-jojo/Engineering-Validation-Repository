/**
 * PharmaTech — POS Cart Panel Component
 * Clinical cart management with touch-friendly quantity steppers, FEFO batch indicators, and patient integration
 */

export class PosCartPanel {
  constructor(containerId = 'pos-cart-panel-container', { onUpdateQty, onRemoveItem, onClearCart, onCloseMobileSheet, onOpenCustomerSelector, onClearCustomer }) {
    this.containerId = containerId;
    this.onUpdateQty = onUpdateQty;
    this.onRemoveItem = onRemoveItem;
    this.onClearCart = onClearCart;
    this.onCloseMobileSheet = onCloseMobileSheet;
    this.onOpenCustomerSelector = onOpenCustomerSelector;
    this.onClearCustomer = onClearCustomer;
  }

  render(cart = [], grandTotal = 0, activeCustomer = null) {
    const el = document.getElementById(this.containerId);
    if (!el) return;

    const totalUnits = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);

    el.innerHTML = `
      <!-- Cart Header -->
      <div class="pos-cart-head" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; padding-bottom:8px; border-bottom:1px solid var(--border);">
        <h3 style="margin:0; font-size:15px; font-weight:800; display:flex; align-items:center; gap:8px;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
          </svg>
          سلة البيع الحالية (${totalUnits})
        </h3>
        
        <div style="display:flex; align-items:center; gap:6px;">
          ${cart.length > 0 ? `
            <button type="button" class="btn-table-action" id="btn-pos-clear-cart" style="color:var(--destructive); font-size:11.5px; padding:3px 8px;">
              إفراغ السلة
            </button>
          ` : ''}
          <button type="button" class="icon-btn pos-cart-close-mobile" id="btn-close-cart-sheet" title="إغلاق السلة" aria-label="إغلاق السلة">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>

      <!-- Patient Selector & Clinical Safety Bar -->
      <div class="pos-patient-bar" style="background:${activeCustomer ? (activeCustomer.allergies?.length ? 'rgba(225,29,72,0.06)' : 'rgba(0,82,204,0.06)') : 'var(--muted)'}; border:1px solid ${activeCustomer ? (activeCustomer.allergies?.length ? '#FDA4AF' : 'var(--primary-subtle, #BFDBFE)') : 'var(--border)'}; border-radius:8px; padding:8px 10px; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center; gap:8px;">
        <div style="flex:1; min-width:0;">
          <div style="display:flex; align-items:center; gap:6px;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:${activeCustomer ? 'var(--primary)' : 'var(--muted-foreground)'};"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
            <span style="font-size:12px; font-weight:700; color:var(--foreground); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
              ${activeCustomer ? activeCustomer.name : 'عميل نقدي عابر (عام)'}
            </span>
            ${activeCustomer ? `
              <span class="badge" style="font-size:10px; padding:1px 6px; ${activeCustomer.type === 'CHRONIC' ? 'background:#FEF3C7; color:#B45309;' : activeCustomer.type === 'INSURANCE' ? 'background:#E0E7FF; color:#4338CA;' : 'background:var(--muted); color:var(--muted-foreground);'}">
                ${activeCustomer.type === 'CHRONIC' ? 'مزمن' : activeCustomer.type === 'INSURANCE' ? 'تأمين' : 'نقدي'}
              </span>
            ` : ''}
          </div>
          ${activeCustomer && activeCustomer.allergies?.length ? `
            <div style="font-size:10.5px; font-weight:700; color:#BE123C; margin-top:2px; display:flex; align-items:center; gap:4px;">
              <span>⚠️ تحذير سريري:</span>
              <span>${activeCustomer.allergies.join('، ')}</span>
            </div>
          ` : activeCustomer && activeCustomer.phone ? `
            <div dir="ltr" style="font-size:10.5px; color:var(--muted-foreground); font-family:var(--font-mono); margin-top:1px;">
              ${activeCustomer.phone}
            </div>
          ` : ''}
        </div>

        <div style="display:flex; align-items:center; gap:4px;">
          ${activeCustomer ? `
            <button type="button" class="btn-table-action" id="btn-pos-clear-customer" title="إلغاء المريض والعودة للبيع العام" style="padding:3px 6px; font-size:11px; color:var(--destructive);">✕</button>
          ` : ''}
          <button type="button" class="btn-table-action" id="btn-pos-select-customer" style="padding:4px 9px; font-size:11.5px; font-weight:700; color:var(--primary); background:var(--card); border:1px solid var(--border);">
            ${activeCustomer ? 'تغيير' : 'اختيار مريض'}
          </button>
        </div>
      </div>

      <!-- Cart Items List -->
      <div class="cart-items-list" style="max-height:220px; overflow-y:auto; display:flex; flex-direction:column; gap:8px; margin-bottom:14px; padding-right:2px;">
        ${cart.length === 0 ? `
          <div class="cart-empty-message" style="text-align:center; padding:28px 16px; color:var(--muted-foreground); background:var(--muted); border-radius:10px;">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" style="margin-bottom:8px; opacity:0.5;">
              <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
            </svg>
            <p style="margin:0; font-size:13px; font-weight:700; color:var(--foreground);">السلة فارغة حالياً</p>
            <small style="font-size:11px;">اختر دواء من القائمة أو امسح الباركود (F2)</small>
          </div>
        ` : cart.map((item, idx) => `
          <div class="cart-row" style="display:flex; justify-content:space-between; align-items:center; background:var(--background); border:1px solid var(--border); border-radius:8px; padding:8px 10px; gap:8px;">
            <div class="cart-row-title" style="flex:1; min-width:0;">
              <strong style="font-size:12.5px; display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${item.name}</strong>
              <small dir="ltr" style="font-size:10.5px; color:var(--muted-foreground); font-family:var(--font-mono);">
                ${item.batchNumber} · ${Number(item.unitPrice).toLocaleString()} ج.س
              </small>
            </div>

            <!-- Quantity Stepper -->
            <div class="cart-qty-ctrl" style="display:flex; align-items:center; gap:4px; background:var(--muted); border-radius:6px; padding:2px;">
              <button type="button" class="cart-qty-btn btn-cart-dec" data-idx="${idx}" style="width:28px; height:28px; border:none; background:var(--card); border-radius:4px; font-weight:800; cursor:pointer;">-</button>
              <span class="cart-qty-num" style="min-width:24px; text-align:center; font-weight:800; font-size:12.5px;">${item.quantity}</span>
              <button type="button" class="cart-qty-btn btn-cart-inc" data-idx="${idx}" style="width:28px; height:28px; border:none; background:var(--card); border-radius:4px; font-weight:800; cursor:pointer;">+</button>
            </div>

            <!-- Line Total -->
            <div class="cart-row-total" dir="ltr" style="font-weight:800; font-size:13px; min-width:65px; text-align:left;">
              ${Number(item.lineTotal).toLocaleString()}
            </div>

            <button type="button" class="cart-qty-btn btn-cart-remove" data-idx="${idx}" title="حذف من السلة" style="color:var(--destructive); background:none; border:none; cursor:pointer; padding:4px;">
              ✕
            </button>
          </div>
        `).join('')}
      </div>

      <!-- Totals Box -->
      <div class="cart-totals-box" style="background:var(--muted); border:1px solid var(--border); border-radius:8px; padding:10px 12px; margin-bottom:12px;">
        <div class="cart-total-line" style="display:flex; justify-content:space-between; font-size:12px; color:var(--muted-foreground); margin-bottom:4px;">
          <span>المجموع الفرعي:</span>
          <strong dir="ltr">${Number(grandTotal).toLocaleString()} ج.س</strong>
        </div>
        <div class="cart-total-line" style="display:flex; justify-content:space-between; font-size:11.5px; color:var(--muted-foreground); margin-bottom:6px;">
          <span>ضريبة القيمة المضافة / الدمغة:</span>
          <span dir="ltr">0.00 ج.س (معفى)</span>
        </div>
        <div class="cart-total-line grand" style="display:flex; justify-content:space-between; font-size:15px; font-weight:800; color:var(--foreground); border-top:1px solid var(--border); padding-top:6px;">
          <span>الإجمالي النهائي:</span>
          <strong dir="ltr" style="color:var(--primary); font-size:16px;">${Number(grandTotal).toLocaleString()} ج.س</strong>
        </div>
      </div>
    `;

    this.bindEvents(cart);
  }

  bindEvents(cart) {
    const el = document.getElementById(this.containerId);
    if (!el) return;

    el.querySelector('#btn-pos-clear-cart')?.addEventListener('click', () => {
      if (this.onClearCart) this.onClearCart();
    });

    el.querySelector('#btn-close-cart-sheet')?.addEventListener('click', () => {
      if (this.onCloseMobileSheet) this.onCloseMobileSheet();
    });

    el.querySelector('#btn-pos-select-customer')?.addEventListener('click', () => {
      if (this.onOpenCustomerSelector) this.onOpenCustomerSelector();
    });

    el.querySelector('#btn-pos-clear-customer')?.addEventListener('click', () => {
      if (this.onClearCustomer) this.onClearCustomer();
    });

    el.querySelectorAll('.btn-cart-dec').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.idx);
        if (this.onUpdateQty && cart[idx]) {
          this.onUpdateQty(idx, cart[idx].quantity - 1);
        }
      });
    });

    el.querySelectorAll('.btn-cart-inc').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.idx);
        if (this.onUpdateQty && cart[idx]) {
          this.onUpdateQty(idx, cart[idx].quantity + 1);
        }
      });
    });

    el.querySelectorAll('.btn-cart-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.idx);
        if (this.onRemoveItem) {
          this.onRemoveItem(idx);
        }
      });
    });
  }
}
