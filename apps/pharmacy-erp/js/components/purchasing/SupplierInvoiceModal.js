/**
 * PharmaTech — Supplier Commercial Invoices & Accounts Payable Modals Controller
 * Handles Dialog 25 (Invoice Creation) and Dialog 26 (Payment Settlement)
 */

import { PurchasingService } from '../../services/purchasingService.js';
import { showToast } from '../Toast.js';

export class SupplierInvoiceModal {
  constructor(options = {}) {
    this.onSuccess = options.onSuccess || (() => {});
    
    // Dialog 25: Invoice Creation Elements
    this.invoiceDialog = document.getElementById('dialog-supplier-invoice-modal');
    this.invoiceCloseX = document.getElementById('btn-close-invoice-modal-x');
    this.invoiceCancelBtn = document.getElementById('btn-cancel-invoice-modal');
    this.invoiceForm = document.getElementById('supplier-invoice-form');
    this.supplierSelect = document.getElementById('invoice-form-supplier-select');
    this.invoiceNumberInput = document.getElementById('invoice-form-number');
    this.poSelect = document.getElementById('invoice-form-po-select');
    this.issueDateInput = document.getElementById('invoice-form-issue-date');
    this.dueDateInput = document.getElementById('invoice-form-due-date');
    this.totalAmountInput = document.getElementById('invoice-form-total-amount');
    this.initialPaidInput = document.getElementById('invoice-form-initial-paid');
    this.initialPaymentBox = document.getElementById('invoice-initial-payment-box');
    this.paymentMethodSelect = document.getElementById('invoice-form-payment-method');
    this.paymentRefInput = document.getElementById('invoice-form-payment-ref');
    this.invoiceNotesInput = document.getElementById('invoice-form-notes');

    // Dialog 26: Invoice Payment Settlement Elements
    this.paymentDialog = document.getElementById('dialog-supplier-payment-modal');
    this.paymentCloseX = document.getElementById('btn-close-payment-modal-x');
    this.paymentCancelBtn = document.getElementById('btn-cancel-payment-modal');
    this.paymentForm = document.getElementById('supplier-payment-form');
    this.paySupplierEl = document.getElementById('pay-summary-supplier');
    this.payInvNumEl = document.getElementById('pay-summary-inv-num');
    this.payTotalEl = document.getElementById('pay-summary-total');
    this.payPaidEl = document.getElementById('pay-summary-paid');
    this.payRemainingEl = document.getElementById('pay-summary-remaining');
    this.payAmountInput = document.getElementById('pay-form-amount');
    this.btnPayFullBalance = document.getElementById('btn-pay-full-balance');
    this.payMethodSelect = document.getElementById('pay-form-method');
    this.payRefInput = document.getElementById('pay-form-ref');
    this.payNotesInput = document.getElementById('pay-form-notes');
    this.payHistoryList = document.getElementById('pay-history-list');

    this.activeInvoice = null;
    this.suppliersCache = [];
    this.ordersCache = [];

    this.init();
  }

  init() {
    this.initInvoiceModalEvents();
    this.initPaymentModalEvents();
  }

