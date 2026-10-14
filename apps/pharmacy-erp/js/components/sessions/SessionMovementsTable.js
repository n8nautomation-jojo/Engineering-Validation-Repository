/**
 * PharmaTech — Cash Session Movements Table Component
 * Renders the ledger of cash additions, withdrawals, and opening balance for the active shift
 */

export class SessionMovementsTable {
  constructor(containerId = 'session-movements-table-container') {
    this.containerId = containerId;
  }

  render(session) {
    const el = document.getElementById(this.containerId);
    if (!el) return;

    const movements = session?.movements || [];

    if (movements.length === 0) {
      el.innerHTML = `
        <div class="table-scroll">
          <table class="data-table">
            <tbody>
              <tr>
                <td colspan="5" style="text-align:center; padding:35px; color:var(--muted-foreground);">
                  <div style="display:grid; place-items:center; gap:8px;">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                      <rect width="20" height="14" x="2" y="5" rx="2" />
                      <line x1="2" x2="22" y1="10" y2="10" />
                    </svg>
                    <span>لا توجد حركات نقدية مسجلة في الوردية الحالية بعد</span>
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
              <th>نوع الحركة</th>
              <th>المبلغ</th>
              <th>الوقت والتاريخ</th>
              <th>السبب / البيان</th>
              <th style="text-align:left;">حالة التأكيد</th>
            </tr>
          </thead>
          <tbody>
            ${movements.map(mov => {
              const isOpening = mov.type === 'OPENING_FLOAT';
              const isCashIn = mov.type === 'CASH_IN';
              const isCashOut = mov.type === 'CASH_OUT';
              const typeLabel = isOpening ? 'رصيد افتتاحي' : isCashIn ? 'إيداع نقدي (+)' : 'سحب مصروفات (-)';
              const typeColor = isOpening ? '#0052CC' : isCashIn ? '#00B37E' : '#E11D48';
              const typeBg = isOpening ? '#EBF5FF' : isCashIn ? '#ECFDF5' : '#FFF1F2';
              const timeStr = new Date(mov.occurredAt).toLocaleString('ar-SD', { dateStyle: 'short', timeStyle: 'short' });

              return `
                <tr>
                  <td>
                    <span class="chip" style="background:${typeBg}; color:${typeColor}; font-weight:700;">
                      ${typeLabel}
                    </span>
                  </td>
                  <td>
                    <strong style="color:${typeColor}; font-size:13.5px;" dir="ltr">
                      ${isCashOut ? '-' : '+'}${Number(mov.amount?.value || mov.amount).toLocaleString()} ج.س
                    </strong>
                  </td>
                  <td>
                    <span style="font-size:12px; color:var(--muted-foreground);">${timeStr}</span>
                  </td>
                  <td>
                    <span style="font-weight:600;">${mov.reason || 'حركة خزينة'}</span>
                  </td>
                  <td style="text-align:left;">
                    <span class="chip chip-success">مؤكدة بالدرج</span>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  }
}
