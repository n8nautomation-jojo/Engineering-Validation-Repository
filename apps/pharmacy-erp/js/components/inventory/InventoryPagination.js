/**
 * PharmaTech — Inventory Pagination Component
 * Responsive pagination controls with page indicators and range breakdown
 */

export class InventoryPagination {
  constructor(containerId = 'inventory-pagination-container', { onPageChange }) {
    this.containerId = containerId;
    this.onPageChange = onPageChange;
  }

  render(currentPage = 1, totalItems = 0, perPage = 10) {
    const el = document.getElementById(this.containerId);
    if (!el) return;

    const totalPages = Math.max(1, Math.ceil(totalItems / perPage));
    const start = totalItems > 0 ? (currentPage - 1) * perPage + 1 : 0;
    const end = Math.min(currentPage * perPage, totalItems);

    el.innerHTML = `
      <div class="table-footer" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; padding:12px 0 4px 0; border-top:1px solid var(--border);">
        <span class="num" style="font-size:12.5px; color:var(--muted-foreground);">
          ${totalItems > 0 ? `عرض ${start}–${end} من أصل ${totalItems} صنفاً` : 'لا توجد أصناف'}
        </span>

        <div class="pagination" style="display:inline-flex; align-items:center; gap:4px;">
          <button 
            type="button" 
            class="icon-btn" 
            id="inv-pagination-prev-btn" 
            aria-label="السابق" 
            ${currentPage <= 1 ? 'disabled style="opacity:0.4; cursor:not-allowed;"' : 'style="cursor:pointer;"'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6" /></svg>
          </button>

          <div id="inv-pagination-pages" style="display:flex; gap:3px;">
            ${Array.from({ length: totalPages }, (_, i) => i + 1).map(p => `
              <button 
                type="button" 
                class="inv-page-num-btn ${p === currentPage ? 'active' : ''}" 
                data-page="${p}"
                style="min-width:32px; height:32px; border-radius:6px; font-size:12px; font-weight:700; border:1px solid ${p === currentPage ? 'var(--primary)' : 'var(--border)'}; background:${p === currentPage ? 'var(--primary)' : 'var(--card)'}; color:${p === currentPage ? '#FFFFFF' : 'var(--foreground)'}; cursor:pointer;"
              >
                ${p}
              </button>
            `).join('')}
          </div>

          <button 
            type="button" 
            class="icon-btn" 
            id="inv-pagination-next-btn" 
            aria-label="التالي" 
            ${currentPage >= totalPages ? 'disabled style="opacity:0.4; cursor:not-allowed;"' : 'style="cursor:pointer;"'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6" /></svg>
          </button>
        </div>
      </div>
    `;

    this.bindEvents(currentPage, totalPages);
  }

  bindEvents(currentPage, totalPages) {
    const el = document.getElementById(this.containerId);
    if (!el) return;

    el.querySelector('#inv-pagination-prev-btn')?.addEventListener('click', () => {
      if (currentPage > 1 && this.onPageChange) {
        this.onPageChange(currentPage - 1);
      }
    });

    el.querySelector('#inv-pagination-next-btn')?.addEventListener('click', () => {
      if (currentPage < totalPages && this.onPageChange) {
        this.onPageChange(currentPage + 1);
      }
    });

    el.querySelectorAll('.inv-page-num-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const p = Number(btn.dataset.page);
        if (p !== currentPage && this.onPageChange) {
          this.onPageChange(p);
        }
      });
    });
  }
}
