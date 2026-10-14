/**
 * PharmaTech — Purchasing Orders Table Component
 * Displays searchable & filterable purchase orders with visual status steppers
 */

export class PurchasingOrdersTable {
  constructor(containerId = 'purchasing-orders-container', callbacks = {}) {
    this.container = document.getElementById(containerId);
    this.callbacks = callbacks; // { onReceive: fn, onView: fn }
    this.searchQuery = '';
    this.statusFilter = 'all';
    this.orders = [];
  }

  render(orders = []) {
    this.orders = orders;
    if (!this.container) return;

    let filtered = this.orders;

    if (this.statusFilter === 'pending') {
      filtered = filtered.filter(o => o.status === 'PENDING_RECEIPT');
    } else if (this.statusFilter === 'delivered') {
      filtered = filtered.filter(o => o.status === 'DELIVERED');
    }

    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      filtered = filtered.filter(o =>
        o.poNumber.toLowerCase().includes(q) ||
        o.supplierName.toLowerCase().includes(q) ||
        (o.notes && o.notes.toLowerCase().includes(q)) ||
        (o.items && o.items.some(i => i.productName.toLowerCase().includes(q)))
      );
    }

    const pendingCount = this.orders.filter(o => o.status === 'PENDING_RECEIPT').length;
    const deliveredCount = this.orders.filter(o => o.status === 'DELIVERED').length;

    this.container.innerHTML = `
      <!-- Table Controls: Search & Segmented Filter -->
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; flex-wrap:wrap; gap:10px;">
        <label class="table-search" style="max-width:320px;">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" x2="16.65" y1="21" y2="16.65"/>
          </svg>
          <input id="po-search-input" value="${this.searchQuery}" placeholder="بحث برقم الأمر أو المورد أو الصنف..." />
        </label>

        <div class="segmented" id="po-status-segmented">
          <button data-status="all" data-active="${this.statusFilter === 'all'}">الكل (${this.orders.length})</button>
          <button data-status="pending" data-active="${this.statusFilter === 'pending'}">بانتظار الاستلام (${pendingCount})</button>
          <button data-status="delivered" data-active="${this.statusFilter === 'delivered'}">مستلمة (${deliveredCount})</button>
        </div>
      </div>

      <!-- Table View -->
      ${filtered.length === 0 ? `
        <div style="padding:40px 20px; text-align:center; color:var(--muted-foreground); background:var(--card); border:1px solid var(--border); border-radius:10px;">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin:0 auto 10px; display:block; opacity:0.4;">
            <rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/>
          </svg>
          <p style="margin:0; font-size:13px;">لا توجد أوامر شراء مطابقة للبحث أو الفلتر المحدد</p>
        </div>
      ` : `
        <div class="table-scroll" style="border:1px solid var(--border); border-radius:10px; background:var(--card);">
          <table class="medicine-table">
            <thead>
              <tr>
                <th>رقم أمر الشراء</th>
                <th>المورد المعتمد</th>
                <th>تاريخ الطلب</th>
                <th>موعد التوريد</th>
                <th>الأصناف والكميات</th>
                <th>إجمالي التكلفة</th>
                <th>الحالة والمرحلة</th>
                <th aria-label="الإجراءات">الإجراء التشغيلي</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.map(order => {
                const isPending = order.status === 'PENDING_RECEIPT';
                const isDelivered = order.status === 'DELIVERED';
                const itemsCount = order.items ? order.items.length : 0;
                const totalCost = order.totals?.totalCost || 0;

                return `
                  <tr>
                    <td>
                      <button class="btn-po-code btn-open-po-detail" data-po-id="${order.id}" style="background:none; border:none; padding:0; cursor:pointer; color:var(--primary); font-family:var(--font-mono); font-weight:700; font-size:13px; text-decoration:underline;">
                        ${order.poNumber}
                      </button>
                    </td>
                    <td>
                      <strong>${order.supplierName}</strong>
                      <small style="display:block; color:var(--muted-foreground);">${order.notes || '—'}</small>
                    </td>
                    <td class="num">${order.issueDate}</td>
                    <td class="num">${order.expectedDeliveryDate || '—'}</td>
                    <td>
                      <span class="chip" title="${(order.items || []).map(i => `${i.productName} (${i.orderedQuantity})`).join(', ')}">
                        ${itemsCount} أصناف مطلوبة
                      </span>
                    </td>
                    <td class="num" style="font-weight:700; color:var(--foreground);">${totalCost.toLocaleString('en-US')} ج.س</td>
                    <td>
                      ${isPending ? '<span class="chip chip-warning">⏳ قيد الشحن / بانتظار الفحص</span>' : ''}
                      ${isDelivered ? '<span class="chip chip-success">✓ تم الاستلام وتوريد FEFO</span>' : ''}
                    </td>
                    <td>
                      <div style="display:flex; gap:6px; align-items:center;">
                        ${isPending ? `
                          <button class="btn-primary btn-action-receive" data-po-id="${order.id}" style="padding:6px 12px; font-size:12px; white-space:nowrap;">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M20 6 9 17l-5-5"/></svg>
                            استلام الشحنة
                          </button>
                        ` : ''}
                        <button class="btn-table-action btn-open-po-detail" data-po-id="${order.id}" style="font-size:12px;">عرض التفاصيل</button>
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
    // Search input
    const searchInput = this.container.querySelector('#po-search-input');
    searchInput?.addEventListener('input', (e) => {
      this.searchQuery = e.target.value.trim();
      this.render(this.orders);
    });

    // Segmented filters
    this.container.querySelectorAll('#po-status-segmented button').forEach(btn => {
      btn.addEventListener('click', () => {
        this.statusFilter = btn.dataset.status;
        this.render(this.orders);
      });
    });

    // Receive shipment buttons
    this.container.querySelectorAll('.btn-action-receive').forEach(btn => {
      btn.addEventListener('click', () => {
        const orderId = btn.dataset.poId;
        const order = this.orders.find(o => o.id === orderId);
        if (order && typeof this.callbacks.onReceive === 'function') {
          this.callbacks.onReceive(order);
        }
      });
    });

    // View PO detail buttons
    this.container.querySelectorAll('.btn-open-po-detail').forEach(btn => {
      btn.addEventListener('click', () => {
        const orderId = btn.dataset.poId;
        const order = this.orders.find(o => o.id === orderId);
        if (order && typeof this.callbacks.onView === 'function') {
          this.callbacks.onView(order);
        }
      });
    });
  }
}
