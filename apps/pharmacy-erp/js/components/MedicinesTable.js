/**
 * PharmaTech — Inventory, Medicines & Multi-Warehouse Coordinator
 * Enterprise Component-Based Modular Architecture coordinating:
 * - InventoryFilterBar, InventoryTableGrid, InventoryPagination
 * - StockTransfersList, StockTransferModal (Multi-warehouse stock routing)
 * - StockAdjustmentModal, BarcodeLabelModal, StockMovementsModal
 */

import { appStore } from '../state/store.js';
import { MedicineService } from '../services/medicineService.js';
import { transferService } from '../services/transferService.js';
import { InventoryFilterBar } from './inventory/InventoryFilterBar.js';
import { InventoryTableGrid } from './inventory/InventoryTableGrid.js';
import { InventoryPagination } from './inventory/InventoryPagination.js';
import { StockAdjustmentModal } from './inventory/StockAdjustmentModal.js';
import { BarcodeLabelModal } from './inventory/BarcodeLabelModal.js';
import { StockMovementsModal } from './inventory/StockMovementsModal.js';
import { StockTransfersList } from './inventory/StockTransfersList.js';
import { StockTransferModal } from './inventory/StockTransferModal.js';
import { showToast } from './Toast.js';

export class MedicinesTable {
  constructor() {
    this.container = document.getElementById('medicines-table-panel');
    this.selectedCategory = 'ALL';
    this.activeTab = 'CATALOG'; // 'CATALOG' | 'TRANSFERS'

    // Sub-components
    this.filterBar = new InventoryFilterBar('inventory-filter-bar-container', {
      onSearch: (q) => this.handleSearch(q),
      onCategoryChange: (cat) => this.handleCategoryChange(cat),
      onStatusChange: (status) => this.handleStatusChange(status),
      onAddNew: () => this.handleAddNew(),
      onExportCSV: () => this.handleExportCSV(),
      onViewMovements: () => this.handleViewMovements()
    });

    this.tableGrid = new InventoryTableGrid('inventory-table-container', {
      onSelectMedicine: (med) => this.handleSelectMedicine(med),
      onAdjustStock: (med) => this.handleAdjustStock(med),
      onPrintBarcode: (med) => this.handlePrintBarcode(med)
    });

    this.pagination = new InventoryPagination('inventory-pagination-container', {
      onPageChange: (page) => this.handlePageChange(page)
    });

    this.stockAdjustmentModal = new StockAdjustmentModal('dialog-stock-adjustment');
    this.barcodeLabelModal = new BarcodeLabelModal('dialog-barcode-label');
    this.stockMovementsModal = new StockMovementsModal('dialog-stock-movements');

    this.transfersList = new StockTransfersList('inventory-transfers-subview', {
      onOpenCreateModal: () => this.stockTransferModal.open()
    });
    this.stockTransferModal = new StockTransferModal('dialog-stock-transfer-modal');

    this.init();
  }

  init() {
    if (!this.container) return;

    // React to store and global catalog updates
    appStore.subscribe((event) => {
      if ([
        'MEDICINES_LOADED',
        'FILTER_CHANGED',
        'PAGE_CHANGED',
        'MEDICINE_ADDED',
        'MEDICINE_DELETED',
        'VIEW_CHANGED'
      ].includes(event)) {
        this.render();
      }
    });

    window.addEventListener('CATALOG_UPDATED', () => this.render());
    window.addEventListener('OPEN_STOCK_MOVEMENTS_MODAL', (e) => {
      this.handleViewMovements(e.detail?.medicine || null);
    });

    window.addEventListener('OPEN_STOCK_TRANSFER_MODAL', () => {
      this.stockTransferModal.open();
    });

    window.addEventListener('TRANSFERS_UPDATED', () => {
      this.transfersList.loadData();
      this.updateTransfersBadge();
    });

    // Initial render
    this.render();
    this.updateTransfersBadge();
  }

  async updateTransfersBadge() {
    try {
      const stats = await transferService.fetchStats();
      const badge = document.getElementById('inventory-transfers-tab-badge');
      if (badge) {
        badge.textContent = stats.pendingCount || 0;
        badge.style.display = (stats.pendingCount > 0) ? 'inline-block' : 'none';
      }
    } catch {}
  }

  getFilteredList() {
    const q = (appStore.query || '').trim().toLowerCase();
    const status = appStore.statusFilter || 'all';
    const cat = this.selectedCategory || 'ALL';

    return appStore.medicines.filter(m => {
      const matchQuery = !q ||
        (m.name && m.name.toLowerCase().includes(q)) ||
        (m.generic && m.generic.toLowerCase().includes(q)) ||
        (m.category && m.category.toLowerCase().includes(q)) ||
        (m.batch && m.batch.toLowerCase().includes(q)) ||
        (m.barcode && m.barcode.includes(q));

      const matchCat = cat === 'ALL' || m.category === cat;

      let matchStatus = true;
      if (status === 'available') matchStatus = m.stock > 0 && m.status !== 'expired';
      else if (status === 'low') matchStatus = m.stock > 0 && m.stock <= 20;
      else if (status === 'expiring') matchStatus = m.status === 'expiring' || m.status === 'expired';

      return matchQuery && matchCat && matchStatus;
    });
  }

