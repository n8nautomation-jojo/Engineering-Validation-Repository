/**
 * PharmaTech — Sales Stats Grid Component
 * Displays 4 live KPI cards: Total Revenue, Invoices Count, Bankak Settled, and Cash Drawer Total
 */

export class SalesStatsGrid {
  constructor(containerId = 'sales-stats-grid') {
    this.containerId = containerId;
  }

  render(sales = []) {
    const el = document.getElementById(this.containerId);
    if (!el) return;

    const totalRevenue = sales.reduce((sum, s) => sum + (s.status === 'COMPLETED' ? parseFloat(s.totals?.total || 0) : 0), 0);
    const bankakTotal = sales.reduce((sum, s) => {
      if (s.status !== 'COMPLETED') return sum;
      const bankakPay = (s.payments || []).find(p => p.method === 'BANK_TRANSFER' || p.method === 'BANKAK');
      return sum + (bankakPay ? parseFloat(bankakPay.amount?.value || 0) : 0);
    }, 0);
    const cashTotal = sales.reduce((sum, s) => {
      if (s.status !== 'COMPLETED') return sum;
      const cashPay = (s.payments || []).find(p => p.method === 'CASH');
      return sum + (cashPay ? parseFloat(cashPay.amount?.value || 0) : 0);
    }, 0);

    el.innerHTML = `
      <div class="stat-card featured">
        <div class="stat-top">
          <span class="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
            </svg>
          </span>
          <span class="chip chip-success">مكتملة رسمياً</span>
        </div>
        <div class="stat-value num" dir="ltr">${Number(totalRevenue).toLocaleString()} <small>ج.س</small></div>
        <div class="stat-label">إجمالي إيراد المبيعات المسجلة</div>
      </div>

      <div class="stat-card">
        <div class="stat-top">
          <span class="stat-icon info">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1Z" />
            </svg>
          </span>
          <span class="chip chip-success">${sales.length} فواتير</span>
        </div>
        <div class="stat-value num">${sales.length} <small>فاتورة</small></div>
        <div class="stat-label">إجمالي الفواتير الصادرة بالوردية</div>
      </div>

      <div class="stat-card">
        <div class="stat-top">
          <span class="stat-icon" style="background:#EBF5FF; color:#0052CC;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect width="20" height="14" x="2" y="5" rx="2" />
              <line x1="2" x2="22" y1="10" y2="10" />
            </svg>
          </span>
          <span class="chip" style="background:#EBF5FF; color:#0052CC; font-weight:700;">Bankak</span>
        </div>
        <div class="stat-value num" dir="ltr" style="color:#0052CC;">${Number(bankakTotal).toLocaleString()} <small>ج.س</small></div>
        <div class="stat-label">مبيعات تطبيق بنكك المؤكدة</div>
      </div>

      <div class="stat-card">
        <div class="stat-top">
          <span class="stat-icon" style="background:#ECFDF5; color:#00B37E;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
              <path d="M12 18V6" />
            </svg>
          </span>
          <span class="chip chip-success">Cash</span>
        </div>
        <div class="stat-value num" dir="ltr" style="color:#00B37E;">${Number(cashTotal).toLocaleString()} <small>ج.س</small></div>
        <div class="stat-label">المقبوضات النقدية المباشرة</div>
      </div>
    `;
  }
}
