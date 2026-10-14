/**
 * PharmaTech — Cash Session Status Banner Component
 * Displays current shift state, active cashier, register ID, start time, and operational action triggers
 */

export class SessionStatusBanner {
  constructor(containerId = 'session-status-banner-container', { onCashIn, onCashOut, onCloseShift, onOpenShift }) {
    this.containerId = containerId;
    this.onCashIn = onCashIn;
    this.onCashOut = onCashOut;
    this.onCloseShift = onCloseShift;
    this.onOpenShift = onOpenShift;
  }

  render(session) {
    const el = document.getElementById(this.containerId);
    if (!el) return;

    const isOpen = session && session.status === 'OPEN';
    const openedAtStr = session?.openedAt 
      ? new Date(session.openedAt).toLocaleString('ar-SD', { dateStyle: 'short', timeStyle: 'short' }) 
      : 'غير مفتوحة';

    el.innerHTML = `
      <div style="background:var(--card); border:1px solid var(--border); border-radius:12px; padding:16px 20px; margin-bottom:20px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
        <div style="display:flex; align-items:center; gap:12px;">
          <span class="title-icon lg" style="${isOpen ? 'background:rgba(0,179,126,0.12); color:#00B37E;' : 'background:rgba(225,29,72,0.12); color:#E11D48;'}">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect width="20" height="14" x="2" y="5" rx="2" />
              <line x1="2" x2="22" y1="10" y2="10" />
            </svg>
          </span>
          <div>
            <div style="display:flex; align-items:center; gap:8px;">
              <h2 style="font-size:17px; font-weight:800; margin:0;">جلسة الخزينة (الوردية الحالية)</h2>
              <span class="chip ${isOpen ? 'chip-success' : 'chip-warning'}">
                ${isOpen ? 'الوردية مفتوحة (OPEN)' : 'الوردية مغلقة (CLOSED)'}
              </span>
            </div>
            <p style="font-size:12.5px; color:var(--muted-foreground); margin:2px 0 0;">
              الكاشير: <strong>${session?.cashierName || 'د. أحمد الطاهر'}</strong> · نقطة الصرف: <strong>REG-01</strong> · وقت البدء: <span dir="ltr">${openedAtStr}</span>
            </p>
          </div>
        </div>

        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
          ${isOpen ? `
            <button class="btn-secondary" id="btn-session-cash-in" style="color:#00B37E; border-color:#A7F3D0;">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14m-7-7h14"/></svg>
              إيداع نقدي
            </button>
            <button class="btn-secondary" id="btn-session-cash-out" style="color:#E11D48; border-color:#FECDD3;">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14"/></svg>
              سحب مصروفات
            </button>
            <button class="btn-primary" id="btn-session-close-shift" style="background:var(--destructive); border-color:var(--destructive);">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" x2="9" y1="9" y2="15"/><line x1="9" x2="15" y1="9" y2="15"/></svg>
              إغلاق الوردية وتقرير Z
            </button>
          ` : `
            <button class="btn-primary" id="btn-session-open-shift">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14m-7-7h14"/></svg>
              فتح وردية جديدة
            </button>
          `}
        </div>
      </div>
    `;

    // Bind event listeners
    document.getElementById('btn-session-cash-in')?.addEventListener('click', () => {
      if (this.onCashIn) this.onCashIn();
    });

    document.getElementById('btn-session-cash-out')?.addEventListener('click', () => {
      if (this.onCashOut) this.onCashOut();
    });

    document.getElementById('btn-session-close-shift')?.addEventListener('click', () => {
      if (this.onCloseShift) this.onCloseShift();
    });

    document.getElementById('btn-session-open-shift')?.addEventListener('click', () => {
      if (this.onOpenShift) this.onOpenShift();
    });
  }
}
