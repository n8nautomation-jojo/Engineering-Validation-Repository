/**
 * PharmaTech — Customer & Patient Detailed Clinical & Sales History Modal
 * Displays patient profile, chronic conditions, clinical allergy alerts, and past dispensed invoices.
 */

import { customerService } from '../../services/customerService.js';
import { appStore } from '../../state/store.js';

export class CustomerDetailModal {
  constructor(modalId = 'dialog-customer-detail', { onEdit, onSelectForPos } = {}) {
    this.modalId = modalId;
    this.currentCustomer = null;
    this.onEdit = onEdit;
    this.onSelectForPos = onSelectForPos;
    this.init();
  }

  init() {
    const modal = document.getElementById(this.modalId);
    if (!modal) return;

    modal.querySelector('.modal-backdrop')?.addEventListener('click', () => this.close());
    modal.querySelector('.btn-modal-close')?.addEventListener('click', () => this.close());
    modal.querySelector('#btn-close-customer-detail')?.addEventListener('click', () => this.close());

    modal.querySelector('#btn-edit-from-detail')?.addEventListener('click', () => {
      if (this.currentCustomer && this.onEdit) {
        const cust = this.currentCustomer;
        this.close();
        this.onEdit(cust);
      }
    });

    modal.querySelector('#btn-book-prescription-patient')?.addEventListener('click', () => {
      if (this.currentCustomer) {
        const cust = this.currentCustomer;
        this.close();
        window.dispatchEvent(new CustomEvent('OPEN_SALES_ORDER_MODAL', { detail: { customer: cust } }));
      }
    });

    modal.querySelector('#btn-pos-dispense-patient')?.addEventListener('click', () => {
      if (this.currentCustomer && this.onSelectForPos) {
        const cust = this.currentCustomer;
        this.close();
        this.onSelectForPos(cust);
      }
    });
  }

  async open(customerId) {
    const modal = document.getElementById(this.modalId);
    if (!modal) return;

    modal.classList.add('is-open');
    this.renderLoading();

    try {
      const fullCustomer = await customerService.getCustomerById(customerId);
      this.currentCustomer = fullCustomer;
      this.renderContent(fullCustomer);
    } catch (err) {
      this.renderError(err.message);
    }
  }

  close() {
    const modal = document.getElementById(this.modalId);
    if (modal) {
      modal.classList.remove('is-open');
    }
    this.currentCustomer = null;
  }

  renderLoading() {
    const body = document.getElementById('customer-detail-body');
    if (!body) return;
    body.innerHTML = `
      <div style="text-align:center; padding:40px 16px; color:var(--muted-foreground);">
        <span class="spinner" style="display:inline-block; width:22px; height:22px; border:2px solid var(--border); border-top-color:var(--primary); border-radius:50%; animation:spin 0.6s linear infinite; margin-bottom:10px;"></span>
        <p style="margin:0; font-size:13px;">جاري تحميل السجل الطبي وتاريخ المبيعات للمريض...</p>
      </div>
    `;
  }

  renderError(msg) {
    const body = document.getElementById('customer-detail-body');
    if (!body) return;
    body.innerHTML = `
      <div style="text-align:center; padding:30px 16px; color:var(--destructive);">
        <p style="margin:0; font-weight:700;">تعذر تحميل بيانات المريض</p>
        <small>${msg || 'حدث خطأ غير متوقع'}</small>
      </div>
    `;
  }

