/**
 * PharmaTech — Help & Support / Zero-Training Guided Onboarding Component
 * Provides instant walk-up operational guidance, visual tabs, and ergonomic shortcut cheatsheets
 */

import { showToast } from './Toast.js';

export class HelpDialog {
  constructor() {
    this.dialog = document.getElementById('dialog-help');
    this.closeBtn = document.getElementById('btn-close-help-dialog');
    this.gotItBtn = document.getElementById('btn-help-got-it');
    this.goPosBtn = document.getElementById('btn-help-go-pos');
    this.tabButtons = this.dialog?.querySelectorAll('.help-tab-btn');
    this.tabPanes = this.dialog?.querySelectorAll('.help-tab-pane');

    this.init();
  }

  init() {
    if (!this.dialog) return;

    this.closeBtn?.addEventListener('click', () => this.close());
    this.dialog.addEventListener('click', (e) => {
      if (e.target === this.dialog) this.close();
    });

    // Got it button
    this.gotItBtn?.addEventListener('click', () => {
      localStorage.setItem('pharmatech_onboarding_seen', 'true');
      this.close();
      showToast('مرحباً بك في فارماتك', 'يمكنك فتح هذا الدليل مجدداً في أي وقت بالضغط على F1 أو زر المساعدة', 'success');
    });

    // Go to POS button
    this.goPosBtn?.addEventListener('click', () => {
      this.close();
      const posNavBtn = document.querySelector('.nav-button[data-view="pos"]');
      if (posNavBtn) posNavBtn.click();
      setTimeout(() => {
        const barcodeInput = document.getElementById('product-search-input');
        if (barcodeInput) {
          barcodeInput.focus();
          barcodeInput.select();
        }
      }, 100);
    });

    // Tab Navigation
    this.tabButtons?.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.dataset.tab;
        this.switchTab(targetTab);
      });
    });

    // Keyboard Dismiss
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !this.dialog.classList.contains('hidden')) {
        this.close();
      }
    });

    // Global Event Listener
    window.addEventListener('OPEN_HELP_DIALOG', () => this.open());

    // Auto-show for first-time users (Walk-up & Use principle)
    if (!localStorage.getItem('pharmatech_onboarding_seen')) {
      setTimeout(() => {
        this.open();
      }, 800);
    }
  }

  switchTab(tabId) {
    this.tabButtons?.forEach(b => {
      const isActive = (b.dataset.tab === tabId);
      b.classList.toggle('active', isActive);
      b.style.color = isActive ? 'var(--primary)' : 'var(--muted-foreground)';
      b.style.borderBottomColor = isActive ? 'var(--primary)' : 'transparent';
      b.style.fontWeight = isActive ? '700' : '600';
    });

    this.tabPanes?.forEach(pane => {
      pane.style.display = (pane.id === `help-pane-${tabId}`) ? 'block' : 'none';
    });
  }

  open() {
    this.switchTab('pos');
    this.dialog?.classList.remove('hidden');
  }

  close() {
    this.dialog?.classList.add('hidden');
  }
}
