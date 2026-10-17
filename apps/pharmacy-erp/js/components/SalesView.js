/**
 * PharmaTech — Official Sales, Invoices & Prescription Orders Coordinator
 * Enterprise Component-Based Modular Architecture coordinating:
 * - SalesStatsGrid, SalesFilterBar, SalesLedgerTable, SalesReturnModal
 * - SalesOrdersList, SalesOrderModal (Advance reservations & 1-click POS fulfillment)
 */

import { apiClient } from '../services/apiClient.js';
import { salesOrderService } from '../services/salesOrderService.js';
import { SalesStatsGrid } from './sales/SalesStatsGrid.js';
import { SalesFilterBar } from './sales/SalesFilterBar.js';
import { SalesLedgerTable } from './sales/SalesLedgerTable.js';
import { SalesReturnModal } from './sales/SalesReturnModal.js';
import { SalesOrdersList } from './sales/SalesOrdersList.js';
import { SalesOrderModal } from './sales/SalesOrderModal.js';
import { showToast } from './Toast.js';

export class SalesView {
  constructor() {
    this.container = document.getElementById('sales-history-view');
    this.sales = [];
    this.query = '';
    this.filterMethod = 'ALL';
    this.isLoading = false;
    this.activeTab = 'INVOICES'; // 'INVOICES' | 'ORDERS'

    this.statsGrid = new SalesStatsGrid('sales-stats-grid-container');
    this.filterBar = new SalesFilterBar('sales-filter-bar-container', {
      onSearch: (q) => {
        this.query = q;
        this.renderTableOnly();
      },
      onFilter: (method) => {
        this.filterMethod = method;
        this.renderTableOnly();
      },
      onRefresh: () => {
        this.loadSales();
        showToast('تم التحديث', 'تم تحديث قائمة الفواتير بنجاح', 'info');
      }
    });

    this.table = new SalesLedgerTable('sales-table-container', {
      onPrintReceipt: (invNo) => this.reprintReceipt(invNo),
      onReturnSale: (sale) => this.returnModal.open(sale)
    });

    this.returnModal = new SalesReturnModal();
    this.ordersList = new SalesOrdersList('sales-orders-subview', {
      onOpenCreateModal: () => this.orderModal.open()
    });
    this.orderModal = new SalesOrderModal('dialog-sales-order-modal');

    this.init();
  }

  init() {
    if (!this.container) return;

    window.addEventListener('SALES_UPDATED', () => {
      this.loadSales();
      this.updateOrdersBadge();
    });

    window.addEventListener('SALES_ORDERS_UPDATED', () => {
      this.ordersList.loadData();
      this.updateOrdersBadge();
    });

    window.addEventListener('OPEN_SALES_ORDER_MODAL', (e) => {
      this.orderModal.open(e.detail || {});
    });

    // Make global bridges available
    window.salesReprintReceipt = (invNo) => this.reprintReceipt(invNo);
    window.openSalesReturn = (invOrSale) => {
      const sale = typeof invOrSale === 'string' ? this.sales.find(s => s.invoice_number === invOrSale || s.sale_id === invOrSale) : invOrSale;
      if (sale) this.returnModal.open(sale);
    };

    this.loadSales();
    this.updateOrdersBadge();
  }

  async loadSales() {
    this.isLoading = true;
    try {
      this.sales = await apiClient.get('/api/sales');
      this.render();
    } catch (err) {
      console.warn('[SalesView] Failed to load sales from backend:', err.message);
      this.sales = [];
      this.render();
    } finally {
      this.isLoading = false;
    }
  }

  async updateOrdersBadge() {
    try {
      const stats = await salesOrderService.fetchStats();
      const badge = document.getElementById('sales-orders-tab-badge');
      if (badge) {
        badge.textContent = stats.confirmedCount || 0;
        badge.style.display = (stats.confirmedCount > 0) ? 'inline-block' : 'none';
      }
    } catch {}
  }

  getFilteredSales() {
    const q = this.query.toLowerCase().trim();
    return this.sales.filter(s => {
      const matchQuery = !q ||
        s.invoice_number.toLowerCase().includes(q) ||
        (s.customer_name && s.customer_name.toLowerCase().includes(q)) ||
        (s.cashier_name && s.cashier_name.toLowerCase().includes(q)) ||
        (s.items && s.items.some(i => (i.name && i.name.toLowerCase().includes(q)) || (i.nameAr && i.nameAr.toLowerCase().includes(q))));

      let matchMethod = true;
      const payments = Array.isArray(s.payments) ? s.payments : [];

      if (this.filterMethod === 'SPLIT') {
        matchMethod = payments.length > 1;
      } else if (this.filterMethod === 'BANKAK') {
        matchMethod = payments.some(p => p.method === 'BANK_TRANSFER' || p.method === 'BANKAK');
      } else if (this.filterMethod === 'CASH') {
        matchMethod = payments.some(p => p.method === 'CASH');
      }

      return matchQuery && matchMethod;
    });
  }

