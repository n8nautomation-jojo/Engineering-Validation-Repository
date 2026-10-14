/**
 * PharmaTech — Thermal Receipt & Printer Configuration Sub-Component
 * Customizes 80mm thermal receipt headers, return policies, and auto-print triggers
 */

export class ReceiptConfigForm {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
  }

  render(settings = {}) {
    if (!this.container) return;

    this.container.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:14px;">
        <div class="form-grid">
          <label class="field wide">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg>
            <input name="receiptHeaderNote" id="setting-receipt-header-input" value="${settings.receiptHeaderNote || 'صيدلية النيلين النموذجية — خدمة على مدار 24 ساعة'}" placeholder="ترويسة الفاتورة الحرارية المطبوعة بالأعلى" />
          </label>

          <label class="field wide">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            <input name="receiptFooterNote" id="setting-receipt-footer-input" value="${settings.receiptFooterNote || 'نتمنى لكم الشفاء العاجل · الدواء المسترد خلال 24 ساعة بالفاتورة وبحالة جيدة'}" placeholder="تذييل الفاتورة وشروط استرجاع الدواء" />
          </label>

          <div style="display:flex; align-items:center; gap:10px; grid-column:1 / -1; padding:8px 12px; background:var(--muted); border-radius:8px; border:1px solid var(--border);">
            <input type="checkbox" id="setting-auto-print-cb" name="autoPrintReceipt" ${settings.autoPrintReceipt !== false ? 'checked' : ''} style="width:18px; height:18px; accent-color:var(--primary); cursor:pointer;" />
            <label for="setting-auto-print-cb" style="font-size:12.5px; cursor:pointer; font-weight:600;">
              طباعة الإيصال الحراري 80mm تلقائياً وبشكل فوري عند إتمام عملية الصرف في POS
            </label>
          </div>
        </div>

        <!-- Live Visual Preview of 80mm Receipt Top & Bottom -->
        <div style="background:#fff; color:#0f172a; border:1px dashed #cbd5e1; border-radius:8px; padding:12px; font-size:11.5px; max-width:320px; margin:0 auto; width:100%; box-shadow:0 2px 6px rgba(0,0,0,0.06);">
          <div style="text-align:center; border-bottom:1px dashed #cbd5e1; padding-bottom:6px; margin-bottom:8px;">
            <strong id="receipt-preview-header" style="display:block; font-size:12px; font-weight:800; color:#0052CC;">
              ${settings.receiptHeaderNote || 'صيدلية النيلين النموذجية — خدمة على مدار 24 ساعة'}
            </strong>
            <small style="color:#64748b; font-size:10px;">TRN: ${settings.taxRegistrationNumber || '10294819'}</small>
          </div>

          <div style="text-align:center; padding:6px 0; color:#64748b; font-size:10px; border-bottom:1px dashed #cbd5e1; margin-bottom:6px;">
            [عناصر الفاتورة المعتمدة وأسعار الأدوية]
          </div>

          <div style="text-align:center;">
            <small id="receipt-preview-footer" style="color:#475569; font-size:10px; line-height:1.4; display:block;">
              ${settings.receiptFooterNote || 'نتمنى لكم الشفاء العاجل · الدواء المسترد خلال 24 ساعة بالفاتورة وبحالة جيدة'}
            </small>
          </div>
        </div>
      </div>
    `;

    this.attachLivePreview();
  }

  attachLivePreview() {
    const headerInput = this.container.querySelector('#setting-receipt-header-input');
    const footerInput = this.container.querySelector('#setting-receipt-footer-input');
    const headerPreview = this.container.querySelector('#receipt-preview-header');
    const footerPreview = this.container.querySelector('#receipt-preview-footer');

    headerInput?.addEventListener('input', () => {
      if (headerPreview) headerPreview.textContent = headerInput.value || 'صيدلية النيلين النموذجية';
    });

    footerInput?.addEventListener('input', () => {
      if (footerPreview) footerPreview.textContent = footerInput.value || 'نتمنى لكم الشفاء العاجل';
    });
  }

  collectData(formData) {
    const getValue = (name) => {
      const formVal = formData ? formData.get(name) : null;
      if (formVal !== null && formVal !== undefined) return String(formVal);
      return this.container?.querySelector(`[name="${name}"]`)?.value ?? '';
    };

    return {
      receiptHeaderNote: getValue('receiptHeaderNote').trim(),
      receiptFooterNote: getValue('receiptFooterNote').trim(),
      autoPrintReceipt: this.container?.querySelector('#setting-auto-print-cb')?.checked ?? true
    };
  }
}