  render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <!-- Inventory & Multi-Warehouse Navigation Subtabs -->
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; border-bottom:1px solid var(--border); padding-bottom:12px; flex-wrap:wrap; gap:10px;">
        <div style="display:flex; gap:8px;">
          <button type="button" class="btn-inv-subtab" data-tab="CATALOG"
            style="padding:8px 18px; border-radius:8px; font-size:13.5px; font-weight:700; border:1px solid ${this.activeTab === 'CATALOG' ? 'var(--primary)' : 'var(--border)'}; background:${this.activeTab === 'CATALOG' ? 'var(--primary)' : 'var(--card-bg, #ffffff)'}; color:${this.activeTab === 'CATALOG' ? '#ffffff' : 'var(--foreground)'}; cursor:pointer; display:inline-flex; align-items:center; gap:6px; transition:all 0.2s ease;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m16.5 9.4-9-5.19M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.29 7 12 12 20.71 7"/><line x1="12" x2="12" y1="22" y2="12"/></svg>
            دليل الأصناف والتشغيلات
          </button>

          <button type="button" class="btn-inv-subtab" data-tab="TRANSFERS"
            style="padding:8px 18px; border-radius:8px; font-size:13.5px; font-weight:700; border:1px solid ${this.activeTab === 'TRANSFERS' ? 'var(--primary)' : 'var(--border)'}; background:${this.activeTab === 'TRANSFERS' ? 'var(--primary)' : 'var(--card-bg, #ffffff)'}; color:${this.activeTab === 'TRANSFERS' ? '#ffffff' : 'var(--foreground)'}; cursor:pointer; display:inline-flex; align-items:center; gap:6px; transition:all 0.2s ease;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m16 3 4 4-4 4M20 7H4m4 14-4-4 4-4m-4 4h16"/></svg>
            أوامر التحويل بين المستودعات
            <span id="inventory-transfers-tab-badge" style="background:#D97706; color:#fff; font-size:11px; font-weight:800; padding:2px 7px; border-radius:10px; margin-right:4px;">0</span>
          </button>
        </div>
      </div>

      <!-- 1. Catalog & Batches Subview -->
      <div id="inventory-catalog-subview" style="${this.activeTab === 'CATALOG' ? 'display:block;' : 'display:none;'}">
        <div id="inventory-filter-bar-container"></div>
        <div id="inventory-table-container"></div>
        <div id="inventory-pagination-container"></div>
      </div>

      <!-- 2. Stock Transfers Subview -->
      <div id="inventory-transfers-subview" style="${this.activeTab === 'TRANSFERS' ? 'display:block;' : 'display:none;'}"></div>
    `;

    // Bind subtab buttons
    this.container.querySelectorAll('.btn-inv-subtab').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        this.switchTab(tab);
      });
    });

    if (this.activeTab === 'CATALOG') {
      const filtered = this.getFilteredList();
      const total = filtered.length;
      const perPage = appStore.perPage || 10;
      const pages = Math.max(1, Math.ceil(total / perPage));
      appStore.page = Math.min(appStore.page || 1, pages);

      const start = (appStore.page - 1) * perPage;
      const pagedRows = filtered.slice(start, start + perPage);

      this.filterBar.render(appStore.query || '', appStore.statusFilter || 'all', appStore.medicines.length);
      this.tableGrid.render(pagedRows);
      this.pagination.render(appStore.page, total, perPage);
    } else {
      this.transfersList.loadData();
    }

    this.updateTransfersBadge();
  }

  switchTab(tab) {
    this.activeTab = tab;
    this.render();
  }

  handleSearch(query) {
    appStore.setSearchQuery(query);
    appStore.page = 1;
    this.render();
  }

  handleCategoryChange(category) {
    this.selectedCategory = category;
    appStore.page = 1;
    this.render();
  }

  handleStatusChange(status) {
    appStore.setStatusFilter(status);
    appStore.page = 1;
    this.render();
  }

  handleAddNew() {
    document.getElementById('dialog-add-medicine')?.classList.remove('hidden');
  }

  handleExportCSV() {
    const count = MedicineService.exportCSV();
    showToast('تم تصدير المخزون', `تم تصدير ${count} صنفاً في ملف CSV معتمد`, 'success');
  }

  handleSelectMedicine(med) {
    if (typeof window.openMedicineDetail === 'function') {
      window.openMedicineDetail(med.id);
    }
  }

  handleAdjustStock(med) {
    this.stockAdjustmentModal.open(med);
  }

  handlePrintBarcode(med) {
    this.barcodeLabelModal.open(med);
  }

  handlePageChange(page) {
    appStore.setPage(page);
    this.render();
  }

  handleViewMovements(medicine = null) {
    this.stockMovementsModal.open(medicine);
  }
}
