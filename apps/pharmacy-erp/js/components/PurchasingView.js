/**
 * PharmaTech — Modular Purchasing & Supply Chain View Orchestrator
 * High-End Clinical UI/UX coordinating separated components:
 * Stats, Orders Table, Suppliers Directory, Order Details Modal, and Goods Receipt
 */

import { PurchasingService } from '../services/purchasingService.js';
import { PurchasingStats } from './purchasing/PurchasingStats.js';
import { PurchasingOrdersTable } from './purchasing/PurchasingOrdersTable.js';
import { PurchasingSuppliersGrid } from './purchasing/PurchasingSuppliersGrid.js';
import { PurchasingInvoicesList } from './purchasing/PurchasingInvoicesList.js';
import { OrderDetailDialog } from './purchasing/OrderDetailDialog.js';
import { ReceiveShipmentDialog } from './purchasing/ReceiveShipmentDialog.js';
import { NewOrderDialog } from './purchasing/NewOrderDialog.js';
import { AddSupplierDialog } from './purchasing/AddSupplierDialog.js';
import { SupplierInvoiceModal } from './purchasing/SupplierInvoiceModal.js';
import { showToast } from './Toast.js';

export class PurchasingView {
  constructor() {
    this.container = document.getElementById('purchasing-view');
    this.orders = [];
    this.suppliers = [];
    this.invoices = [];
    this.invoicesStats = null;
    this.activeTab = 'orders'; // 'orders' | 'invoices' | 'suppliers'

    // Sub-components
    this.orderDetailDialog = new OrderDetailDialog((order) => this.receiveDialog.open(order));
    this.receiveDialog = new ReceiveShipmentDialog();
    this.newOrderDialog = new NewOrderDialog();
    this.addSupplierDialog = new AddSupplierDialog();
    this.supplierInvoiceModal = new SupplierInvoiceModal({
      onSuccess: () => this.loadData()
    });

    this.stats = null;
    this.ordersTable = null;
    this.suppliersGrid = null;
    this.invoicesList = null;

    this.init();
  }

  init() {
    if (!this.container) return;

    window.addEventListener('PURCHASING_UPDATED', () => {
      this.loadData();
    });

    window.addEventListener('CATALOG_UPDATED', () => {
      if (this.container.style.display !== 'none') {
        this.loadData();
      }
    });

    window.addEventListener('OPEN_NEW_PURCHASE_ORDER', (e) => {
      this.newOrderDialog.open(e.detail?.supplierId || null, e.detail?.productId || null);
    });

    this.loadData();
  }

  async loadData() {
    try {
      const [orders, suppliers, invoices, invoicesStats] = await Promise.all([
        PurchasingService.fetchOrders(),
        PurchasingService.fetchSuppliers(),
        PurchasingService.fetchInvoices(),
        PurchasingService.fetchInvoicesStats()
      ]);

      this.orders = orders;
      this.suppliers = suppliers;
      this.invoices = invoices;
      this.invoicesStats = invoicesStats;
      this.render();
    } catch (err) {
      console.error('Failed to load purchasing data:', err);
    }
  }

