/**
 * PharmaTech — Open Cash Session Dialog Component (Ergonomic UX 2.0)
 * 1-Tap Quick Float Presets, Auto-Cashier Identity & Zero-Training Shift Opening
 */

import { cashSessionService } from '../services/cashSessionService.js';
import { AuthService } from '../services/authService.js';
import { showToast } from './Toast.js';

export class OpenSessionDialog {
  constructor() {
    this.dialog = document.getElementById('dialog-open-session');
    this.closeBtn = document.getElementById('btn-dismiss-open-dialog');
    this.form = document.getElementById('open-session-dialog-form');
    this.floatInput = document.getElementById('open-session-float-input');
    this.cashierLabel = document.getElementById('open-session-cashier-label');
    this.cashierInput = document.getElementById('open-session-cashier-input');

    this.init();
  }

  init() {
    this.closeBtn?.addEventListener('click', () => this.close());

    // Quick float presets
    this.dialog?.querySelectorAll('.btn-quick-float').forEach(btn => {
      btn.addEventListener('click', () => {
        const amount = btn.dataset.amount || '0';
        if (this.floatInput) {
          this.floatInput.value = amount;
        }
        this.dialog.querySelectorAll('.btn-quick-float').forEach(b => {
          const isActive = (b === btn);
          b.style.borderColor = isActive ? 'var(--primary)' : 'var(--border)';
          b.style.background = isActive ? 'var(--primary)' : 'var(--card)';
          b.style.color = isActive ? '#fff' : 'inherit';
        });
      });
    });

    this.form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(this.form);
      const openingFloat = formData.get('openingFloat') || '0';
      const cashierName = formData.get('cashierName') || 'د. أحمد الطاهر';
      const note = formData.get('note') || '';

      try {
        await cashSessionService.openSession(openingFloat, cashierName, note);
        showToast('تم افتتاح الوردية بنجاح', `رصيد افتتاحي: ${Number(openingFloat).toLocaleString()} ج.س · كاشير: ${cashierName}`, 'success');
        this.close();
      } catch (err) {
        showToast('خطأ في افتتاح الوردية', err.message, 'danger');
      }
    });

    // Listen for custom trigger
    window.addEventListener('OPEN_OPEN_SESSION_DIALOG', () => this.open());
  }

  open() {
    const user = AuthService.getCurrentUser();
    const cashierName = user?.fullName || 'د. أحمد الطاهر';
    if (this.cashierLabel) this.cashierLabel.textContent = cashierName;
    if (this.cashierInput) this.cashierInput.value = cashierName;

    if (this.floatInput) this.floatInput.value = '50000';

    // Highlight 50k preset
    this.dialog?.querySelectorAll('.btn-quick-float').forEach(b => {
      const isDefault = (b.dataset.amount === '50000');
      b.style.borderColor = isDefault ? 'var(--primary)' : 'var(--border)';
      b.style.background = isDefault ? 'var(--primary)' : 'var(--card)';
      b.style.color = isDefault ? '#fff' : 'inherit';
    });

    this.dialog?.classList.remove('hidden');

    setTimeout(() => {
      this.floatInput?.focus();
      this.floatInput?.select();
    }, 100);
  }

  close() {
    this.dialog?.classList.add('hidden');
  }
}
