/**
 * PharmaTech — Supplier Commercial Invoices & Accounts Payable Component
 * Handles invoice tracking, payment schedules, and settlement history
 */

export class PurchasingInvoicesList {
  constructor(containerId = 'purchasing-invoices-container', callbacks = {}) {
    this.container = document.getElementById(containerId);
    this.callbacks = callbacks; // { onNewInvoice, onPayInvoice, onViewInvoice }
    this.searchQuery = '';
    this.statusFilter = 'all'; // 'all' | 'UNPAID' | 'PARTIALLY_PAID' | 'PAID'
    this.invoices = [];
    this.stats = {
      totalInvoicesCount: 0,
      unpaidCount: 0,
      partiallyPaidCount: 0,
      paidCount: 0,
      totalInvoicedAmount: 0,
      totalPaidAmount: 0,
      totalOutstandingBalance: 0,
      currency: 'SDG'
    };
  }

  render(invoices = [], stats = null) {
    this.invoices = invoices;
    if (stats) this.stats = stats;
    if (!this.container) return;

    let filtered = this.invoices;

    if (this.statusFilter !== 'all') {
      filtered = filtered.filter(i => i.status === this.statusFilter);
    }

    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase().trim();
      filtered = filtered.filter(i =>
        (i.invoiceNumber && i.invoiceNumber.toLowerCase().includes(q)) ||
        (i.supplierName && i.supplierName.toLowerCase().includes(q)) ||
        (i.poNumber && i.poNumber.toLowerCase().includes(q)) ||
        (i.notes && i.notes.toLowerCase().includes(q))
      );
    }

    const unpaidCount = this.invoices.filter(i => i.status === 'UNPAID').length;
    const partialCount = this.invoices.filter(i => i.status === 'PARTIALLY_PAID').length;
    const paidCount = this.invoices.filter(i => i.status === 'PAID').length;

