/**
 * PharmaTech — Topbar & Global Controls Component
 * Theme toggling (Dark/Day mode), Global Search & Keyboard Shortcuts
 */

import { appStore } from '../state/store.js';
import { MedicineService } from '../services/medicineService.js';
import { showToast } from './Toast.js';

export class Topbar {
  constructor() {
    this.themeBtn = document.getElementById('theme-toggle-btn');
    this.moonIcon = document.getElementById('theme-moon-icon');
    this.searchInput = document.getElementById('global-search-input');
    this.exportBtn = document.getElementById('btn-export-csv');

    this.init();
  }

  init() {
    this.applyTheme(appStore.dark);

    // Theme Toggle
    if (this.themeBtn) {
      this.themeBtn.addEventListener('click', () => {
        const nextDark = !appStore.dark;
        appStore.setTheme(nextDark);
        this.applyTheme(nextDark);
        showToast(
          nextDark ? 'الوضع الليلي الفاخر' : 'الوضع النهاري المريح',
          'تم تبديل مظهر النظام بما يتوافق مع راحة العين في الصيدلية',
          'info'
        );
      });
    }

    // Global Search
    if (this.searchInput) {
      this.searchInput.addEventListener('input', (e) => {
        appStore.setSearchQuery(e.target.value);
      });
    }

    // Shortcuts
    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + K: Focus Search
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        this.searchInput?.focus();
        this.searchInput?.select();
      }

      // F2: Fast POS
      if (e.key === 'F2') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('OPEN_RECEIPT_MODAL', { detail: 'INV-2026-0842' }));
      }

      // ESC: Close all dialogs
      if (e.key === 'Escape') {
        document.querySelectorAll('.dialog-backdrop').forEach(d => d.classList.add('hidden'));
      }
    });

    // CSV Export
    if (this.exportBtn) {
      this.exportBtn.addEventListener('click', () => {
        const count = MedicineService.exportCSV();
        showToast('تم تصدير المخزون', `${count} صنفاً في ملف CSV معتمد`, 'success');
      });
    }
  }

  applyTheme(isDark) {
    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');

    if (this.moonIcon) {
      if (isDark) {
        this.moonIcon.innerHTML = `<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2m10-10h-2M4 10H2m15.36 7.36-1.41-1.41M5.64 5.64 4.23 4.23m15.13.01-1.41 1.41M5.64 18.36l-1.41 1.41"/>`;
      } else {
        this.moonIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>`;
      }
    }
  }
}
