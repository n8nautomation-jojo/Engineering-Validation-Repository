/**
 * PharmaTech — Past Sessions & Z-Reports Archive Table Component
 * Displays historical shifts with reconciliation metrics, variances, and 80mm Z-Report reprints
 */

export class SessionHistoryTable {
  constructor(containerId = 'session-history-table-container', { onPrintZReport }) {
    this.containerId = containerId;
    this.onPrintZReport = onPrintZReport;
  }

  render(history = []) {
    const el = document.getElementById(this.containerId);
    if (!el) return;

    if (history.length === 0) {
      el.innerHTML = `
        <div class="table-scroll">
          <table class="data-table">
            <tbody>
              <tr>
                <td colspan="9" style="text-align:center; padding:35px; color:var(--muted-foreground);">
                  <div style="display:grid; place-items:center; gap:8px;">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    <span>لا توجد ورديات سابقة مؤرشفة في النظام بعد</span>
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
              <th>رقم تقرير Z</th>
              <th>وقت فتح الوردية</th>
              <th>وقت إغلاق الوردية</th>
              <th>الكاشير المسؤول</th>
              <th>مبيعات بنكك</th>
              <th>النقدية المتوقعة</th>
              <th>النقدية المعدودة</th>
              <th>فارق المطابقة</th>
              <th style="text-align:left;">تقرير Z</th>
            </tr>
          </thead>
          <tbody>
            ${history.map(h => {
              const zNo = h.zReport?.zReportNumber || 'Z-REPORT';
              const openTime = new Date(h.openedAt).toLocaleString('ar-SD', { dateStyle: 'short', timeStyle: 'short' });
              const closeTime = h.closedAt ? new Date(h.closedAt).toLocaleString('ar-SD', { dateStyle: 'short', timeStyle: 'short' }) : 'غير محدد';
              const variance = h.variance || 0;
              const varianceColor = variance === 0 ? '#00B37E' : variance < 0 ? '#E11D48' : '#0052CC';
              const varianceLabel = variance === 0 ? 'مطابق (0)' : variance < 0 ? `عجز (${Math.abs(variance).toLocaleString()})` : `زيادة (+${variance.toLocaleString()})`;

              return `
                <tr>
                  <td>
                    <strong style="color:var(--primary); font-family:var(--font-mono); font-size:12.5px;" dir="ltr">${zNo}</strong>
                  </td>
                  <td><span style="font-size:12px; color:var(--muted-foreground);">${openTime}</span></td>
                  <td><span style="font-size:12px; color:var(--muted-foreground);">${closeTime}</span></td>
                  <td><strong>${h.cashierName || 'د. أحمد'}</strong></td>
                  <td dir="ltr" style="color:#0052CC; font-weight:700;">${Number(h.metrics?.bankakSales || 0).toLocaleString()} ج.س</td>
                  <td dir="ltr">${Number(h.metrics?.expectedCash || 0).toLocaleString()} ج.س</td>
                  <td dir="ltr"><strong>${Number(h.countedCash || h.metrics?.countedCash || 0).toLocaleString()} ج.س</strong></td>
                  <td>
                    <span class="chip" style="color:${varianceColor}; font-weight:700;">
                      ${varianceLabel}
                    </span>
                  </td>
                  <td style="text-align:left;">
                    <button class="btn-table-action btn-print-z-action" data-session-id="${h.cashSessionId}" title="طباعة تقرير Z الحراري 80mm">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="6 9 6 2 18 2 18 9" />
                        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                        <rect width="12" height="8" x="6" y="14" />
                      </svg>
                      طباعة Z-Report
                    </button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;

    // Bind Z-Report buttons
    el.querySelectorAll('.btn-print-z-action').forEach(btn => {
      btn.addEventListener('click', () => {
        const sid = btn.dataset.sessionId;
        if (this.onPrintZReport) this.onPrintZReport(sid);
      });
    });
  }
}
