/**
 * PharmaTech — Sales Revenue SVG Area Chart Component
 * Interactive weekly & monthly trend morphing with official logo gradient
 */

import { appStore } from '../state/store.js';

export class SalesChart {
  constructor() {
    this.weekTab = document.getElementById('chart-tab-week');
    this.monthTab = document.getElementById('chart-tab-month');
    this.summaryEl = document.getElementById('chart-summary-amount');
    this.areaPath = document.getElementById('chart-area-path');
    this.strokePath = document.getElementById('chart-stroke-path');

    this.init();
  }

  init() {
    if (this.weekTab && this.monthTab) {
      this.weekTab.addEventListener('click', () => {
        appStore.setChartPeriod('week');
        this.weekTab.dataset.active = 'true';
        this.monthTab.dataset.active = 'false';
        this.render();
      });

      this.monthTab.addEventListener('click', () => {
        appStore.setChartPeriod('month');
        this.monthTab.dataset.active = 'true';
        this.weekTab.dataset.active = 'false';
        this.render();
      });
    }

    // Reactive updates on sales ledger changes
    window.addEventListener('SALES_UPDATED', () => this.render());
    appStore.subscribe((event) => {
      if (event === 'SALES_UPDATED' || event === 'CHART_PERIOD_CHANGED') {
        this.render();
      }
    });

    this.render();
  }

  render() {
    const sales = appStore.sales || [];
    const totalSales = sales
      .filter((s) => s.status === 'COMPLETED')
      .reduce((sum, s) => sum + (parseFloat(s.totals?.total || s.total || 0) || 0), 0);

    if (this.summaryEl) {
      this.summaryEl.innerHTML = `${Number(totalSales).toLocaleString('en-US')} <small>ج.س</small>`;
    }

    if (appStore.chartPeriod === 'month') {
      if (this.areaPath) this.areaPath.setAttribute('d', 'M 10 130 Q 150 90, 260 60 T 480 35 T 630 20 L 630 170 L 10 170 Z');
      if (this.strokePath) this.strokePath.setAttribute('d', 'M 10 130 Q 150 90, 260 60 T 480 35 T 630 20');
    } else {
      if (this.areaPath) this.areaPath.setAttribute('d', 'M 10 110 Q 110 70, 210 85 T 410 40 T 630 30 L 630 170 L 10 170 Z');
      if (this.strokePath) this.strokePath.setAttribute('d', 'M 10 110 Q 110 70, 210 85 T 410 40 T 630 30');
    }
  }
}
