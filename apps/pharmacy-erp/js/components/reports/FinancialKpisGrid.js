/**
 * PharmaTech — Financial KPIs Grid Component
 * Renders 4 executive summary metrics dynamically from live ledger
 */

export class FinancialKpisGrid {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
  }

  render(summary) {
    if (!this.container) return;

    const metrics = summary?.metrics || {
      grossRevenue: 0,
      reversedAmount: 0,
      netRevenue: 0,
      salesCount: 0,
      reversedCount: 0,
      totalItemsSold: 0,
      averageBasket: 0
    };

    const payments = summary?.paymentBreakdown || {
      cash: { amount: 0, percentage: 0 },
      bankak: { amount: 0, percentage: 0 },
      card: { amount: 0, percentage: 0 },
      insurance: { amount: 0, percentage: 0 }
    };

    const drawer = summary?.drawerStatus || {
      currentCashInDrawer: 0,
      openingFloat: 50000,
      sessionStatus: 'OPEN'
    };

    this.container.innerHTML = `
      <div class="stats-grid" style="margin-bottom:20px;">
        <!-- Card 1: Net Revenue -->
        <div class="stat-card featured">
          <div class="stat-top">
            <span class="stat-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </span>
            <span class="chip chip-success">صافي الإيراد المعتمد</span>
          </div>
          <div class="stat-value num">
            ${Number(metrics.netRevenue).toLocaleString('en-US')} <small>ج.س</small>
          </div>
          <div class="stat-label">المبيعات الصافية</div>
        </div>

        <!-- Card 2: Bankak Settlement -->
        <div class="stat-card">
          <div class="stat-top">
            <span class="stat-icon info">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect width="20" height="14" x="2" y="5" rx="2" />
                <line x1="2" x2="22" y1="10" y2="10" />
              </svg>
            </span>
            <span class="chip chip-info">${payments.bankak.percentage}% من المبيعات</span>
          </div>
          <div class="stat-value num">
            ${Number(payments.bankak.amount).toLocaleString('en-US')} <small>ج.س</small>
          </div>
          <div class="stat-label">مبيعات بنكك</div>
        </div>

        <!-- Card 3: Cash In Drawer -->
        <div class="stat-card">
          <div class="stat-top">
            <span class="stat-icon warning">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
                <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
                <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
              </svg>
            </span>
            <span class="chip chip-warning">الدرج: ${drawer.sessionStatus === 'OPEN' ? 'وردية نشطة' : 'مغلق'}</span>
          </div>
          <div class="stat-value num">
            ${Number(drawer.currentCashInDrawer || payments.cash.amount).toLocaleString('en-US')} <small>ج.س</small>
          </div>
          <div class="stat-label">النقدية بالدرج</div>
        </div>

        <!-- Card 4: Invoices & Basket -->
        <div class="stat-card">
          <div class="stat-top">
            <span class="stat-icon violet">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="m16.5 9.4-9-5.19M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              </svg>
            </span>
            <span class="chip chip-success">${metrics.salesCount} فاتورة</span>
          </div>
          <div class="stat-value num">
            ${Number(metrics.averageBasket).toLocaleString('en-US')} <small>ج.س</small>
          </div>
          <div class="stat-label">متوسط الفاتورة</div>
        </div>
      </div>
    `;
  }
}
