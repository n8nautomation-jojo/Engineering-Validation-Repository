/**
 * PharmaTech — Sales Orders & Prescription Reservations List Component
 * Renders advance bookings, chronic refill orders, and 1-click POS dispensation triggers.
 */

import { salesOrderService } from '../../services/salesOrderService.js';
import { showToast } from '../Toast.js';

export class SalesOrdersList {
  constructor(containerId, options = {}) {
    this.containerId = containerId;
    this.container = document.getElementById(containerId);
    this.options = options;
    this.orders = [];
    this.stats = { totalOrders: 0, confirmedCount: 0, fulfilledCount: 0, cancelledCount: 0, pendingRevenue: 0 };
    this.query = '';
    this.statusFilter = 'ALL';
    this.isLoading = false;
  }

  async loadData() {
    this.isLoading = true;
    try {
      const [orders, stats] = await Promise.all([
        salesOrderService.fetchOrders(),
        salesOrderService.fetchStats()
      ]);
      this.orders = orders;
      this.stats = stats;
      this.render();
    } catch (err) {
      console.warn('[SalesOrdersList] Failed to load data:', err.message);
    } finally {
      this.isLoading = false;
    }
  }

  getFilteredOrders() {
    const q = this.query.toLowerCase().trim();
    return this.orders.filter(order => {
      const matchQuery = !q ||
        order.orderNumber.toLowerCase().includes(q) ||
        (order.customerName && order.customerName.toLowerCase().includes(q)) ||
        (order.customerPhone && order.customerPhone.includes(q)) ||
        (order.doctorName && order.doctorName.toLowerCase().includes(q)) ||
        (order.prescriptionNumber && order.prescriptionNumber.toLowerCase().includes(q)) ||
        (Array.isArray(order.items) && order.items.some(i => (i.name && i.name.toLowerCase().includes(q)) || (i.nameAr && i.nameAr.toLowerCase().includes(q))));

      const matchStatus = this.statusFilter === 'ALL' || order.status === this.statusFilter;
      return matchQuery && matchStatus;
    });
  }

