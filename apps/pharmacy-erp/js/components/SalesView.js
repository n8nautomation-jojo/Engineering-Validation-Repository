/**
 * PharmaTech — Official Sales & Invoices Ledger Coordinator
 * Enterprise Component-Based Modular Architecture coordinating:
 * SalesStatsGrid, SalesFilterBar, SalesLedgerTable, and SalesReturnModal
 */

import { apiClient } from '../services/apiClient.js';
import { SalesStatsGrid } from './sales/SalesStatsGrid.js';
import { SalesFilterBar } from './sales/SalesFilterBar.js';
import { SalesLedgerTable } from './sales/SalesLedgerTable.js';
import { SalesReturnModal } from './sales/SalesReturnModal.js';
import { showToast } from './Toast.js';

export class SalesView {
  constructor() {
    this.container = document.getElementById('sales-history-view');
    this.sales = [];
    this.query = '';
    this.filterMethod = 'ALL';
    this.isLoading = false;

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
        showToast('تم التحديث', 'تم جلب أحدث الفواتير من الباك إند', 'info');
      }
    });

    this.table = new SalesLedgerTable('sales-table-container', {
      onPrintReceipt: (invNo) => this.reprintReceipt(invNo),
      onReturnSale: (sale) => this.returnModal.open(sale)
    });

    this.returnModal = new SalesReturnModal();

    this.init();
  }

  init() {
    if (!this.container) return;

    window.addEventListener('SALES_UPDATED', () => this.loadSales());

    // Make global bridges available
    window.salesReprintReceipt = (invNo) => this.reprintReceipt(invNo);
    window.openSalesReturn = (invOrSale) => {
      const sale = typeof invOrSale === 'string' ? this.sales.find(s => s.invoice_number === invOrSale || s.sale_id === invOrSale) : invOrSale;
      if (sale) this.returnModal.open(sale);
    };

    this.loadSales();
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
      <!-- Sales Stats Cards -->
      <div class="stats-grid" id="sales-stats-grid-container" style="margin-bottom: 20px;"></div>

      <!-- Controls Panel (Search & Method Filter) -->
      <div id="sales-filter-bar-container"></div>

      <!-- Sales Table -->
      <div id="sales-table-container"></div>
    `;

    const filtered = this.getFilteredSales();
    this.statsGrid.render(this.sales);
    this.filterBar.render(filtered.length, this.query, this.filterMethod);
    this.table.render(filtered);
  }

  renderTableOnly() {
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
