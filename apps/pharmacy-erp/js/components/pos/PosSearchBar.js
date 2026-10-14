/**
 * PharmaTech — POS Search & Category Filter Bar Component
 * Manages fast barcode scanning, Enter-key auto addition, and category pills
 */

export class PosSearchBar {
  constructor(containerId = 'pos-search-bar-container', { onSearch, onCategorySelect, onBarcodeEnter }) {
    this.containerId = containerId;
    this.onSearch = onSearch;
    this.onCategorySelect = onCategorySelect;
    this.onBarcodeEnter = onBarcodeEnter;
    this.selectedCategory = 'ALL';
    this.categories = [
      { id: 'ALL', label: 'جميع الأدوية' },
      { id: 'مسكنات', label: 'مسكنات' },
      { id: 'مضادات حيوية', label: 'مضادات حيوية' },
      { id: 'السكري', label: 'السكري' },
      { id: 'الضغط والقلب', label: 'الضغط والقلب' },
      { id: 'المعدة', label: 'المعدة' },
      { id: 'مكملات', label: 'مكملات وفيتامينات' }
    ];
  }

  render(currentQuery = '') {
    const el = document.getElementById(this.containerId);
    if (!el) return;

    el.innerHTML = `
      <!-- Fast Barcode / Medication Search Input -->
      <div class="pos-barcode-bar" style="margin-bottom:12px;">
        <div class="barcode-input-wrap" style="width:100%; position:relative; display:flex; align-items:center;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="position:absolute; right:12px; color:var(--muted-foreground); pointer-events:none;">
            <path d="M3 5v14M8 5v14M12 5v14M17 5v14M21 5v14"/>
          </svg>
          <input 
            id="product-search-input" 
            value="${currentQuery}"
            placeholder="امسح الباركود أو ابحث باسم الدواء التجاري/العلمي (اضغط Enter للإضافة)..." 
            autocomplete="off" 
            style="width:100%; box-sizing:border-box; padding:10px 38px 10px 48px; border-radius:8px; border:1px solid var(--border); background:var(--background); color:var(--foreground); font-size:13.5px;"
          />
          <kbd style="position:absolute; left:12px; font-size:11px; padding:2px 6px; background:var(--muted); border:1px solid var(--border); border-radius:4px; color:var(--muted-foreground); font-family:var(--font-mono);">F2</kbd>
        </div>
      </div>

      <!-- Category Filter Pills (Touch-Friendly Horizontal Scroll) -->
      <div class="pos-category-tabs" style="display:flex; gap:6px; overflow-x:auto; padding-bottom:6px; margin-bottom:12px; scrollbar-width:none;">
        ${this.categories.map(c => `
          <button 
            type="button" 
            class="pos-tab-btn ${this.selectedCategory === c.id ? 'active' : ''}" 
            data-category="${c.id}"
            style="white-space:nowrap; padding:6px 14px; font-size:12px; border-radius:20px; font-weight:600; cursor:pointer;"
          >
            ${c.label}
          </button>
        `).join('')}
      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    const input = document.getElementById('product-search-input');
    if (input) {
      input.addEventListener('input', (e) => {
        if (this.onSearch) this.onSearch(e.target.value);
      });

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const val = input.value.trim();
          if (val && this.onBarcodeEnter) {
            this.onBarcodeEnter(val);
          }
        }
      });
    }

    const container = document.getElementById(this.containerId);
    if (container) {
      container.querySelectorAll('.pos-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          this.selectedCategory = btn.dataset.category || 'ALL';
          container.querySelectorAll('.pos-tab-btn').forEach(b => b.classList.toggle('active', b === btn));
          if (this.onCategorySelect) this.onCategorySelect(this.selectedCategory);
        });
      });
    }
  }

  focus() {
    const input = document.getElementById('product-search-input');
    if (input) {
      input.focus();
      input.select();
    }
  }

  clear() {
    const input = document.getElementById('product-search-input');
    if (input) {
      input.value = '';
    }
  }
}
