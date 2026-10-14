/**
 * PharmaTech — Category Performance Panel Component
 * Therapeutic categories sales volume, revenue contribution, and portfolio share
 */

export class CategoryPerformancePanel {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
  }

  render(categoryData) {
    if (!this.container) return;

    const categories = categoryData?.categories || [];
    const totalRev = categoryData?.totalRevenue || 0;

    this.container.innerHTML = `
      <section class="panel" style="padding:18px; height:100%; display:flex; flex-direction:column; justify-content:space-between;">
        <div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
            <h3 style="font-size:14px; margin:0; display:flex; align-items:center; gap:8px;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/>
                <path d="m8.5 8.5 7 7"/>
              </svg>
              أداء المبيعات حسب الفئة الدوائية
            </h3>
            <span class="chip chip-info" style="font-size:11px;">${categories.length} فئات نشطة</span>
          </div>

          <div style="display:flex; flex-direction:column; gap:12px; max-height:260px; overflow-y:auto; padding-left:4px;">
            ${categories.length === 0 ? `
              <div style="text-align:center; padding:30px; color:var(--muted-foreground); font-size:12.5px;">
                لا توجد مبيعات مسجلة للفترة المحددة
              </div>
            ` : categories.map(cat => `
              <div style="padding-bottom:8px; border-bottom:1px solid var(--border);">
                <div style="display:flex; justify-content:space-between; align-items:center; font-size:12.5px; margin-bottom:4px;">
                  <div>
                    <strong>${cat.category}</strong>
                    <small style="color:var(--muted-foreground); margin-right:6px;">(${cat.unitsSold} عبوة مباعة)</small>
                  </div>
                  <div style="text-align:left;">
                    <strong class="num">${Number(cat.revenue).toLocaleString('en-US')} ج.س</strong>
                    <span class="chip chip-success" style="font-size:10.5px; margin-right:6px; padding:1px 6px;">
                      ${cat.sharePercentage}%
                    </span>
                  </div>
                </div>
                
                <div style="height:6px; border-radius:3px; background:var(--muted); overflow:hidden;">
                  <div style="height:100%; width:${Math.min(100, Math.max(0, cat.sharePercentage))}%; background:var(--primary); border-radius:3px;"></div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <div style="margin-top:14px; padding-top:10px; border-top:1px dashed var(--border); display:flex; justify-content:space-between; align-items:center; font-size:11.5px; color:var(--muted-foreground);">
          <span>إجمالي إيراد الفئات: <strong>${Number(totalRev).toLocaleString('en-US')} ج.س</strong></span>
          <span class="chip chip-info" style="font-size:10.5px;">توزيع الأصناف</span>
        </div>
      </section>
    `;
  }
}
