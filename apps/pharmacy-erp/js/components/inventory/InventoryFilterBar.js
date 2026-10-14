/**
 * PharmaTech — Inventory Filter & Action Bar Component
 * Live search, category pills, clinical status segmentation & quick actions
 */

import { AuthService } from '../../services/authService.js';

export class InventoryFilterBar {
  constructor(containerId = 'inventory-filter-bar-container', { onSearch, onCategoryChange, onStatusChange, onAddNew, onExportCSV }) {
    this.containerId = containerId;
    this.onSearch = onSearch;
    this.onCategoryChange = onCategoryChange;
    this.onStatusChange = onStatusChange;
    this.onAddNew = onAddNew;
    this.onExportCSV = onExportCSV;

    this.categories = [
      { id: 'ALL', label: 'جميع الأقسام' },
      { id: 'مسكنات', label: 'مسكنات' },
      { id: 'مضادات حيوية', label: 'مضادات حيوية' },
      { id: 'السكري', label: 'السكري' },
      { id: 'الحساسية', label: 'الحساسية' },
      { id: 'المعدة', label: 'المعدة' },
      { id: 'الجهاز التنفسي', label: 'الجهاز التنفسي' },
      { id: 'مكملات', label: 'مكملات وفيتامينات' }
    ];

    this.selectedCategory = 'ALL';
  }

  render(currentQuery = '', currentStatus = 'all', totalCount = 0) {
    const el = document.getElementById(this.containerId);
    if (!el) return;

    const isManager = typeof AuthService !== 'undefined' ? AuthService.isManager() : true;

    el.innerHTML = `
      <div class="inventory-controls-wrapper" style="display:flex; flex-direction:column; gap:12px; margin-bottom:14px;">
        
        <!-- Top Row: Search & Actions -->
        <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap;">
          
          <!-- Search Input -->
          <div style="flex:1; min-width:240px; position:relative; display:flex; align-items:center;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="position:absolute; right:12px; color:var(--muted-foreground); pointer-events:none;">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" x2="16.65" y1="21" y2="16.65" />
            </svg>
            <input 
              id="inventory-search-input" 
              value="${currentQuery}"
              placeholder="بحث باسم الدواء، الاسم العلمي، الباركود، أو رقم التشغيلة..." 
              autocomplete="off" 
              style="width:100%; padding:9px 38px 9px 12px; border-radius:8px; border:1px solid var(--border); background:var(--background); color:var(--foreground); font-size:13px;"
            />
          </div>

          <!-- Status Segmented Buttons -->
          <div class="segmented" id="inventory-status-segmented" style="display:inline-flex; border-radius:8px; background:var(--muted); padding:3px; border:1px solid var(--border);">
            <button type="button" data-status="all" class="${currentStatus === 'all' ? 'active' : ''}" style="padding:6px 12px; font-size:12px; font-weight:600; border-radius:6px; border:none; cursor:pointer; background:${currentStatus === 'all' ? 'var(--card)' : 'transparent'}; color:${currentStatus === 'all' ? 'var(--foreground)' : 'var(--muted-foreground)'};">الكل (${totalCount})</button>
            <button type="button" data-status="available" class="${currentStatus === 'available' ? 'active' : ''}" style="padding:6px 12px; font-size:12px; font-weight:600; border-radius:6px; border:none; cursor:pointer; background:${currentStatus === 'available' ? 'var(--card)' : 'transparent'}; color:${currentStatus === 'available' ? 'var(--primary)' : 'var(--muted-foreground)'};">متوفر</button>
            <button type="button" data-status="low" class="${currentStatus === 'low' ? 'active' : ''}" style="padding:6px 12px; font-size:12px; font-weight:600; border-radius:6px; border:none; cursor:pointer; background:${currentStatus === 'low' ? 'var(--card)' : 'transparent'}; color:${currentStatus === 'low' ? 'var(--warning)' : 'var(--muted-foreground)'};">منخفض</button>
            <button type="button" data-status="expiring" class="${currentStatus === 'expiring' ? 'active' : ''}" style="padding:6px 12px; font-size:12px; font-weight:600; border-radius:6px; border:none; cursor:pointer; background:${currentStatus === 'expiring' ? 'var(--card)' : 'transparent'}; color:${currentStatus === 'expiring' ? 'var(--destructive)' : 'var(--muted-foreground)'};">ينتهي قريباً</button>
          </div>

          <!-- Action Buttons -->
          <div style="display:flex; align-items:center; gap:8px;">
            <button type="button" class="btn-table-action" id="btn-inventory-export-csv" title="تصدير كشف المخزون والتشغيلات إلى CSV" style="padding:8px 12px; font-size:12.5px; display:inline-flex; align-items:center; gap:6px;">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" x2="12" y1="15" y2="3" />
              </svg>
              تصدير CSV
            </button>
            ${isManager ? `
            <button type="button" class="btn-primary" id="btn-inventory-add-new" style="padding:8px 14px; font-size:12.5px; display:inline-flex; align-items:center; gap:6px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M5 12h14m-7-7v14" /></svg>
              إضافة دواء جديد
            </button>` : ''}
          </div>

        </div>

        <!-- Bottom Row: Category Filter Pills (Horizontal Scroll) -->
        <div class="inventory-category-pills" style="display:flex; gap:6px; overflow-x:auto; padding-bottom:4px; scrollbar-width:none;">
          ${this.categories.map(c => `
            <button 
              type="button" 
              class="inv-category-pill" 
              data-category="${c.id}"
              style="white-space:nowrap; padding:5px 12px; font-size:11.5px; font-weight:700; border-radius:18px; border:1px solid ${this.selectedCategory === c.id ? 'var(--primary)' : 'var(--border)'}; background:${this.selectedCategory === c.id ? 'rgba(0,179,126,0.12)' : 'var(--muted)'}; color:${this.selectedCategory === c.id ? 'var(--primary)' : 'var(--muted-foreground)'}; cursor:pointer; transition:all 0.15s ease;"
            >
              ${c.label}
            </button>
          `).join('')}
        </div>

      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    const el = document.getElementById(this.containerId);
    if (!el) return;

    // Search input
    const input = el.querySelector('#inventory-search-input');
    input?.addEventListener('input', (e) => {
      if (this.onSearch) this.onSearch(e.target.value);
    });

    // Status segmented buttons
    el.querySelectorAll('#inventory-status-segmented button').forEach(btn => {
      btn.addEventListener('click', () => {
        const status = btn.dataset.status;
        if (this.onStatusChange) this.onStatusChange(status);
      });
    });

    // Category pills
    el.querySelectorAll('.inv-category-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        this.selectedCategory = btn.dataset.category || 'ALL';
        el.querySelectorAll('.inv-category-pill').forEach(b => {
          const isSelected = b === btn;
          b.style.borderColor = isSelected ? 'var(--primary)' : 'var(--border)';
          b.style.background = isSelected ? 'rgba(0,179,126,0.12)' : 'var(--muted)';
          b.style.color = isSelected ? 'var(--primary)' : 'var(--muted-foreground)';
        });
        if (this.onCategoryChange) this.onCategoryChange(this.selectedCategory);
      });
    });

    // Action buttons
    el.querySelector('#btn-inventory-export-csv')?.addEventListener('click', () => {
      if (this.onExportCSV) this.onExportCSV();
    });

    el.querySelector('#btn-inventory-add-new')?.addEventListener('click', () => {
      if (this.onAddNew) this.onAddNew();
    });
  }
}
