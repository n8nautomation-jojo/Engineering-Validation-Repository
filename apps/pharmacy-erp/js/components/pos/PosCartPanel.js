/**
 * PharmaTech — POS Cart Panel Component (POS 2.0 UX Overhaul)
 * Touch-optimized cart management:
 * - Giant 34x34px finger-friendly quantity steppers
 * - Instant 1-click line removal
 * - Prominent clinical allergy alert badge
 * - Clear, friendly zero-state guidance
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
      <!-- Cart Top Bar -->
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; padding-bottom:6px; border-bottom:1px solid var(--border); flex-shrink:0;">
        <h3 style="margin:0; font-size:14px; font-weight:800; display:flex; align-items:center; gap:6px; color:var(--foreground);">
          <span style="font-size:16px;">🛒</span>
          <span>سلة البيع الحالية</span>
          <span class="badge" style="background:#0284c7; color:#fff; font-size:10.5px; padding:1px 6px; border-radius:10px;">
            ${totalUnits} ${totalUnits === 1 ? 'علبة' : 'علب'}
          </span>
        </h3>
        
        <div style="display:flex; align-items:center; gap:4px;">
          ${cart.length > 0 ? `
            <button type="button" class="btn-table-action" id="btn-pos-clear-cart" style="color:#dc2626; background:#fef2f2; border:1px solid #fecaca; font-size:11px; font-weight:700; padding:2px 8px; border-radius:6px; display:inline-flex; align-items:center; gap:3px;" title="إفراغ السلة (F8)">
              <span>🗑️</span>
              <span>إفراغ (F8)</span>
            </button>
          ` : ''}
          <button type="button" class="icon-btn pos-cart-close-mobile" id="btn-close-cart-sheet" title="إغلاق السلة">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>

      <!-- Patient / Customer Bar -->
      <div style="background:${activeCustomer ? (activeCustomer.allergies?.length ? '#fff1f2' : '#eff6ff') : 'var(--muted)'}; border:1px solid ${activeCustomer ? (activeCustomer.allergies?.length ? '#fecdd3' : '#bfdbfe') : 'var(--border)'}; border-radius:8px; padding:6px 10px; margin-bottom:6px; display:flex; justify-content:space-between; align-items:center; gap:6px; flex-shrink:0;">
        <div style="flex:1; min-width:0;">
          <div style="display:flex; align-items:center; gap:4px;">
            <span style="font-size:14px;">👤</span>
            <strong style="font-size:12px; color:var(--foreground); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
              ${activeCustomer ? activeCustomer.name : 'عميل نقدي عابر (افتراضي)'}
            </strong>
            ${activeCustomer?.type ? `
              <span class="badge" style="font-size:9.5px; padding:1px 5px; background:${activeCustomer.type === 'CHRONIC' ? '#fef3c7' : '#e0e7ff'}; color:${activeCustomer.type === 'CHRONIC' ? '#b45309' : '#3730a3'};">
                ${activeCustomer.type === 'CHRONIC' ? 'أمراض مزمنة' : 'تأمين'}
              </span>
            ` : ''}
          </div>

          <!-- Clinical Allergy Warning Alert -->
          ${activeCustomer && activeCustomer.allergies?.length ? `
            <div style="font-size:10.5px; font-weight:800; color:#b91c1c; margin-top:2px; display:flex; align-items:center; gap:3px; background:#fee2e2; padding:2px 6px; border-radius:4px;">
              <span>⚠️ حساسية: (${activeCustomer.allergies.join('، ')})</span>
            </div>
          ` : ''}
        </div>

        <div style="display:flex; align-items:center; gap:3px;">
          ${activeCustomer ? `
            <button type="button" id="btn-pos-clear-customer" style="cursor:pointer; border:none; background:transparent; color:#dc2626; font-size:13px; padding:2px 4px;" title="إلغاء المريض والعودة لعميل عابر">✕</button>
          ` : ''}
          <button type="button" id="btn-pos-select-customer" style="cursor:pointer; padding:3px 8px; font-size:11px; font-weight:700; color:var(--primary); background:var(--card); border:1px solid var(--border); border-radius:6px;">
            ${activeCustomer ? 'تغيير' : '+ ربط بمريض'}
          </button>
        </div>
      </div>

      <!-- Cart Items List (Flex Scrollable) -->
      <div class="cart-items-list" style="flex:1; min-height:60px; overflow-y:auto; display:flex; flex-direction:column; gap:5px; margin-bottom:6px; padding-left:2px;">
        ${cart.length === 0 ? `
          <div style="text-align:center; padding:24px 12px; color:var(--muted-foreground); background:var(--muted); border-radius:10px; border:2px dashed var(--border);">
            <div style="font-size:32px; margin-bottom:4px;">🛒</div>
            <p style="margin:0; font-size:13px; font-weight:800; color:var(--foreground);">السلة فارغة حالياً</p>
            <small style="font-size:11px; display:block; margin-top:2px; color:var(--muted-foreground);">
              امسح الباركود، أو اضغط على أحد الأدوية للبدء
            </small>
          </div>
        ` : cart.map((item, idx) => `
          <div class="cart-item-row-v2" style="display:flex; justify-content:space-between; align-items:center; background:var(--card); border:1px solid var(--border); border-radius:8px; padding:6px 10px; gap:6px; box-shadow:0 1px 2px rgba(0,0,0,0.03);">
            
            <!-- Item Name & Price -->
            <div style="flex:1; min-width:0;">
              <strong style="font-size:12.5px; color:var(--foreground); display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                ${item.name}
              </strong>
              <div style="font-size:10px; color:var(--muted-foreground); margin-top:1px;">
                ${item.batchNumber ? `تشغيلة: ${item.batchNumber} · ` : ''}${Number(item.unitPrice).toLocaleString()} ج.س
              </div>
            </div>

            <!-- Touch Stepper & Delete -->
            <div style="display:flex; align-items:center; gap:6px;">
              <!-- Large Touch Stepper Controls -->
              <div style="display:flex; align-items:center; background:var(--muted); border:1px solid var(--border); border-radius:6px; padding:1px;">
                <button 
                  type="button" 
                  class="cart-btn-stepper btn-minus" 
                  data-idx="${idx}" 
                  data-qty="${item.quantity - 1}"
                  style="width:26px; height:26px; border:none; background:transparent; font-size:16px; font-weight:800; color:var(--foreground); cursor:pointer; display:grid; place-items:center; border-radius:5px;"
                  title="إنقاص الكمية"
                >−</button>

                <span style="font-family:var(--font-mono); font-size:13px; font-weight:800; min-width:24px; text-align:center; color:var(--foreground);">
                  ${item.quantity}
                </span>

                <button 
                  type="button" 
                  class="cart-btn-stepper btn-plus" 
                  data-idx="${idx}" 
                  data-qty="${item.quantity + 1}"
                  style="width:26px; height:26px; border:none; background:transparent; font-size:16px; font-weight:800; color:var(--primary); cursor:pointer; display:grid; place-items:center; border-radius:5px;"
                  title="زيادة الكمية"
                >+</button>
              </div>

              <!-- Line Total -->
              <div style="min-width:60px; text-align:left; font-family:var(--font-latin); font-weight:800; font-size:12.5px; color:#0284c7;">
                ${Number(item.lineTotal).toLocaleString()} <span style="font-size:9.5px; font-weight:700;">ج.س</span>
              </div>

              <!-- Delete Button -->
              <button 
                type="button" 
                class="cart-btn-remove" 
                data-idx="${idx}"
                style="cursor:pointer; border:none; background:#fee2e2; color:#dc2626; width:24px; height:24px; border-radius:5px; display:grid; place-items:center; font-size:12px;"
                title="حذف الصنف من السلة"
              >✕</button>
            </div>

          </div>
        `).join('')}
      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    const el = document.getElementById(this.containerId);
    if (!el) return;

    // Clear cart
    el.querySelector('#btn-pos-clear-cart')?.addEventListener('click', () => {
      if (this.onClearCart) this.onClearCart();
    });

    // Close Mobile Sheet
    el.querySelector('#btn-close-cart-sheet')?.addEventListener('click', () => {
      if (this.onCloseMobileSheet) this.onCloseMobileSheet();
    });

    // Select Customer
    el.querySelector('#btn-pos-select-customer')?.addEventListener('click', () => {
      if (this.onOpenCustomerSelector) this.onOpenCustomerSelector();
    });

    // Clear Customer
    el.querySelector('#btn-pos-clear-customer')?.addEventListener('click', () => {
      if (this.onClearCustomer) this.onClearCustomer();
    });

    // Stepper buttons
    el.querySelectorAll('.cart-btn-stepper').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx, 10);
        const qty = parseInt(btn.dataset.qty, 10);
        if (this.onUpdateQty) this.onUpdateQty(idx, qty);
      });
    });

    // Remove buttons
    el.querySelectorAll('.cart-btn-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx, 10);
        if (this.onRemoveItem) this.onRemoveItem(idx);
      });
    });
  }
}
