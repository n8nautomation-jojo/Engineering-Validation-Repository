/**
 * PharmaTech — Cash Session KPIs Grid Component
 * Displays 4 financial shift cards: Opening Float, Direct Cash Sales, Bankak Sales, and Net Expected Cash
 */

export class SessionKpisGrid {
  constructor(containerId = 'session-kpis-grid-container') {
    this.containerId = containerId;
  }

  render(session) {
    const el = document.getElementById(this.containerId);
    if (!el) return;

    const m = session?.metrics || {
      openingFloat: 0,
      cashSales: 0,
      bankakSales: 0,
      cashIn: 0,
      cashOut: 0,
      expectedCash: 0,
      totalRevenue: 0,
      salesCount: 0
    };

    el.innerHTML = `
      <div class="stats-grid" style="margin-bottom: 20px;">
        <!-- Card 1: Opening Float -->
        <div class="stat-card">
          <div class="stat-top">
            <span class="stat-icon" style="background:#EBF5FF; color:#0052CC;">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v8" />
                <path d="M8 12h8" />
              </svg>
            </span>
            <span class="chip" style="background:#EBF5FF; color:#0052CC; font-weight:700;">عهدة البداية</span>
          </div>
          <div class="stat-value num" dir="ltr">${Number(m.openingFloat || 0).toLocaleString()} <small>ج.س</small></div>
          <div class="stat-label">الرصيد الافتتاحي</div>
        </div>

        <!-- Card 2: Cash Sales -->
        <div class="stat-card">
          <div class="stat-top">
            <span class="stat-icon" style="background:#ECFDF5; color:#00B37E;">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
                <path d="M12 18V6" />
              </svg>
            </span>
            <span class="chip chip-success">مقبوضات كاش</span>
          </div>
          <div class="stat-value num" dir="ltr" style="color:#00B37E;">+${Number(m.cashSales || 0).toLocaleString()} <small>ج.س</small></div>
          <div class="stat-label">مبيعات النقدية</div>
        </div>

        <!-- Card 3: Bankak Sales -->
        <div class="stat-card">
          <div class="stat-top">
            <span class="stat-icon" style="background:#EBF5FF; color:#0052CC;">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect width="20" height="14" x="2" y="5" rx="2" />
                <line x1="2" x2="22" y1="10" y2="10" />
              </svg>
            </span>
            <span class="chip" style="background:#EBF5FF; color:#0052CC; font-weight:700;">تحويلات بنكك</span>
          </div>
          <div class="stat-value num" dir="ltr" style="color:#0052CC;">${Number(m.bankakSales || 0).toLocaleString()} <small>ج.س</small></div>
          <div class="stat-label">مبيعات بنكك</div>
        </div>

        <!-- Card 4: Expected Drawer Cash -->
        <div class="stat-card featured">
          <div class="stat-top">
            <span class="stat-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
              </svg>
            </span>
            <span class="chip chip-success">واجب التسليم</span>
          </div>
          <div class="stat-value num" dir="ltr" style="color:var(--primary);">${Number(m.expectedCash || 0).toLocaleString()} <small>ج.س</small></div>
          <div class="stat-label">النقدية المتوقعة</div>
        </div>
      </div>
    `;
  }
}
