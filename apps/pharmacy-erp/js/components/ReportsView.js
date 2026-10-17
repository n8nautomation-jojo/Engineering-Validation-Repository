/**
 * PharmaTech — Modular Financial & Operational Reports View Coordinator
 * Orchestrates separated, single-responsibility sub-components:
 * Period Selector, Financial KPIs, Payment Channels, Categories, Top Medicines, Inventory Risk & Printable Statement
 */

import { ReportsService } from '../services/reportsService.js';
import { ReportPeriodSelector } from './reports/ReportPeriodSelector.js';
import { FinancialKpisGrid } from './reports/FinancialKpisGrid.js';
import { PaymentMethodsBreakdown } from './reports/PaymentMethodsBreakdown.js';
import { CategoryPerformancePanel } from './reports/CategoryPerformancePanel.js';
import { TopSellingTable } from './reports/TopSellingTable.js';
import { InventoryRiskPanel } from './reports/InventoryRiskPanel.js';
import { PrintableExecutiveReport } from './reports/PrintableExecutiveReport.js';
import { showToast } from './Toast.js';

export class ReportsView {
  constructor() {
    this.container = document.getElementById('reports-view');
    this.summary = null;
    this.categoryData = null;
    this.inventoryHealth = null;
    this.topProducts = [];

    this.currentStartDate = null;
    this.currentEndDate = null;
    this.currentPeriodLabel = 'اليوم (الوردية)';

    // Sub-components
    this.periodSelector = null;
    this.kpisGrid = null;
    this.paymentBreakdown = null;
    this.categoryPanel = null;
    this.topSellingTable = null;
    this.inventoryRiskPanel = null;
    this.printableModal = new PrintableExecutiveReport();

    this.init();
  }

  init() {
    if (!this.container) return;

    // React to live sales updates & catalog changes
    window.addEventListener('SALES_UPDATED', () => {
      if (this.container.style.display !== 'none') {
        this.loadData();
      }
    });

    window.addEventListener('CATALOG_UPDATED', () => {
      if (this.container.style.display !== 'none') {
        this.loadData();
      }
    });

    // Default dates: Today
    const todayStr = new Date().toISOString().split('T')[0];
    this.currentStartDate = todayStr;
    this.currentEndDate = todayStr;

    this.renderSkeleton();
    this.loadData();
  }

  renderSkeleton() {
    if (!this.container) return;

    this.container.innerHTML = `
      <!-- Header -->
      <div class="panel-head wrap" style="margin-bottom:16px;">
        <div class="panel-title">
          <span class="title-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" x2="18" y1="20" y2="10" />
              <line x1="12" x2="12" y1="20" y2="4" />
              <line x1="6" x2="6" y1="20" y2="14" />
            </svg>
          </span>
          <div>
            <h2>التقارير والتحليلات المالية</h2>
            <p class="heading-meta" style="margin:0; font-size:12px;">تحليل الإيرادات، تسويات بنكك، أداء الفئات الدوائية، ومخاطر الصلاحيات</p>
          </div>
        </div>

        <div class="heading-actions">
          <button class="btn-primary" id="btn-open-executive-report-modal">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg>
            كشف الحساب المعتمد
          </button>
          <button class="icon-btn outlined" id="btn-export-reports-csv" title="تصدير كملف CSV الشامل">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
          </button>
          <button class="icon-btn outlined" id="btn-refresh-reports" title="تحديث المؤشرات من السيرفر">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/></svg>
          </button>
        </div>
      </div>

      <!-- 1. Period Selector Container -->
      <div id="reports-period-selector-container"></div>

      <!-- 2. Financial KPIs Grid Container -->
      <div id="reports-kpis-grid-container"></div>

      <!-- 3. Middle Analytical Grid -->
      <div class="middle-grid" style="margin-bottom:20px; display:grid; grid-template-columns:repeat(auto-fit, minmax(min(100%, 360px), 1fr)); gap:20px;">
        <div id="reports-payment-breakdown-container"></div>
        <div id="reports-category-performance-container"></div>
      </div>

      <!-- 4. Bottom Data Grid -->
      <div class="bottom-grid" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(min(100%, 360px), 1fr)); gap:20px;">
        <div id="reports-top-selling-container"></div>
        <div id="reports-inventory-risk-container"></div>
      </div>
    `;

    // Instantiate sub-components with their container IDs
    this.periodSelector = new ReportPeriodSelector('reports-period-selector-container', (start, end, label) => {
      this.currentStartDate = start;
      this.currentEndDate = end;
      this.currentPeriodLabel = label;
      this.loadData();
    });
    this.periodSelector.render();

    this.kpisGrid = new FinancialKpisGrid('reports-kpis-grid-container');
    this.paymentBreakdown = new PaymentMethodsBreakdown('reports-payment-breakdown-container');
    this.categoryPanel = new CategoryPerformancePanel('reports-category-performance-container');
    this.topSellingTable = new TopSellingTable('reports-top-selling-container');
    this.inventoryRiskPanel = new InventoryRiskPanel('reports-inventory-risk-container');

    this.attachEvents();
  }