  render() {
    this.container = document.getElementById(this.containerId);
    if (!this.container) return;

    const filtered = this.getFilteredOrders();
    const confirmedCount = this.orders.filter(o => o.status === 'CONFIRMED').length;
    const fulfilledCount = this.orders.filter(o => o.status === 'FULFILLED').length;
    const cancelledCount = this.orders.filter(o => o.status === 'CANCELLED').length;

    this.container.innerHTML = `
      <!-- Sales Orders KPI Grid -->
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:12px; margin-bottom:20px;">
        <div style="background:var(--card-bg, #ffffff); border:1px solid var(--border); border-radius:12px; padding:14px 16px; box-shadow:0 1px 3px rgba(0,0,0,0.04);">
          <div style="font-size:12px; font-weight:600; color:var(--muted-foreground); margin-bottom:6px;">إجمالي الحجوزات والروشتات</div>
          <div style="font-size:22px; font-weight:800; color:var(--foreground);">${this.orders.length} <span style="font-size:13px; font-weight:600; color:var(--muted-foreground);">طلب</span></div>
        </div>

        <div style="background:var(--card-bg, #ffffff); border:1px solid #A7F3D0; border-radius:12px; padding:14px 16px; box-shadow:0 1px 3px rgba(0,0,0,0.04); background:rgba(16,185,129,0.04);">
          <div style="font-size:12px; font-weight:700; color:#047857; margin-bottom:6px;">جاهزة للصرف (قيد الانتظار)</div>
          <div style="font-size:22px; font-weight:800; color:#059669;">${confirmedCount} <span style="font-size:13px; font-weight:600; color:#047857;">روشتة جاهزة</span></div>
        </div>

        <div style="background:var(--card-bg, #ffffff); border:1px solid #BFDBFE; border-radius:12px; padding:14px 16px; box-shadow:0 1px 3px rgba(0,0,0,0.04); background:rgba(59,130,246,0.04);">
          <div style="font-size:12px; font-weight:700; color:#1D4ED8; margin-bottom:6px;">القيمة المحجوزة المنتظرة</div>
          <div style="font-size:22px; font-weight:800; color:#2563EB;">${(this.stats.pendingRevenue || 0).toLocaleString()} <span style="font-size:12px; font-weight:600; color:var(--muted-foreground);">ج.س</span></div>
        </div>

        <div style="background:var(--card-bg, #ffffff); border:1px solid var(--border); border-radius:12px; padding:14px 16px; box-shadow:0 1px 3px rgba(0,0,0,0.04);">
          <div style="font-size:12px; font-weight:600; color:var(--muted-foreground); margin-bottom:6px;">الروشتات المصروفة مكتملة</div>
          <div style="font-size:22px; font-weight:800; color:#10B981;">${fulfilledCount} <span style="font-size:13px; font-weight:600; color:var(--muted-foreground);">مكتمل</span></div>
        </div>
      </div>

      <!-- Action & Filter Bar -->
      <div style="background:var(--card-bg, #ffffff); border:1px solid var(--border); border-radius:12px; padding:14px 16px; margin-bottom:16px; display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:12px;">
        <div style="display:flex; flex-wrap:wrap; align-items:center; gap:10px; flex:1; min-width:280px;">
          <div style="position:relative; flex:1; min-width:200px; max-width:340px;">
            <input type="text" id="sales-orders-search" placeholder="بحث برقم الحجز، اسم المريض، الهاتف، الطبيب..." value="${this.query}"
              style="width:100%; padding:8px 34px 8px 12px; border:1px solid var(--border); border-radius:8px; background:var(--background); color:var(--foreground); font-size:13px;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" 
              style="position:absolute; right:10px; top:50%; transform:translateY(-50%); color:var(--muted-foreground); pointer-events:none;">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </div>

          <div style="display:flex; gap:6px;">
            <button type="button" class="order-filter-chip ${this.statusFilter === 'ALL' ? 'active' : ''}" data-status="ALL"
              style="padding:6px 12px; border-radius:20px; font-size:12px; font-weight:600; border:1px solid ${this.statusFilter === 'ALL' ? 'var(--primary)' : 'var(--border)'}; background:${this.statusFilter === 'ALL' ? 'var(--primary)' : 'transparent'}; color:${this.statusFilter === 'ALL' ? '#fff' : 'var(--foreground)'}; cursor:pointer;">
              الكل (${this.orders.length})
            </button>
            <button type="button" class="order-filter-chip ${this.statusFilter === 'CONFIRMED' ? 'active' : ''}" data-status="CONFIRMED"
              style="padding:6px 12px; border-radius:20px; font-size:12px; font-weight:600; border:1px solid ${this.statusFilter === 'CONFIRMED' ? '#10B981' : 'var(--border)'}; background:${this.statusFilter === 'CONFIRMED' ? '#10B981' : 'transparent'}; color:${this.statusFilter === 'CONFIRMED' ? '#fff' : 'var(--foreground)'}; cursor:pointer;">
              جاهز للصرف (${confirmedCount})
            </button>
            <button type="button" class="order-filter-chip ${this.statusFilter === 'FULFILLED' ? 'active' : ''}" data-status="FULFILLED"
              style="padding:6px 12px; border-radius:20px; font-size:12px; font-weight:600; border:1px solid ${this.statusFilter === 'FULFILLED' ? '#2563EB' : 'var(--border)'}; background:${this.statusFilter === 'FULFILLED' ? '#2563EB' : 'transparent'}; color:${this.statusFilter === 'FULFILLED' ? '#fff' : 'var(--foreground)'}; cursor:pointer;">
              مصروف (${fulfilledCount})
            </button>
            <button type="button" class="order-filter-chip ${this.statusFilter === 'CANCELLED' ? 'active' : ''}" data-status="CANCELLED"
              style="padding:6px 12px; border-radius:20px; font-size:12px; font-weight:600; border:1px solid ${this.statusFilter === 'CANCELLED' ? '#EF4444' : 'var(--border)'}; background:${this.statusFilter === 'CANCELLED' ? '#EF4444' : 'transparent'}; color:${this.statusFilter === 'CANCELLED' ? '#fff' : 'var(--foreground)'}; cursor:pointer;">
              ملغي (${cancelledCount})
            </button>
          </div>
        </div>

        <button type="button" id="btn-open-create-order-modal" class="btn-primary" 
          style="padding:8px 16px; font-size:13px; font-weight:700; display:inline-flex; align-items:center; gap:6px; cursor:pointer;">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          حجز روشتة / طلب مسبق جديد
        </button>
      </div>

      <!-- Orders List Cards -->
      <div style="display:flex; flex-direction:column; gap:12px;">
        ${filtered.length === 0 ? `
          <div style="text-align:center; padding:48px 16px; background:var(--card-bg, #ffffff); border:1px dashed var(--border); border-radius:12px;">
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="var(--muted-foreground)" stroke-width="1.5" style="margin:0 auto 12px; opacity:0.6;">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
            <div style="font-size:15px; font-weight:700; color:var(--foreground); margin-bottom:4px;">لا توجد أوامر حجز أو روشتات مطابقة</div>
            <div style="font-size:12.5px; color:var(--muted-foreground);">يمكنك إضافة حجز روشتة مسبق جديد بالضغط على الزر أعلاه</div>
          </div>
        ` : filtered.map(order => this.renderOrderCard(order)).join('')}
      </div>
    `;

    this.bindEvents();
  }

