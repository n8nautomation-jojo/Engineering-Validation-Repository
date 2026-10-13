/**
 * PharmaTech — Sidebar Navigation Component
 * Controls desktop sidebar collapse, mobile drawer, branch selector & view routing
 */

import { appStore } from '../state/store.js';
import { showToast } from './Toast.js';

export class Sidebar {
  constructor() {
    this.shell = document.getElementById('app-shell');
    this.toggleBtn = document.getElementById('sidebar-toggle-btn');
    this.mobileBtn = document.getElementById('mobile-menu-btn');
    this.backdrop = document.getElementById('sidebar-backdrop');
    this.branchBtn = document.getElementById('branch-select-btn');
    this.navButtons = document.querySelectorAll('.nav-button');

    this.closeMobileBtn = document.getElementById('sidebar-close-mobile-btn');

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

    // Branch Selector
    if (this.branchBtn) {
      this.branchBtn.addEventListener('click', () => {
        showToast('فرع الخرطوم الرئيسي', 'الفرع النشط حالياً · صيدلية النيلين النموذجية', 'info');
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

    this.navButtons.forEach(b => b.classList.remove('active'));
    if (btnEl) btnEl.classList.add('active');

    appStore.setActiveView(view);

    const pageTitle = document.getElementById('page-title-heading');
    const middleGrid = document.getElementById('dashboard-middle-grid');
    const featuredStat = document.getElementById('stat-featured-sales');
    const statsGrid = document.querySelector('.stats-grid');
    const tablePanel = document.getElementById('medicines-table-panel');
    const posView = document.getElementById('pos-terminal-view');
    const salesView = document.getElementById('sales-history-view');
    const sessionsView = document.getElementById('sessions-view');

    if (view === 'dashboard') {
      if (pageTitle) pageTitle.textContent = 'صباح الخير، د. أحمد 👋';
      if (statsGrid) statsGrid.style.display = 'grid';
      if (middleGrid) middleGrid.style.display = 'grid';
      if (featuredStat) featuredStat.style.display = 'block';
      if (tablePanel) tablePanel.style.display = 'block';
      if (posView) posView.style.display = 'none';
      if (salesView) salesView.style.display = 'none';
      if (sessionsView) sessionsView.style.display = 'none';
    } else if (view === 'inventory') {
      if (pageTitle) pageTitle.textContent = 'المخزون والتشغيلات (FEFO)';
      if (statsGrid) statsGrid.style.display = 'grid';
      if (middleGrid) middleGrid.style.display = 'none';
      if (featuredStat) featuredStat.style.display = 'block';
      if (tablePanel) tablePanel.style.display = 'block';
      if (posView) posView.style.display = 'none';
      if (salesView) salesView.style.display = 'none';
      if (sessionsView) sessionsView.style.display = 'none';
      appStore.setStatusFilter('all');
    } else if (view === 'pos') {
      if (pageTitle) pageTitle.textContent = 'نقطة البيع السريعة (POS) · الصرف الفوري';
      if (statsGrid) statsGrid.style.display = 'none';
      if (middleGrid) middleGrid.style.display = 'none';
      if (featuredStat) featuredStat.style.display = 'none';
      if (tablePanel) tablePanel.style.display = 'none';
      if (salesView) salesView.style.display = 'none';
      if (sessionsView) sessionsView.style.display = 'none';
      if (posView) posView.style.display = 'grid';

      showToast('نقطة البيع السريعة (POS)', 'امسح الباركود أو اختر الدواء لصرف فوري بأسبقية FEFO', 'success');
      setTimeout(() => {
        document.getElementById('product-search-input')?.focus();
      }, 100);
    } else if (view === 'sales') {
      if (pageTitle) pageTitle.textContent = 'سجل المبيعات والفواتير المعتمدة';
      if (statsGrid) statsGrid.style.display = 'none';
      if (middleGrid) middleGrid.style.display = 'none';
      if (featuredStat) featuredStat.style.display = 'none';
      if (tablePanel) tablePanel.style.display = 'none';
      if (posView) posView.style.display = 'none';
      if (sessionsView) sessionsView.style.display = 'none';
      if (salesView) salesView.style.display = 'block';

      window.dispatchEvent(new CustomEvent('SALES_UPDATED'));
      showToast('سجل الفواتير والمبيعات', 'تم جلب الفواتير المعتمدة من الباك إند', 'info');
    } else if (view === 'sessions') {
      if (pageTitle) pageTitle.textContent = 'جلسات الخزينة وإدارة الورديات (Cash Sessions)';
      if (statsGrid) statsGrid.style.display = 'none';
      if (middleGrid) middleGrid.style.display = 'none';
      if (featuredStat) featuredStat.style.display = 'none';
      if (tablePanel) tablePanel.style.display = 'none';
      if (posView) posView.style.display = 'none';
      if (salesView) salesView.style.display = 'none';
      if (sessionsView) sessionsView.style.display = 'block';

      window.dispatchEvent(new CustomEvent('SESSION_UPDATED'));
      showToast('جلسات الخزينة', 'تم مزامنة حالة الدرج وحركات النقدية مع الباك إند', 'info');
    } else if (view === 'design-system') {
      showToast('الهوية البصرية ونظام التصميم', 'جميع الرموز والألوان مستخلصة بدقة من الشعار الرسمي', 'success');
    } else {
      showToast(btnEl.querySelector('.nav-text')?.textContent || 'القسم قيد المزامنة', 'جاهز للربط في المرحلة التالية', 'info');
    }
  }
}
