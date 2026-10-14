/**
 * PharmaTech — POS Cart Panel Component
 * Clinical cart management with touch-friendly quantity steppers, FEFO batch indicators, and line totals
 */

export class PosCartPanel {
  constructor(containerId = 'pos-cart-panel-container', { onUpdateQty, onRemoveItem, onClearCart, onCloseMobileSheet }) {
    this.containerId = containerId;
    this.onUpdateQty = onUpdateQty;
    this.onRemoveItem = onRemoveItem;
    this.onClearCart = onClearCart;
    this.onCloseMobileSheet = onCloseMobileSheet;
  }

  render(cart = [], grandTotal = 0) {
    const el = document.getElementById(this.containerId);
    if (!el) return;

    const totalUnits = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);

    el.innerHTML = `
      <!-- Cart Header -->
      <div class="pos-cart-head" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; padding-bottom:10px; border-bottom:1px solid var(--border);">
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

      <!-- Cart Items List -->
      <div class="cart-items-list" style="max-height:240px; overflow-y:auto; display:flex; flex-direction:column; gap:8px; margin-bottom:14px; padding-right:2px;">
        ${cart.length === 0 ? `
          <div class="cart-empty-message" style="text-align:center; padding:32px 16px; color:var(--muted-foreground); background:var(--muted); border-radius:10px;">
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
