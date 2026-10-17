/**
 * PharmaTech — Top Selling Medicines Table Component
 * High-performance leaderboard of top prescribed and requested pharmaceuticals
 */

export class TopSellingTable {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
  }

  render(topProducts) {
    if (!this.container) return;

    const list = Array.isArray(topProducts) ? topProducts : [];

    const getRankBadge = (index) => {
      if (index === 0) return '<span style="font-size:14px;" title="المركز الأول">🥇</span>';
      if (index === 1) return '<span style="font-size:14px;" title="المركز الثاني">🥈</span>';
      if (index === 2) return '<span style="font-size:14px;" title="المركز الثالث">🥉</span>';
      return `<span style="font-family:var(--font-mono); font-size:11px; font-weight:700; color:var(--muted-foreground);">#${index + 1}</span>`;
    };

    this.container.innerHTML = `
      <section class="panel" style="padding:18px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <h3 style="font-size:14px; margin:0; display:flex; align-items:center; gap:8px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
            الأدوية الأكثر مبيعاً وإيراداً
          </h3>
          <span class="chip chip-info" style="font-size:11px;">أفضل 10 أصناف</span>
        </div>

        <div class="table-scroll" style="max-height:280px; overflow-y:auto; border:1px solid var(--border); border-radius:8px;">
          <table class="medicine-table" style="font-size:12px;">
            <thead>
              <tr>
                <th style="width:40px; text-align:center;">الرتبة</th>
                <th>الدواء الصيدلاني</th>
                <th>الكمية المباعة</th>
                <th>إجمالي الإيراد (ج.س)</th>
                <th>العمليات</th>
              </tr>
            </thead>
            <tbody>
              ${list.length === 0 ? `
                <tr>
                  <td colspan="5" style="text-align:center; padding:30px; color:var(--muted-foreground);">
                    لا توجد بيانات مبيعات في هذه الفترة
                  </td>
                </tr>
              ` : list.map((p, idx) => `
                <tr>
                  <td style="text-align:center;">${getRankBadge(idx)}</td>
                  <td>
                    <strong>${p.name}</strong>
                    ${p.nameAr && p.nameAr !== p.name ? `<small style="display:block; color:var(--muted-foreground);">${p.nameAr}</small>` : ''}
                  </td>
                  <td class="num">
                    <strong>${p.totalQuantity}</strong> عبوة
                  </td>
                  <td class="num" style="color:var(--primary); font-weight:700;">
                    ${Number(p.totalRevenue).toLocaleString('en-US')}
                  </td>
                  <td style="font-size:11px; color:var(--muted-foreground);">
                    ${p.salesCount || 1} فواتير
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </section>
    `;
  }
}
