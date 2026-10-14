/**
 * PharmaTech — Sales Filter Bar Component
 * Provides live invoice search, payment method filtering, and refresh triggers
 */

export class SalesFilterBar {
  constructor(containerId = 'sales-filter-bar-container', { onSearch, onFilter, onRefresh }) {
    this.containerId = containerId;
    this.onSearch = onSearch;
    this.onFilter = onFilter;
    this.onRefresh = onRefresh;
  }

  render(count = 0, currentQuery = '', currentMethod = 'ALL') {
    const el = document.getElementById(this.containerId);
    if (!el) return;

    el.innerHTML = `
      <div class="panel-head wrap">
        <div class="panel-title">
          <span class="title-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1Z" />
            </svg>
          </span>
          <h2>سجل الفواتير والمبيعات المعتمدة</h2>
          <span class="chip">${count} فاتورة</span>
        </div>

        <div class="inventory-controls">
          <label class="table-search">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" x2="16.65" y1="21" y2="16.65" />
            </svg>
            <input id="sales-search-input" value="${currentQuery}" placeholder="بحث برقم الفاتورة أو العميل..." />
          </label>

          <div class="segmented" id="sales-filter-segmented">
            <button data-method="ALL" data-active="${currentMethod === 'ALL'}">الكل</button>
            <button data-method="BANKAK" data-active="${currentMethod === 'BANKAK'}">بنكك</button>
            <button data-method="CASH" data-active="${currentMethod === 'CASH'}">نقداً</button>
            <button data-method="SPLIT" data-active="${currentMethod === 'SPLIT'}">مجزأ</button>
          </div>

          <button class="btn-secondary" id="btn-sales-refresh" title="تحديث السجل من السيرفر">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 2v6h-6" />
              <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
              <path d="M3 22v-6h6" />
              <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
            </svg>
            تحديث
          </button>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    const searchInput = document.getElementById('sales-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        if (this.onSearch) this.onSearch(e.target.value);
      });
    }

    const segmented = document.getElementById('sales-filter-segmented');
    if (segmented) {
      segmented.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => {
          segmented.querySelectorAll('button').forEach(b => b.dataset.active = 'false');
          btn.dataset.active = 'true';
          if (this.onFilter) this.onFilter(btn.dataset.method);
        });
      });
    }

    const refreshBtn = document.getElementById('btn-sales-refresh');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        if (this.onRefresh) this.onRefresh();
      });
    }
  }
}
