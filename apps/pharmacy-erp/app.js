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
import { PurchasingView } from './js/components/PurchasingView.js';
import { ReportsView } from './js/components/ReportsView.js';
import { DesignSystemView } from './js/components/DesignSystemView.js';
import { CustomersView } from './js/components/CustomersView.js';
import { AccountingView } from './js/components/AccountingView.js';
import { BranchIntelligenceView } from './js/components/BranchIntelligenceView.js';
import { SettingsDialog } from './js/components/SettingsDialog.js';
import { HelpDialog } from './js/components/HelpDialog.js';
import { CashMovementDialog } from './js/components/CashMovementDialog.js';
import { CloseSessionDialog } from './js/components/CloseSessionDialog.js';
import { OpenSessionDialog } from './js/components/OpenSessionDialog.js';
import { DashboardStats } from './js/components/DashboardStats.js';
import { SettingsService } from './js/services/settingsService.js';
import { AuthService } from './js/services/authService.js';
import { LoginModal } from './js/components/auth/LoginModal.js';
import { UserMenuModal } from './js/components/auth/UserMenuModal.js';
import { offlineSyncService } from './js/services/offlineSyncService.js';

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
    this.components.purchasing = new PurchasingView();
    this.components.customers = new CustomersView();
    this.components.accounting = new AccountingView();
    this.components.branches = new BranchIntelligenceView();
    this.components.reports = new ReportsView();
    this.components.designSystem = new DesignSystemView();
    this.components.settingsDialog = new SettingsDialog();
    this.components.helpDialog = new HelpDialog();
    this.components.movementDialog = new CashMovementDialog();
    this.components.closeDialog = new CloseSessionDialog();
    this.components.openDialog = new OpenSessionDialog();
    this.components.dashboardStats = new DashboardStats();
    this.components.loginModal = new LoginModal();
    this.components.userMenuModal = new UserMenuModal();

    window.addEventListener('OPEN_CUSTOMER_ADD_MODAL', (e) => {
      if (this.components.customers?.formModal) {
        this.components.customers.formModal.open({ name: e.detail?.name || '' });
      }
    });

    window.addEventListener('ACCOUNTING_VIEW_ACTIVATED', () => {
      this.components.accounting?.loadData();
    });

    window.addEventListener('BRANCHES_VIEW_ACTIVATED', () => {
      this.components.branches?.loadData();
    });

    // Event listeners for global dialog triggers
    window.addEventListener('OPEN_SETTINGS_DIALOG', () => {
      this.components.settingsDialog.open();
    });

    window.addEventListener('OPEN_HELP_DIALOG', () => {
      this.components.helpDialog.open();
    });

    window.addEventListener('OPEN_USER_MENU_DIALOG', () => {
      this.components.userMenuModal.open();
    });

    const updateAuthUI = (user) => {
      if (!user) return;

      const userNameEl = document.querySelector('#user-profile-btn strong') || document.querySelector('#user-profile-btn .user-name');
      if (userNameEl) userNameEl.textContent = user.fullName || user.username;

      const userRoleEl = document.querySelector('#user-profile-btn small') || document.querySelector('#user-profile-btn .user-role');
      if (userRoleEl) userRoleEl.textContent = user.roleNameAr || (user.role === 'CASHIER' ? 'كاشير نقطة بيع' : 'صيدلي مسؤول');

      const userAvatarEl = document.querySelector('#user-profile-btn .avatar');
      if (userAvatarEl) {
        userAvatarEl.textContent = (user.fullName || user.username).slice(0, 2);
        if (user.role === 'CASHIER') {
          userAvatarEl.style.background = 'linear-gradient(135deg, #10b981, #059669)';
          userAvatarEl.style.boxShadow = '0 2px 8px rgba(16, 185, 129, 0.3)';
        } else {
          userAvatarEl.style.background = 'linear-gradient(135deg, var(--primary), #0070f3)';
          userAvatarEl.style.boxShadow = '0 2px 8px rgba(0, 82, 204, 0.3)';
        }
      }

      // Restrict Manager actions vs Cashier actions
      const isManager = AuthService.isManager();
      const addMedicineBtn = document.getElementById('btn-open-add-dialog');
      const exportCsvBtn = document.getElementById('btn-export-csv');

      if (addMedicineBtn) {
        addMedicineBtn.style.display = isManager ? 'inline-flex' : 'none';
      }
      if (exportCsvBtn) {
        exportCsvBtn.style.display = isManager ? 'inline-flex' : 'none';
      }

      // Apply role permissions to sidebar navigation
      if (this.components?.sidebar) {
        this.components.sidebar.applyRolePermissions(user);
      }

      // If user is Cashier, enforce POS default workstation and cashier branding
      if (user.role === 'CASHIER') {
        const targetBtn = document.querySelector('.nav-button[data-view="pos"]');
        this.components?.sidebar?.switchView('pos', targetBtn);

        // Zero-Training Ergonomics: Auto-enable Fullscreen Kiosk Mode for Cashiers
        document.body.classList.add('pos-kiosk-mode');
        if (this.components?.pos?.headerBanner) {
          this.components.pos.headerBanner.isFocusMode = true;
        }

        const metaEl = document.getElementById('page-heading-pharmacy-meta');
        if (metaEl) {
          const dateStr = new Date().toLocaleDateString('ar-SD', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
          metaEl.textContent = `${dateStr} — كاشير: ${user.fullName} (${user.branchName || 'فرع الخرطوم الرئيسي'})`;
        }
      } else {
        document.body.classList.remove('pos-kiosk-mode');
        if (this.components?.pos?.headerBanner) {
          this.components.pos.headerBanner.isFocusMode = false;
        }
        const pageTitle = document.getElementById('page-title-heading');
        if (pageTitle && appStore.activeView === 'dashboard') {
          pageTitle.textContent = `صباح الخير، ${user.fullName} 👋`;
        }
      }
    };

    window.addEventListener('AUTH_STATE_CHANGED', (e) => {
      if (e.detail?.isAuthenticated && e.detail?.user) {
        updateAuthUI(e.detail.user);
      } else {
        this.components.loginModal.open();
      }
    });

    // Check authentication state on startup
    if (!AuthService.isAuthenticated()) {
      setTimeout(() => {
        this.components.loginModal.open();
      }, 100);
    } else {
      updateAuthUI(AuthService.getCurrentUser());
      AuthService.verifySession().catch(() => {});
    }

    const applySettingsToUI = (settings) => {
      if (!settings) return;
      if (settings.branchName) {
        const branchEl = document.getElementById('current-branch-name');
        if (branchEl) branchEl.textContent = settings.branchName;
      }
      if (settings.pharmacyName) {
        const pharmacyEl = document.getElementById('current-pharmacy-name');
        if (pharmacyEl) pharmacyEl.textContent = settings.pharmacyName;

        const metaEl = document.getElementById('page-heading-pharmacy-meta');
        if (metaEl && !AuthService.isCashier()) {
          const dateStr = new Date().toLocaleDateString('ar-SD', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
          metaEl.textContent = `${dateStr} — ${settings.pharmacyName}`;
        }

        document.title = `${settings.pharmacyName} — PharmaTech`;
      }
    };

    // Apply cached settings immediately on boot
    applySettingsToUI(SettingsService.getCachedSettings());

    // Listen for live updates across components
    window.addEventListener('SETTINGS_UPDATED', (e) => {
      applySettingsToUI(e.detail);
    });

    // Fetch authoritative live product catalog and settings from Core Backend API
    try {
      const [_, settings] = await Promise.all([
        MedicineService.fetchFromBackend(),
        SettingsService.fetchSettings()
      ]);
      applySettingsToUI(settings);
    } catch (err) {
      console.warn('Initial data fetch deferred:', err);
    }

    // Support direct deep links with RBAC guards: /pharmacy-erp/?view=pos | ?view=sales | ?view=sessions | ?view=purchasing | ?view=reports
    const urlParams = new URLSearchParams(window.location.search);
    const viewParam = urlParams.get('view');
    if (viewParam) {
      if (AuthService.canAccessView(viewParam)) {
        const targetNavBtn = document.querySelector(`.nav-button[data-view="${viewParam}"]`);
        if (targetNavBtn) targetNavBtn.click();
      } else {
        showToast('غير مصرح لك بالوصول', `لا تملك صلاحية الوصول إلى شاشة (${viewParam}) بحسابك الحالي`, 'warning');
        const defaultView = AuthService.getDefaultView();
        const fallbackBtn = document.querySelector(`.nav-button[data-view="${defaultView}"]`);
        if (fallbackBtn) fallbackBtn.click();
      }
    }

    // Initial operational feedback
    setTimeout(() => {
      showToast('أهلاً بك في فارماتك', 'النظام متصل وقاعدة البيانات جاهزة للعمل', 'success');
      
      // Auto-check pending offline outbox
      const pendingCount = offlineSyncService.getPendingCount();
      if (pendingCount > 0) {
        setTimeout(() => {
          showToast(
            'فواتير محفوظة بدون إنترنت',
            `توجد ${pendingCount} فواتير محفوظة على جهازك بانتظار الإرسال للسحابة`,
            'warning'
          );
        }, 1200);
      }
    }, 1000);

    console.log('⚡ PharmaTech Modular ERP Initialized & Connected to Official Backend API.');
  }
}

// Bootstrap on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new PharmaTechApp();
  app.bootstrap();
});
