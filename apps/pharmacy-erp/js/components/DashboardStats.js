/**
 * PharmaTech — Live Dashboard Statistics & Alerts Controller
 * Dynamically binds Dashboard Cards & Operational Alerts to Core Backend APIs
 * Fully interconnected: reacts to sales, catalog changes, and cash sessions
 */

import { appStore } from '../state/store.js';
import { apiClient } from '../services/apiClient.js';

export class DashboardStats {
  constructor() {
    this.salesNumEl = document.getElementById('stat-daily-sales-num');
    this.invoicesNumEl = document.getElementById('stat-invoices-num');
    this.itemsNumEl = document.getElementById('stat-items-num');
    this.alertsNumEl = document.getElementById('stat-alerts-num');
    this.alertsChipEl = document.getElementById('stat-alerts-chip');
    this.alertTotalChip = document.getElementById('alert-total-chip');
    this.alertLowStockDesc = document.getElementById('alert-lowstock-desc');
    this.alertExpiryDesc = document.getElementById('alert-expiry-desc');
    this.chartSummaryAmount = document.getElementById('chart-summary-amount');
    this.currentBranchName = document.getElementById('current-branch-name');
    this.userProfileName = document.getElementById('user-profile-name');

    this.alertRowLowStock = document.getElementById('alert-row-lowstock');
    this.alertRowExpiry = document.getElementById('alert-row-expiry');

    this.init();
  }

  init() {
    // 1. Reactive Store Subscriptions
    appStore.subscribe((event) => {
      if (
        event === 'MEDICINES_LOADED' ||
        event === 'SALES_UPDATED' ||
        event === 'SESSION_UPDATED' ||
        event === 'STATS_UPDATED'
      ) {
        this.render();
      }
    });

    // 2. Global Event Listeners
    window.addEventListener('SALES_UPDATED', () => this.syncFromBackend());
    window.addEventListener('SESSION_UPDATED', () => this.syncFromBackend());

    // 3. Interactive Alert Row Links
    if (this.alertRowLowStock) {
      this.alertRowLowStock.addEventListener('click', () => {
        appStore.setStatusFilter('low');
        const invBtn = document.querySelector('.nav-button[data-view="inventory"]');
        if (invBtn) invBtn.click();
      });
    }

    if (this.alertRowExpiry) {
      this.alertRowExpiry.addEventListener('click', () => {
        appStore.setStatusFilter('expiring');
        const invBtn = document.querySelector('.nav-button[data-view="inventory"]');
        if (invBtn) invBtn.click();
      });
    }

    // 4. Initial Backend Synchronization
    this.syncFromBackend();
  }

  async syncFromBackend() {
    try {
      const [sales, session] = await Promise.all([
        apiClient.get('/api/sales').catch(() => []),
        apiClient.get('/api/sessions/current').catch(() => null)
      ]);

      appStore.sales = Array.isArray(sales) ? sales : [];
      appStore.currentSession = session;

      this.render();
    } catch (err) {
      console.warn('[DashboardStats] Sync error:', err);
      this.render();
    }
  }

  render() {
    const medicines = appStore.medicines || [];
    const sales = appStore.sales || [];
    const session = appStore.currentSession;

    // 1. Calculate Real Daily Revenue from Sales Ledger
    const totalRevenue = sales
      .filter((s) => s.status === 'COMPLETED')
      .reduce((sum, s) => {
        const val = parseFloat(s.totals?.total || s.total || 0);
        return sum + (isNaN(val) ? 0 : val);
      }, 0);

    const invoicesCount = sales.filter((s) => s.status === 'COMPLETED').length;
    const totalItems = medicines.length;

    // 2. Real Alerts Calculation from Live Medicines & Batches
    const now = Date.now();
    const sixtyDaysMs = 60 * 24 * 60 * 60 * 1000;

    const lowStockItems = medicines.filter((m) => {
      const stock = typeof m.stock === 'number' ? m.stock : 0;
      return stock <= 20;
    });

    const expiringItems = medicines.filter((m) => {
      if (!m.expiry) return false;
      const exp = new Date(m.expiry).getTime();
      return exp > 0 && exp - now < sixtyDaysMs;
    });

    const totalAlerts = lowStockItems.length + expiringItems.length;

    // 3. Update DOM Elements
    if (this.salesNumEl) {
      this.salesNumEl.innerHTML = `${Number(totalRevenue).toLocaleString('en-US')} <small>ج.س</small>`;
    }

    if (this.invoicesNumEl) {
      this.invoicesNumEl.innerHTML = `${invoicesCount} <small>فاتورة</small>`;
    }

    if (this.itemsNumEl) {
      this.itemsNumEl.innerHTML = `${totalItems} <small>صنفاً</small>`;
    }

    if (this.alertsNumEl) {
      this.alertsNumEl.innerHTML = `${totalAlerts} <small>تنبيه</small>`;
    }

    if (this.alertsChipEl) {
      this.alertsChipEl.textContent = `${totalAlerts} عاجلة`;
    }

    if (this.alertTotalChip) {
      this.alertTotalChip.textContent = `${totalAlerts} عاجلة`;
    }

    if (this.alertLowStockDesc) {
      this.alertLowStockDesc.textContent = `${lowStockItems.length} صنفاً تحت حد الأمان في المخزون`;
    }

    if (this.alertExpiryDesc) {
      this.alertExpiryDesc.textContent = `${expiringItems.length} تشغيلات تنتهي صلاحيتها خلال 60 يوماً`;
    }

    if (this.chartSummaryAmount) {
      this.chartSummaryAmount.innerHTML = `${Number(totalRevenue).toLocaleString('en-US')} <small>ج.س</small>`;
    }

    if (session) {
      if (this.currentBranchName && session.branchName) {
        this.currentBranchName.textContent = session.branchName;
      }
      if (this.userProfileName && session.cashierName) {
        this.userProfileName.textContent = session.cashierName;
      }
    }
  }
}