  initInvoiceModalEvents() {
    if (!this.invoiceDialog) return;

    this.invoiceCloseX?.addEventListener('click', () => this.closeInvoiceModal());
    this.invoiceCancelBtn?.addEventListener('click', () => this.closeInvoiceModal());

    this.invoiceDialog.addEventListener('click', (e) => {
      if (e.target === this.invoiceDialog) this.closeInvoiceModal();
    });

    // Toggle initial payment box visibility
    this.initialPaidInput?.addEventListener('input', () => {
      const val = Number(this.initialPaidInput.value) || 0;
      if (this.initialPaymentBox) {
        this.initialPaymentBox.style.display = val > 0 ? 'grid' : 'none';
      }
    });

    this.invoiceForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleInvoiceSubmit();
    });
  }

  initPaymentModalEvents() {
    if (!this.paymentDialog) return;

    this.paymentCloseX?.addEventListener('click', () => this.closePaymentModal());
    this.paymentCancelBtn?.addEventListener('click', () => this.closePaymentModal());

    this.paymentDialog.addEventListener('click', (e) => {
      if (e.target === this.paymentDialog) this.closePaymentModal();
    });

    this.btnPayFullBalance?.addEventListener('click', () => {
      if (this.activeInvoice && this.payAmountInput) {
        this.payAmountInput.value = this.activeInvoice.remainingBalance || 0;
      }
    });

    this.paymentForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handlePaymentSubmit();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (!this.invoiceDialog?.classList.contains('hidden')) this.closeInvoiceModal();
        if (!this.paymentDialog?.classList.contains('hidden')) this.closePaymentModal();
      }
    });
  }

  async openInvoiceModal(prefill = {}) {
    if (!this.invoiceDialog) return;

    try {
      const [suppliers, orders] = await Promise.all([
        PurchasingService.fetchSuppliers(),
        PurchasingService.fetchOrders()
      ]);
      this.suppliersCache = suppliers;
      this.ordersCache = orders;

      // Populate suppliers
      if (this.supplierSelect) {
        this.supplierSelect.innerHTML = `
          <option value="">-- اختر المورد --</option>
          ${suppliers.map(s => `<option value="${s.id}" ${prefill.supplierId === s.id ? 'selected' : ''}>${s.name}</option>`).join('')}
        `;
      }

      // Populate POs
      if (this.poSelect) {
        this.poSelect.innerHTML = `
          <option value="">-- غير مرتبط بأمر شراء محدد --</option>
          ${orders.map(o => `<option value="${o.poNumber}" ${prefill.poNumber === o.poNumber ? 'selected' : ''}>${o.poNumber} — ${o.supplierName} (${Number(o.totals?.totalCost || 0).toLocaleString()} ج.س)</option>`).join('')}
        `;
      }

      const today = new Date().toISOString().split('T')[0];
      const defaultDue = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      if (this.invoiceNumberInput) this.invoiceNumberInput.value = prefill.invoiceNumber || '';
      if (this.issueDateInput) this.issueDateInput.value = prefill.issueDate || today;
      if (this.dueDateInput) this.dueDateInput.value = prefill.dueDate || defaultDue;
      if (this.totalAmountInput) this.totalAmountInput.value = prefill.totalAmount || '';
      if (this.initialPaidInput) this.initialPaidInput.value = '0';
      if (this.initialPaymentBox) this.initialPaymentBox.style.display = 'none';
      if (this.paymentRefInput) this.paymentRefInput.value = '';
      if (this.invoiceNotesInput) this.invoiceNotesInput.value = prefill.notes || '';

      this.invoiceDialog.classList.remove('hidden');
    } catch (err) {
      showToast('خطأ', 'تعذر تحميل بيانات الموردين وأوامر الشراء', 'error');
    }
  }

  closeInvoiceModal() {
    this.invoiceDialog?.classList.add('hidden');
    this.invoiceForm?.reset();
    if (this.initialPaymentBox) this.initialPaymentBox.style.display = 'none';
  }

  async handleInvoiceSubmit() {
    const supplierId = this.supplierSelect?.value;
    const invoiceNumber = this.invoiceNumberInput?.value.trim();
    const poNumber = this.poSelect?.value || null;
    const issueDate = this.issueDateInput?.value;
    const dueDate = this.dueDateInput?.value;
    const totalAmount = Number(this.totalAmountInput?.value);
    const initialPaidAmount = Number(this.initialPaidInput?.value) || 0;
    const paymentMethod = this.paymentMethodSelect?.value;
    const paymentReference = this.paymentRefInput?.value.trim();
    const notes = this.invoiceNotesInput?.value.trim();

    if (!supplierId) {
      showToast('حقل مطلوب', 'يرجى اختيار المورد المعتمد', 'warning');
      return;
    }

    if (!invoiceNumber) {
      showToast('حقل مطلوب', 'يرجى إدخال رقم فاتورة المورد التجارية', 'warning');
      return;
    }

    if (isNaN(totalAmount) || totalAmount <= 0) {
      showToast('قيمة غير صالحة', 'إجمالي الفاتورة يجب أن يكون أكبر من الصفر', 'warning');
      return;
    }

    if (initialPaidAmount > totalAmount) {
      showToast('خطأ في الحساب', 'مبلغ الدفعة الأولى لا يمكن أن يتجاوز إجمالي الفاتورة', 'warning');
      return;
    }

    try {
      const invoiceData = {
        supplierId,
        invoiceNumber,
        poNumber,
        issueDate,
        dueDate,
        totalAmount,
        initialPaidAmount,
        paymentMethod,
        paymentReference,
        notes
      };

      await PurchasingService.createInvoice(invoiceData);
      this.closeInvoiceModal();
      this.onSuccess();
    } catch (err) {
      // Error is handled with toast in PurchasingService
    }
  }

  openPaymentModal(invoice) {
    if (!this.paymentDialog || !invoice) return;
    this.activeInvoice = invoice;

    if (this.paySupplierEl) this.paySupplierEl.textContent = invoice.supplierName;
    if (this.payInvNumEl) this.payInvNumEl.textContent = invoice.invoiceNumber;
    if (this.payTotalEl) this.payTotalEl.textContent = `${Number(invoice.totalAmount).toLocaleString()} ج.س`;
    if (this.payPaidEl) this.payPaidEl.textContent = `${Number(invoice.paidAmount || 0).toLocaleString()} ج.س`;
    if (this.payRemainingEl) this.payRemainingEl.textContent = `${Number(invoice.remainingBalance || 0).toLocaleString()} ج.س`;

    if (this.payAmountInput) {
      this.payAmountInput.max = invoice.remainingBalance || 0;
      this.payAmountInput.value = invoice.remainingBalance || 0;
    }

    if (this.payRefInput) this.payRefInput.value = '';
    if (this.payNotesInput) this.payNotesInput.value = '';

    // Render past payments history
    if (this.payHistoryList) {
      const payments = invoice.payments || [];
      if (payments.length === 0) {
        this.payHistoryList.innerHTML = `
          <div style="color:var(--muted-foreground); text-align:center; padding:6px 0;">
            لا توجد دفعات سداد مسجلة مسبقاً لهذه الفاتورة
          </div>
        `;
      } else {
        this.payHistoryList.innerHTML = payments.map(p => {
          const methodLabel = p.method === 'BANK_TRANSFER' ? 'تحويل بنكي / بنكك' : p.method === 'CHEQUE' ? 'شيك مصرفي' : 'نقداً';
          return `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:5px 0; border-bottom:1px solid rgba(0,0,0,0.05);">
              <div>
                <strong style="color:#059669; font-family:var(--font-mono);">${Number(p.amount).toLocaleString()} ج.س</strong>
                <span style="color:var(--muted-foreground); margin-right:6px;">(${methodLabel})</span>
                ${p.reference ? `<small style="display:block; font-family:var(--font-mono); color:var(--muted-foreground);">${p.reference}</small>` : ''}
              </div>
              <div style="text-align:left; font-size:11px; color:var(--muted-foreground);">
                ${p.paidAt ? new Date(p.paidAt).toLocaleDateString('ar-SD') : '—'}
                ${p.paidBy ? `<small style="display:block;">${p.paidBy}</small>` : ''}
              </div>
            </div>
          `;
        }).join('');
      }
    }

    this.paymentDialog.classList.remove('hidden');
  }

  closePaymentModal() {
    this.paymentDialog?.classList.add('hidden');
    this.paymentForm?.reset();
    this.activeInvoice = null;
  }

  async handlePaymentSubmit() {
    if (!this.activeInvoice) return;

    const amount = Number(this.payAmountInput?.value);
    const method = this.payMethodSelect?.value;
    const reference = this.payRefInput?.value.trim();
    const notes = this.payNotesInput?.value.trim();

    if (isNaN(amount) || amount <= 0) {
      showToast('قيمة غير صالحة', 'يرجى إدخال مبلغ سداد موجب أكبر من الصفر', 'warning');
      return;
    }

    if (amount > this.activeInvoice.remainingBalance) {
      showToast(
        'المبلغ تجاوز الرصيد',
        `مبلغ السداد (${amount.toLocaleString()} ج.س) أكبر من الرصيد المتبقي على الفاتورة (${this.activeInvoice.remainingBalance.toLocaleString()} ج.س)`,
        'warning'
      );
      return;
    }

    try {
      const paymentData = {
        amount,
        method,
        reference: reference || 'إشعار سداد نقدي/بنكي',
        notes
      };

      await PurchasingService.payInvoice(this.activeInvoice.id, paymentData);
      this.closePaymentModal();
      this.onSuccess();
    } catch (err) {
      // Handled with toast
    }
  }
}