  renderOrderCard(order) {
    const isConfirmed = order.status === 'CONFIRMED';
    const isFulfilled = order.status === 'FULFILLED';
    const isCancelled = order.status === 'CANCELLED';

    const priorityBadge = order.priority === 'CHRONIC_REFILL'
      ? `<span style="background:rgba(147,51,234,0.1); color:#7E22CE; border:1px solid #D8B4FE; padding:3px 8px; border-radius:6px; font-size:11px; font-weight:700;">صرف شهري لمريض مزمن</span>`
      : order.priority === 'URGENT'
      ? `<span style="background:rgba(225,29,72,0.1); color:#BE123C; border:1px solid #FDA4AF; padding:3px 8px; border-radius:6px; font-size:11px; font-weight:700;">طلب عاجل</span>`
      : `<span style="background:rgba(100,116,139,0.1); color:var(--foreground); border:1px solid var(--border); padding:3px 8px; border-radius:6px; font-size:11px; font-weight:600;">حجز عادي</span>`;

    const statusBadge = isConfirmed
      ? `<span style="background:#E6F8F2; color:#00B37E; border:1px solid #A7F3D0; padding:4px 10px; border-radius:20px; font-size:12px; font-weight:700; display:inline-flex; align-items:center; gap:4px;"><span style="width:7px; height:7px; border-radius:50%; background:#00B37E;"></span> جاهز للصرف</span>`
      : isFulfilled
      ? `<span style="background:#EFF6FF; color:#2563EB; border:1px solid #BFDBFE; padding:4px 10px; border-radius:20px; font-size:12px; font-weight:700;">تم الصرف بنجاح</span>`
      : `<span style="background:#F3F4F6; color:#6B7280; border:1px solid #E5E7EB; padding:4px 10px; border-radius:20px; font-size:12px; font-weight:600;">ملغي</span>`;

    const dateStr = order.createdAt ? new Date(order.createdAt).toLocaleDateString('ar-SD', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    }) : '—';

    return `
      <div class="sales-order-card" data-order-id="${order.id}" style="background:var(--card-bg, #ffffff); border:1px solid var(--border); border-radius:12px; padding:16px; box-shadow:0 1px 3px rgba(0,0,0,0.03); transition:all 0.2s ease;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px; flex-wrap:wrap; gap:10px;">
          <div>
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
              <span style="font-family:var(--font-mono); font-size:14px; font-weight:800; color:var(--primary);">${order.orderNumber}</span>
              ${priorityBadge}
              ${statusBadge}
            </div>
            <div style="font-size:12px; color:var(--muted-foreground);">تاريخ الحجز: ${dateStr}</div>
          </div>

          <div style="text-align:left;">
            <div style="font-size:11.5px; color:var(--muted-foreground); margin-bottom:2px;">إجمالي الروشتة</div>
            <div style="font-size:18px; font-weight:800; color:var(--foreground);">${Number(order.totalAmount || 0).toLocaleString()} <span style="font-size:12px; font-weight:600; color:var(--muted-foreground);">ج.س</span></div>
          </div>
        </div>

        <!-- Patient & Doctor Metadata -->
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:10px; background:var(--background); border-radius:8px; padding:10px 12px; margin-bottom:12px; font-size:12.5px;">
          <div>
            <span style="color:var(--muted-foreground); font-size:11px; display:block;">المريض:</span>
            <strong>${order.customerName || 'عميل نقدي'}</strong>
            ${order.customerPhone ? `<span style="display:inline-block; margin-right:6px; color:var(--primary); font-family:var(--font-mono); font-size:12px;" dir="ltr">${order.customerPhone}</span>` : ''}
          </div>
          <div>
            <span style="color:var(--muted-foreground); font-size:11px; display:block;">الطبيب والروشتة:</span>
            <span>${order.doctorName || 'طبيب عام'}</span>
            ${order.prescriptionNumber ? `<span style="display:inline-block; margin-right:6px; font-family:var(--font-mono); color:var(--muted-foreground);">(${order.prescriptionNumber})</span>` : ''}
          </div>
          ${order.notes ? `
          <div style="grid-column:1 / -1;">
            <span style="color:var(--muted-foreground); font-size:11px; display:block;">ملاحظات الصيدلي:</span>
            <span style="color:var(--foreground); font-style:italic;">${order.notes}</span>
          </div>` : ''}
        </div>

        <!-- Prescribed Items Breakdown -->
        <div style="border:1px solid var(--border); border-radius:8px; overflow:hidden; margin-bottom:14px;">
          <table style="width:100%; border-collapse:collapse; font-size:12px; text-align:right;">
            <thead>
              <tr style="background:var(--background); border-bottom:1px solid var(--border); color:var(--muted-foreground);">
                <th style="padding:6px 10px; font-weight:700;">الدواء / الصنف</th>
                <th style="padding:6px 10px; font-weight:700; width:70px; text-align:center;">الكمية</th>
                <th style="padding:6px 10px; font-weight:700; width:100px; text-align:left;">السعر</th>
                <th style="padding:6px 10px; font-weight:700; width:110px; text-align:left;">الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              ${(order.items || []).map(item => `
                <tr style="border-bottom:1px solid var(--border);">
                  <td style="padding:7px 10px;">
                    <strong>${item.nameAr || item.name}</strong>
                    ${item.nameAr && item.name ? `<span style="font-size:11px; color:var(--muted-foreground); display:block;">${item.name}</span>` : ''}
                  </td>
                  <td style="padding:7px 10px; text-align:center; font-family:var(--font-mono); font-weight:700;">${item.quantity}</td>
                  <td style="padding:7px 10px; text-align:left; font-family:var(--font-mono);">${Number(item.unitPrice || 0).toLocaleString()} ج.س</td>
                  <td style="padding:7px 10px; text-align:left; font-family:var(--font-mono); font-weight:700; color:var(--primary);">${Number(item.lineTotal || 0).toLocaleString()} ج.س</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <!-- Action Buttons -->
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
          <div>
            ${isFulfilled && order.fulfilledInvoiceNumber ? `
              <span style="font-size:12px; color:#2563EB; font-weight:600; display:inline-flex; align-items:center; gap:4px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                تم الصرف بموجب فاتورة: <strong style="font-family:var(--font-mono);">${order.fulfilledInvoiceNumber}</strong>
              </span>
            ` : ''}
            ${isCancelled && order.cancelReason ? `
              <span style="font-size:12px; color:#EF4444;">سبب الإلغاء: ${order.cancelReason}</span>
            ` : ''}
          </div>

