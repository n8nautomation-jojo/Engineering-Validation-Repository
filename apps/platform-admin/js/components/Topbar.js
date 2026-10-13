/**
 * [Feature / Domain]: Platform Administration — Topbar Component
 * [Multi-Tenancy Context]: Global Environment Header & Theme Switcher
 * [Security / Entitlement]: Public Telemetry Display & Quick Provisioning Trigger
 */

import { adminStore } from '../state/adminStore.js';
import { showToast } from './Toast.js';

export class Topbar {
  constructor() {
    this.themeBtn = document.getElementById('theme-toggle-btn');
    this.themeIcon = document.getElementById('theme-icon');
    this.quickProvisionBtn = document.getElementById('btn-quick-provision');

    this.init();
  }

  init() {
    this.applyTheme(adminStore.dark);

    if (this.themeBtn) {
      this.themeBtn.addEventListener('click', () => {
        const nextDark = !adminStore.dark;
        adminStore.setTheme(nextDark);
        this.applyTheme(nextDark);
        showToast(
          nextDark ? 'الوضع الليلي الفاخر' : 'الوضع النهاري المريح',
          'تم تبديل مظهر لوحة إدارة المنصة',
          'info'
        );
      });
    }

    if (this.quickProvisionBtn) {
      this.quickProvisionBtn.addEventListener('click', () => {
        adminStore.setActiveTab('provisioning');
      });
    }
  }

  applyTheme(isDark) {
    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');

    if (this.themeIcon) {
      if (isDark) {
        this.themeIcon.innerHTML = `<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2m10-10h-2M4 10H2m15.36 7.36-1.41-1.41M5.64 5.64 4.23 4.23m15.13.01-1.41 1.41M5.64 18.36l-1.41 1.41"/>`;
      } else {
        this.themeIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>`;
      }
    }
  }
}
