/**
 * Metrics Component
 * Displays key quantitative operational and market proof points in an elevated ribbon.
 */

export function renderMetrics() {
  return `
    <section class="container">
      <div class="metrics-ribbon">
        <div class="metric-item">
          <div class="metric-num num">+<span>120</span></div>
          <div class="metric-label">صيدلية ومجمع طبي نشط</div>
        </div>

        <div class="metric-item">
          <div class="metric-num num"><span>99.98</span>%</div>
          <div class="metric-label">جاهزية تشغيل دون انقطاع</div>
        </div>

        <div class="metric-item">
          <div class="metric-num num">+<span>450</span>K</div>
          <div class="metric-label">عملية صرف وفاتورة شهرياً</div>
        </div>

        <div class="metric-item">
          <div class="metric-num num"><span>0</span>%</div>
          <div class="metric-label">هدر في صرف أدوية منتهية الصلاحية</div>
        </div>
      </div>
    </section>
  `;
}
