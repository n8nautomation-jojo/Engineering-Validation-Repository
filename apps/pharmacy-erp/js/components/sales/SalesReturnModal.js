/**
 * PharmaTech — Sales Return & Inventory Reversal Modal Component
 * Handles the complete return workflow: batch stock restoration,
 * split payment refund documentation, and credit note issuance.
 */

import { apiClient } from '../../services/apiClient.js';
import { MedicineService } from '../../services/medicineService.js';
import { showToast } from '../Toast.js';

export class SalesReturnModal {
  constructor() {
    this.dialog = document.getElementById('dialog-sales-return');
    this.body = document.getElementById('sales-return-modal-body');
    this.closeBtn = document.getElementById('btn-close-sales-return');
    this.currentSale = null;
    this.isSubmitting = false;

    this.init();
  }

  init() {
    this.closeBtn?.addEventListener('click', () => this.close());

    // Close on backdrop click
    this.dialog?.addEventListener('click', (e) => {
      if (e.target === this.dialog) this.close();
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !this.dialog?.classList.contains('hidden')) {
        this.close();
      }
    });
  }

  open(sale) {
    if (!sale) return;
    this.currentSale = sale;

    this.render();
    this.dialog?.classList.remove('hidden');
  }

  close() {
    this.dialog?.classList.add('hidden');
    this.currentSale = null;
    this.isSubmitting = false;
  }

  render() {
    if (!this.body || !this.currentSale) return;

    const s = this.currentSale;
    const invNo = s.invoice_number;
    const customer = s.customer_name || 'مواطن — صرف نقدي';
    const cashier = s.cashier_name || 'د. أحمد الطاهر';
    const totalAmount = Number(s.totals?.total || 0).toLocaleString();
    const dateFormatted = new Date(s.created_at).toLocaleString('ar-SD', { dateStyle: 'short', timeStyle: 'short' });

    // Payment analysis (Split vs Single)
    const payments = Array.isArray(s.payments) ? s.payments : [];
    const isSplit = payments.length > 1;
    let paymentSummaryHtml = '';

    if (isSplit) {
      paymentSummaryHtml = `
        <div style="background:var(--muted); border:1px solid var(--border); border-radius:8px; padding:10px 12px; margin-bottom:10px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <span class="chip" style="background:#F3E8FF; color:#7E22CE; font-weight:700; font-size:11px;">⚡ سداد مجزأ (Split Payment)</span>
            <strong style="color:var(--foreground); font-size:13px;" dir="ltr">${totalAmount} ج.س</strong>
          </div>
          <div style="display:grid; gap:4px; font-size:12px;">
            ${payments.map(p => {
              const amt = Number(p.amount?.value || p.amount || 0).toLocaleString();
              const isBankak = p.method === 'BANK_TRANSFER' || p.method === 'BANKAK';
              const name = isBankak ? 'تطبيق بنكك (Bankak)' : p.method === 'CASH' ? 'نقداً (Cash Drawer)' : p.method;
              const ref = p.evidence_reference ? ` <span dir="ltr" style="font-family:var(--font-mono); color:#0052CC;">(${p.evidence_reference})</span>` : '';
              return `
                <div style="display:flex; justify-content:space-between; color:var(--muted-foreground);">
                  <span>• ${name}:</span>
                  <span style="font-weight:600; color:var(--foreground);" dir="ltr">${amt} ج.س ${ref}</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    } else {
      const p = payments[0] || { method: 'CASH' };
      const isBankak = p.method === 'BANK_TRANSFER' || p.method === 'BANKAK';
      const name = isBankak ? 'تطبيق بنكك (Bankak)' : 'نقداً (Cash)';
      const ref = p.evidence_reference ? ` — مرجع: ${p.evidence_reference}` : '';
      paymentSummaryHtml = `
        <div style="background:var(--muted); border:1px solid var(--border); border-radius:8px; padding:8px 12px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center; font-size:12px;">
          <span style="color:var(--muted-foreground);">طريقة السداد الأصلية: <strong style="color:var(--foreground);">${name}${ref}</strong></span>
          <strong dir="ltr" style="font-size:13px; color:var(--foreground);">${totalAmount} ج.س</strong>
        </div>
      `;
    }

    // Items list to be restored to stock
    const items = Array.isArray(s.items) ? s.items : [];
    const itemsRowsHtml = items.map(item => `
      <tr style="border-bottom:1px solid var(--border); font-size:12px;">
        <td style="padding:6px 0;">
          <strong style="color:var(--foreground);">${item.nameAr || item.name}</strong><br>
          <small style="color:var(--muted-foreground); font-family:var(--font-mono);" dir="ltr">${item.batchNumber || 'BATCH-STD'}</small>
        </td>
        <td style="text-align:center; padding:6px 4px; font-weight:700; color:#00B37E;" dir="ltr">
          +${item.quantity} عبوة
        </td>
        <td style="text-align:left; padding:6px 0; font-family:var(--font-mono);" dir="ltr">
          ${Number(item.lineTotal || (item.quantity * item.unitPrice) || 0).toLocaleString()} ج.س
        </td>
      </tr>
    `).join('');

    this.body.innerHTML = `
      <!-- Invoice Meta Card -->
      <div style="background:var(--card); border:1px solid var(--border); border-radius:8px; padding:10px 14px; display:grid; grid-template-columns:1fr 1fr; gap:8px; font-size:12px;">
        <div>
          <span style="color:var(--muted-foreground);">رقم الفاتورة:</span>
          <strong dir="ltr" style="color:var(--primary); font-family:var(--font-mono); margin-right:4px;">${invNo}</strong>
        </div>
        <div>
          <span style="color:var(--muted-foreground);">تاريخ الإصدار:</span>
          <span style="color:var(--foreground); margin-right:4px;">${dateFormatted}</span>
        </div>
        <div>
          <span style="color:var(--muted-foreground);">العميل:</span>
          <span style="color:var(--foreground); font-weight:600; margin-right:4px;">${customer}</span>
        </div>
        <div>
          <span style="color:var(--muted-foreground);">الصيدلي المصدر:</span>
          <span style="color:var(--foreground); margin-right:4px;">${cashier}</span>
        </div>
      </div>

      <!-- Items to be returned table -->
      <div style="border:1px solid var(--border); border-radius:8px; padding:10px 12px; background:var(--background);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <label style="font-size:12px; font-weight:700; color:var(--foreground); margin:0;">
            الأصناف والتشغيلات المردودة للمخزون (${items.length}):
          </label>
          <span class="chip chip-success" style="font-size:10.5px;">إعادة فورية للمخزون</span>
        </div>
        <table style="width:100%; border-collapse:collapse;">
          <thead>
            <tr style="border-bottom:1px solid var(--border); font-size:11px; color:var(--muted-foreground); text-align:right;">
              <th style="padding-bottom:4px;">الصنف والتشغيلة</th>
              <th style="padding-bottom:4px; text-align:center;">الكمية المستردة</th>
              <th style="padding-bottom:4px; text-align:left;">المبلغ</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRowsHtml}
          </tbody>
        </table>
      </div>

      <!-- Payment Summary -->
      ${paymentSummaryHtml}

      <!-- Refund Indicator -->
      <div style="background:#FEF2F2; border:1px solid #FECACA; border-radius:8px; padding:10px 14px; display:flex; justify-content:space-between; align-items:center;">
        <div>
          <div style="font-size:12.5px; font-weight:700; color:#991B1B;">المبلغ الإجمالي المسترد للعميل:</div>
          <div style="font-size:11px; color:#B91C1C;">سيتم استرجاع المبلغ للمريض بحسب وسيلة الدفع الأصلية</div>
        </div>
        <strong dir="ltr" style="font-size:18px; font-family:var(--font-mono); color:#DC2626;">-${totalAmount} ج.س</strong>
      </div>

      <!-- Reason & Notes Form -->
      <form id="sales-return-form" style="display:flex; flex-direction:column; gap:10px;">
        <div>
          <label for="return-reason-select" style="font-size:12px; font-weight:700; color:var(--muted-foreground); display:block; margin-bottom:4px;">
            سبب الإرجاع والاسترداد الدوائي:
          </label>
          <select id="return-reason-select" style="width:100%; padding:8px 10px; border-radius:6px; border:1px solid var(--border); background:var(--background); color:var(--foreground); font-size:13px;">
            <option value="RETURN_WITHIN_24H" selected>إرجاع دواء سليم خلال 24 ساعة (سياسة الاسترجاع الصيدلانية)</option>
            <option value="WRONG_ITEM">صرف صنف بالخطأ أو تعديل الوصفة الطبية</option>
            <option value="PATIENT_CANCELLED">إلغاء من طرف المريض قبل المغادرة</option>
            <option value="DEFECTIVE_PRODUCT">عيب مصنعي أو تلف في العبوة الدوائية</option>
          </select>
        </div>

        <div>
          <label for="return-notes-input" style="font-size:11.5px; color:var(--muted-foreground); display:block; margin-bottom:3px;">
            ملاحظات الصيدلي المشرف (اختياري):
          </label>
          <input id="return-notes-input" placeholder="مثال: تم التأكد من سلامة الشريط والعبوة الدوائية" style="width:100%; padding:7px 10px; border-radius:6px; border:1px solid var(--border); background:var(--background); color:var(--foreground); font-size:12px;" />
        </div>

        <div style="background:var(--muted); border-radius:6px; padding:8px 10px; display:flex; align-items:flex-start; gap:8px;">
          <input type="checkbox" id="return-restock-confirm" required style="margin-top:3px; cursor:pointer;" />
          <label for="return-restock-confirm" style="font-size:11.5px; color:var(--foreground); cursor:pointer; line-height:1.4;">
            <strong>إقرار استلام وفحص الأدوية:</strong> أقر بصفتي الصيدلي المناوب باستلام الأدوية ومطابقة سلامتها الدوائية وإعادتها فورياً لرصيد المخزون الفعلي.
          </label>
        </div>

        <div class="form-actions" style="margin-top:6px; display:flex; justify-content:space-between; align-items:center;">
          <button type="button" class="btn-table-action" id="btn-cancel-sales-return">
            إلغاء
          </button>
          <button type="submit" class="btn-primary" id="btn-submit-sales-return" style="background:#DC2626; border-color:#DC2626; color:#fff;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
            تأكيد إرجاع الفاتورة واسترداد المخزون
          </button>
        </div>
      </form>
    `;

    // Bind form events
    const cancelBtn = document.getElementById('btn-cancel-sales-return');
    cancelBtn?.addEventListener('click', () => this.close());

    const form = document.getElementById('sales-return-form');
    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.submit();
    });
  }

  async submit() {
    if (this.isSubmitting || !this.currentSale) return;

    const confirmBox = document.getElementById('return-restock-confirm');
    if (!confirmBox?.checked) {
      showToast('تنبيه مطلوب', 'يرجى تأكيد إقرار فحص واستلام الأدوية أولاً', 'warning');
      return;
    }

    const reason = document.getElementById('return-reason-select')?.value || 'RETURN_WITHIN_24H';
    const note = document.getElementById('return-notes-input')?.value?.trim() || '';
    const submitBtn = document.getElementById('btn-submit-sales-return');

    this.isSubmitting = true;
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `
        <svg class="spinner" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" stroke-opacity="0.25" />
          <path d="M12 2a10 10 0 0 1 10 10" />
        </svg>
        جاري استرجاع المخزون...
      `;
    }

    try {
      const saleId = this.currentSale.sale_id || this.currentSale.invoice_number;
      const reversed = await apiClient.post(`/api/sales/${saleId}/reverse`, {
        reason,
        note
      });

      // Synchronize local inventory catalog from backend
      await MedicineService.fetchFromBackend();

      // Trigger global event updates
      window.dispatchEvent(new CustomEvent('SALES_UPDATED'));
      window.dispatchEvent(new CustomEvent('SESSION_UPDATED'));

      this.close();

      showToast(
        'تم إرجاع الفاتورة بنجاح',
        `تم إلغاء الفاتورة ${reversed.invoice_number} وإعادة الأصناف للمخزون الفعلي`,
        'success'
      );

      // Automatically open the Return Receipt / Credit Note dialog
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('OPEN_RECEIPT_MODAL', { detail: reversed }));
      }, 300);

    } catch (err) {
      console.error('[SalesReturnModal] Error reversing sale:', err);
      showToast('خطأ في الإرجاع', err.message || 'تعذر استرجاع الفاتورة والمخزون', 'error');
    } finally {
      this.isSubmitting = false;
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
          </svg>
          تأكيد إرجاع الفاتورة واسترداد المخزون
        `;
      }
    }
  }
}