  async loadData() {
    try {
      const [summary, categoryData, inventoryHealth, topProducts] = await Promise.all([
        ReportsService.fetchFinancialSummary(this.currentStartDate, this.currentEndDate),
        ReportsService.fetchCategoryAnalytics(this.currentStartDate, this.currentEndDate),
        ReportsService.fetchInventoryHealth(),
        ReportsService.fetchTopSellingProducts(this.currentStartDate, this.currentEndDate)
      ]);

      this.summary = summary;
      this.categoryData = categoryData;
      this.inventoryHealth = inventoryHealth;
      this.topProducts = topProducts;

      this.renderSubComponents();
    } catch (err) {
      console.error('Failed to load reports data:', err);
    }
  }

  renderSubComponents() {
    this.kpisGrid?.render(this.summary);
    this.paymentBreakdown?.render(this.summary?.paymentBreakdown);
    this.categoryPanel?.render(this.categoryData);
    this.topSellingTable?.render(this.topProducts);
    this.inventoryRiskPanel?.render(this.inventoryHealth);
  }

  attachEvents() {
    // Open Official Executive Report Modal
    document.getElementById('btn-open-executive-report-modal')?.addEventListener('click', () => {
      this.printableModal.open({
        summary: this.summary,
        categoryData: this.categoryData,
        inventoryHealth: this.inventoryHealth,
        topProducts: this.topProducts,
        periodLabel: this.currentPeriodLabel
      });
    });

    // Refresh Button
    document.getElementById('btn-refresh-reports')?.addEventListener('click', () => {
      this.loadData();
      showToast('تم تحديث المؤشرات', 'تمت إعادة احتساب البيانات المالية بنجاح', 'info');
    });

    // Comprehensive CSV Export
    document.getElementById('btn-export-reports-csv')?.addEventListener('click', () => {
      this.exportCsv();
    });
  }

  exportCsv() {
    const m = this.summary?.metrics || { grossRevenue: 0, reversedAmount: 0, netRevenue: 0, salesCount: 0, averageBasket: 0 };
    const p = this.summary?.paymentBreakdown || { cash: { amount: 0 }, bankak: { amount: 0 }, card: { amount: 0 }, insurance: { amount: 0 } };

    let csv = `PharmaTech Financial Report - ${this.currentPeriodLabel}\n`;
    csv += `Export Date,${new Date().toISOString()}\n\n`;

    csv += `EXECUTIVE FINANCIAL KPIS\n`;
    csv += `Net Revenue (SDG),${m.netRevenue}\n`;
    csv += `Gross Revenue (SDG),${m.grossRevenue}\n`;
    csv += `Reversed Sales (SDG),${m.reversedAmount}\n`;
    csv += `Completed Invoices,${m.salesCount}\n`;
    csv += `Average Basket (SDG),${m.averageBasket}\n\n`;

    csv += `PAYMENT METHODS BREAKDOWN\n`;
    csv += `Bankak Transfer (SDG),${p.bankak.amount}\n`;
    csv += `Cash in Drawer (SDG),${p.cash.amount}\n`;
    csv += `POS Cards (SDG),${p.card.amount}\n`;
    csv += `Insurance (SDG),${p.insurance.amount}\n\n`;

    csv += `THERAPEUTIC CATEGORIES PERFORMANCE\n`;
    csv += `Category,Units Sold,Revenue (SDG),Share %\n`;
    (this.categoryData?.categories || []).forEach(c => {
      csv += `"${c.category}",${c.unitsSold},${c.revenue},${c.sharePercentage}%\n`;
    });
    csv += `\n`;

    csv += `TOP SELLING PHARMACEUTICALS\n`;
    csv += `Medicine,Units Sold,Revenue (SDG)\n`;
    (this.topProducts || []).forEach(p => {
      csv += `"${p.name}",${p.totalQuantity},${p.totalRevenue}\n`;
    });

    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PharmaTech_Executive_Report_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('تصدير كشف الحساب', 'تم تنزيل التقرير المالي الشامل بصيغة CSV بنجاح', 'success');
  }
}
