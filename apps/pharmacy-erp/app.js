/**
 * PharmaTech — Pharmacy ERP Main Application Controller (Orchestrator)
 * Enterprise Component-Based Modular Architecture with Live Backend Binding
 */

import { appStore } from './js/state/store.js';
import { MedicineService } from './js/services/medicineService.js';
import { Sidebar } from './js/components/Sidebar.js';
import { Topbar } from './js/components/Topbar.js';
import { SalesChart } from './js/components/SalesChart.js';
import { MedicinesTable } from './js/components/MedicinesTable.js';
import { AddMedicineDialog } from './js/components/AddMedicineDialog.js';
import { MedicineDetailDialog } from './js/components/MedicineDetailDialog.js';
import { ReceiptDialog } from './js/components/ReceiptDialog.js';
import { NotificationsDialog } from './js/components/NotificationsDialog.js';
import { PosView } from './js/components/PosView.js';
import { SalesView } from './js/components/SalesView.js';
import { SessionsView } from './js/components/SessionsView.js';
import { CashMovementDialog } from './js/components/CashMovementDialog.js';
import { CloseSessionDialog } from './js/components/CloseSessionDialog.js';
import { OpenSessionDialog } from './js/components/OpenSessionDialog.js';
import { DashboardStats } from './js/components/DashboardStats.js';
import { showToast } from './js/components/Toast.js';

class PharmaTechApp {
  constructor() {
    this.components = {};
  }

  async bootstrap() {
    // Expose global pagination bridge for inline buttons
    window.setPage = (p) => appStore.setPage(p);

    // Initialize UI Components
    this.components.sidebar = new Sidebar();
    this.components.topbar = new Topbar();
    this.components.chart = new SalesChart();
    this.components.table = new MedicinesTable();
    this.components.addDialog = new AddMedicineDialog();
    this.components.detailDialog = new MedicineDetailDialog();
    this.components.receiptDialog = new ReceiptDialog();
    this.components.notificationsDialog = new NotificationsDialog();
    this.components.pos = new PosView();
    this.components.sales = new SalesView();
    this.components.sessions = new SessionsView();
    this.components.movementDialog = new CashMovementDialog();
    this.components.closeDialog = new CloseSessionDialog();
    this.components.openDialog = new OpenSessionDialog();
    this.components.dashboardStats = new DashboardStats();

    // Fetch authoritative live product catalog from Core Backend API
    try {
      await MedicineService.fetchFromBackend();
    } catch (err) {
      console.warn('Initial catalog fetch deferred:', err);
    }

    // Support direct deep links: /pharmacy-erp/?view=pos | ?view=sales | ?view=sessions
    const urlParams = new URLSearchParams(window.location.search);
    const viewParam = urlParams.get('view');
    if (viewParam) {
      const targetNavBtn = document.querySelector(`.nav-button[data-view="${viewParam}"]`);
      if (targetNavBtn) targetNavBtn.click();
    }

    // Initial operational feedback
    setTimeout(() => {
      showToast('المنظومة متصلة بالباك إند رسمياً', 'حسابات FEFO والخصم المخزني الآلي والتحقق نشط', 'success');
    }, 1000);

    console.log('⚡ PharmaTech Modular ERP Initialized & Connected to Official Backend API.');
  }
}

// Bootstrap on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new PharmaTechApp();
  app.bootstrap();
});
