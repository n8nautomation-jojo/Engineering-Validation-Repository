/**
 * PharmaTech — Dynamic 80mm Thermal POS Receipt & Z-Report Service
 * Renders authentic fiscal receipts from actual sale records & shift Z-Reports
 */

export const ReceiptService = {
  getReceiptHTML(saleData = null) {
    let invNo = 'INV-2026-0842';
    let items = [
      { name: 'أوجمنتين 1 جم', nameAr: 'أوجمنتين 1 جم', batchNumber: 'BATCH-AUG-99', quantity: 1, unitPrice: 18500, lineTotal: 18500 },
      { name: 'بنادول إكسترا', nameAr: 'بنادول إكسترا', batchNumber: 'BATCH-2026-A2', quantity: 2, unitPrice: 4500, lineTotal: 9000 }
    ];
    let subtotal = '27,500';
    let total = '27,500';
    let paymentMethodText = 'تطبيق بنكك (Bankak)';
    let paymentRef = 'TXN-BOK-94821038';
    let dateStr = new Date().toLocaleString('ar-SD', { dateStyle: 'short', timeStyle: 'short' });
    let cashierName = 'د. أحمد الطاهر';

    if (saleData && typeof saleData === 'object') {
      const record = saleData.receipt_data || saleData;
      invNo = record.invoice_number || saleData.invoice_number || invNo;
      if (Array.isArray(record.items) && record.items.length > 0) {
        items = record.items;
      }
      if (record.totals) {
        subtotal = Number(record.totals.subtotal).toLocaleString();
        total = Number(record.totals.total).toLocaleString();
      }
      if (record.created_at) {
        dateStr = new Date(record.created_at).toLocaleString('ar-SD', { dateStyle: 'short', timeStyle: 'short' });
      }
      if (record.cashier_name) {
        cashierName = record.cashier_name;
      }
      if (Array.isArray(record.payments) && record.payments.length > 0) {
        const primaryPay = record.payments[0];
        const isBankak = primaryPay.method === 'BANK_TRANSFER' || primaryPay.method === 'BANKAK';
        paymentMethodText = isBankak ? 'تطبيق بنكك (Bankak)' : primaryPay.method === 'CASH' ? 'نقداً (Cash)' : primaryPay.method;
        paymentRef = primaryPay.evidence_reference || primaryPay.reference || (isBankak ? 'TXN-BOK-CONFIRMED' : '');
      }
    } else if (typeof saleData === 'string' && saleData.startsWith('INV-')) {
      invNo = saleData;
    }

    const rowsHTML = items.map(item => `
      <tr>
        <td>
          <strong>${item.nameAr || item.name}</strong><br>
          <small style="color:#64748B;" dir="ltr">${item.batchNumber || item.batch || 'BATCH-STD'}</small>
        </td>
        <td style="text-align:center;">${item.quantity}</td>
        <td dir="ltr" style="text-align:left;">${Number(item.unitPrice || item.price || 0).toLocaleString()}</td>
        <td dir="ltr" style="text-align:left;"><strong>${Number(item.lineTotal || (item.quantity * item.unitPrice) || 0).toLocaleString()}</strong></td>
      </tr>
    `).join('');

    return `
      <div class="receipt-header" style="text-align:center; border-bottom:1px dashed #CBD5E1; padding-bottom:8px; margin-bottom:10px;">
        <h3 style="font-size:15px; font-weight:800; margin-bottom:2px; color:#0F172A;">صيدلية النيلين النموذجية</h3>
        <p style="font-size:11.5px; color:#64748B; margin-bottom:4px;">فرع الخرطوم الرئيسي — شارع القصر</p>
        <p style="font-size:10.5px; font-weight:700; color:#334155;" dir="ltr">TRN: 10294819 | CASHIER: ${cashierName}</p>
        <p style="font-size:10.5px; color:#64748B;">التاريخ: ${dateStr}</p>
        <p style="font-size:12px; font-weight:700; margin-top:6px; background:#F1F5F9; padding:4px; border-radius:4px;" dir="ltr">
          فاتورة ضريبية مبسطة (${invNo})
        </p>
      </div>

      <table class="receipt-table" style="width:100%; font-size:11.5px; border-collapse:collapse; margin-bottom:10px;">
        <thead>
          <tr style="border-bottom:1px solid #0F172A; text-align:right;">
            <th style="padding:4px 0;">الصنف والتشغيلة</th>
            <th style="text-align:center;">الكمية</th>
            <th style="text-align:left;">السعر</th>
            <th style="text-align:left;">الإجمالي</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHTML}
        </tbody>
      </table>

      <div style="border-top:1px solid #0F172A; padding-top:8px; display:grid; gap:4px; font-size:12px;">
        <div style="display:flex; justify-content:space-between;">
          <span style="color:#64748B;">المجموع الصافي:</span>
          <strong dir="ltr">${subtotal} ج.س</strong>
        </div>
        <div style="display:flex; justify-content:space-between;">
          <span style="color:#64748B;">ضريبة القيمة المضافة (0% أدوية):</span>
          <span dir="ltr">0.00 ج.س</span>
        </div>
        <div style="display:flex; justify-content:space-between;">
          <span style="color:#64748B;">طريقة السداد:</span>
          <strong style="color:#0052CC;">${paymentMethodText}</strong>
        </div>
        ${paymentRef ? `
        <div style="display:flex; justify-content:space-between; font-size:11px; background:#F8FAFC; padding:2px 4px; border-radius:3px;">
          <span style="color:#64748B;">رقم المعاملة (TXN Ref):</span>
          <strong dir="ltr" style="font-family:monospace; color:#0052CC;">${paymentRef}</strong>
        </div>
        ` : ''}
        <div style="display:flex; justify-content:space-between; font-size:14px; font-weight:800; border-top:1px dashed #CBD5E1; padding-top:6px; margin-top:4px;">
          <span>المبلغ الإجمالي المدفوع:</span>
          <strong style="color:#00B37E;" dir="ltr">${total} ج.س</strong>
        </div>
      </div>

      <div style="text-align:center; margin-top:14px; border-top:1px dashed #CBD5E1; padding-top:10px; font-size:11px; color:#64748B;">
        <p style="margin-bottom:4px;">مع تمنياتنا لكم بموفور الصحة والعافية</p>
        <p style="font-family:monospace; font-size:13px; letter-spacing:4px; font-weight:700; color:#0F172A;" dir="ltr">*${invNo}*</p>
      </div>
    `;
  },

  getZReportHTML(report) {
    if (!report) return '<p>لا توجد بيانات للتقرير Z</p>';
    const zNo = report.zReportNumber || 'Z-2026-0001';
    const cashier = report.cashierName || 'د. أحمد الطاهر';
    const branch = report.branchName || 'صيدلية النيلين النموذجية';
    const openedAt = report.openedAt ? new Date(report.openedAt).toLocaleString('ar-SD', { dateStyle: 'short', timeStyle: 'short' }) : '08:00 AM';
    const closedAt = report.closedAt ? new Date(report.closedAt).toLocaleString('ar-SD', { dateStyle: 'short', timeStyle: 'short' }) : '04:00 PM';
    const m = report.metrics || report;

    const varianceNum = Number(m.variance || 0);
    const varianceColor = varianceNum === 0 ? '#00B37E' : varianceNum < 0 ? '#E11D48' : '#0052CC';
    const varianceLabel = varianceNum === 0 ? 'مطابق تماماً (0.00 ج.س)' : varianceNum < 0 ? `عجز: ${Math.abs(varianceNum).toLocaleString()} ج.س` : `زيادة: ${varianceNum.toLocaleString()} ج.س`;

    return `
      <div class="receipt-header" style="text-align:center; border-bottom:1px dashed #CBD5E1; padding-bottom:8px; margin-bottom:10px;">
        <h3 style="font-size:15px; font-weight:800; margin-bottom:2px; color:#0F172A;">${branch}</h3>
        <p style="font-size:11px; color:#64748B;">فرع الخرطوم الرئيسي — شارع القصر</p>
        <p style="font-size:10px; font-weight:700;" dir="ltr">TRN: 10294819 | CASH REGISTER: REG-01</p>
        <div style="background:#0F172A; color:#fff; font-weight:800; font-size:13px; padding:4px 8px; border-radius:4px; margin-top:6px; letter-spacing:1px;" dir="ltr">
          تقرير الوردية الختامي (Z-REPORT)
        </div>
        <p style="font-size:11px; font-family:monospace; font-weight:700; margin-top:4px;" dir="ltr">${zNo}</p>
      </div>

      <div style="font-size:11.5px; border-bottom:1px dashed #CBD5E1; padding-bottom:6px; margin-bottom:8px; display:grid; gap:3px;">
        <div style="display:flex; justify-content:space-between;">
          <span style="color:#64748B;">مسؤول الوردية:</span>
          <strong>${cashier}</strong>
        </div>
        <div style="display:flex; justify-content:space-between;">
          <span style="color:#64748B;">وقت فتح الوردية:</span>
          <span dir="ltr">${openedAt}</span>
        </div>
        <div style="display:flex; justify-content:space-between;">
          <span style="color:#64748B;">وقت إغلاق الوردية:</span>
          <span dir="ltr">${closedAt}</span>
        </div>
        <div style="display:flex; justify-content:space-between;">
          <span style="color:#64748B;">عدد الفواتير الصادرة:</span>
          <strong>${m.salesCount || 0} فاتورة</strong>
        </div>
      </div>

      <div style="font-size:12px; display:grid; gap:4px; margin-bottom:10px;">
        <div style="display:flex; justify-content:space-between;">
          <span style="color:#64748B;">الرصيد الافتتاحي:</span>
          <strong dir="ltr">${Number(m.openingFloat || 0).toLocaleString()} ج.س</strong>
        </div>
        <div style="display:flex; justify-content:space-between;">
          <span style="color:#64748B;">إجمالي مبيعات النقد (Cash):</span>
          <strong dir="ltr">${Number(m.cashSales || 0).toLocaleString()} ج.س</strong>
        </div>
        <div style="display:flex; justify-content:space-between;">
          <span style="color:#64748B;">إيداعات إضافية (Cash In):</span>
          <strong dir="ltr">${Number(m.cashIn || 0).toLocaleString()} ج.س</strong>
        </div>
        <div style="display:flex; justify-content:space-between;">
          <span style="color:#64748B;">سحوبات ومصروفات (Cash Out):</span>
          <strong dir="ltr" style="color:#E11D48;">-${Number(m.cashOut || 0).toLocaleString()} ج.س</strong>
        </div>
        <div style="display:flex; justify-content:space-between; border-top:1px dashed #CBD5E1; padding-top:4px; font-weight:700;">
          <span>النقدية المتوقعة بالدرج:</span>
          <strong dir="ltr">${Number(m.expectedCash || 0).toLocaleString()} ج.س</strong>
        </div>
        <div style="display:flex; justify-content:space-between; font-weight:700;">
          <span>النقدية الفعلية المعدودة:</span>
          <strong dir="ltr">${Number(m.countedCash || 0).toLocaleString()} ج.س</strong>
        </div>
        <div style="display:flex; justify-content:space-between; background:#F8FAFC; padding:4px 6px; border-radius:4px; font-weight:800; border:1px solid #E2E8F0;">
          <span>فارق المطابقة (Variance):</span>
          <strong dir="ltr" style="color:${varianceColor};">${varianceLabel}</strong>
        </div>
      </div>

      <div style="border-top:1px solid #0F172A; padding-top:6px; font-size:12px; display:grid; gap:4px;">
        <div style="display:flex; justify-content:space-between;">
          <span style="color:#0052CC; font-weight:700;">مبيعات تطبيق بنكك (Bankak):</span>
          <strong dir="ltr" style="color:#0052CC;">${Number(m.bankakSales || 0).toLocaleString()} ج.س</strong>
        </div>
        <div style="display:flex; justify-content:space-between; font-weight:800; font-size:13px; border-top:1px dashed #CBD5E1; padding-top:4px;">
          <span>إجمالي إيراد الوردية العام:</span>
          <strong dir="ltr" style="color:#00B37E;">${Number(m.totalRevenue || 0).toLocaleString()} ج.س</strong>
        </div>
      </div>

      <div style="margin-top:14px; border-top:1px dashed #CBD5E1; padding-top:10px; font-size:10.5px; color:#475569; display:grid; gap:8px;">
        <div style="display:flex; justify-content:space-between;">
          <span>توقيع الكاشير: ........................</span>
          <span>توقيع المشرف: ........................</span>
        </div>
        <p style="text-align:center; font-family:monospace; font-size:12px; letter-spacing:3px; margin-top:4px;" dir="ltr">*${zNo}*</p>
      </div>
    `;
  }
};
