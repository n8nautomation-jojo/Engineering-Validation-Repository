/**
 * PharmaTech — Inventory & Medicines Manager Coordinator
 * Enterprise Component-Based Modular Architecture coordinating:
 * - InventoryFilterBar: Search, Category Pills, Status Segmentation & Quick Actions
 * - InventoryTableGrid: FEFO Priority Badges, Stock Levels, and Row Actions
 * - InventoryPagination: Range Breakdown and Page Controls
 * - StockAdjustmentModal: Physical Audits, Damage, and Stock Corrections
 * - BarcodeLabelModal: 50x30mm Shelf Price Tag & Barcode Preview
 */

import { appStore } from '../state/store.js';
import { MedicineService } from '../services/medicineService.js';
import { InventoryFilterBar } from './inventory/InventoryFilterBar.js';
import { InventoryTableGrid } from './inventory/InventoryTableGrid.js';
import { InventoryPagination } from './inventory/InventoryPagination.js';
import { StockAdjustmentModal } from './inventory/StockAdjustmentModal.js';
import { BarcodeLabelModal } from './inventory/BarcodeLabelModal.js';
import { StockMovementsModal } from './inventory/StockMovementsModal.js';
import { showToast } from './Toast.js';

export class MedicinesTable {
  constructor() {
    this.container = document.getElementById('medicines-table-panel');
    this.selectedCategory = 'ALL';

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

    // Initial render
    this.render();
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

    const filtered = this.getFilteredList();
    const total = filtered.length;
    const perPage = appStore.perPage || 10;
    const pages = Math.max(1, Math.ceil(total / perPage));
    appStore.page = Math.min(appStore.page || 1, pages);

    const start = (appStore.page - 1) * perPage;
    const pagedRows = filtered.slice(start, start + perPage);

    // Render Sub-components
    this.filterBar.render(appStore.query || '', appStore.statusFilter || 'all', appStore.medicines.length);
    this.tableGrid.render(pagedRows);
    this.pagination.render(appStore.page, total, perPage);
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