          <div style="display:flex; gap:8px;">
            ${isConfirmed ? `
              <button type="button" class="btn-cancel-sales-order btn-table-action" data-order-id="${order.id}" 
                style="padding:6px 12px; font-size:12px; color:#EF4444; border-color:#FCA5A5;">
                إلغاء الحجز
              </button>
              <button type="button" class="btn-fulfill-pos btn-primary" data-order-id="${order.id}" 
                style="padding:6px 16px; font-size:12.5px; font-weight:700; background:#00B37E; border-color:#00B37E; display:inline-flex; align-items:center; gap:6px;">
                ⚡ صرف في الكاشير (POS)
              </button>
            ` : isFulfilled ? `
              <button type="button" class="btn-table-action btn-reprint-receipt" data-inv="${order.fulfilledInvoiceNumber}" style="padding:6px 12px; font-size:12px;">
                🖨️ طباعة الفاتورة
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }

  bindEvents() {
    // Search listener
    const searchInput = document.getElementById('sales-orders-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.query = e.target.value;
        this.render();
      });
    }

    // Filter chips
    const chips = this.container.querySelectorAll('.order-filter-chip');
    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        this.statusFilter = chip.getAttribute('data-status');
        this.render();
      });
    });

    // Create modal open button
    const createBtn = document.getElementById('btn-open-create-order-modal');
    if (createBtn) {
      createBtn.addEventListener('click', () => {
        if (this.options.onOpenCreateModal) {
          this.options.onOpenCreateModal();
        } else {
          window.dispatchEvent(new CustomEvent('OPEN_SALES_ORDER_MODAL'));
        }
      });
    }

    // 1-Click Fulfill in POS button
    const fulfillBtns = this.container.querySelectorAll('.btn-fulfill-pos');
    fulfillBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const orderId = btn.getAttribute('data-order-id');
        const order = this.orders.find(o => o.id === orderId);
        if (order) {
          window.dispatchEvent(new CustomEvent('POS_LOAD_SALES_ORDER', { detail: order }));
        }
      });
    });

    // Cancel order button
    const cancelBtns = this.container.querySelectorAll('.btn-cancel-sales-order');
    cancelBtns.forEach(btn => {
      btn.addEventListener('click', async () => {
        const orderId = btn.getAttribute('data-order-id');
        const reason = prompt('يرجى ذكر سبب إلغاء حجز الروشتة (اختياري):', 'إلغاء بناء على طلب المريض');
        if (reason !== null) {
          try {
            await salesOrderService.cancelOrder(orderId, reason);
            showToast('تم إلغاء الحجز', `تم إلغاء أمر الحجز ${orderId} بنجاح`, 'info');
            this.loadData();
          } catch (err) {
            showToast('تعذر الإلغاء', err.message, 'danger');
          }
        }
      });
    });

    // Reprint receipt button
    const reprintBtns = this.container.querySelectorAll('.btn-reprint-receipt');
    reprintBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const invNo = btn.getAttribute('data-inv');
        if (invNo) {
          window.dispatchEvent(new CustomEvent('OPEN_RECEIPT_MODAL', { detail: invNo }));
        }
      });
    });
  }
}
