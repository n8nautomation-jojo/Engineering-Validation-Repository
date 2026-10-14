/**
 * PharmaTech — POS Medication Catalog Grid Component
 * Clinical touch cards with FEFO priority indicator, available units, and 1-tap addition
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
        <div style="grid-column: 1 / -1; text-align: center; padding: 48px 20px; color: var(--muted-foreground); background:var(--card); border:1px dashed var(--border); border-radius:12px;">
          <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="margin-bottom:8px; opacity:0.6;">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" x2="16.65" y1="21" y2="16.65" />
          </svg>
          <div style="font-size:14px; font-weight:700; color:var(--foreground);">لم يتم العثور على أدوية مطابقة</div>
          <small>تأكد من اسم الدواء، الباركود، أو التصنيف المحدد</small>
        </div>
      `;
      return;
    }

    el.innerHTML = `
      <div class="pos-catalog-grid">
        ${medicines.map(m => {
          const isExpired = m.status === 'expired';
          const isOutOfStock = m.stock <= 0;
          const isLowStock = m.stock > 0 && m.stock <= 20;

          return `
            <div 
              class="pos-med-card ${isExpired || isOutOfStock ? 'expired-card' : ''}" 
              data-id="${m.id}"
              style="background:var(--card); border:1px solid ${isLowStock ? 'var(--warning)' : 'var(--border)'}; border-radius:10px; padding:12px; cursor:${isExpired || isOutOfStock ? 'not-allowed' : 'pointer'}; display:flex; flex-direction:column; justify-content:space-between; gap:10px; transition:transform 0.15s ease, box-shadow 0.15s ease;"
              tabindex="${isExpired || isOutOfStock ? '-1' : '0'}"
            >
              <div class="pos-card-head" style="display:flex; justify-content:space-between; align-items:flex-start; gap:6px;">
                <div>
                  <h4 style="margin:0; font-size:13px; font-weight:700; line-height:1.3;">${m.name}</h4>
                  <small dir="ltr" style="font-size:11px; color:var(--muted-foreground); display:block; margin-top:2px;">${m.generic || m.name}</small>
                </div>
                <span class="fefo-badge" style="font-size:10px; padding:2px 6px; border-radius:4px; font-family:var(--font-mono); font-weight:700;" title="رقم التشغيلة للأدوية الأقرب انتهاءً">
                  ${m.batch || 'تشغيلة'}
                </span>
              </div>

              <div class="pos-card-footer" style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--border); padding-top:8px;">
                <div class="pos-card-price" dir="ltr" style="font-weight:800; font-size:13.5px; color:var(--primary);">
                  ${Number(m.price).toLocaleString()} <small style="font-size:10px;">ج.س</small>
                </div>
                <div class="pos-card-stock" style="font-size:11px; font-weight:600; color:${isOutOfStock ? 'var(--destructive)' : isLowStock ? 'var(--warning)' : 'var(--muted-foreground)'};">
                  ${isExpired ? 'محظور (منتهي)' : isOutOfStock ? 'نفد المخزون' : `المتوفر: ${m.stock}`}
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    // Bind click events on cards
    el.querySelectorAll('.pos-med-card').forEach(card => {
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
