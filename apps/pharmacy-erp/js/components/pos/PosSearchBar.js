/**
 * PharmaTech — POS Search Bar & Quick-Pick Engine (POS 2.0 UX Overhaul)
 * Features:
 * - High-contrast, touch-optimized Hero Barcode & Search input (48px)
 * - Auto-focus restoration for continuous barcode scanning
 * - Fast-Pick row for top everyday medications (1-tap add with zero typing)
 * - Category filter pills with smooth scrolling
 */

export class PosSearchBar {
  constructor(containerId = 'pos-search-bar-container', { onSearch, onCategorySelect, onBarcodeEnter, onQuickPick }) {
    this.containerId = containerId;
    this.onSearch = onSearch;
    this.onCategorySelect = onCategorySelect;
    this.onBarcodeEnter = onBarcodeEnter;
    this.onQuickPick = onQuickPick;
    this.selectedCategory = 'ALL';
    this.categories = [
      { id: 'ALL', label: 'جميع الأدوية' },
      { id: 'مسكنات', label: 'مسكنات وخافضات' },
      { id: 'مضادات حيوية', label: 'مضادات حيوية' },
      { id: 'السكري', label: 'أدوية السكري' },
      { id: 'الضغط والقلب', label: 'الضغط والقلب' },
      { id: 'المعدة', label: 'المعدة والجهاز الهضمي' },
      { id: 'مكملات', label: 'فيتامينات ومكملات' }
    ];

    // Everyday fast-moving essentials in Sudanese pharmacies
    this.quickPicks = [
      { name: 'بنادول إكسترا', generic: 'Panadol Extra', color: '#0284c7' },
      { name: 'أموكسيسيلين 500', generic: 'Amoxicillin', color: '#059669' },
      { name: 'بروفين 400', generic: 'Ibuprofen', color: '#d97706' },
      { name: 'جلوكوفاج 500', generic: 'Metformin', color: '#7c3aed' },
      { name: 'فيتامين C فوار', generic: 'Vitamin C', color: '#ea580c' },
      { name: 'فلاجيل 500', generic: 'Metronidazole', color: '#0891b2' },
      { name: 'أوجمنتين 1 جم', generic: 'Augmentin', color: '#dc2626' }
    ];
  }

  render(currentQuery = '') {
    const el = document.getElementById(this.containerId);
    if (!el) return;

    el.innerHTML = `
      <!-- Fast Barcode / Search Hero Bar -->
      <div class="pos-search-hero-bar" style="margin-bottom:6px;">
        <div style="position:relative; display:flex; align-items:center; width:100%;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="position:absolute; right:12px; color:var(--primary); pointer-events:none;">
            <path d="M3 5v14M8 5v14M12 5v14M17 5v14M21 5v14"/>
          </svg>
          <input 
            id="product-search-input" 
            value="${currentQuery}"
            placeholder="امسح الباركود، أو اكتب اسم الدواء (مثال: بنادول، أوجمنتين)... اضغط Enter للإضافة المباشرة" 
            autocomplete="off" 
            style="width:100%; box-sizing:border-box; height:38px; padding:6px 38px 6px 44px; border-radius:8px; border:2px solid var(--border); background:var(--background); color:var(--foreground); font-size:13.5px; font-weight:600; outline:none; transition:border-color 0.2s ease, box-shadow 0.2s ease;"
          />
          ${currentQuery ? `
            <button type="button" id="btn-clear-search" style="position:absolute; left:44px; border:none; background:transparent; font-size:15px; color:var(--muted-foreground); cursor:pointer; padding:3px;">✕</button>
          ` : ''}
          <kbd style="position:absolute; left:10px; font-size:10px; padding:2px 5px; background:var(--muted); border:1px solid var(--border); border-radius:5px; color:var(--muted-foreground); font-family:var(--font-mono); font-weight:700;">F2</kbd>
        </div>
      </div>

      <!-- Quick-Pick Fast Buttons (1-Tap direct addition for top sellers) -->
      <div style="display:flex; align-items:center; gap:5px; overflow-x:auto; padding-bottom:4px; margin-bottom:6px; scrollbar-width:none;">
        <span style="font-size:11px; font-weight:700; color:var(--muted-foreground); white-space:nowrap; display:flex; align-items:center; gap:4px; padding-left:2px;">
          ⚡ الأكثر طلباً:
        </span>
        ${this.quickPicks.map(qp => `
          <button 
            type="button" 
            class="pos-quick-pick-btn" 
            data-name="${qp.name}" 
            data-generic="${qp.generic}"
            style="cursor:pointer; white-space:nowrap; padding:3px 8px; border-radius:6px; font-size:11.5px; font-weight:700; background:var(--card); border:1px solid var(--border); color:var(--foreground); display:inline-flex; align-items:center; gap:4px; transition:all 0.15s ease;"
            title="إضافة سريعة بنقرة واحدة إلى السلة"
          >
            <span style="width:6px; height:6px; border-radius:50%; background:${qp.color};"></span>
            <span>${qp.name}</span>
          </button>
        `).join('')}
      </div>

      <!-- Category Filter Pills -->
      <div class="pos-category-tabs" style="display:flex; gap:5px; overflow-x:auto; padding-bottom:4px; margin-bottom:8px; scrollbar-width:none;">
        ${this.categories.map(c => `
          <button 
            type="button" 
            class="pos-tab-btn ${this.selectedCategory === c.id ? 'active' : ''}" 
            data-category="${c.id}"
            style="white-space:nowrap; padding:4px 10px; font-size:11.5px; border-radius:16px; font-weight:600; cursor:pointer;"
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
      input.addEventListener('focus', () => {
        input.style.borderColor = 'var(--primary)';
        input.style.boxShadow = '0 0 0 3px rgba(0, 179, 126, 0.2)';
      });
      input.addEventListener('blur', () => {
        input.style.borderColor = 'var(--border)';
        input.style.boxShadow = 'none';
      });

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

    // Clear search
    document.getElementById('btn-clear-search')?.addEventListener('click', () => {
      if (input) {
        input.value = '';
        input.focus();
        if (this.onSearch) this.onSearch('');
      }
    });

    const container = document.getElementById(this.containerId);
    if (!container) return;

    // Quick pick fast buttons
    container.querySelectorAll('.pos-quick-pick-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const name = btn.dataset.name;
        const generic = btn.dataset.generic;
        if (this.onQuickPick) {
          this.onQuickPick(name, generic);
        } else if (this.onBarcodeEnter) {
          this.onBarcodeEnter(name);
        }
      });
    });

    // Category pills
    container.querySelectorAll('.pos-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.selectedCategory = btn.dataset.category || 'ALL';
        container.querySelectorAll('.pos-tab-btn').forEach(b => b.classList.toggle('active', b === btn));
        if (this.onCategorySelect) this.onCategorySelect(this.selectedCategory);
      });
    });
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
    if (input) input.value = '';
  }
}