  renderContent(cust) {
    const body = document.getElementById('customer-detail-body');
    if (!body) return;

    const hasAllergies = Array.isArray(cust.allergies) && cust.allergies.length > 0;
    const hasConditions = Array.isArray(cust.chronicConditions) && cust.chronicConditions.length > 0;
    const purchases = Array.isArray(cust.purchases) ? cust.purchases : [];

    const typeBadge = {
      CHRONIC: '<span class="badge" style="background:#FEF3C7; color:#B45309; border:1px solid #FDE68A;">مريض أمراض مزمنة</span>',
      INSURANCE: '<span class="badge" style="background:#E0E7FF; color:#4338CA; border:1px solid #C7D2FE;">تأمين صحي معتمد</span>',
      WALK_IN: '<span class="badge" style="background:var(--muted); color:var(--muted-foreground); border:1px solid var(--border);">عميل نقدي عابر</span>'
    }[cust.type] || '<span class="badge">عام</span>';

    body.innerHTML = `
      <!-- Header Profile Card -->
      <div style="display:flex; justify-content:space-between; align-items:flex-start; background:var(--muted); border:1px solid var(--border); border-radius:10px; padding:14px 16px; margin-bottom:16px;">
        <div>
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
            <h3 style="margin:0; font-size:17px; font-weight:800; color:var(--foreground);">${cust.name}</h3>
            ${typeBadge}
          </div>
          <div style="display:flex; align-items:center; gap:16px; font-size:12.5px; color:var(--muted-foreground);">
            <span>كود الملف: <strong dir="ltr" style="font-family:var(--font-mono); color:var(--primary);">${cust.id}</strong></span>
            <span>الهاتف: <strong dir="ltr" style="font-family:var(--font-mono);">${cust.phone || 'غير مسجل'}</strong></span>
            <span>تاريخ التسجيل: <span dir="ltr">${new Date(cust.createdAt).toLocaleDateString('ar-SD')}</span></span>
          </div>
        </div>

        <div style="text-align:left;">
          <div style="font-size:11px; color:var(--muted-foreground);">إجمالي المشتريات</div>
          <strong dir="ltr" style="font-size:18px; color:var(--primary);">${Number(cust.totalPurchases || 0).toLocaleString()} ج.س</strong>
          <div style="font-size:11px; color:var(--muted-foreground);">${cust.visitsCount || 0} زيارة / فاتورة</div>
        </div>
      </div>

      <!-- Clinical Alerts (Allergies & Chronic Diseases) -->
      ${hasAllergies ? `
        <div style="background:rgba(225, 29, 72, 0.08); border:1.5px solid #FDA4AF; border-radius:8px; padding:10px 14px; margin-bottom:12px; display:flex; align-items:center; gap:10px;">
          <span style="font-size:20px;">⚠️</span>
          <div>
            <strong style="color:#BE123C; font-size:13px; display:block;">تحذير سريري — حساسية دوائية مسجلة</strong>
            <div style="display:flex; flex-wrap:wrap; gap:6px; margin-top:4px;">
              ${cust.allergies.map(a => `<span style="background:#FFE4E6; color:#9F1239; font-size:11.5px; font-weight:700; padding:2px 8px; border-radius:4px; border:1px solid #FECDD3;">${a}</span>`).join('')}
            </div>
          </div>
        </div>
      ` : ''}

      ${hasConditions ? `
        <div style="background:rgba(245, 158, 11, 0.08); border:1.5px solid #FDE68A; border-radius:8px; padding:10px 14px; margin-bottom:14px; display:flex; align-items:center; gap:10px;">
          <span style="font-size:20px;">🩺</span>
          <div>
            <strong style="color:#B45309; font-size:13px; display:block;">الأمراض المزمنة المسجلة للمريض</strong>
            <div style="display:flex; flex-wrap:wrap; gap:6px; margin-top:4px;">
              ${cust.chronicConditions.map(c => `<span style="background:#FEF3C7; color:#92400E; font-size:11.5px; font-weight:600; padding:2px 8px; border-radius:4px; border:1px solid #FDE68A;">${c}</span>`).join('')}
            </div>
          </div>
        </div>
      ` : ''}

      ${cust.insuranceDetails ? `
        <div style="background:rgba(59, 130, 246, 0.06); border:1px solid #BFDBFE; border-radius:8px; padding:10px 14px; margin-bottom:14px; display:flex; justify-content:space-between; align-items:center; font-size:12.5px;">
          <div>
            <strong style="color:#1D4ED8;">شركة التأمين:</strong> ${cust.insuranceDetails.provider || 'غير محدد'}
            <span style="margin:0 8px; color:var(--border);">|</span>
            <strong style="color:#1D4ED8;">رقم الوثيقة:</strong> <span dir="ltr" style="font-family:var(--font-mono);">${cust.insuranceDetails.policyNumber || '—'}</span>
          </div>
          <div>
            <strong style="color:#1D4ED8;">نسبة تحمل المريض:</strong> ${cust.insuranceDetails.copayPercent || 0}%
          </div>
        </div>
      ` : ''}

      ${cust.notes ? `
        <div style="background:var(--background); border:1px solid var(--border); border-radius:8px; padding:8px 12px; margin-bottom:16px; font-size:12px; color:var(--muted-foreground);">
          <strong>ملاحظات الصيدلي:</strong> ${cust.notes}
        </div>
      ` : ''}

      <!-- Past Invoices Section -->
      <div style="margin-top:10px;">
        <h4 style="margin:0 0 10px; font-size:14px; font-weight:800; display:flex; justify-content:space-between; align-items:center;">
          <span>سجل فواتير وصرف الأدوية للمريض (${purchases.length})</span>
          ${cust.lastVisitAt ? `<span style="font-size:11.5px; font-weight:500; color:var(--muted-foreground);">آخر صرف: ${new Date(cust.lastVisitAt).toLocaleDateString('ar-SD')}</span>` : ''}
        </h4>

        <div style="max-height:220px; overflow-y:auto; border:1px solid var(--border); border-radius:8px;">
          ${purchases.length === 0 ? `
            <div style="text-align:center; padding:24px; color:var(--muted-foreground); font-size:12px;">
              لا توجد فواتير سابقة مسجلة لهذا المريض حتى الآن.
            </div>
          ` : `
            <table style="width:100%; border-collapse:collapse; text-align:right; font-size:12px;">
              <thead style="position:sticky; top:0; background:var(--muted); border-bottom:1px solid var(--border); color:var(--muted-foreground);">
                <tr>
                  <th style="padding:8px 10px;">رقم الفاتورة</th>
                  <th style="padding:8px 10px;">التاريخ</th>
                  <th style="padding:8px 10px;">الأصناف المصروفة</th>
                  <th style="padding:8px 10px;">المبلغ</th>
                  <th style="padding:8px 10px;">طريقة السداد</th>
                </tr>
              </thead>
              <tbody>
                ${purchases.map(p => `
                  <tr style="border-bottom:1px solid var(--border);">
                    <td style="padding:8px 10px; font-weight:700; font-family:var(--font-mono); color:var(--primary);">${p.invoice_number}</td>
                    <td style="padding:8px 10px; color:var(--muted-foreground);">${new Date(p.created_at).toLocaleDateString('ar-SD')}</td>
                    <td style="padding:8px 10px;">
                      ${(p.items || []).map(i => `<span style="display:inline-block; background:var(--muted); padding:2px 6px; border-radius:4px; font-size:11px; margin:2px;">${i.name || i.nameAr} (${i.quantity})</span>`).join('')}
                    </td>
                    <td style="padding:8px 10px; font-weight:700;" dir="ltr">${Number(p.totals?.total || 0).toLocaleString()} ج.س</td>
                    <td style="padding:8px 10px;">
                      ${p.payments?.[0]?.method === 'BANK_TRANSFER' ? '<span class="badge" style="background:#E6F8F2; color:#00B37E;">بنكك</span>' : '<span class="badge" style="background:#EFF6FF; color:#2563EB;">نقداً</span>'}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `}
        </div>
      </div>
    `;
  }
}
