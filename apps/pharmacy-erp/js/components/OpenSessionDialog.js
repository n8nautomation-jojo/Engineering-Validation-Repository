/**
 * PharmaTech — Open Cash Session Dialog Component
 * Handles opening a new cashier shift with starting float (الرصيد الافتتاحي)
 */

import { cashSessionService } from '../services/cashSessionService.js';
import { showToast } from './Toast.js';

export class OpenSessionDialog {
  constructor() {
    this.dialog = document.getElementById('dialog-open-session');
    this.closeBtn = document.getElementById('btn-dismiss-open-dialog');
    this.form = document.getElementById('open-session-dialog-form');

    this.init();
  }

  init() {
    this.closeBtn?.addEventListener('click', () => this.close());

    this.form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(this.form);
      const openingFloat = formData.get('openingFloat');
      const cashierName = formData.get('cashierName');
      const note = formData.get('note');

      try {
        await cashSessionService.openSession(openingFloat, cashierName, note);
        showToast('تم فتح الوردية بنجاح', `رصيد افتتاحي: ${Number(openingFloat).toLocaleString()} ج.س · كاشير: ${cashierName}`, 'success');
        this.close();
      } catch (err) {
        showToast('خطأ في فتح الوردية', err.message, 'danger');
      }
    });

    // Listen for custom trigger
    window.addEventListener('OPEN_OPEN_SESSION_DIALOG', () => this.open());
  }

  open() {
    if (this.form) this.form.reset();
    this.dialog?.classList.remove('hidden');
  }

  close() {
    this.dialog?.classList.add('hidden');
  }
}
