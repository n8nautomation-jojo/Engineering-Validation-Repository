/**
 * PharmaTech — Cash Movement Dialog Component
 * Handles Cash In (إيداع) and Cash Out (سحب مصروفات) with reason tracking
 */

import { cashSessionService } from '../services/cashSessionService.js';
import { showToast } from './Toast.js';

export class CashMovementDialog {
  constructor() {
    this.dialog = document.getElementById('dialog-cash-movement');
    this.closeBtn = document.getElementById('btn-close-movement-dialog');
    this.form = document.getElementById('cash-movement-dialog-form');
    this.titleEl = document.getElementById('movement-dialog-title');
    this.descEl = document.getElementById('movement-dialog-desc');
    this.typeInput = document.getElementById('movement-type-input');

    this.activeType = 'CASH_IN';

    this.init();
  }

  init() {
    this.closeBtn?.addEventListener('click', () => this.close());

    this.form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(this.form);
      const amount = formData.get('amount');
      const reason = formData.get('reason');
      const type = this.activeType;

      try {
        await cashSessionService.recordMovement(type, amount, reason);
        showToast(
          type === 'CASH_IN' ? 'تم تسجيل الإيداع النقدي' : 'تم تسجيل السحب النقدي',
          `بمبلغ ${Number(amount).toLocaleString()} ج.س في درج الخزينة`,
          'success'
        );
        this.close();
      } catch (err) {
        showToast('خطأ في تسجيل الحركة', err.message, 'danger');
      }
    });

    // Listen for custom trigger
    window.addEventListener('OPEN_CASH_MOVEMENT_DIALOG', (e) => {
      this.open(e.detail?.type || 'CASH_IN');
    });
  }

  open(type = 'CASH_IN') {
    this.activeType = type;
    if (this.typeInput) this.typeInput.value = type;

    if (this.titleEl) {
      this.titleEl.textContent = type === 'CASH_IN' ? 'تسجيل إيداع نقدي في الدرج' : 'تسجيل سحب نقدي (مصروفات)';
    }
    if (this.descEl) {
      this.descEl.textContent = type === 'CASH_IN' 
        ? 'إضافة سيولة نقدية جديدة إلى رصيد الدرج الفعلي للوردية'
        : 'صرف نثريات أو توريد نقدي مؤقت يخصم من رصيد الدرج';
    }

    if (this.form) this.form.reset();
    this.dialog?.classList.remove('hidden');
  }

  close() {
    this.dialog?.classList.add('hidden');
  }
}
