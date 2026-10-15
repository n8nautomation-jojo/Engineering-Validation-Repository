/**
 * PharmaTech — POS Medication Catalog Grid Component (POS 2.0 UX Overhaul)
 * Touch-optimized clinical medicine cards with:
 * - High-contrast SDG pricing
 * - Instant stock status visual pills
 * - Tactile 1-tap addition with subtle micro-interactions
 */

export class PosCatalogGrid {
  constructor(containerId = 'pos-catalog-grid-container', { onSelectProduct }) {
    this.containerId = containerId;
    this.onSelectProduct = onSelectProduct;
  }

  render(medicines = []) {
    const el = document.getElementById(this.containerId);
    if (!el) return;

    if (medicines.length === 0) {
      el.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 48px 20px; color: var(--muted-foreground); background:var(--card); border:2px dashed var(--border); border-radius:14px;">
          <div style="font-size:38px; margin-bottom:8px;">🔍</div>
          <div style="font-size:15px; font-weight:800; color:var(--foreground);">لا يوجد دواء مطابق لهذا البحث</div>
          <small style="font-size:12px; display:block; margin-top:4px;">تأكد من الحروف أو امسح الباركود، أو اضغط على أحد الأقسام أعلاه</small>
        </div>
      `;
      return;
    }

    el.innerHTML = `
      <div class="pos-catalog-grid" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(180px, 1fr)); gap:12px; max-height:calc(100vh - 290px); overflow-y:auto; padding:2px;">
        ${medicines.map(m => {
          const isExpired = m.status === 'expired';
          const isOutOfStock = m.stock <= 0;
          const isLowStock = m.stock > 0 && m.stock <= 15;

          return `
            <div 
              class="pos-med-card-v2 ${isExpired || isOutOfStock ? 'disabled-card' : ''}" 
              data-id="${m.id}"
              style="background:var(--card); border:1px solid ${isLowStock ? '#fed7aa' : 'var(--border)'}; border-radius:12px; padding:12px; cursor:${isExpired || isOutOfStock ? 'not-allowed' : 'pointer'}; display:flex; flex-direction:column; justify-content:space-between; gap:10px; transition:all 0.15s ease; box-shadow:0 1px 3px rgba(0,0,0,0.04); position:relative; overflow:hidden;"
              tabindex="${isExpired || isOutOfStock ? '-1' : '0'}"
            >
              <!-- Card Header -->
              <div>
                <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:6px;">
                  <h4 style="margin:0; font-size:13.5px; font-weight:800; color:var(--foreground); line-height:1.35;">${m.name}</h4>
                  ${m.batch ? `
                    <span style="font-size:9.5px; font-family:var(--font-mono); font-weight:700; padding:1px 5px; border-radius:4px; background:var(--muted); color:var(--muted-foreground); white-space:nowrap;">
                      ${m.batch}
                    </span>
                  ` : ''}
                </div>
                <small dir="ltr" style="font-size:11px; color:var(--muted-foreground); display:block; margin-top:3px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                  ${m.generic || m.name}
                </small>
              </div>

              <!-- Price & Stock Footer -->
              <div style="border-top:1px dashed var(--border); padding-top:8px; display:flex; justify-content:space-between; align-items:flex-end;">
                <div>
                  <div style="font-size:10px; color:var(--muted-foreground);">السعر:</div>
                  <div style="font-size:15px; font-weight:900; color:#0284c7; font-family:var(--font-latin); line-height:1.2;">
                    ${Number(m.price).toLocaleString()} <span style="font-size:10.5px; font-weight:700;">ج.س</span>
                  </div>
                </div>

                <div style="text-align:left;">
                  <span style="display:inline-block; font-size:10.5px; font-weight:700; padding:2px 7px; border-radius:12px; ${
                    isExpired 
                      ? 'background:#fef2f2; color:#dc2626;' 
                      : isOutOfStock 
                        ? 'background:#f3f4f6; color:#9ca3af;' 
                        : isLowStock 
                          ? 'background:#fffbeb; color:#b45309;' 
                          : 'background:#ecfdf5; color:#059669;'
                  }">
                    ${isExpired ? 'منتهي' : isOutOfStock ? 'نفد' : `متاح: ${m.stock}`}
                  </span>
                </div>
              </div>

              <!-- 1-Tap Add Hover Pill -->
              ${!isExpired && !isOutOfStock ? `
                <div class="card-add-hint" style="font-size:11px; font-weight:700; color:var(--primary); text-align:center; padding-top:4px; opacity:0.85;">
                  + اضغط للإضافة
                </div>
              ` : ''}
            </div>
          `;
        }).join('')}
      </div>
    `;

    // Bind click events on cards
    el.querySelectorAll('.pos-med-card-v2').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.dataset.id;
        const med = medicines.find(m => m.id === id);
        if (med && this.onSelectProduct) {
          this.onSelectProduct(med);
        }
      });
    });
  }
}