    this.container.innerHTML = `
      <!-- Invoices & Accounts Payable Metrics Bar -->
      <div class="stats-grid" style="margin-bottom:16px;">
        <div class="stat-card">
          <div class="stat-top">
            <span class="stat-icon info">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
              </svg>
            </span>
            <span class="chip chip-info">${this.invoices.length} فواتير</span>
          </div>
          <div class="stat-value num">${Number(this.stats.totalInvoicedAmount || 0).toLocaleString()} <small>ج.س</small></div>
          <div class="stat-label">إجمالي الفواتير</div>
        </div>

        <div class="stat-card">
          <div class="stat-top">
            <span class="stat-icon" style="background:#ECFDF5; color:#00B37E;">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </span>
            <span class="chip chip-success">مسدد</span>
          </div>
          <div class="stat-value num" style="color:#00B37E;">${Number(this.stats.totalPaidAmount || 0).toLocaleString()} <small>ج.س</small></div>
          <div class="stat-label">المسدد للموردين</div>
        </div>

        <div class="stat-card featured" style="border-color:rgba(239,68,68,0.3); background:linear-gradient(135deg, rgba(239,68,68,0.06), rgba(245,158,11,0.03));">
          <div class="stat-top">
            <span class="stat-icon danger">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </span>
            <span class="chip chip-danger">${unpaidCount + partialCount} مستحقة</span>
          </div>
          <div class="stat-value num" style="color:var(--destructive);">${Number(this.stats.totalOutstandingBalance || 0).toLocaleString()} <small>ج.س</small></div>
          <div class="stat-label">الذمم الدائنة المتبقية</div>
        </div>

        <div class="stat-card" style="display:flex; flex-direction:column; justify-content:center; align-items:stretch;">
          <button id="btn-invoices-add-new" class="btn-primary" style="width:100%; justify-content:center; padding:10px; font-weight:700;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
            تسجيل فاتورة مورد
          </button>
        </div>
      </div>

      <!-- Controls: Search & Status Filters -->
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; flex-wrap:wrap; gap:10px;">
        <label class="table-search" style="max-width:320px;">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" x2="16.65" y1="21" y2="16.65"/>
          </svg>
          <input id="inv-search-input" value="${this.searchQuery}" placeholder="بحث برقم الفاتورة أو المورد أو أمر الشراء..." />
        </label>

        <div class="segmented" id="inv-status-segmented">
          <button data-status="all" data-active="${this.statusFilter === 'all'}">الكل (${this.invoices.length})</button>
          <button data-status="UNPAID" data-active="${this.statusFilter === 'UNPAID'}" style="${unpaidCount > 0 ? 'color:#DC2626; font-weight:700;' : ''}">غير مسددة (${unpaidCount})</button>
          <button data-status="PARTIALLY_PAID" data-active="${this.statusFilter === 'PARTIALLY_PAID'}" style="${partialCount > 0 ? 'color:#D97706; font-weight:700;' : ''}">مسددة جزئياً (${partialCount})</button>
          <button data-status="PAID" data-active="${this.statusFilter === 'PAID'}">مسددة بالكامل (${paidCount})</button>
        </div>
      </div>

      <!-- Invoices Ledger Table -->
      ${filtered.length === 0 ? `
        <div style="padding:40px 20px; text-align:center; color:var(--muted-foreground); background:var(--card); border:1px solid var(--border); border-radius:10px;">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin:0 auto 10px; display:block; opacity:0.4;">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
          </svg>
          <p style="margin:0; font-size:13px;">لا توجد فواتير موردين مطابقة لمعايير البحث الحالية</p>
        </div>
      ` : `
        <div class="table-scroll" style="border:1px solid var(--border); border-radius:10px; background:var(--card);">
          <table class="medicine-table">
            <thead>
              <tr>
                <th>رقم الفاتورة</th>
                <th>المورد التجاري</th>
                <th>تاريخ الفاتورة</th>
                <th>تاريخ الاستحقاق</th>
                <th>إجمالي الفاتورة (ج.س)</th>
                <th>المسدد (ج.س)</th>
                <th>الرصيد المتبقي (ج.س)</th>
                <th>حالة السداد</th>
                <th aria-label="الإجراءات">إجراءات الذمم</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.map(inv => {
                const total = Number(inv.totalAmount) || 0;
                const paid = Number(inv.paidAmount) || 0;
                const remaining = Number(inv.remainingBalance) || 0;

                let statusBadge = '';
                if (inv.status === 'PAID' || remaining <= 0) {
                  statusBadge = '<span class="badge badge-success">مسددة بالكامل</span>';
                } else if (inv.status === 'PARTIALLY_PAID' || paid > 0) {
                  statusBadge = '<span class="badge badge-warning">سداد جزئي</span>';
                } else {
                  statusBadge = '<span class="badge badge-danger">غير مسددة</span>';
                }

                const isOverdue = inv.status !== 'PAID' && inv.dueDate && new Date(inv.dueDate) < new Date();

                return `
                  <tr>
                    <td>
                      <div style="font-family:var(--font-mono); font-weight:700; font-size:13px; color:var(--foreground);">
                        ${inv.invoiceNumber}
                      </div>
                      <div style="font-size:11px; color:var(--muted-foreground); font-family:var(--font-mono);">
                        ${inv.id} ${inv.poNumber ? `• أمر: ${inv.poNumber}` : ''}
                      </div>
                    </td>
                    <td>
                      <strong>${inv.supplierName}</strong>
                      ${inv.notes ? `<small style="display:block; color:var(--muted-foreground); max-width:240px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${inv.notes}</small>` : ''}
                    </td>
                    <td class="num">${inv.issueDate || '—'}</td>
                    <td class="num">
                      <span style="${isOverdue ? 'color:#DC2626; font-weight:700;' : ''}">
                        ${inv.dueDate || '—'}
                      </span>
                      ${isOverdue ? '<span style="display:block; font-size:10px; color:#DC2626;">(متأخرة)</span>' : ''}
                    </td>
                    <td class="num" style="font-weight:700;">
                      ${total.toLocaleString()}
                    </td>
                    <td class="num" style="color:#059669; font-weight:700;">
                      ${paid.toLocaleString()}
                    </td>
                    <td class="num" style="color:${remaining > 0 ? '#DC2626' : 'var(--muted-foreground)'}; font-weight:800; font-size:13px;">
                      ${remaining.toLocaleString()}
                    </td>
                    <td>${statusBadge}</td>
                    <td>
                      <div style="display:flex; gap:6px; align-items:center;">
                        ${remaining > 0 ? `
                          <button class="btn-table-action btn-pay-invoice" data-inv-id="${inv.id}" style="color:var(--primary); font-weight:700; padding:4px 10px;" title="تسجيل دفعة سداد">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
                            سداد
                          </button>
                        ` : `
                          <span style="font-size:11px; color:#059669; font-weight:600; padding:4px 8px;">مكتمل ✓</span>
                        `}
                        <button class="btn-table-action btn-view-invoice" data-inv-id="${inv.id}" style="padding:4px 8px;" title="عرض تفاصيل الفاتورة وحركات السداد">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                          تفاصيل
                        </button>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `}
    `;

    this.attachEvents();
  }

  attachEvents() {
    if (!this.container) return;

    // Search input
    const searchInput = this.container.querySelector('#inv-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value;
        this.render(this.invoices, this.stats);
      });
    }

    // Status filter buttons
    const segButtons = this.container.querySelectorAll('#inv-status-segmented button');
    segButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        this.statusFilter = btn.dataset.status;
        this.render(this.invoices, this.stats);
      });
    });

    // New invoice button
    const btnNew = this.container.querySelector('#btn-invoices-add-new');
    if (btnNew) {
      btnNew.addEventListener('click', () => {
        if (typeof this.callbacks.onNewInvoice === 'function') {
          this.callbacks.onNewInvoice();
        }
      });
    }

    // Pay invoice buttons
    const payButtons = this.container.querySelectorAll('.btn-pay-invoice');
    payButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.invId;
        const inv = this.invoices.find(i => i.id === id);
        if (inv && typeof this.callbacks.onPayInvoice === 'function') {
          this.callbacks.onPayInvoice(inv);
        }
      });
    });

    // View invoice buttons
    const viewButtons = this.container.querySelectorAll('.btn-view-invoice');
    viewButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.invId;
        const inv = this.invoices.find(i => i.id === id);
        if (inv && typeof this.callbacks.onViewInvoice === 'function') {
          this.callbacks.onViewInvoice(inv);
        }
      });
    });
  }
}
