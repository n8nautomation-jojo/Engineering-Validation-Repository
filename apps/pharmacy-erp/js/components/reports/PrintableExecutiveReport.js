import { SettingsService } from '../../services/settingsService.js';

export class PrintableExecutiveReport {
  constructor() {
    this.dialog = document.getElementById('dialog-executive-report');
    this.closeBtn = document.getElementById('btn-close-executive-report');
    this.printBtn = document.getElementById('btn-print-executive-report-doc');
    this.contentEl = document.getElementById('executive-report-modal-content');
    this.init();
  }

  init() {
    if (!this.dialog) return;

    this.closeBtn?.addEventListener('click', () => this.close());
    this.dialog.addEventListener('click', (e) => {
      if (e.target === this.dialog) this.close();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !this.dialog.classList.contains('hidden')) {
        this.close();
      }
    });

    this.printBtn?.addEventListener('click', () => {
      window.print();
    });
  }

  open(data) {
    if (!data) return;
    this.render(data);
    this.dialog?.classList.remove('hidden');
  }

  close() {
    this.dialog?.classList.add('hidden');
  }

  render(data) {
    if (!this.contentEl) return;

    const s = SettingsService.getCachedSettings() || {
      pharmacyName: 'صيدلية النيلين النموذجية',
      branchName: 'فرع الخرطوم الرئيسي',
      licenseNumber: 'MOH-SD-KHT-2024-8841',
      taxRegistrationNumber: 'TRN-10294819'
    };

    const { summary, categoryData, inventoryHealth, topProducts, periodLabel } = data;
    const m = summary?.metrics || { grossRevenue: 0, reversedAmount: 0, netRevenue: 0, salesCount: 0, totalItemsSold: 0, averageBasket: 0 };
    const p = summary?.paymentBreakdown || { cash: { amount: 0, percentage: 0 }, bankak: { amount: 0, percentage: 0 }, card: { amount: 0, percentage: 0 }, insurance: { amount: 0, percentage: 0 } };
    const inv = inventoryHealth?.summary || { totalStockUnits: 0, totalStockValue: 0, lowStockCount: 0, expiringCount: 0 };

    const todayStr = new Date().toLocaleDateString('ar-SD', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    this.contentEl.innerHTML = `
      <div class="printable-doc" style="background:#fff; color:#111; padding:24px; border-radius:12px; font-family:var(--font-sans, system-ui);">
        <!-- Official Pharmacy Header -->
        <div style="border-bottom:2px solid #0f172a; padding-bottom:14px; margin-bottom:16px; display:flex; justify-content:space-between; align-items:flex-start;">
          <div>
            <h2 style="margin:0; font-size:20px; font-weight:800; color:#0052CC;">منظومة فارما تك — PharmaTech OS</h2>
            <div style="font-size:13px; font-weight:700; margin-top:2px;">${s.pharmacyName} — ${s.branchName}</div>
            <div style="font-size:11px; color:#64748b; margin-top:3px;">
              ترخيص وزارة الصحة: <strong>${s.licenseNumber}</strong> · الرقم الضريبي: <strong>${s.taxRegistrationNumber}</strong>
            </div>
          </div>
          <div style="text-align:left;">
            <div style="border:1px solid #cbd5e1; border-radius:6px; padding:6px 10px; font-size:11px; background:#f8fafc;">
              <div>كشف الحساب المالي الرسمي</div>
              <strong style="font-size:12px; color:#0052CC;">${periodLabel || 'الفترة المالية الحالية'}</strong>
            </div>
            <div style="font-size:10.5px; color:#64748b; margin-top:4px;">تاريخ الاستخراج: ${todayStr}</div>
          </div>
        </div>

        <!-- Executive Summary Cards -->
        <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:10px; margin-bottom:18px;">
          <div style="background:#f1f5f9; padding:10px; border-radius:8px; border:1px solid #e2e8f0;">
            <small style="color:#64748b; font-size:11px; display:block;">صافي الإيراد المحقق</small>
            <strong style="font-size:15px; color:#0052CC;">${Number(m.netRevenue).toLocaleString('en-US')} ج.س</strong>
          </div>
          <div style="background:#f1f5f9; padding:10px; border-radius:8px; border:1px solid #e2e8f0;">
            <small style="color:#64748b; font-size:11px; display:block;">تسويات بنكك (Bankak)</small>
            <strong style="font-size:15px; color:#0f766e;">${Number(p.bankak.amount).toLocaleString('en-US')} ج.س</strong>
          </div>
          <div style="background:#f1f5f9; padding:10px; border-radius:8px; border:1px solid #e2e8f0;">
            <small style="color:#64748b; font-size:11px; display:block;">النقد الفعلي بالخزينة</small>
            <strong style="font-size:15px; color:#b45309;">${Number(p.cash.amount).toLocaleString('en-US')} ج.س</strong>
          </div>
          <div style="background:#f1f5f9; padding:10px; border-radius:8px; border:1px solid #e2e8f0;">
            <small style="color:#64748b; font-size:11px; display:block;">الفواتير الصادرة</small>
            <strong style="font-size:15px; color:#475569;">${m.salesCount} فاتورة</strong>
          </div>
        </div>

        <!-- Payments Breakdown Table -->
        <h4 style="font-size:13px; margin:0 0 8px; border-bottom:1px solid #e2e8f0; padding-bottom:4px;">1. تحليل وسائل الدفع والمقبوضات:</h4>
        <table style="width:100%; border-collapse:collapse; font-size:11.5px; margin-bottom:18px;">
          <thead>
            <tr style="background:#f8fafc; text-align:right; border-bottom:1px solid #cbd5e1;">
              <th style="padding:6px;">وسيلة الدفع</th>
              <th style="padding:6px;">المبلغ (ج.س)</th>
              <th style="padding:6px;">النسبة</th>
              <th style="padding:6px;">الحالة والملاحظات</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom:1px solid #f1f5f9;">
              <td style="padding:6px;">📱 تطبيق بنكك (Bankak Transfer)</td>
              <td style="padding:6px; font-weight:700;">${Number(p.bankak.amount).toLocaleString('en-US')}</td>
              <td style="padding:6px;">${p.bankak.percentage}%</td>
              <td style="padding:6px; color:#0f766e;">إشعارات رقمية موثقة برقم المعاملة</td>
            </tr>
            <tr style="border-bottom:1px solid #f1f5f9;">
              <td style="padding:6px;">💵 نقد في الدرج (Cash Drawer)</td>
              <td style="padding:6px; font-weight:700;">${Number(p.cash.amount).toLocaleString('en-US')}</td>
              <td style="padding:6px;">${p.cash.percentage}%</td>
              <td style="padding:6px; color:#b45309;">مستلم بالدرج وخاضع لتقرير Z</td>
            </tr>
            <tr style="border-bottom:1px solid #f1f5f9;">
              <td style="padding:6px;">💳 بطاقات مصرفية (POS/ATM)</td>
              <td style="padding:6px; font-weight:700;">${Number(p.card.amount).toLocaleString('en-US')}</td>
              <td style="padding:6px;">${p.card.percentage}%</td>
              <td style="padding:6px;">إيصالات نقاط البيع</td>
            </tr>
            <tr style="border-bottom:1px solid #f1f5f9;">
              <td style="padding:6px;">🏥 التأمين الصحي والشركات</td>
              <td style="padding:6px; font-weight:700;">${Number(p.insurance.amount).toLocaleString('en-US')}</td>
              <td style="padding:6px;">${p.insurance.percentage}%</td>
              <td style="padding:6px;">مطالبات آجلة</td>
            </tr>
          </tbody>
        </table>

        <!-- Top Selling Medicines -->
        <h4 style="font-size:13px; margin:0 0 8px; border-bottom:1px solid #e2e8f0; padding-bottom:4px;">2. الأدوية الأعلى إيراداً للفترة:</h4>
        <table style="width:100%; border-collapse:collapse; font-size:11px; margin-bottom:18px;">
          <thead>
            <tr style="background:#f8fafc; text-align:right; border-bottom:1px solid #cbd5e1;">
              <th style="padding:6px;">الدواء</th>
              <th style="padding:6px;">الكمية المباعة</th>
              <th style="padding:6px;">إجمالي الإيراد (ج.س)</th>
            </tr>
          </thead>
          <tbody>
            ${(topProducts || []).slice(0, 5).map(item => `
              <tr style="border-bottom:1px solid #f1f5f9;">
                <td style="padding:6px;"><strong>${item.name}</strong></td>
                <td style="padding:6px;">${item.totalQuantity} وحدة</td>
                <td style="padding:6px; font-weight:700; color:#0052CC;">${Number(item.totalRevenue).toLocaleString('en-US')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <!-- Audit & Signatures -->
        <div style="margin-top:24px; padding-top:14px; border-top:1px solid #0f172a; display:flex; justify-content:space-between; align-items:center;">
          <div style="font-size:11px; color:#475569;">
            <div>الصيدلي المسؤول: <strong>د. أحمد الطاهر</strong></div>
            <div style="margin-top:2px;">التوقيع: .......................................</div>
          </div>
          <div style="text-align:center; border:2px dashed #94a3b8; border-radius:8px; padding:10px 24px; font-size:11px; color:#64748b;">
            ختم الصيدلية الرسمي المعتمد
          </div>
          <div style="font-size:11px; color:#475569; text-align:left;">
            <div>المراجعة والتدقيق المالي</div>
            <div style="margin-top:2px;">التاريخ: ${new Date().toISOString().split('T')[0]}</div>
          </div>
        </div>
      </div>
    `;
  }
}
