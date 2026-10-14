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
    this.alertRowShipment = document.getElementById('alert-row-shipment');
    this.alertShipmentDesc = document.getElementById('alert-shipment-desc');

    this.pendingOrdersCount = 0;

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
    window.addEventListener('PURCHASING_UPDATED', () => this.syncFromBackend());

    // 3. Interactive Alert Row Links
    if (this.alertRowLowStock) {
      this.alertRowLowStock.addEventListener('click', () => {
        const invBtn = document.querySelector('.nav-button[data-view="inventory"]');
        if (invBtn) invBtn.click();
        setTimeout(() => appStore.setStatusFilter('low'), 10);
      });
    }

    if (this.alertRowExpiry) {
      this.alertRowExpiry.addEventListener('click', () => {
        const invBtn = document.querySelector('.nav-button[data-view="inventory"]');
        if (invBtn) invBtn.click();
        setTimeout(() => appStore.setStatusFilter('expiring'), 10);
      });
    }

    if (this.alertRowShipment) {
      this.alertRowShipment.addEventListener('click', () => {
        const purchBtn = document.querySelector('.nav-button[data-view="purchasing"]');
        if (purchBtn) purchBtn.click();
      });
    }

    // 4. Initial Backend Synchronization
    this.syncFromBackend();
  }

  async syncFromBackend() {
    try {
      const [sales, session, orders] = await Promise.all([
        apiClient.get('/api/sales').catch(() => []),
        apiClient.get('/api/sessions/current').catch(() => null),
        apiClient.get('/api/purchasing/orders').catch(() => [])
      ]);

      appStore.sales = Array.isArray(sales) ? sales : [];
      appStore.currentSession = session;

      const orderList = Array.isArray(orders) ? orders : [];
      this.pendingOrdersCount = orderList.filter((o) => o.status === 'PENDING_RECEIPT').length;

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

    const totalAlerts = lowStockItems.length + expiringItems.length + this.pendingOrdersCount;

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

    // Dynamic sidebar inventory counter
    const navInvCount = document.getElementById('nav-inventory-count');
    if (navInvCount) {
      navInvCount.textContent = totalItems;
    }

    // Dynamic topbar notification counter
    const notifBadge = document.getElementById('notifications-badge-count');
    if (notifBadge) {
      notifBadge.textContent = totalAlerts;
    }

    // Populate appStore.notifications with real clinical & operational alerts
    const notifications = [];
    if (lowStockItems.length > 0) {
      notifications.push({
        type: 'warning',
        title: 'نواقص في المخزون الصيدلاني',
        desc: `${lowStockItems.length} أدوية وصلت إلى حد الأمان أو نفدت (${lowStockItems.slice(0, 2).map(m => m.name).join('، ')}${lowStockItems.length > 2 ? '...' : ''})`,
        time: 'مباشر',
        action: 'LOW_STOCK'
      });
    }
    if (expiringItems.length > 0) {
      notifications.push({
        type: 'danger',
        title: 'تنبيه الأدوية الأقرب انتهاءً',
        desc: `${expiringItems.length} أدوية تقترب من تاريخ الانتهاء خلال 60 يوماً`,
        time: 'مباشر',
        action: 'EXPIRING'
      });
    }
    if (this.pendingOrdersCount > 0) {
      notifications.push({
        type: 'info',
        title: 'شحنات توريد بانتظار الاستلام',
        desc: `يوجد ${this.pendingOrdersCount} طلبيات توريد مؤكدة بانتظار فحص التشغيلات وتوريد المخزون`,
        time: 'مباشر',
        action: 'SHIPMENTS'
      });
    }
    appStore.notifications = notifications;

    if (this.alertLowStockDesc) {
      this.alertLowStockDesc.textContent = `${lowStockItems.length} صنفاً تحت حد الأمان في المخزون`;
    }

    if (this.alertExpiryDesc) {
      this.alertExpiryDesc.textContent = `${expiringItems.length} تشغيلات تنتهي صلاحيتها خلال 60 يوماً`;
    }

    if (this.alertShipmentDesc) {
      this.alertShipmentDesc.textContent = this.pendingOrdersCount > 0
        ? `${this.pendingOrdersCount} طلبيات توريد بانتظار فحص واستلام الشحنة`
        : 'جميع طلبيات التوريد مستلمة ومطابقة';
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
