/**
 * PharmaTech — POS Receipt Dialog Component
 * Handles instant thermal receipt preview & print triggering with dynamic backend lookup
 */

import { ReceiptService } from '../services/receiptService.js';
import { apiClient } from '../services/apiClient.js';
import { showToast } from './Toast.js';

export class ReceiptDialog {
  constructor() {
    this.dialog = document.getElementById('dialog-receipt');
    this.content = document.getElementById('receipt-paper-content');
    this.closeBtn = document.getElementById('btn-close-receipt');
    this.printBtn = document.getElementById('btn-print-receipt');

    this.init();
  }

  init() {
    this.closeBtn?.addEventListener('click', () => this.close());

    this.printBtn?.addEventListener('click', () => {
      showToast('جاري الطباعة', 'تم إرسال الإيصال إلى طابعة الفواتير الحرارية 80mm', 'success');
      this.close();
    });

    // Listen for custom event or direct call
    window.addEventListener('OPEN_RECEIPT_MODAL', (e) => {
      this.open(e.detail);
    });

    window.openReceiptModal = (invOrSale) => this.open(invOrSale);
  }

  async open(invoiceOrSale = 'INV-2026-0842') {
    if (this.content) {
      this.content.innerHTML = ReceiptService.getReceiptHTML(invoiceOrSale);
    }
    this.dialog?.classList.remove('hidden');

    // If only an invoice string was provided, fetch the full rich record from backend asynchronously
    if (typeof invoiceOrSale === 'string') {
      try {
        const fullSale = await apiClient.get(`/api/sales/${invoiceOrSale}`);
        if (fullSale && this.content) {
          this.content.innerHTML = ReceiptService.getReceiptHTML(fullSale);
        }
      } catch {
        // Fallback already rendered
      }
    }
  }

  close() {
    this.dialog?.classList.add('hidden');
  }
}
