/**
 * PharmaTech — Close Cash Session Dialog Component
 * Handles cash drawer counting, expected vs. actual variance reconciliation and Z-Report generation
 */

import { cashSessionService } from '../services/cashSessionService.js';
import { ReceiptService } from '../services/receiptService.js';
import { showToast } from './Toast.js';

export class CloseSessionDialog {
  constructor() {
    this.dialog = document.getElementById('dialog-close-session');
    this.closeBtn = document.getElementById('btn-dismiss-close-dialog');
    this.form = document.getElementById('close-session-dialog-form');
    this.expectedValEl = document.getElementById('close-session-expected-val');
    this.countedInput = document.getElementById('close-session-counted-input');
    this.varianceBox = document.getElementById('close-session-variance-box');
    this.varianceValEl = document.getElementById('close-session-variance-val');

    this.init();
  }

  init() {
    this.closeBtn?.addEventListener('click', () => this.close());

    // Live variance calculation as cashier counts cash
    this.countedInput?.addEventListener('input', () => {
      this.updateVarianceDisplay();
    });

    this.form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const counted = parseFloat(this.countedInput?.value);
      const note = document.getElementById('close-session-note-input')?.value || '';

      if (isNaN(counted) || counted < 0) {
        showToast('تنبيه', 'يرجى إدخال مبلغ النقدية المعدودة في الدرج', 'warning');
        return;
      }

      try {
        const result = await cashSessionService.closeSession(counted, note);

        showToast('تم إغلاق الوردية بنجاح', `تم إصدار تقرير الوردية ${result.zReport.zReportNumber}`, 'success');

        this.close();

        // Automatically open the thermal Z-Report preview
        this.openZReport(result.zReport);
      } catch (err) {
        showToast('خطأ في إغلاق الوردية', err.message, 'danger');
      }
    });

    // Listen for custom trigger
    window.addEventListener('OPEN_CLOSE_SESSION_DIALOG', () => this.open());
  }

  open() {
    const session = cashSessionService.currentSession;
    if (!session || session.status !== 'OPEN') {
      showToast('تنبيه', 'لا توجد وردية مفتوحة حالياً لإغلاقها', 'warning');
      return;
    }

    const expected = session.metrics ? session.metrics.expectedCash : 0;
    if (this.expectedValEl) {
      this.expectedValEl.textContent = `${Number(expected).toLocaleString()} ج.س`;
    }

    if (this.countedInput) {
      this.countedInput.value = expected; // Default to expected for quick reconciliation
    }

    this.updateVarianceDisplay();
    this.dialog?.classList.remove('hidden');
  }

  updateVarianceDisplay() {
    const session = cashSessionService.currentSession;
    const expected = session?.metrics ? session.metrics.expectedCash : 0;
    const counted = parseFloat(this.countedInput?.value) || 0;
    const diff = Number((counted - expected).toFixed(2));

    if (!this.varianceValEl || !this.varianceBox) return;

    if (diff === 0) {
      this.varianceBox.style.background = '#ECFDF5';
      this.varianceBox.style.borderColor = '#A7F3D0';
      this.varianceValEl.style.color = '#00B37E';
      this.varianceValEl.textContent = 'مطابق تماماً (0.00 ج.س)';
    } else if (diff < 0) {
      this.varianceBox.style.background = '#FFF1F2';
      this.varianceBox.style.borderColor = '#FECDD3';
      this.varianceValEl.style.color = '#E11D48';
      this.varianceValEl.textContent = `عجز في النقدية: ${Math.abs(diff).toLocaleString()} ج.س`;
    } else {
      this.varianceBox.style.background = '#EBF5FF';
      this.varianceBox.style.borderColor = '#BFDBFE';
      this.varianceValEl.style.color = '#0052CC';
      this.varianceValEl.textContent = `زيادة في النقدية: ${diff.toLocaleString()} ج.س`;
    }
  }

  openZReport(zReport) {
    const receiptDialog = document.getElementById('dialog-receipt');
    const content = document.getElementById('receipt-paper-content');
    if (receiptDialog && content) {
      content.innerHTML = ReceiptService.getZReportHTML(zReport);
      receiptDialog.classList.remove('hidden');
    }
  }

  close() {
    this.dialog?.classList.add('hidden');
  }
}
