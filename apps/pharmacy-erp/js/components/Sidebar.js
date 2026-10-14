/**
 * PharmaTech — Sidebar Navigation Component
 * Controls desktop sidebar collapse, mobile drawer, branch selector & view routing
 */

import { appStore } from '../state/store.js';
import { showToast } from './Toast.js';
import { AuthService } from '../services/authService.js';

export class Sidebar {
  constructor() {
    this.shell = document.getElementById('app-shell');
    this.toggleBtn = document.getElementById('sidebar-toggle-btn');
    this.mobileBtn = document.getElementById('mobile-menu-btn');
    this.backdrop = document.getElementById('sidebar-backdrop');
    this.branchBtn = document.getElementById('branch-select-btn');
    this.navButtons = document.querySelectorAll('.nav-button');

    this.closeMobileBtn = document.getElementById('sidebar-close-mobile-btn');
    this.settingsBtn = document.getElementById('btn-sidebar-settings');
    this.helpBtn = document.getElementById('btn-sidebar-help');

    this.init();
  }

  init() {
    // Desktop Collapse
    if (this.toggleBtn && this.shell) {
      this.toggleBtn.addEventListener('click', () => {
        appStore.collapsed = !appStore.collapsed;
        this.shell.classList.toggle('is-collapsed', appStore.collapsed);
      });
    }

    // Mobile Drawer Open
    if (this.mobileBtn && this.backdrop && this.shell) {
      this.mobileBtn.addEventListener('click', () => {
        this.openMobile();
      });

      this.backdrop.addEventListener('click', () => {
        this.closeMobile();
      });
    }

    // Mobile Drawer Close Button
    if (this.closeMobileBtn) {
      this.closeMobileBtn.addEventListener('click', () => {
        this.closeMobile();
      });
    }

    // Escape Key to Dismiss Mobile Drawer
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && appStore.mobile) {
        this.closeMobile();
      }
    });

    // Branch Selector Card
    if (this.branchBtn) {
      this.branchBtn.addEventListener('click', () => {
        if (!AuthService.isManager()) {
          const activeBranch = document.getElementById('current-branch-name')?.textContent || 'الفرع النشط';
          const user = AuthService.getCurrentUser();
          showToast('الفرع النشط', `${activeBranch} · حسابك الحالي: ${user?.fullName || 'كاشير'} (${user?.roleNameAr || 'بيع سريع'})`, 'info');
          return;
        }
        window.dispatchEvent(new CustomEvent('OPEN_SETTINGS_DIALOG'));
        const activeBranch = document.getElementById('current-branch-name')?.textContent || 'الفرع النشط';
        showToast(`${activeBranch} (نشط)`, 'تم فتح إعدادات الصيدلية لمراجعة بيانات الفرع أو السجل الضريبي', 'info');
      });
    }

    // Settings Button in Sidebar Bottom
    if (this.settingsBtn) {
      this.settingsBtn.addEventListener('click', () => {
        if (!AuthService.isManager()) {
          showToast('وصول مقيد (RBAC)', 'إعدادات المنظومة وبيانات الفرع والضرائب مخصصة لمدير الصيدلية فقط', 'warning');
          return;
        }
        this.closeMobile();
        window.dispatchEvent(new CustomEvent('OPEN_SETTINGS_DIALOG'));
      });
    }

    // Help Button in Sidebar Bottom
    if (this.helpBtn) {
      this.helpBtn.addEventListener('click', () => {
        this.closeMobile();
        window.dispatchEvent(new CustomEvent('OPEN_HELP_DIALOG'));
      });
    }

    // View Navigation
    this.navButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const view = btn.dataset.view;
        if (!view) return;
        this.switchView(view, btn);
      });
    });
  }

  /**
   * Dynamically filters navigation items, action buttons, and active workspace based on user role
   */
  applyRolePermissions(user) {
    const allowedViews = AuthService.getAllowedViews();

    // Filter Navigation buttons
    this.navButtons.forEach(btn => {
      const view = btn.dataset.view;
      if (!view) return;
      if (allowedViews.includes(view)) {
        btn.style.display = '';
        btn.removeAttribute('aria-hidden');
      } else {
        btn.style.display = 'none';
        btn.setAttribute('aria-hidden', 'true');
        btn.classList.remove('active');
      }
    });

    // Hide or show Settings button in sidebar bottom
    if (this.settingsBtn) {
      this.settingsBtn.style.display = AuthService.isManager() ? '' : 'none';
    }

    // If active view is disallowed for the current role, immediately route to default view
    const currentView = appStore.activeView;
    if (!allowedViews.includes(currentView)) {
      const defaultView = AuthService.getDefaultView();
      const targetBtn = document.querySelector(`.nav-button[data-view="${defaultView}"]`);
      this.switchView(defaultView, targetBtn);
    }
  }

  openMobile() {
    appStore.mobile = true;
    this.shell?.classList.add('mobile-open');
    document.body.style.overflow = 'hidden';
  }

  closeMobile() {
    appStore.mobile = false;
    this.shell?.classList.remove('mobile-open');
    document.body.style.overflow = '';
  }

  switchView(view, btnEl) {
    this.closeMobile();

    // Enforce Role-Based Access Control (RBAC Guard)
    if (!AuthService.canAccessView(view)) {
      showToast('صلاحية مقيدة (RBAC)', `قسم (${view}) مخصص لإدارة الصيدلية فقط وفقاً لسياسة الأمان والتحكم بالصلاحيات`, 'warning');
      const defaultView = AuthService.getDefaultView();
      const defaultBtn = document.querySelector(`.nav-button[data-view="${defaultView}"]`);
      if (defaultView !== view) {
        this.switchView(defaultView, defaultBtn);
      }
      return;
    }

    this.navButtons.forEach(b => b.classList.remove('active'));
    if (btnEl) {
      btnEl.classList.add('active');
    } else {
      const targetBtn = document.querySelector(`.nav-button[data-view="${view}"]`);
      if (targetBtn) targetBtn.classList.add('active');
    }

    appStore.setActiveView(view);

    const pageTitle = document.getElementById('page-title-heading');
    const middleGrid = document.getElementById('dashboard-middle-grid');
    const featuredStat = document.getElementById('stat-featured-sales');
    const statsGrid = document.querySelector('.stats-grid');
    const tablePanel = document.getElementById('medicines-table-panel');
    const posView = document.getElementById('pos-terminal-view');
    const salesView = document.getElementById('sales-history-view');
    const sessionsView = document.getElementById('sessions-view');
    const purchasingView = document.getElementById('purchasing-view');
    const reportsView = document.getElementById('reports-view');
    const designSystemView = document.getElementById('design-system-view');

    // Helper to hide all views
    const hideAll = () => {
      if (statsGrid) statsGrid.style.display = 'none';
      if (middleGrid) middleGrid.style.display = 'none';
      if (featuredStat) featuredStat.style.display = 'none';
      if (tablePanel) tablePanel.style.display = 'none';
      if (posView) posView.style.display = 'none';
      if (salesView) salesView.style.display = 'none';
      if (sessionsView) sessionsView.style.display = 'none';
      if (purchasingView) purchasingView.style.display = 'none';
      if (reportsView) reportsView.style.display = 'none';
      if (designSystemView) designSystemView.style.display = 'none';
    };

    hideAll();

    if (view === 'dashboard') {
      if (pageTitle) pageTitle.textContent = 'صباح الخير، د. أحمد 👋';
      if (statsGrid) statsGrid.style.display = 'grid';
      if (middleGrid) middleGrid.style.display = 'grid';
      if (featuredStat) featuredStat.style.display = 'block';
      if (tablePanel) tablePanel.style.display = 'block';
    } else if (view === 'inventory') {
      if (pageTitle) pageTitle.textContent = 'المخزون والتشغيلات (FEFO)';
      if (statsGrid) statsGrid.style.display = 'grid';
      if (featuredStat) featuredStat.style.display = 'block';
      if (tablePanel) tablePanel.style.display = 'block';
      appStore.setStatusFilter('all');
    } else if (view === 'pos') {
      if (pageTitle) pageTitle.textContent = 'نقطة البيع السريعة (POS) · الصرف الفوري';
      if (posView) posView.style.display = 'grid';

      showToast('نقطة البيع السريعة (POS)', 'امسح الباركود أو اختر الدواء لصرف فوري بأسبقية FEFO', 'success');
      setTimeout(() => {
        document.getElementById('product-search-input')?.focus();
      }, 100);
    } else if (view === 'sales') {
      if (pageTitle) pageTitle.textContent = 'سجل المبيعات والفواتير المعتمدة';
      if (salesView) salesView.style.display = 'block';

      window.dispatchEvent(new CustomEvent('SALES_UPDATED'));
      showToast('سجل الفواتير والمبيعات', 'تم جلب الفواتير المعتمدة من الباك إند', 'info');
    } else if (view === 'sessions') {
      if (pageTitle) pageTitle.textContent = 'جلسات الخزينة وإدارة الورديات (Cash Sessions)';
      if (sessionsView) sessionsView.style.display = 'block';

      window.dispatchEvent(new CustomEvent('SESSION_UPDATED'));
      showToast('جلسات الخزينة', 'تم مزامنة حالة الدرج وحركات النقدية مع الباك إند', 'info');
    } else if (view === 'purchasing') {
      if (pageTitle) pageTitle.textContent = 'المشتريات وسلاسل الإمداد والتوريد (Supply Chain)';
      if (purchasingView) purchasingView.style.display = 'block';

      window.dispatchEvent(new CustomEvent('PURCHASING_UPDATED'));
      showToast('المشتريات والتوريد', 'تم استعراض أوامر الشراء ودليل الموردين المعتمدين', 'info');
    } else if (view === 'reports') {
      if (pageTitle) pageTitle.textContent = 'التقارير المالية والتحليلات التشغيلية';
      if (reportsView) reportsView.style.display = 'block';

      window.dispatchEvent(new CustomEvent('SALES_UPDATED'));
      showToast('التقارير المالية والتحليلية', 'تم استخراج مؤشرات الإيرادات وتسويات بنكك', 'info');
    } else if (view === 'design-system') {
      if (pageTitle) pageTitle.textContent = 'دليل الهوية البصرية ونظام المكونات';
      if (designSystemView) designSystemView.style.display = 'block';

      showToast('الهوية البصرية ونظام التصميم', 'جميع الرموز والألوان مستخلصة بدقة من الشعار الرسمي', 'success');
    } else {
      showToast(btnEl.querySelector('.nav-text')?.textContent || 'القسم قيد التحديث', 'تم تفعيل القسم وربطه بالمنظومة', 'info');
    }
  }
}
