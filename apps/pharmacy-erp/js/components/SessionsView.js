/**
 * PharmaTech — Cash Sessions & Drawer Management Component
 * Controls live cash drawer tracking, cash in/out movements, shift reconciliation and Z-Reports
 */

import { cashSessionService } from '../services/cashSessionService.js';
import { ReceiptService } from '../services/receiptService.js';
import { showToast } from './Toast.js';

export class SessionsView {
  constructor() {
    this.container = document.getElementById('sessions-view');
    this.activeTab = 'movements'; // 'movements' | 'history'

    this.init();
  }

  init() {
    if (!this.container) return;

    window.addEventListener('SESSION_UPDATED', () => this.loadAndRender());
    window.addEventListener('SALES_UPDATED', () => this.loadAndRender());

    this.loadAndRender();
  }

  async loadAndRender() {
    await cashSessionService.fetchAllSessions();
    this.render();
  }

  render() {
    if (!this.container) return;

    const session = cashSessionService.currentSession;
    const history = cashSessionService.history || [];
    const isOpen = session && session.status === 'OPEN';
    const m = session?.metrics || {
      openingFloat: 0,
      cashSales: 0,
      bankakSales: 0,
      cashIn: 0,
      cashOut: 0,
      expectedCash: 0,
      totalRevenue: 0,
      salesCount: 0
    };

    const openedAtStr = session?.openedAt 
      ? new Date(session.openedAt).toLocaleString('ar-SD', { dateStyle: 'short', timeStyle: 'short' }) 
      : 'غير مفتوحة';

    this.container.innerHTML = `
      <!-- Top Shift Status Banner -->
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

        <!-- Shift Quick Actions -->
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

      <!-- Live Shift Financial Metrics -->
      <div class="stats-grid" style="margin-bottom:20px;">
        <!-- Card 1: Expected Drawer Cash -->
        <div class="stat-card featured">
          <div class="stat-top">
            <span class="stat-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect width="20" height="14" x="2" y="5" rx="2" />
                <line x1="2" x2="22" y1="10" y2="10" />
              </svg>
            </span>
            <span class="chip chip-success">نقدية الدرج الفعلية</span>
          </div>
          <div class="stat-value num" dir="ltr">${Number(m.expectedCash).toLocaleString()} <small>ج.س</small></div>
          <div class="stat-label">النقدية المتوقعة بالدرج (افتتاحي + كاش ± حركات)</div>
        </div>

        <!-- Card 2: Bankak Electronic Sales -->
        <div class="stat-card">
          <div class="stat-top">
            <span class="stat-icon" style="background:#EBF5FF; color:#0052CC;">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5"/>
              </svg>
            </span>
            <span class="chip" style="background:#EBF5FF; color:#0052CC; font-weight:700;">بنكك (إلكتروني)</span>
          </div>
          <div class="stat-value num" dir="ltr" style="color:#0052CC;">${Number(m.bankakSales).toLocaleString()} <small>ج.س</small></div>
          <div class="stat-label">مبيعات تطبيق بنكك (تستثنى من نقدية الدرج)</div>
        </div>

        <!-- Card 3: Direct Cash Sales -->
        <div class="stat-card">
          <div class="stat-top">
            <span class="stat-icon" style="background:#ECFDF5; color:#00B37E;">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
                <path d="M12 18V6" />
              </svg>
            </span>
            <span class="chip chip-success">${m.salesCount} فواتير</span>
          </div>
          <div class="stat-value num" dir="ltr" style="color:#00B37E;">${Number(m.cashSales).toLocaleString()} <small>ج.س</small></div>
          <div class="stat-label">إجمالي المقبوضات النقدية من المبيعات</div>
        </div>

        <!-- Card 4: Opening Float & Movements -->
        <div class="stat-card">
          <div class="stat-top">
            <span class="stat-icon warning">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
                <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
              </svg>
            </span>
            <span class="chip" style="font-weight:700;">الرصيد الابتدائي</span>
          </div>
          <div class="stat-value num" dir="ltr">${Number(m.openingFloat).toLocaleString()} <small>ج.س</small></div>
          <div class="stat-label">الافتتاحي: ${Number(m.openingFloat).toLocaleString()} | سحب: ${Number(m.cashOut).toLocaleString()} ج.س</div>
        </div>
      </div>

      <!-- Main Panels: Tabbed Interface -->
      <div class="panel-head wrap" style="border-bottom:1px solid var(--border); padding-bottom:12px; margin-bottom:14px;">
        <div class="panel-title">
          <span class="title-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect width="18" height="18" x="3" y="4" rx="2" />
              <line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" />
            </svg>
          </span>
          <h2>سجل حركات الخزينة وتقارير Z</h2>
        </div>

        <div class="segmented" id="sessions-tab-segmented">
          <button data-tab="movements" class="${this.activeTab === 'movements' ? 'active' : ''}">
            حركات نقدية الوردية (${(session?.movements || []).length})
          </button>
          <button data-tab="history" class="${this.activeTab === 'history' ? 'active' : ''}">
            سجل الورديات السابقة (${history.length})
          </button>
        </div>
      </div>

      <!-- Tab Content 1: Active Session Movements -->
      ${this.activeTab === 'movements' ? `
        <div class="table-scroll">
          <table class="data-table">
            <thead>
              <tr>
                <th>نوع الحركة النقدية</th>
                <th>المبلغ (ج.س)</th>
                <th>التاريخ والوقت</th>
                <th>البيان والسبب</th>
                <th style="text-align:left;">حالة التأكيد</th>
              </tr>
            </thead>
            <tbody>
              ${!session || !session.movements || session.movements.length === 0 ? `
                <tr>
                  <td colspan="5" style="text-align:center; padding:30px; color:var(--muted-foreground);">
                    لا توجد حركات نقدية مسجلة في الوردية الحالية
                  </td>
                </tr>
              ` : session.movements.map(mov => {
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
      ` : `
        <!-- Tab Content 2: Past Sessions & Z-Reports -->
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
              ${history.length === 0 ? `
                <tr>
                  <td colspan="9" style="text-align:center; padding:30px; color:var(--muted-foreground);">
                    لا توجد ورديات سابقة مؤرشفة
                  </td>
                </tr>
              ` : history.map(h => {
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
                      <button class="btn-table-action" onclick="window.printShiftZReport('${h.cashSessionId}')" title="طباعة تقرير Z الحراري 80mm">
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
      `}
    `;

    this.bindEvents();
  }

  bindEvents() {
    // Segmented tab toggle
    const seg = document.getElementById('sessions-tab-segmented');
    if (seg) {
      seg.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => {
          this.activeTab = btn.dataset.tab;
          this.render();
        });
      });
    }

    // Cash In
    document.getElementById('btn-session-cash-in')?.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('OPEN_CASH_MOVEMENT_DIALOG', { detail: { type: 'CASH_IN' } }));
    });

    // Cash Out
    document.getElementById('btn-session-cash-out')?.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('OPEN_CASH_MOVEMENT_DIALOG', { detail: { type: 'CASH_OUT' } }));
    });

    // Close Shift
    document.getElementById('btn-session-close-shift')?.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('OPEN_CLOSE_SESSION_DIALOG'));
    });

    // Open Shift
    document.getElementById('btn-session-open-shift')?.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('OPEN_OPEN_SESSION_DIALOG'));
    });

    // Global bridge for reprint Z-Report
    window.printShiftZReport = (sessionId) => {
      const history = cashSessionService.history || [];
      const session = history.find(s => s.cashSessionId === sessionId);
      if (session && session.zReport) {
        const receiptDialog = document.getElementById('dialog-receipt');
        const content = document.getElementById('receipt-paper-content');
        if (receiptDialog && content) {
          content.innerHTML = ReceiptService.getZReportHTML(session.zReport);
          receiptDialog.classList.remove('hidden');
        }
      } else {
        showToast('تنبيه', 'لم يتم العثور على تقرير Z لهذه الوردية', 'warning');
      }
    };
  }
}
