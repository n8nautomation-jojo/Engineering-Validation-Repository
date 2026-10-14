/**
 * PharmaTech — Cash Sessions & Drawer Management Coordinator
 * Enterprise Component-Based Modular Architecture coordinating:
 * SessionStatusBanner, SessionKpisGrid, SessionMovementsTable, and SessionHistoryTable
 */

import { cashSessionService } from '../services/cashSessionService.js';
import { ReceiptService } from '../services/receiptService.js';
import { SessionStatusBanner } from './sessions/SessionStatusBanner.js';
import { SessionKpisGrid } from './sessions/SessionKpisGrid.js';
import { SessionMovementsTable } from './sessions/SessionMovementsTable.js';
import { SessionHistoryTable } from './sessions/SessionHistoryTable.js';
import { showToast } from './Toast.js';

export class SessionsView {
  constructor() {
    this.container = document.getElementById('sessions-view');
    this.activeTab = 'movements'; // 'movements' | 'history'

    // Sub-components
    this.statusBanner = new SessionStatusBanner('session-banner-container', {
      onCashIn: () => window.dispatchEvent(new CustomEvent('OPEN_CASH_MOVEMENT_DIALOG', { detail: { type: 'CASH_IN' } })),
      onCashOut: () => window.dispatchEvent(new CustomEvent('OPEN_CASH_MOVEMENT_DIALOG', { detail: { type: 'CASH_OUT' } })),
      onCloseShift: () => window.dispatchEvent(new CustomEvent('OPEN_CLOSE_SESSION_DIALOG')),
      onOpenShift: () => window.dispatchEvent(new CustomEvent('OPEN_OPEN_SESSION_DIALOG'))
    });

    this.kpisGrid = new SessionKpisGrid('session-kpis-container');
    this.movementsTable = new SessionMovementsTable('session-movements-container');
    this.historyTable = new SessionHistoryTable('session-history-container', {
      onPrintZReport: (sessionId) => this.printZReport(sessionId)
    });

    this.init();
  }

  init() {
    if (!this.container) return;

    window.addEventListener('SESSION_UPDATED', () => this.loadAndRender());
    window.addEventListener('SALES_UPDATED', () => this.loadAndRender());

    // Backward compatibility bridge
    window.printShiftZReport = (sessionId) => this.printZReport(sessionId);

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
    const movementsCount = session?.movements?.length || 0;

    this.container.innerHTML = `
      <!-- 1. Top Shift Status Banner -->
      <div id="session-banner-container"></div>

      <!-- 2. Financial KPIs Grid -->
      <div id="session-kpis-container"></div>

      <!-- 3. Segmented Navigation (Movements vs Past Shifts) -->
      <div class="panel-head wrap" style="margin-bottom:14px;">
        <div class="panel-title">
          <span class="title-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </span>
          <h2>سجل حركات الخزينة والمطابقة الدورية</h2>
        </div>

        <div class="segmented" id="sessions-tab-segmented">
          <button data-tab="movements" data-active="${this.activeTab === 'movements'}">
            حركات نقدية الوردية (${movementsCount})
          </button>
          <button data-tab="history" data-active="${this.activeTab === 'history'}">
            أرشيف الورديات السابقة و Z-Reports (${history.length})
          </button>
        </div>
      </div>

      <!-- 4. Tab 1: Active Movements Table -->
      <div id="session-movements-container" style="display:${this.activeTab === 'movements' ? 'block' : 'none'};"></div>

      <!-- 5. Tab 2: Past Shifts History Table -->
      <div id="session-history-container" style="display:${this.activeTab === 'history' ? 'block' : 'none'};"></div>
    `;

    // Render sub-components
    this.statusBanner.render(session);
    this.kpisGrid.render(session);
    this.movementsTable.render(session);
    this.historyTable.render(history);

    this.bindTabEvents();
  }

  bindTabEvents() {
    const segmented = document.getElementById('sessions-tab-segmented');
    if (!segmented) return;

    segmented.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        this.activeTab = btn.dataset.tab;
        segmented.querySelectorAll('button').forEach(b => b.dataset.active = 'false');
        btn.dataset.active = 'true';

        const movEl = document.getElementById('session-movements-container');
        const histEl = document.getElementById('session-history-container');
        if (movEl) movEl.style.display = this.activeTab === 'movements' ? 'block' : 'none';
        if (histEl) histEl.style.display = this.activeTab === 'history' ? 'block' : 'none';
      });
    });
  }

  printZReport(sessionId) {
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
  }
}
