/**
 * PharmaTech — Pharmacy Settings Dialog Coordinator Component
 * Orchestrates modular sub-components:
 * PharmacyIdentityForm, ReceiptConfigForm, and OfflinePolicyForm
 */

import { SettingsService } from '../services/settingsService.js';
import { PharmacyIdentityForm } from './settings/PharmacyIdentityForm.js';
import { ReceiptConfigForm } from './settings/ReceiptConfigForm.js';
import { OfflinePolicyForm } from './settings/OfflinePolicyForm.js';
import { showToast } from './Toast.js';
import { AuthService } from '../services/authService.js';

export class SettingsDialog {
  constructor() {
    this.dialog = document.getElementById('dialog-settings');
    this.closeBtn = document.getElementById('btn-close-settings-dialog');
    this.cancelBtn = document.getElementById('btn-cancel-settings-dialog');
    this.form = document.getElementById('settings-dialog-form');

    this.activeTab = 'identity'; // 'identity' | 'receipt' | 'offline'
    this.settings = null;

    // Sub-components
    this.identityForm = null;
    this.receiptForm = null;
    this.offlineForm = null;

    this.init();
  }

  init() {
    if (!this.dialog) return;

    this.closeBtn?.addEventListener('click', () => this.close());
    this.cancelBtn?.addEventListener('click', () => this.close());

    this.dialog.addEventListener('click', (e) => {
      if (e.target === this.dialog) this.close();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !this.dialog.classList.contains('hidden')) {
        this.close();
      }
    });

    this.attachTabEvents();

    this.form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleSubmit();
    });
  }

  async open() {
    if (!AuthService.isManager()) {
      showToast('وصول مقيد (RBAC)', 'إعدادات المنظومة وبيانات الفرع مخصصة لمدير الصيدلية فقط', 'warning');
      return;
    }

    try {
      this.settings = await SettingsService.fetchSettings();
      this.render();
      this.dialog?.classList.remove('hidden');
    } catch (err) {
      console.error('Failed to open settings:', err);
      showToast('خطأ', 'تعذر تحميل الإعدادات الحالية', 'error');
    }
  }

  close() {
    this.dialog?.classList.add('hidden');
  }

  render() {
    if (!this.dialog) return;

    // Instantiate and render modular sub-components
    this.identityForm = new PharmacyIdentityForm('settings-identity-container');
    this.identityForm.render(this.settings);

    this.receiptForm = new ReceiptConfigForm('settings-receipt-container');
    this.receiptForm.render(this.settings);

    this.offlineForm = new OfflinePolicyForm('settings-offline-container');
    this.offlineForm.render(this.settings);

    this.switchTab(this.activeTab);
  }

  attachTabEvents() {
    const tabBtns = this.dialog.querySelectorAll('.settings-tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const tab = btn.dataset.tab;
        this.switchTab(tab);
      });
    });
  }

  switchTab(tab) {
    this.activeTab = tab;
    const tabBtns = this.dialog.querySelectorAll('.settings-tab-btn');
    tabBtns.forEach(b => {
      b.dataset.active = (b.dataset.tab === tab).toString();
    });

    const panels = {
      identity: document.getElementById('settings-identity-container'),
      receipt: document.getElementById('settings-receipt-container'),
      offline: document.getElementById('settings-offline-container')
    };

    Object.keys(panels).forEach(key => {
      if (panels[key]) {
        panels[key].style.display = key === tab ? 'block' : 'none';
      }
    });
  }

  async handleSubmit() {
    if (!this.form) return;

    const submitBtn = this.form.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'جاري الحفظ والتحقق...';
    }

    try {
      const formData = new FormData(this.form);

      const identityData = this.identityForm?.collectData(formData) || {};
      const receiptData = this.receiptForm?.collectData(formData) || {};
      const offlineData = this.offlineForm?.collectData(formData) || {};

      // Client-side required field validation
      if (!identityData.pharmacyName) {
        this.switchTab('identity');
        this.form.querySelector('input[name="pharmacyName"]')?.focus();
        showToast('تنبيه التحقق', 'يرجى كتابة اسم الصيدلية الرسمي بالعربية', 'warning');
        return;
      }

      if (!identityData.branchName) {
        this.switchTab('identity');
        this.form.querySelector('input[name="branchName"]')?.focus();
        showToast('تنبيه التحقق', 'يرجى كتابة اسم الفرع النشط', 'warning');
        return;
      }

      const updates = {
        ...this.settings,
        ...identityData,
        ...receiptData,
        ...offlineData
      };

      const saved = await SettingsService.saveSettings(updates);
      this.settings = saved;

      // Real-time DOM updates across open application
      this.updateAppDOM(saved);

      this.close();
    } catch (err) {
      console.error('Settings submit error:', err);
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="m5 12 5 5L20 7"/></svg>
          حفظ إعدادات الصيدلية
        `;
      }
    }
  }

  updateAppDOM(settings) {
    if (!settings) return;

    if (settings.branchName) {
      const currentBranchEl = document.getElementById('current-branch-name');
      if (currentBranchEl) currentBranchEl.textContent = settings.branchName;
    }

    if (settings.pharmacyName) {
      const currentPharmacyEl = document.getElementById('current-pharmacy-name');
      if (currentPharmacyEl) currentPharmacyEl.textContent = settings.pharmacyName;

      const metaEl = document.getElementById('page-heading-pharmacy-meta');
      if (metaEl) {
        const dateStr = new Date().toLocaleDateString('ar-SD', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        metaEl.textContent = `${dateStr} — ${settings.pharmacyName}`;
      }

      document.title = `${settings.pharmacyName} — PharmaTech`;
    }
  }
}

