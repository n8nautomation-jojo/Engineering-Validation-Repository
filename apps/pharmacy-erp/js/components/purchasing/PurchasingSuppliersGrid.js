/**
 * PharmaTech — Purchasing Suppliers Directory Grid Component
 * Displays pharmaceutical suppliers with real computed order volumes and quick PO dispatch
 */

export class PurchasingSuppliersGrid {
  constructor(containerId = 'purchasing-suppliers-container', callbacks = {}) {
    this.container = document.getElementById(containerId);
    this.callbacks = callbacks; // { onQuickOrder: fn, onAddSupplier: fn }
    this.searchQuery = '';
    this.suppliers = [];
  }

  render(suppliers = []) {
    this.suppliers = suppliers;
    if (!this.container) return;

    let filtered = this.suppliers;
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      filtered = filtered.filter(s =>
        s.name.toLowerCase().includes(q) ||
        (s.nameEn && s.nameEn.toLowerCase().includes(q)) ||
        (s.contactPerson && s.contactPerson.toLowerCase().includes(q)) ||
        (s.phone && s.phone.includes(q)) ||
        (s.address && s.address.toLowerCase().includes(q))
      );
    }

    this.container.innerHTML = `
      <!-- Suppliers Search & Add Header -->
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; flex-wrap:wrap; gap:10px;">
        <label class="table-search" style="max-width:320px;">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" x2="16.65" y1="21" y2="16.65"/>
          </svg>
          <input id="supplier-search-input" value="${this.searchQuery}" placeholder="بحث باسم المورد أو رقم الهاتف أو العنوان..." />
        </label>

        <button class="btn-primary" id="btn-grid-add-supplier" style="font-size:12.5px; padding:7px 14px;">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" x2="20" y1="8" y2="14"/><line x1="23" x2="17" y1="11" y2="11"/></svg>
          + إضافة مورد جديد
        </button>
      </div>

      <!-- Suppliers Cards Grid -->
      ${filtered.length === 0 ? `
        <div style="padding:40px 20px; text-align:center; color:var(--muted-foreground); background:var(--card); border:1px solid var(--border); border-radius:10px;">
          <p style="margin:0; font-size:13px;">لا توجد شركات أو موردين مطابقين للبحث</p>
        </div>
      ` : `
        <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:16px;">
          ${filtered.map(sup => `
            <div class="panel" style="padding:16px; border:1px solid var(--border); border-radius:12px; background:var(--card); display:flex; flex-direction:column; justify-content:space-between;">
              <div>
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
                  <div>
                    <strong style="font-size:14.5px; display:block; color:var(--foreground);">${sup.name}</strong>
                    <small style="color:var(--muted-foreground);">${sup.nameEn || sup.name}</small>
                  </div>
                  <span class="chip chip-success" style="font-size:11px;">مورد معتمد</span>
                </div>

                <div style="font-size:12px; line-height:1.7; margin-bottom:12px; color:var(--muted-foreground);">
                  <div>👤 مسؤول المبيعات: <strong style="color:var(--foreground);">${sup.contactPerson}</strong></div>
                  <div>📞 الهاتف: <span dir="ltr" style="color:var(--foreground);">${sup.phone}</span></div>
                  <div>📍 المقر: <span style="color:var(--foreground);">${sup.address}</span></div>
                  <div>🏢 الرقم الضريبي: <span dir="ltr" style="font-family:var(--font-mono); color:var(--foreground);">${sup.taxNumber}</span></div>
                </div>
              </div>

              <div style="display:flex; justify-content:space-between; align-items:center; padding-top:10px; border-top:1px solid var(--border); font-size:12px;">
                <div>
                  <span style="color:var(--muted-foreground);">الأوامر:</span> <strong>${sup.ordersCount || 0}</strong>
                  <span style="color:var(--muted-foreground); margin-right:8px;">المشتريات:</span> <strong class="num">${(sup.totalPurchases || 0).toLocaleString('en-US')} ج.س</strong>
                </div>
                <button class="btn-primary btn-quick-order-supplier" data-supplier-id="${sup.id}" style="padding:5px 12px; font-size:12px;">
                  + طلب توريد
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      `}
    `;

    this.attachEvents();
  }

  attachEvents() {
    const searchInput = this.container.querySelector('#supplier-search-input');
    searchInput?.addEventListener('input', (e) => {
      this.searchQuery = e.target.value.trim();
      this.render(this.suppliers);
    });

    this.container.querySelector('#btn-grid-add-supplier')?.addEventListener('click', () => {
      if (typeof this.callbacks.onAddSupplier === 'function') {
        this.callbacks.onAddSupplier();
      }
    });

    this.container.querySelectorAll('.btn-quick-order-supplier').forEach(btn => {
      btn.addEventListener('click', () => {
        const supId = btn.dataset.supplierId;
        if (typeof this.callbacks.onQuickOrder === 'function') {
          this.callbacks.onQuickOrder(supId);
        }
      });
    });
  }
}