  render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <!-- Sales & Prescription Subtabs Navigation Header -->
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; border-bottom:1px solid var(--border); padding-bottom:12px; flex-wrap:wrap; gap:10px;">
        <div style="display:flex; gap:8px;">
          <button type="button" class="btn-sales-subtab" data-tab="INVOICES"
            style="padding:8px 18px; border-radius:8px; font-size:13.5px; font-weight:700; border:1px solid ${this.activeTab === 'INVOICES' ? 'var(--primary)' : 'var(--border)'}; background:${this.activeTab === 'INVOICES' ? 'var(--gradient-primary)' : 'var(--card-bg, #ffffff)'}; color:${this.activeTab === 'INVOICES' ? '#ffffff' : 'var(--foreground)'}; cursor:pointer; display:inline-flex; align-items:center; gap:6px; transition:all 0.2s ease; ${this.activeTab === 'INVOICES' ? 'box-shadow: 0 2px 8px rgba(0, 179, 126, 0.25);' : ''}">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1Z"/></svg>
            فواتير المبيعات
          </button>

          <button type="button" class="btn-sales-subtab" data-tab="ORDERS"
            style="padding:8px 18px; border-radius:8px; font-size:13.5px; font-weight:700; border:1px solid ${this.activeTab === 'ORDERS' ? 'var(--primary)' : 'var(--border)'}; background:${this.activeTab === 'ORDERS' ? 'var(--gradient-primary)' : 'var(--card-bg, #ffffff)'}; color:${this.activeTab === 'ORDERS' ? '#ffffff' : 'var(--foreground)'}; cursor:pointer; display:inline-flex; align-items:center; gap:6px; transition:all 0.2s ease; ${this.activeTab === 'ORDERS' ? 'box-shadow: 0 2px 8px rgba(0, 179, 126, 0.25);' : ''}">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            طلبات الحجز والروشتات
            <span id="sales-orders-tab-badge" style="background:${this.activeTab === 'ORDERS' ? '#ffffff' : '#00B37E'}; color:${this.activeTab === 'ORDERS' ? 'var(--primary)' : '#fff'}; font-size:11px; font-weight:800; padding:2px 7px; border-radius:10px; margin-right:4px;">0</span>
          </button>
        </div>
      </div>

      <!-- 1. Completed Invoices Subview -->
      <div id="sales-invoices-subview" style="${this.activeTab === 'INVOICES' ? 'display:block;' : 'display:none;'}">
        <!-- Sales Stats Cards -->
        <div class="stats-grid" id="sales-stats-grid-container" style="margin-bottom: 20px;"></div>

        <!-- Controls Panel (Search & Method Filter) -->
        <div id="sales-filter-bar-container"></div>

        <!-- Sales Table -->
        <div id="sales-table-container"></div>
      </div>

      <!-- 2. Prescription Reservations & Orders Subview -->
      <div id="sales-orders-subview" style="${this.activeTab === 'ORDERS' ? 'display:block;' : 'display:none;'}"></div>
    `;

    // Bind subtab clicks
    const tabBtns = this.container.querySelectorAll('.btn-sales-subtab');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.getAttribute('data-tab');
        this.switchTab(targetTab);
      });
    });

    if (this.activeTab === 'INVOICES') {
      const filtered = this.getFilteredSales();
      this.statsGrid.render(this.sales);
      this.filterBar.render(filtered.length, this.query, this.filterMethod);
      this.table.render(filtered);
    } else {
      this.ordersList.loadData();
    }

    this.updateOrdersBadge();
  }

  switchTab(tab) {
    this.activeTab = tab;
    this.render();
  }

  renderTableOnly() {
    if (this.activeTab !== 'INVOICES') return;
    const filtered = this.getFilteredSales();
    this.table.render(filtered);

    // Update count chip in filter bar
    const chip = document.querySelector('#sales-filter-bar-container .panel-title .chip');
    if (chip) chip.textContent = `${filtered.length} فاتورة`;
  }

  reprintReceipt(invNo) {
    const sale = this.sales.find(s => s.invoice_number === invNo);
    window.dispatchEvent(new CustomEvent('OPEN_RECEIPT_MODAL', { detail: sale || invNo }));
  }
}