  render() {
    if (!this.container) return;

    const unpaidCount = this.invoices.filter(i => i.status === 'UNPAID' || i.status === 'PARTIALLY_PAID').length;

    this.container.innerHTML = `
      <!-- View Header -->
      <div class="panel-head wrap">
        <div class="panel-title">
          <span class="title-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 18H9" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" />
              <circle cx="17" cy="18" r="2" />
              <circle cx="7" cy="18" r="2" />
            </svg>
          </span>
          <div>
            <h2>المشتريات والتوريد</h2>
          </div>
        </div>

        <div class="heading-actions">
          <button class="btn-primary" id="btn-open-new-order">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 5v14M5 12h14"/></svg>
            طلب توريد جديد
          </button>
          <button class="btn-table-action" id="btn-open-new-invoice" style="padding:8px 14px; font-weight:700; color:var(--primary); border-color:var(--primary); background:rgba(37,99,235,0.06);">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="vertical-align:middle; margin-left:4px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/></svg>
            تسجيل فاتورة مورد
          </button>
          <button class="icon-btn outlined" id="btn-open-add-supplier" title="إضافة مورد جديد">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" x2="20" y1="8" y2="14"/><line x1="23" x2="17" y1="11" y2="11"/></svg>
          </button>
          <button class="icon-btn outlined" id="btn-refresh-purchasing" title="تحديث البيانات من السيرفر">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/></svg>
          </button>
        </div>
      </div>

      <!-- Quick Metrics Grid -->
      <div class="stats-grid" id="purchasing-stats-grid" style="margin-bottom:20px;"></div>

      <!-- Main Segmented Navigation (3 Subtabs) -->
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; flex-wrap:wrap; gap:10px;">
        <div class="segmented">
          <button id="tab-btn-orders" data-active="${this.activeTab === 'orders'}">
            أوامر الشراء (${this.orders.length})
          </button>
          <button id="tab-btn-invoices" data-active="${this.activeTab === 'invoices'}" style="position:relative;">
            فواتير الموردين (${this.invoices.length})
            ${unpaidCount > 0 ? `<span style="background:#EF4444; color:#fff; font-size:10px; font-weight:800; padding:1px 6px; border-radius:10px; margin-right:4px;">${unpaidCount} مستحقة</span>` : ''}
          </button>
          <button id="tab-btn-suppliers" data-active="${this.activeTab === 'suppliers'}">
            دليل الموردين (${this.suppliers.length})
          </button>
        </div>
      </div>

      <!-- Content Views -->
      <div id="purchasing-orders-container" style="display:${this.activeTab === 'orders' ? 'block' : 'none'};"></div>
      <div id="purchasing-invoices-container" style="display:${this.activeTab === 'invoices' ? 'block' : 'none'};"></div>
      <div id="purchasing-suppliers-container" style="display:${this.activeTab === 'suppliers' ? 'block' : 'none'};"></div>
    `;

    // Instantiate and render sub-components
    this.stats = new PurchasingStats('purchasing-stats-grid');
    this.stats.render(this.orders, this.suppliers);

    this.ordersTable = new PurchasingOrdersTable('purchasing-orders-container', {
      onReceive: (order) => this.receiveDialog.open(order),
      onView: (order) => this.orderDetailDialog.open(order)
    });
    this.ordersTable.render(this.orders);

    this.invoicesList = new PurchasingInvoicesList('purchasing-invoices-container', {
      onNewInvoice: () => this.supplierInvoiceModal.openInvoiceModal(),
      onPayInvoice: (inv) => this.supplierInvoiceModal.openPaymentModal(inv),
      onViewInvoice: (inv) => this.supplierInvoiceModal.openPaymentModal(inv)
    });
    this.invoicesList.render(this.invoices, this.invoicesStats);

    this.suppliersGrid = new PurchasingSuppliersGrid('purchasing-suppliers-container', {
      onQuickOrder: (supplierId) => this.newOrderDialog.open(supplierId),
      onAddSupplier: () => this.addSupplierDialog.open()
    });
    this.suppliersGrid.render(this.suppliers);

    this.attachEvents();
  }

  attachEvents() {
    // Header Buttons
    document.getElementById('btn-open-new-order')?.addEventListener('click', () => {
      this.newOrderDialog.open();
    });

    document.getElementById('btn-open-new-invoice')?.addEventListener('click', () => {
      this.supplierInvoiceModal.openInvoiceModal();
    });

    document.getElementById('btn-open-add-supplier')?.addEventListener('click', () => {
      this.addSupplierDialog.open();
    });

    document.getElementById('btn-refresh-purchasing')?.addEventListener('click', () => {
      this.loadData();
      showToast('تم تحديث البيانات', 'تم تحديث أوامر الشراء والفواتير وقائمة الموردين بنجاح', 'info');
    });

    // Subtab switching
    const setTab = (tab) => {
      this.activeTab = tab;
      const ordersContainer = document.getElementById('purchasing-orders-container');
      const invoicesContainer = document.getElementById('purchasing-invoices-container');
      const suppliersContainer = document.getElementById('purchasing-suppliers-container');
      const tabOrders = document.getElementById('tab-btn-orders');
      const tabInvoices = document.getElementById('tab-btn-invoices');
      const tabSuppliers = document.getElementById('tab-btn-suppliers');

      if (ordersContainer) ordersContainer.style.display = tab === 'orders' ? 'block' : 'none';
      if (invoicesContainer) invoicesContainer.style.display = tab === 'invoices' ? 'block' : 'none';
      if (suppliersContainer) suppliersContainer.style.display = tab === 'suppliers' ? 'block' : 'none';

      if (tabOrders) tabOrders.dataset.active = String(tab === 'orders');
      if (tabInvoices) tabInvoices.dataset.active = String(tab === 'invoices');
      if (tabSuppliers) tabSuppliers.dataset.active = String(tab === 'suppliers');
    };

    document.getElementById('tab-btn-orders')?.addEventListener('click', () => setTab('orders'));
    document.getElementById('tab-btn-invoices')?.addEventListener('click', () => setTab('invoices'));
    document.getElementById('tab-btn-suppliers')?.addEventListener('click', () => setTab('suppliers'));
  }
}
