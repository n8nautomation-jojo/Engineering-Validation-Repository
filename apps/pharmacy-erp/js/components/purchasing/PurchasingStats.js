/**
 * PharmaTech — Purchasing Stats KPI Component
 * Computes live metrics from real orders and supplier records
 */

export class PurchasingStats {
  constructor(containerId = 'purchasing-stats-grid') {
    this.container = document.getElementById(containerId);
  }

  render(orders = [], suppliers = []) {
    if (!this.container) return;

    const pendingOrders = orders.filter(o => o.status === 'PENDING_RECEIPT');
    const deliveredOrders = orders.filter(o => o.status === 'DELIVERED');
    const totalPurchasesVolume = deliveredOrders.reduce((sum, o) => sum + (o.totals?.totalCost || 0), 0);

    this.container.innerHTML = `
      <div class="stat-card">
        <div class="stat-top">
          <span class="stat-icon info">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/>
              <line x1="16" x2="8" y1="17" y2="17"/><polyline points="10 9 9 9 8 9"/>
            </svg>
          </span>
          <span class="chip chip-info">${orders.length} طلبات</span>
        </div>
        <div class="stat-value num">${orders.length} <small>طلب</small></div>
        <div class="stat-label">إجمالي أوامر الشراء الصادرة</div>
      </div>

      <div class="stat-card featured" style="background:linear-gradient(135deg, rgba(245,158,11,0.08), rgba(0,179,126,0.04));">
        <div class="stat-top">
          <span class="stat-icon warning">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </span>
          <span class="chip chip-warning">بانتظار الاستلام</span>
        </div>
        <div class="stat-value num" style="color:var(--warning);">${pendingOrders.length} <small>شحنة</small></div>
        <div class="stat-label">شحنات جارية بانتظار الفحص والتوريد</div>
      </div>

      <div class="stat-card">
        <div class="stat-top">
          <span class="stat-icon violet">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </span>
          <span class="chip chip-success">معتمدون</span>
        </div>
        <div class="stat-value num">${suppliers.length} <small>مورد</small></div>
        <div class="stat-label">شركات ومصانع الأدوية المعتمدة</div>
      </div>

      <div class="stat-card">
        <div class="stat-top">
          <span class="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </span>
          <span class="chip chip-success">مستلم</span>
        </div>
        <div class="stat-value num">${totalPurchasesVolume.toLocaleString('en-US')} <small>ج.س</small></div>
        <div class="stat-label">قيمة المشتريات الموردة فعلياً</div>
      </div>
    `;
  }
}
