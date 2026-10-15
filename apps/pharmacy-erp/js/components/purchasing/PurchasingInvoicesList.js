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
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:12px; margin-bottom:16px;">
        <div style="background:var(--card); border:1px solid var(--border); border-radius:10px; padding:14px;">
          <div style="font-size:11.5px; color:var(--muted-foreground); margin-bottom:4px;">إجمالي فواتير المشتريات</div>
          <div style="font-size:18px; font-weight:800; font-family:var(--font-mono); color:var(--foreground);">
            ${Number(this.stats.totalInvoicedAmount || 0).toLocaleString()} <span style="font-size:12px; font-weight:600;">ج.س</span>
          </div>
          <div style="font-size:11px; color:var(--muted-foreground); margin-top:4px;">${this.invoices.length} فاتورة تجارية مسجلة</div>
        </div>

        <div style="background:var(--card); border:1px solid var(--border); border-radius:10px; padding:14px;">
          <div style="font-size:11.5px; color:var(--muted-foreground); margin-bottom:4px;">إجمالي المسدد للموردين</div>
          <div style="font-size:18px; font-weight:800; font-family:var(--font-mono); color:#059669;">
            ${Number(this.stats.totalPaidAmount || 0).toLocaleString()} <span style="font-size:12px; font-weight:600;">ج.س</span>
          </div>
          <div style="font-size:11px; color:#059669; margin-top:4px;">تم الوفاء بها نقدياً وعبر بنكك</div>
        </div>

        <div style="background:rgba(239,68,68,0.06); border:1px solid rgba(239,68,68,0.25); border-radius:10px; padding:14px;">
          <div style="font-size:11.5px; color:#DC2626; font-weight:700; margin-bottom:4px;">الذمم الدائنة المستحقة (مطلوبات الموردين)</div>
          <div style="font-size:20px; font-weight:800; font-family:var(--font-mono); color:#DC2626;">
            ${Number(this.stats.totalOutstandingBalance || 0).toLocaleString()} <span style="font-size:12px; font-weight:600;">ج.س</span>
          </div>
          <div style="font-size:11px; color:#B91C1C; margin-top:4px; font-weight:600;">
            ${unpaidCount + partialCount} فواتير قيد السداد
          </div>
        </div>

        <div style="background:var(--card); border:1px solid var(--border); border-radius:10px; padding:14px; display:flex; flex-direction:column; justify-content:center;">
          <button id="btn-invoices-add-new" class="btn-primary" style="width:100%; justify-content:center; padding:10px; font-weight:700;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
            تسجيل فاتورة مورد جديدة
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
                <th>إجمالي الفاتورة</th>
                <th>المسدد</th>
                <th>الرصيد المتبقي</th>
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
                  statusBadge = '<span class="badge badge-success" style="padding:4px 8px; border-radius:6px; font-weight:700;">مسددة بالكامل</span>';
                } else if (inv.status === 'PARTIALLY_PAID' || paid > 0) {
                  statusBadge = '<span class="badge badge-warning" style="padding:4px 8px; border-radius:6px; font-weight:700; background:#FEF3C7; color:#92400E; border:1px solid #FCD34D;">سداد جزئي</span>';
                } else {
                  statusBadge = '<span class="badge badge-danger" style="padding:4px 8px; border-radius:6px; font-weight:700; background:#FEE2E2; color:#991B1B; border:1px solid #FCA5A5;">غير مسددة</span>';
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
                      ${total.toLocaleString()} <small>ج.س</small>
                    </td>
                    <td class="num" style="color:#059669; font-weight:700;">
                      ${paid.toLocaleString()} <small>ج.س</small>
                    </td>
                    <td class="num" style="color:${remaining > 0 ? '#DC2626' : 'var(--muted-foreground)'}; font-weight:800; font-size:13px;">
                      ${remaining.toLocaleString()} <small>ج.س</small>
                    </td>
                    <td>${statusBadge}</td>
                    <td>
                      <div style="display:flex; gap:6px; align-items:center;">
                        ${remaining > 0 ? `
                          <button class="btn-table-action btn-pay-invoice" data-inv-id="${inv.id}" style="color:#2563EB; border-color:#BFDBFE; background:#EFF6FF; font-weight:700; padding:4px 10px;" title="تسجيل دفعة سداد">
                            💳 سداد
                          </button>
                        ` : `
                          <span style="font-size:11px; color:#059669; font-weight:600; padding:4px 8px;">مكتمل ✓</span>
                        `}
                        <button class="btn-table-action btn-view-invoice" data-inv-id="${inv.id}" style="color:var(--foreground); padding:4px 8px;" title="عرض تفاصيل الفاتورة وحركات السداد">
                          👁️ تفاصيل
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
