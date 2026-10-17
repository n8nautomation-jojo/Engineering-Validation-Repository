/**
 * PharmaTech — Sales Ledger Table Component
 * Renders the authoritative sales and invoices ledger with items preview,
 * clear split payment documentation, thermal receipt triggers, and return/reversal flows.
 */

import { AuthService } from '../../services/authService.js';export class SalesLedgerTable {
  constructor(containerId = 'sales-table-container', { onPrintReceipt, onReturnSale, onReloadSales } = {}) {
    this.containerId = containerId;
    this.onPrintReceipt = onPrintReceipt;
    this.onReturnSale = onReturnSale;
    this.onReloadSales = onReloadSales;
  }

  render(sales = []) {
    const el = document.getElementById(this.containerId);
    if (!el) return;

    if (sales.length === 0) {
      el.innerHTML = `
        <div class="table-scroll">
          <table class="data-table">
            <tbody>
              <tr>
                <td colspan="8" style="text-align:center; padding:40px; color:var(--muted-foreground);">
                  <div style="display:grid; place-items:center; gap:8px;">
                    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1Z" />
                    </svg>
                    <span>لا توجد فواتير مطابقة للبحث أو معايير التصفية</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      `;
      return;
    }

    el.innerHTML = `
      <div class="table-scroll">
        <table class="data-table">
          <thead>
            <tr>
              <th>رقم الفاتورة</th>
              <th>التاريخ والوقت</th>
              <th>الصيدلي / الكاشير</th>
              <th>الأصناف والتشغيلات</th>
              <th>طريقة السداد</th>
              <th>الإجمالي (ج.س)</th>
              <th>الحالة</th>
              <th style="text-align:left;">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            ${sales.map(s => {
              const payments = Array.isArray(s.payments) ? s.payments : [];
              const isSplit = payments.length > 1;
              const bankakPayments = payments.filter(p => p.method === 'BANK_TRANSFER' || p.method === 'BANKAK');
              const hasBankak = bankakPayments.length > 0;
              const hasUnverifiedBankak = bankakPayments.some(p => p.verification_status !== 'API_VERIFIED');
              let paymentBadge = '';

              if (isSplit) {
                const parts = payments.map(p => {
                  const isB = p.method === 'BANK_TRANSFER' || p.method === 'BANKAK';
                  const label = isB ? 'بنكك' : 'نقداً';
                  const val = Number(p.amount?.value || p.amount || 0).toLocaleString();
                  const mark = isB ? (p.verification_status === 'API_VERIFIED' ? ' (✓ API)' : ' (⏳ API)') : '';
                  return `${label}${mark}: ${val}`;
                }).join(' · ');
                paymentBadge = `
                  <div style="display:grid; gap:3px;">
                    <span class="chip" style="background:#F3E8FF; color:#7E22CE; font-weight:700; font-size:11px; width:fit-content;">
                      ⚡ سداد مجزأ
                    </span>
                    <span style="font-size:11px; color:var(--muted-foreground); white-space:nowrap;" dir="ltr">${parts}</span>
                  </div>
                `;
              } else {
                const p = payments[0] || { method: 'CASH' };
                const isBankak = p.method === 'BANK_TRANSFER' || p.method === 'BANKAK';
                const bankakRef = p.evidence_reference || '';
                const vStatus = p.verification_status || (isBankak ? 'PENDING_VERIFICATION' : 'VERIFIED');
                if (isBankak) {
                  const isVerified = vStatus === 'API_VERIFIED';
                  paymentBadge = `
                    <div style="display:grid; gap:3px;">
                      <span class="chip" style="background:#EBF5FF; color:#0052CC; font-weight:700; font-size:11px;" title="${bankakRef || 'بنكك'}">
                        بنكك ${bankakRef ? `· ${bankakRef}` : ''}
                      </span>
                      ${isVerified ? `
                        <span class="chip" style="background:#ECFDF5; color:#059669; font-weight:700; font-size:10px; padding:1px 6px;" title="تمت المطابقة البنكية عبر API التطبيق الخارجي: ${p.provider_reference || ''}">
                          ✓ مطابق بنكياً (API)
                        </span>
                      ` : `
                        <span class="chip" style="background:#FEF3C7; color:#D97706; font-weight:700; font-size:10px; padding:1px 6px;" title="بانتظار مطابقة الإشعار عبر اتصال API بالتطبيق الخارجي">
                          ⏳ بانتظار مطابقة الـ API
                        </span>
                      `}
                    </div>
                  `;
                } else {
                  paymentBadge = `
                    <span class="chip" style="background:#ECFDF5; color:#00B37E; font-weight:700; font-size:11px;">
                      نقداً
                    </span>
                  `;
                }
              }

              const dateFormatted = new Date(s.created_at).toLocaleString('ar-SD', { dateStyle: 'short', timeStyle: 'short' });
              const itemsCount = (s.items || []).length;
              const itemsPreview = (s.items || []).map(i => `${i.nameAr || i.name} (${i.quantity})`).slice(0, 2).join('، ') + (itemsCount > 2 ? ` +${itemsCount - 2}` : '');
              const isReversed = s.status === 'REVERSED';

              const totalHtml = isReversed
                ? `<div style="display:grid; gap:1px;">
                     <s style="font-size:12px; color:var(--muted-foreground);" dir="ltr">${Number(s.totals?.total || 0).toLocaleString()}</s>
                     <strong style="font-size:12px; color:#DC2626;" dir="ltr">-${Number(s.totals?.total || 0).toLocaleString()}</strong>
                   </div>`
                : `<strong style="font-size:13px;" dir="ltr">${Number(s.totals?.total || 0).toLocaleString()}</strong>`;

              const statusHtml = isReversed
                ? `<span class="chip" style="background:#FEE2E2; color:#DC2626; border:1px solid #FECACA; font-weight:700; font-size:11px;" title="سبب الإرجاع: ${s.reversal_reason || 'مرتجع'}">
                     مرتجعة / ملغاة
                   </span>`
                : `<span class="chip chip-success" style="font-size:11px;">
                     مكتملة
                   </span>`;

              const canReverse = AuthService.hasCapability('sales.reverse') || AuthService.isManager();

              const actionsHtml = `
                <div style="display:flex; align-items:center; gap:6px; justify-content:flex-end;">
                  ${(!isReversed && hasUnverifiedBankak) ? `
                    <button class="btn-table-action btn-verify-bankak-action" data-inv="${s.invoice_number}" data-ref="${bankakPayments[0]?.evidence_reference || ''}" style="color:#0052CC; border-color:#B3D4FF; background:#F0F7FF;" title="فحص ومطابقة إشعار بنكك عبر اتصال الـ API الخارجي">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="11" cy="11" r="8"/>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                      </svg>
                      فحص API
                    </button>
                  ` : ''}
                  <button class="btn-table-action btn-print-receipt-action" data-inv="${s.invoice_number}" title="${isReversed ? 'معاينة وطباعة إشعار الدائن' : 'طباعة الإيصال الحراري 80mm'}">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="6 9 6 2 18 2 18 9" />
                      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                      <rect width="12" height="8" x="6" y="14" />
                    </svg>
                    ${isReversed ? 'إشعار دائن' : 'طباعة'}
                  </button>
                  ${!isReversed ? (
                    canReverse ? `
                      <button class="btn-table-action btn-return-sale-action" data-inv="${s.invoice_number}" style="color:#DC2626; border-color:#FECACA;" title="إرجاع الفاتورة واسترداد المخزون">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <polyline points="1 4 1 10 7 10" />
                          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                        </svg>
                        إرجاع
                      </button>
                    ` : `
                      <span class="chip" style="background:var(--muted); color:var(--muted-foreground); font-size:10.5px; font-weight:600; padding:2px 6px;" title="إرجاع الفاتورة يتطلب موافقة مدير الصيدلية">
                        🔒 بإذن المدير
                      </span>
                    `
                  ) : `
                    <span style="font-size:11px; color:#DC2626; font-weight:600; display:inline-flex; align-items:center; gap:3px;">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                      مسترد
                    </span>
                  `}
                </div>
              `;

              return `
                <tr style="${isReversed ? 'background:rgba(254, 226, 226, 0.2);' : ''}">
                  <td data-label="رقم الفاتورة">
                    <strong style="color:var(--primary); font-family:var(--font-mono); font-size:13px;" dir="ltr">${s.invoice_number}</strong>
                  </td>
                  <td data-label="التاريخ">
                    <span style="font-size:12px; color:var(--muted-foreground);">${dateFormatted}</span>
                  </td>
                  <td data-label="الكاشير">
                    <span style="font-size:12.5px; font-weight:600;">${s.cashier_name || 'د. أحمد الطاهر'}</span>
                  </td>
                  <td data-label="الأصناف">
                    <div style="font-size:12px;">
                      <span>${itemsPreview || `${itemsCount} صنف`}</span>
                    </div>
                  </td>
                  <td data-label="طريقة السداد">
                    ${paymentBadge}
                  </td>
                  <td data-label="الإجمالي">
                    ${totalHtml}
                  </td>
                  <td data-label="الحالة">
                    ${statusHtml}
                  </td>
                  <td data-label="إجراءات" style="text-align:left;">
                    ${actionsHtml}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;

    // Bind Bankak external API verify buttons
    el.querySelectorAll('.btn-verify-bankak-action').forEach(btn => {
      btn.addEventListener('click', async () => {
        const inv = btn.dataset.inv;
        const ref = btn.dataset.ref;
        btn.disabled = true;
        const origText = btn.innerHTML;
        btn.innerHTML = '⏳ جارِ الاتصال...';

        try {
          const res = await fetch('/api/integrations/bankak/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ invoiceNumber: inv, transactionReference: ref })
          });
          const data = await res.json();
          if (data.success && data.verificationStatus === 'API_VERIFIED') {
            if (window.showToast) {
              window.showToast('تمت المطابقة البنكية', `تم التحقق بنجاح عبر API بنكك! مرجع: ${data.providerReference}`, 'success');
            } else {
              alert(`✓ تم التحقق بنجاح عبر API بنكك!\nالمرجع البنكي: ${data.providerReference}`);
            }
            if (this.onReloadSales) {
              this.onReloadSales();
            } else {
              window.dispatchEvent(new CustomEvent('SALES_UPDATED'));
            }
          } else {
            const reason = data.reason || 'المعاملة قيد المراجعة في التطبيق الخارجي';
            if (window.showToast) {
              window.showToast('فحص الـ API', `لم تتم المطابقة بعد: ${reason}`, 'warning');
            } else {
              alert(`⚠️ لم تتم المطابقة بعد: ${reason}`);
            }
            btn.disabled = false;
            btn.innerHTML = origText;
          }
        } catch (err) {
          if (window.showToast) {
            window.showToast('خطأ بالاتصال', err.message, 'error');
          } else {
            alert(`خطأ في الاتصال بالـ API الخارجي: ${err.message}`);
          }
          btn.disabled = false;
          btn.innerHTML = origText;
        }
      });
    });

    // Bind print buttons
    el.querySelectorAll('.btn-print-receipt-action').forEach(btn => {
      btn.addEventListener('click', () => {
        const inv = btn.dataset.inv;
        if (this.onPrintReceipt) this.onPrintReceipt(inv);
      });
    });

    // Bind return buttons
    el.querySelectorAll('.btn-return-sale-action').forEach(btn => {
      btn.addEventListener('click', () => {
        const inv = btn.dataset.inv;
        const sale = sales.find(s => s.invoice_number === inv);
        if (this.onReturnSale && sale) this.onReturnSale(sale);
      });
    });
  }
}
