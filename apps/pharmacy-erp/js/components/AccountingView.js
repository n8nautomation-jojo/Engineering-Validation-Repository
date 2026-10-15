/**
 * PharmaTech — Accounting & Financial Operations View (Ergonomic UX 2.0)
 * High-Efficiency Executive Financial Dashboards, Live Cash & Profit KPIs, and 1-Click Operations
 */

import { AccountingService } from '../services/accountingService.js';
import { showToast } from './Toast.js';
import { AuthService } from '../services/authService.js';

export class AccountingView {
  constructor() {
    this.container = document.getElementById('accounting-view');
    this.activeTab = 'statements'; // 'statements' | 'journal' | 'accounts' | 'ledger'
    this.statementSubTab = 'income-statement'; // 'income-statement' | 'balance-sheet' | 'trial-balance'
    this.accounts = [];
    this.journalEntries = [];
    this.selectedLedgerAccountId = 'ACC-1111';

    this.init();
  }

  init() {
    if (!this.container) return;
    this.render();
    this.bindEvents();
  }

  async loadData() {
    try {
      this.accounts = await AccountingService.fetchAccounts();
      this.journalEntries = await AccountingService.fetchJournalEntries();
      this.render();
      this.bindEvents();
    } catch (err) {
      console.error('[AccountingView] Failed to load accounting data:', err);
      showToast('خطأ في تحميل البيانات المحاسبية', err.message, 'error');
    }
  }

  render() {
    if (!this.container) return;

    // Calculate Hero Financial Indicators for instant executive visibility
    const cashAcc = this.accounts.find(a => a.code === '1111')?.currentBalance || 0;
    const bankAcc = this.accounts.find(a => a.code === '1112')?.currentBalance || 0;
    const totalLiquidity = cashAcc + bankAcc;

    const inventoryVal = this.accounts.find(a => a.code === '1130')?.currentBalance || 0;
    const payables = this.accounts.find(a => a.code === '2110')?.currentBalance || 0;

    const totalRev = this.accounts.filter(a => a.type === 'REVENUE').reduce((sum, a) => sum + (a.currentBalance || 0), 0);
    const totalExp = this.accounts.filter(a => a.type === 'EXPENSE').reduce((sum, a) => sum + (a.currentBalance || 0), 0);
    const estimatedNetProfit = totalRev - totalExp;

    this.container.innerHTML = `
      <div class="accounting-view-container">
        <!-- View Header -->
        <div class="view-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 4px;">
          <div class="view-title-group">
            <div style="display: flex; align-items: center; gap: 8px;">
              <h1 class="view-title" style="margin: 0; font-size: 1.4rem; font-weight: 800;">المالية والأرباح العامة</h1>
              <span class="chip chip-success" style="font-size: 11px;">متوازن ومباشر</span>
            </div>
            <p class="view-subtitle" style="margin: 2px 0 0; font-size: 0.85rem; color: var(--muted-foreground);">
              الأرباح التشغيلية، السيولة النقدية، سجل القيود، وكشوف الحسابات
            </p>
          </div>
          <div class="view-actions" style="display: flex; gap: 8px;">
            <button id="btn-refresh-accounting" class="btn btn-secondary btn-sm" title="تحديث الأرقام">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
              </svg>
              تحديث
            </button>
            <button id="btn-create-journal-entry" class="btn btn-primary btn-sm" style="font-weight: 700;">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              + تسجيل قيد / مصروف سريع
            </button>
          </div>
        </div>

        <!-- Executive Financial KPI Grid (Immediate Vital Signs) -->
        <div class="accounting-kpi-grid">
          <div class="financial-kpi-card" style="border-right: 4px solid #00B37E;">
            <div style="font-size: 0.8rem; font-weight: 700; color: var(--muted-foreground);">السيولة النقدية (الخزينة + بنكك)</div>
            <div style="font-size: 1.4rem; font-weight: 800; font-family: var(--font-mono); color: #00B37E;">
              ${Number(totalLiquidity).toLocaleString()} SDG
            </div>
            <div style="font-size: 0.75rem; color: var(--muted-foreground);">
              الخزينة: ${Number(cashAcc).toLocaleString()} | بنكك: ${Number(bankAcc).toLocaleString()}
            </div>
          </div>

          <div class="financial-kpi-card" style="border-right: 4px solid #0052CC;">
            <div style="font-size: 0.8rem; font-weight: 700; color: var(--muted-foreground);">صافي أرباح العمليات التشغيلية</div>
            <div style="font-size: 1.4rem; font-weight: 800; font-family: var(--font-mono); color: ${estimatedNetProfit >= 0 ? '#0052CC' : '#E11D48'};">
              ${Number(estimatedNetProfit).toLocaleString()} SDG
            </div>
            <div style="font-size: 0.75rem; color: var(--muted-foreground);">
              إجمالي الإيرادات: ${Number(totalRev).toLocaleString()} SDG
            </div>
          </div>

          <div class="financial-kpi-card" style="border-right: 4px solid #7928CA;">
            <div style="font-size: 0.8rem; font-weight: 700; color: var(--muted-foreground);">القيمة الدفترية للمخزون الدوائي</div>
            <div style="font-size: 1.4rem; font-weight: 800; font-family: var(--font-mono); color: #7928CA;">
              ${Number(inventoryVal).toLocaleString()} SDG
            </div>
            <div style="font-size: 0.75rem; color: var(--muted-foreground);">أصول متداولة جاهزة للبيع</div>
          </div>

          <div class="financial-kpi-card" style="border-right: 4px solid #FF9900;">
            <div style="font-size: 0.8rem; font-weight: 700; color: var(--muted-foreground);">التزامات ومستحقات الموردين</div>
            <div style="font-size: 1.4rem; font-weight: 800; font-family: var(--font-mono); color: #FF9900;">
              ${Number(payables).toLocaleString()} SDG
            </div>
            <div style="font-size: 0.75rem; color: var(--muted-foreground);">فواتير توريد مستحقة السداد</div>
          </div>
        </div>

        <!-- Navigation Tabs (Action-Oriented) -->
        <div class="accounting-tabs-nav">
          <button class="accounting-tab-btn ${this.activeTab === 'statements' ? 'active' : ''}" data-tab="statements">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="20" x2="18" y2="10"></line>
              <line x1="12" y1="20" x2="12" y2="4"></line>
              <line x1="6" y1="20" x2="6" y2="14"></line>
            </svg>
            الأرباح والقوائم المالية
          </button>
          <button class="accounting-tab-btn ${this.activeTab === 'journal' ? 'active' : ''}" data-tab="journal">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
            </svg>
            قيود وحركات اليومية (${this.journalEntries.length})
          </button>
          <button class="accounting-tab-btn ${this.activeTab === 'accounts' ? 'active' : ''}" data-tab="accounts">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
            دليل الحسابات (${this.accounts.length})
          </button>
          <button class="accounting-tab-btn ${this.activeTab === 'ledger' ? 'active' : ''}" data-tab="ledger">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
            </svg>
            كشف حساب تفصيلي
          </button>
        </div>

        <!-- Tab Content Area -->
        <div class="accounting-tab-content">
          ${this.renderActiveTabContent()}
        </div>
      </div>

      <!-- Create Journal Entry Modal Container -->
      <div id="journal-entry-modal-container"></div>
    `;
  }

  renderActiveTabContent() {
    switch (this.activeTab) {
      case 'statements':
        return this.renderStatementsTab();
      case 'journal':
        return this.renderJournalTab();
      case 'accounts':
        return this.renderAccountsTab();
      case 'ledger':
        return this.renderLedgerTab();
      default:
        return '';
    }
  }

  // =========================================================================
  // TAB 1: FINANCIAL STATEMENTS (DEFAULT — FAST VISIBILITY)
  // =========================================================================

  renderStatementsTab() {
    return `
      <div class="statements-view card" style="padding: 16px;">
        <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 12px; border-bottom: 1px solid var(--border); padding-bottom: 12px;">
          <div>
            <h3 class="card-title" style="margin: 0; font-size: 1.1rem; font-weight: 800;">القوائم والتقارير المالية</h3>
            <span style="font-size: 0.8rem; color: var(--muted-foreground);">حساب الأرباح والخسائر وموقف الميزانية المتوازنة</span>
          </div>
          <div class="statement-subtabs-nav" style="display: flex; gap: 8px;">
            <button class="btn btn-sm ${this.statementSubTab === 'income-statement' ? 'btn-primary' : 'btn-secondary'} btn-subtab" data-subtab="income-statement">
              📊 قائمة الدخل والأرباح
            </button>
            <button class="btn btn-sm ${this.statementSubTab === 'balance-sheet' ? 'btn-primary' : 'btn-secondary'} btn-subtab" data-subtab="balance-sheet">
              ⚖️ الميزانية العمومية
            </button>
            <button class="btn btn-sm ${this.statementSubTab === 'trial-balance' ? 'btn-primary' : 'btn-secondary'} btn-subtab" data-subtab="trial-balance">
              📑 ميزان المراجعة
            </button>
          </div>
        </div>

        <div id="statement-dynamic-container">
          <div style="text-align: center; padding: 24px; color: var(--muted-foreground);">
            جاري احتساب وتجميع القوائم المالية...
          </div>
        </div>
      </div>
    `;
  }

  // =========================================================================
  // TAB 2: GENERAL JOURNAL ENTRIES
  // =========================================================================

  renderJournalTab() {
    return `
      <div class="journal-entries-view card" style="padding: 16px;">
        <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 14px; border-bottom: 1px solid var(--border); padding-bottom: 10px;">
          <div>
            <h3 class="card-title" style="margin: 0; font-size: 1.1rem; font-weight: 800;">سجل القيود المحاسبية</h3>
            <span style="font-size: 0.8rem; color: var(--muted-foreground);">العمليات الآلية المرحّلة من المبيعات والمشتريات والمصروفات</span>
          </div>
          <div style="display: flex; gap: 8px;">
            <select id="select-journal-module-filter" class="form-input" style="width: 160px; height: 36px; font-size: 0.85rem;">
              <option value="">كافة المصادر</option>
              <option value="POS_SALES">مبيعات الـ POS</option>
              <option value="PURCHASING">فواتير المشتريات</option>
              <option value="PAYMENT">سداد الموردين</option>
              <option value="INVENTORY">تسويات الجرد</option>
              <option value="MANUAL">قيود يدوية</option>
              <option value="REVERSAL">قيود عكسية</option>
            </select>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 12px;">
          ${this.journalEntries.length === 0 ? `
            <div style="text-align: center; padding: 36px; color: var(--muted-foreground);">
              لا توجد قيود مسجلة حالياً
            </div>
          ` : this.journalEntries.map(entry => `
            <div class="card journal-entry-card" style="border: 1px solid var(--border); border-radius: 8px; overflow: hidden; background: var(--card);">
              <div class="journal-entry-header" style="background: var(--background); padding: 10px 14px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); flex-wrap: wrap; gap: 8px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                  <span style="font-weight: 800; font-family: var(--font-mono); color: var(--primary); font-size: 0.95rem;">${entry.entryNumber}</span>
                  <span class="badge ${entry.status === 'POSTED' ? 'badge-green' : 'badge-red'}">
                    ${entry.status === 'POSTED' ? 'معتمد' : 'معكوس'}
                  </span>
                  <span class="badge badge-purple">${this.getSourceModuleLabel(entry.sourceModule)}</span>
                  <strong style="font-size: 0.85rem; color: var(--foreground);">${entry.description}</strong>
                </div>
                <div style="display: flex; align-items: center; gap: 12px;">
                  <span style="font-size: 0.8rem; color: var(--muted-foreground);">${new Date(entry.entryDate).toLocaleDateString('ar-SD')}</span>
                  <strong style="font-family: var(--font-mono); font-size: 0.95rem; color: var(--primary);">
                    ${Number(entry.totalAmount).toLocaleString()} SDG
                  </strong>
                  ${entry.status === 'POSTED' ? `
                    <button class="btn btn-secondary btn-xs btn-reverse-entry" data-id="${entry.id}" style="color: #dc2626; border-color: #fca5a5; padding: 2px 8px;">
                      عكس القيد
                    </button>
                  ` : `
                    <span style="font-size: 0.75rem; color: #dc2626;">معكوس</span>
                  `}
                </div>
              </div>

              <div class="table-responsive">
                <table class="data-table" style="margin: 0; font-size: 0.82rem;">
                  <tbody>
                    ${entry.lines.map(line => `
                      <tr style="border-bottom: 1px dashed var(--border);">
                        <td style="width: 100px;"><code>${line.accountCode}</code></td>
                        <td><strong>${line.accountNameAr}</strong> ${line.narration ? `<span style="color:var(--muted-foreground); font-size:0.75rem;">(${line.narration})</span>` : ''}</td>
                        <td style="width: 140px; text-align: left; font-family: var(--font-mono); font-weight: 700; color: #0284c7;">
                          ${line.debit > 0 ? `مدين: ${Number(line.debit).toLocaleString()}` : ''}
                        </td>
                        <td style="width: 140px; text-align: left; font-family: var(--font-mono); font-weight: 700; color: #d97706;">
                          ${line.credit > 0 ? `دائن: ${Number(line.credit).toLocaleString()}` : ''}
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // =========================================================================
  // TAB 3: CHART OF ACCOUNTS (STREAMLINED & SEARCHABLE)
  // =========================================================================

  renderAccountsTab() {
    return `
      <div class="chart-of-accounts-view card" style="padding: 16px;">
        <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 14px; border-bottom: 1px solid var(--border); padding-bottom: 10px;">
          <div>
            <h3 class="card-title" style="margin: 0; font-size: 1.1rem; font-weight: 800;">دليل وشجرة الحسابات الصيدلانية</h3>
            <span style="font-size: 0.8rem; color: var(--muted-foreground);">الأصول، الخصوم، الإيرادات، والمصروفات</span>
          </div>
          <div style="display: flex; gap: 8px;">
            <input type="text" id="input-account-search" class="form-input" placeholder="بحث بالاسم أو الكود..." style="width: 200px; height: 36px; font-size: 0.85rem;">
            <select id="select-account-type-filter" class="form-input" style="width: 130px; height: 36px; font-size: 0.85rem;">
              <option value="">كافة الحسابات</option>
              <option value="ASSET">الأصول</option>
              <option value="LIABILITY">الخصوم</option>
              <option value="EQUITY">حقوق الملكية</option>
              <option value="REVENUE">الإيرادات</option>
              <option value="EXPENSE">المصروفات</option>
            </select>
          </div>
        </div>

        <div class="table-responsive">
          <table class="data-table" id="table-chart-of-accounts" style="font-size: 0.85rem;">
            <thead>
              <tr>
                <th style="width: 90px;">الكود</th>
                <th>اسم الحساب</th>
                <th style="width: 110px;">النوع</th>
                <th style="width: 90px;">الطبيعة</th>
                <th style="width: 160px; text-align: left;">الرصيد الدفتري</th>
                <th style="width: 80px; text-align: center;">كشف</th>
              </tr>
            </thead>
            <tbody>
              ${this.accounts.map(acc => `
                <tr class="account-row ${acc.category === 'HEADER' ? 'is-header-account' : ''}" style="${acc.category === 'HEADER' ? 'background: rgba(14, 165, 233, 0.04); font-weight: 700;' : ''}">
                  <td><code>${acc.code}</code></td>
                  <td>
                    <div style="padding-right: ${acc.category === 'POSTABLE' ? '18px' : '0'};">
                      ${acc.category === 'POSTABLE' ? '↳ ' : ''}<strong>${acc.name}</strong>
                    </div>
                  </td>
                  <td>
                    <span class="badge ${this.getAccountTypeBadgeClass(acc.type)}">
                      ${this.getAccountTypeLabel(acc.type)}
                    </span>
                  </td>
                  <td>
                    <span style="font-size: 0.75rem; color: ${acc.normalBalance === 'DEBIT' ? '#0284c7' : '#d97706'}; font-weight: 700;">
                      ${acc.normalBalance === 'DEBIT' ? 'مدين' : 'دائن'}
                    </span>
                  </td>
                  <td style="text-align: left; font-weight: 700; font-family: var(--font-mono); color: var(--foreground);">
                    ${Number(acc.currentBalance).toLocaleString()} SDG
                  </td>
                  <td style="text-align: center;">
                    ${acc.category === 'POSTABLE' ? `
                      <button class="btn btn-secondary btn-xs btn-view-ledger" data-id="${acc.id}" style="padding: 2px 8px;">
                        كشف
                      </button>
                    ` : '—'}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // =========================================================================
  // TAB 4: GENERAL LEDGER STATEMENT (CLEAN SEARCH & RUNNING BALANCE)
  // =========================================================================

  renderLedgerTab() {
    const postableAccounts = this.accounts.filter(a => a.category === 'POSTABLE');

    return `
      <div class="ledger-view card" style="padding: 16px;">
        <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 14px; border-bottom: 1px solid var(--border); padding-bottom: 10px;">
          <div>
            <h3 class="card-title" style="margin: 0; font-size: 1.1rem; font-weight: 800;">كشف حساب الأستاذ العام</h3>
            <span style="font-size: 0.8rem; color: var(--muted-foreground);">حركات الحساب الفردية والرصيد التراكمي المباشر</span>
          </div>
          <div style="display: flex; gap: 8px; align-items: center;">
            <label style="font-size: 0.85rem; font-weight: 700;">الحساب:</label>
            <select id="select-ledger-account" class="form-input" style="width: 250px; height: 36px; font-size: 0.85rem;">
              ${postableAccounts.map(acc => `
                <option value="${acc.id}" ${acc.id === this.selectedLedgerAccountId ? 'selected' : ''}>
                  ${acc.code} — ${acc.name}
                </option>
              `).join('')}
            </select>
          </div>
        </div>

        <div id="ledger-dynamic-container">
          <div style="text-align: center; padding: 24px; color: var(--muted-foreground);">
            جاري تحميل كشف الحساب...
          </div>
        </div>
      </div>
    `;
  }

  // =========================================================================
  // STATEMENT RENDERING HELPERS
  // =========================================================================

  async loadStatementContent() {
    const container = document.getElementById('statement-dynamic-container');
    if (!container) return;

    try {
      if (this.statementSubTab === 'income-statement') {
        const is = await AccountingService.fetchIncomeStatement();
        container.innerHTML = `
          <!-- Summary Cards -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-bottom: 20px;">
            <div class="card" style="padding: 14px; border-top: 3px solid #10b981; background: var(--background);">
              <div style="font-size: 0.8rem; font-weight: 600; color: var(--muted-foreground);">إجمالي الإيرادات</div>
              <div style="font-size: 1.35rem; font-weight: 800; color: #10b981; font-family: var(--font-mono);">
                ${is.totalRevenue.toLocaleString()} SDG
              </div>
            </div>
            <div class="card" style="padding: 14px; border-top: 3px solid #f59e0b; background: var(--background);">
              <div style="font-size: 0.8rem; font-weight: 600; color: var(--muted-foreground);">تكلفة البضاعة المباعة (COGS)</div>
              <div style="font-size: 1.35rem; font-weight: 800; color: #f59e0b; font-family: var(--font-mono);">
                ${is.totalCogs.toLocaleString()} SDG
              </div>
            </div>
            <div class="card" style="padding: 14px; border-top: 3px solid #0284c7; background: var(--background);">
              <div style="font-size: 0.8rem; font-weight: 600; color: var(--muted-foreground);">إجمالي الربح (الهامش: ${is.grossProfitMargin}%)</div>
              <div style="font-size: 1.35rem; font-weight: 800; color: #0284c7; font-family: var(--font-mono);">
                ${is.grossProfit.toLocaleString()} SDG
              </div>
            </div>
            <div class="card" style="padding: 14px; border-top: 3px solid ${is.netProfit >= 0 ? '#059669' : '#dc2626'}; background: var(--background);">
              <div style="font-size: 0.8rem; font-weight: 600; color: var(--muted-foreground);">صافي الربح التشغيلي (${is.netProfitMargin}%)</div>
              <div style="font-size: 1.35rem; font-weight: 800; color: ${is.netProfit >= 0 ? '#059669' : '#dc2626'}; font-family: var(--font-mono);">
                ${is.netProfit.toLocaleString()} SDG
              </div>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div class="card" style="padding: 14px; background: var(--card); border: 1px solid var(--border);">
              <h4 style="margin: 0 0 10px; font-size: 0.95rem; font-weight: 800; border-bottom: 1px solid var(--border); padding-bottom: 6px;">تفاصيل الإيرادات</h4>
              <table style="width: 100%; font-size: 0.85rem;">
                ${is.revenueDetails.map(r => `
                  <tr>
                    <td style="padding: 6px 0;">${r.name}</td>
                    <td style="text-align: left; font-family: var(--font-mono); font-weight: 700;">${r.amount.toLocaleString()} SDG</td>
                  </tr>
                `).join('')}
              </table>
            </div>

            <div class="card" style="padding: 14px; background: var(--card); border: 1px solid var(--border);">
              <h4 style="margin: 0 0 10px; font-size: 0.95rem; font-weight: 800; border-bottom: 1px solid var(--border); padding-bottom: 6px;">تكلفة البضاعة والمصروفات</h4>
              <table style="width: 100%; font-size: 0.85rem;">
                ${is.cogsDetails.map(c => `
                  <tr>
                    <td style="padding: 6px 0;">${c.name}</td>
                    <td style="text-align: left; font-family: var(--font-mono); font-weight: 700; color: #f59e0b;">${c.amount.toLocaleString()} SDG</td>
                  </tr>
                `).join('')}
                ${is.operatingExpenseDetails.map(o => `
                  <tr>
                    <td style="padding: 6px 0;">${o.name}</td>
                    <td style="text-align: left; font-family: var(--font-mono); font-weight: 700; color: #dc2626;">${o.amount.toLocaleString()} SDG</td>
                  </tr>
                `).join('')}
              </table>
            </div>
          </div>
        `;
      } else if (this.statementSubTab === 'balance-sheet') {
        const bs = await AccountingService.fetchBalanceSheet();
        container.innerHTML = `
          <div style="margin-bottom: 16px; background: ${bs.isEquationBalanced ? '#ecfdf5' : '#fef2f2'}; border: 1px solid ${bs.isEquationBalanced ? '#a7f3d0' : '#fecaca'}; padding: 12px 16px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 1.2rem;">${bs.isEquationBalanced ? '✓' : '⚠️'}</span>
              <strong style="color: ${bs.isEquationBalanced ? '#065f46' : '#991b1b'};">
                ${bs.isEquationBalanced ? 'الميزانية متوازنة تماماً (الأصول = الخصوم + حقوق الملكية)' : 'تنبيه: يوجد فارق بالميزانية'}
              </strong>
            </div>
            <div style="font-family: var(--font-mono); font-weight: 800; font-size: 1.1rem;">
              الفارق: ${bs.variance} SDG
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <!-- Assets Side -->
            <div class="card" style="padding: 14px; border-top: 3px solid #0284c7; background: var(--card); border: 1px solid var(--border);">
              <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); padding-bottom: 6px; margin-bottom: 10px;">
                <h4 style="margin: 0; color: #0284c7; font-size: 0.95rem; font-weight: 800;">الأصول والموجودات</h4>
                <strong style="font-family: var(--font-mono); font-size: 1.05rem;">${bs.totalAssets.toLocaleString()} SDG</strong>
              </div>
              <table style="width: 100%; font-size: 0.85rem;">
                ${bs.assets.map(a => `
                  <tr>
                    <td style="padding: 6px 0;"><strong>${a.code}</strong> — ${a.name}</td>
                    <td style="text-align: left; font-family: var(--font-mono);">${a.netDebit.toLocaleString()} SDG</td>
                  </tr>
                `).join('')}
              </table>
            </div>

            <!-- Liabilities & Equity Side -->
            <div style="display: flex; flex-direction: column; gap: 14px;">
              <div class="card" style="padding: 14px; border-top: 3px solid #d97706; background: var(--card); border: 1px solid var(--border);">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); padding-bottom: 6px; margin-bottom: 10px;">
                  <h4 style="margin: 0; color: #d97706; font-size: 0.95rem; font-weight: 800;">الخصوم والالتزامات</h4>
                  <strong style="font-family: var(--font-mono); font-size: 1.05rem;">${bs.totalLiabilities.toLocaleString()} SDG</strong>
                </div>
                <table style="width: 100%; font-size: 0.85rem;">
                  ${bs.liabilities.map(l => `
                    <tr>
                      <td style="padding: 6px 0;"><strong>${l.code}</strong> — ${l.name}</td>
                      <td style="text-align: left; font-family: var(--font-mono);">${l.netCredit.toLocaleString()} SDG</td>
                    </tr>
                  `).join('')}
                </table>
              </div>

              <div class="card" style="padding: 14px; border-top: 3px solid #10b981; background: var(--card); border: 1px solid var(--border);">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); padding-bottom: 6px; margin-bottom: 10px;">
                  <h4 style="margin: 0; color: #10b981; font-size: 0.95rem; font-weight: 800;">حقوق الملكية والأرباح</h4>
                  <strong style="font-family: var(--font-mono); font-size: 1.05rem;">${bs.totalEquity.toLocaleString()} SDG</strong>
                </div>
                <table style="width: 100%; font-size: 0.85rem;">
                  ${bs.equity.map(e => `
                    <tr>
                      <td style="padding: 6px 0;"><strong>${e.code}</strong> — ${e.name}</td>
                      <td style="text-align: left; font-family: var(--font-mono);">${e.netCredit.toLocaleString()} SDG</td>
                    </tr>
                  `).join('')}
                  <tr style="background: rgba(16, 185, 129, 0.05); font-weight: 700;">
                    <td style="padding: 6px 0;">+ أرباح الفترة المالية الحالية</td>
                    <td style="text-align: left; font-family: var(--font-mono); color: #059669;">${bs.currentPeriodNetProfit.toLocaleString()} SDG</td>
                  </tr>
                </table>
              </div>
            </div>
          </div>
        `;
      } else if (this.statementSubTab === 'trial-balance') {
        const tb = await AccountingService.fetchTrialBalance();
        container.innerHTML = `
          <div style="margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center; background: ${tb.isBalanced ? '#ecfdf5' : '#fef2f2'}; border: 1px solid ${tb.isBalanced ? '#a7f3d0' : '#fecaca'}; padding: 10px 14px; border-radius: 8px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 1.1rem;">${tb.isBalanced ? '✓' : '⚠️'}</span>
              <strong>${tb.isBalanced ? 'ميزان المراجعة متطابق تماماً' : 'تنبيه: ميزان المراجعة غير متوازن'}</strong>
            </div>
            <div style="text-align: left;">
              <strong style="font-size: 1.05rem; font-family: var(--font-mono);">${tb.totalDebits.toLocaleString()} SDG</strong>
            </div>
          </div>

          <div class="table-responsive">
            <table class="data-table" style="font-size: 0.85rem;">
              <thead>
                <tr>
                  <th style="width: 90px;">الرمز</th>
                  <th>اسم الحساب</th>
                  <th style="width: 100px;">النوع</th>
                  <th style="width: 140px; text-align: left; color: #0284c7;">رصيد مدين</th>
                  <th style="width: 140px; text-align: left; color: #d97706;">رصيد دائن</th>
                </tr>
              </thead>
              <tbody>
                ${tb.rows.map(r => `
                  <tr>
                    <td><code>${r.code}</code></td>
                    <td><strong>${r.name}</strong></td>
                    <td><span class="badge ${this.getAccountTypeBadgeClass(r.type)}">${this.getAccountTypeLabel(r.type)}</span></td>
                    <td style="text-align: left; font-family: var(--font-mono); font-weight: 700; color: #0284c7;">
                      ${r.netDebit > 0 ? r.netDebit.toLocaleString() : '—'}
                    </td>
                    <td style="text-align: left; font-family: var(--font-mono); font-weight: 700; color: #d97706;">
                      ${r.netCredit > 0 ? r.netCredit.toLocaleString() : '—'}
                    </td>
                  </tr>
                `).join('')}
                <tr style="background: var(--background); font-weight: 800; font-size: 0.95rem; border-top: 2px solid var(--border);">
                  <td colspan="3" style="text-align: right;">المجموع الإجمالي:</td>
                  <td style="text-align: left; font-family: var(--font-mono); color: #0284c7;">${tb.totalDebits.toLocaleString()} SDG</td>
                  <td style="text-align: left; font-family: var(--font-mono); color: #d97706;">${tb.totalCredits.toLocaleString()} SDG</td>
                </tr>
              </tbody>
            </table>
          </div>
        `;
      }
    } catch (err) {
      container.innerHTML = `<div style="color: #dc2626; padding: 16px;">خطأ في إعداد القائمة: ${err.message}</div>`;
    }
  }

  // =========================================================================
  // LEDGER STATEMENT LOADER
  // =========================================================================

  async loadLedgerContent() {
    const container = document.getElementById('ledger-dynamic-container');
    if (!container) return;

    try {
      const ledger = await AccountingService.fetchAccountLedger(this.selectedLedgerAccountId);
      container.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; background: var(--background); padding: 12px 16px; border-radius: 8px; margin-bottom: 14px; border: 1px solid var(--border); flex-wrap: wrap; gap: 12px;">
          <div>
            <h4 style="margin: 0; color: var(--primary); font-size: 1.05rem;">
              <code>${ledger.account.code}</code> — ${ledger.account.name}
            </h4>
            <div style="font-size: 0.8rem; color: var(--muted-foreground); margin-top: 2px;">
              ${this.getAccountTypeLabel(ledger.account.type)} · ${ledger.account.normalBalance === 'DEBIT' ? 'طبيعة مدينة' : 'طبيعة دائنة'}
            </div>
          </div>
          <div style="display: flex; gap: 20px; font-family: var(--font-mono);">
            <div>
              <span style="font-size: 0.75rem; color: var(--muted-foreground); display: block;">الرصيد الافتتاحي:</span>
              <strong>${ledger.openingBalance.toLocaleString()} SDG</strong>
            </div>
            <div>
              <span style="font-size: 0.75rem; color: var(--muted-foreground); display: block;">الرصيد الحالي:</span>
              <strong style="color: var(--primary); font-size: 1.1rem;">${ledger.closingBalance.toLocaleString()} SDG</strong>
            </div>
          </div>
        </div>

        <div class="table-responsive">
          <table class="data-table" style="font-size: 0.85rem;">
            <thead>
              <tr>
                <th style="width: 90px;">التاريخ</th>
                <th style="width: 120px;">رقم القيد</th>
                <th>البيان والشرح</th>
                <th style="width: 120px; text-align: left; color: #0284c7;">مدين</th>
                <th style="width: 120px; text-align: left; color: #d97706;">دائن</th>
                <th style="width: 140px; text-align: left; font-weight: 700;">الرصيد التراكمي</th>
              </tr>
            </thead>
            <tbody>
              ${ledger.transactions.length === 0 ? `
                <tr><td colspan="6" style="text-align: center; padding: 24px; color: var(--muted-foreground);">لا توجد حركات مسجلة لهذا الحساب</td></tr>
              ` : ledger.transactions.map(tx => `
                <tr>
                  <td>${new Date(tx.entryDate).toLocaleDateString('ar-SD')}</td>
                  <td><code>${tx.entryNumber}</code></td>
                  <td>${tx.narration || tx.description}</td>
                  <td style="text-align: left; font-family: var(--font-mono); font-weight: 600;">${tx.debit > 0 ? tx.debit.toLocaleString() : '—'}</td>
                  <td style="text-align: left; font-family: var(--font-mono); font-weight: 600;">${tx.credit > 0 ? tx.credit.toLocaleString() : '—'}</td>
                  <td style="text-align: left; font-family: var(--font-mono); font-weight: 700; color: var(--foreground);">
                    ${tx.runningBalance.toLocaleString()} SDG
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    } catch (err) {
      container.innerHTML = `<div style="color: #dc2626; padding: 16px;">خطأ في كشف الأستاذ: ${err.message}</div>`;
    }
  }

  // =========================================================================
  // MODAL: CREATE JOURNAL ENTRY (BALANCED DOUBLE-ENTRY)
  // =========================================================================

  openCreateJournalModal() {
    const modalContainer = document.getElementById('journal-entry-modal-container');
    if (!modalContainer) return;

    const postableAccounts = this.accounts.filter(a => a.category === 'POSTABLE');

    modalContainer.innerHTML = `
      <div class="modal-overlay" id="journal-modal-overlay">
        <div class="modal-content" style="max-width: 820px; width: 95%;">
          <div class="modal-header">
            <div>
              <h3 class="modal-title" style="margin: 0; font-size: 1.15rem; font-weight: 800;">تسجيل قيد يومية / تسوية</h3>
              <p class="modal-subtitle" style="margin: 2px 0 0; font-size: 0.8rem; color: var(--muted-foreground);">تسجيل طرفي القيد المدين والدائن مع التحقق التلقائي من التوازن</p>
            </div>
            <button class="modal-close-btn" id="btn-close-journal-modal">&times;</button>
          </div>

          <div class="modal-body" style="padding: 16px;">
            <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 14px; margin-bottom: 14px;">
              <div>
                <label class="form-label" style="font-size: 0.85rem; font-weight: 700; display: block; margin-bottom: 4px;">تاريخ القيد:</label>
                <input type="date" id="input-je-date" class="form-input" value="${new Date().toISOString().slice(0, 10)}" style="height: 38px;">
              </div>
              <div>
                <label class="form-label" style="font-size: 0.85rem; font-weight: 700; display: block; margin-bottom: 4px;">البيان العام:</label>
                <input type="text" id="input-je-desc" class="form-input" placeholder="مثال: تسوية مصروفات نثرية أو صيانة" style="height: 38px;">
              </div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <label class="form-label" style="font-weight: 700; font-size: 0.85rem;">أطراف القيد:</label>
              <button type="button" id="btn-add-je-line" class="btn btn-secondary btn-xs" style="padding: 4px 10px;">
                + إضافة طرف آخر
              </button>
            </div>

            <div class="table-responsive" style="max-height: 260px; overflow-y: auto;">
              <table class="data-table" id="table-je-lines" style="margin: 0; font-size: 0.85rem;">
                <thead>
                  <tr>
                    <th>الحساب</th>
                    <th style="width: 180px;">البيان التفصيلي</th>
                    <th style="width: 130px; text-align: left;">مدين (Debit)</th>
                    <th style="width: 130px; text-align: left;">دائن (Credit)</th>
                    <th style="width: 36px;"></th>
                  </tr>
                </thead>
                <tbody id="tbody-je-lines">
                  <tr class="je-line-row">
                    <td>
                      <select class="form-input select-line-account" style="font-size: 0.82rem; height: 34px;">
                        ${postableAccounts.map(a => `<option value="${a.id}">${a.code} - ${a.name}</option>`).join('')}
                      </select>
                    </td>
                    <td><input type="text" class="form-input input-line-narration" placeholder="شرح..." style="height: 34px; font-size: 0.82rem;"></td>
                    <td><input type="number" step="0.01" class="form-input input-line-debit" value="0" style="text-align: left; height: 34px; font-weight: 700; font-family: var(--font-mono);"></td>
                    <td><input type="number" step="0.01" class="form-input input-line-credit" value="0" style="text-align: left; height: 34px; font-weight: 700; font-family: var(--font-mono);"></td>
                    <td style="text-align: center;"><button type="button" class="btn btn-danger btn-xs btn-remove-line">&times;</button></td>
                  </tr>
                  <tr class="je-line-row">
                    <td>
                      <select class="form-input select-line-account" style="font-size: 0.82rem; height: 34px;">
                        ${postableAccounts.map(a => `<option value="${a.id}" ${a.code === '4110' ? 'selected' : ''}>${a.code} - ${a.name}</option>`).join('')}
                      </select>
                    </td>
                    <td><input type="text" class="form-input input-line-narration" placeholder="شرح..." style="height: 34px; font-size: 0.82rem;"></td>
                    <td><input type="number" step="0.01" class="form-input input-line-debit" value="0" style="text-align: left; height: 34px; font-weight: 700; font-family: var(--font-mono);"></td>
                    <td><input type="number" step="0.01" class="form-input input-line-credit" value="0" style="text-align: left; height: 34px; font-weight: 700; font-family: var(--font-mono);"></td>
                    <td style="text-align: center;"><button type="button" class="btn btn-danger btn-xs btn-remove-line">&times;</button></td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Balance Validator Summary Bar -->
            <div id="je-balance-summary" style="margin-top: 14px; padding: 10px 14px; border-radius: 8px; background: var(--background); border: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
              <div id="je-balance-status-badge" style="font-weight: 700; font-size: 0.85rem;">
                <span style="color: #dc2626;">⚠️ القيد غير متوازن</span>
              </div>
              <div style="display: flex; gap: 20px; font-family: var(--font-mono); font-size: 0.85rem;">
                <div>المدين: <strong id="je-sum-debit" style="color: #0284c7;">0.00</strong></div>
                <div>الدائن: <strong id="je-sum-credit" style="color: #d97706;">0.00</strong></div>
                <div>الفارق: <strong id="je-sum-diff" style="color: #dc2626;">0.00</strong></div>
              </div>
            </div>
          </div>

          <div class="modal-footer" style="display: flex; justify-content: space-between; align-items: center; padding: 14px 16px; border-top: 1px solid var(--border);">
            <button type="button" class="btn btn-secondary" id="btn-cancel-je-modal">إلغاء</button>
            <button type="button" class="btn btn-primary" id="btn-submit-journal-entry" disabled style="font-weight: 700;">
              اعتماد وترحيل القيد
            </button>
          </div>
        </div>
      </div>
    `;

    this.bindModalEvents();
  }

  bindModalEvents() {
    const closeBtn = document.getElementById('btn-close-journal-modal');
    const cancelBtn = document.getElementById('btn-cancel-je-modal');
    const addLineBtn = document.getElementById('btn-add-je-line');
    const tbody = document.getElementById('tbody-je-lines');
    const submitBtn = document.getElementById('btn-submit-journal-entry');

    const closeModal = () => {
      const container = document.getElementById('journal-entry-modal-container');
      if (container) container.innerHTML = '';
    };

    if (closeBtn) closeBtn.onclick = closeModal;
    if (cancelBtn) cancelBtn.onclick = closeModal;

    const postableAccounts = this.accounts.filter(a => a.category === 'POSTABLE');

    // Add Row
    if (addLineBtn && tbody) {
      addLineBtn.onclick = () => {
        const tr = document.createElement('tr');
        tr.className = 'je-line-row';
        tr.innerHTML = `
          <td>
            <select class="form-input select-line-account" style="font-size: 0.82rem; height: 34px;">
              ${postableAccounts.map(a => `<option value="${a.id}">${a.code} - ${a.name}</option>`).join('')}
            </select>
          </td>
          <td><input type="text" class="form-input input-line-narration" placeholder="شرح..." style="height: 34px; font-size: 0.82rem;"></td>
          <td><input type="number" step="0.01" class="form-input input-line-debit" value="0" style="text-align: left; height: 34px; font-weight: 700; font-family: var(--font-mono);"></td>
          <td><input type="number" step="0.01" class="form-input input-line-credit" value="0" style="text-align: left; height: 34px; font-weight: 700; font-family: var(--font-mono);"></td>
          <td style="text-align: center;"><button type="button" class="btn btn-danger btn-xs btn-remove-line">&times;</button></td>
        `;
        tbody.appendChild(tr);
        this.recalculateModalBalance();
      };
    }

    // Dynamic Balance Calculation on input
    if (tbody) {
      tbody.addEventListener('input', () => {
        this.recalculateModalBalance();
      });

      tbody.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-remove-line')) {
          const rows = tbody.querySelectorAll('.je-line-row');
          if (rows.length <= 2) {
            showToast('الحد الأدنى للقيود', 'يتطلب القيد سطرين على الأقل (طرف مدين وطرف دائن)', 'warning');
            return;
          }
          e.target.closest('tr').remove();
          this.recalculateModalBalance();
        }
      });
    }

    // Submit Entry
    if (submitBtn) {
      submitBtn.onclick = async () => {
        const dateInput = document.getElementById('input-je-date')?.value;
        const descInput = document.getElementById('input-je-desc')?.value;

        const rows = document.querySelectorAll('.je-line-row');
        const lines = [];

        rows.forEach(r => {
          const accId = r.querySelector('.select-line-account')?.value;
          const narration = r.querySelector('.input-line-narration')?.value || '';
          const debit = parseFloat(r.querySelector('.input-line-debit')?.value) || 0;
          const credit = parseFloat(r.querySelector('.input-line-credit')?.value) || 0;

          if (debit > 0 || credit > 0) {
            lines.push({ accountId: accId, narration, debit, credit });
          }
        });

        try {
          submitBtn.disabled = true;
          submitBtn.textContent = 'جاري الترحيل...';

          const newEntry = await AccountingService.createJournalEntry({
            entryDate: dateInput ? new Date(dateInput).toISOString() : new Date().toISOString(),
            description: descInput || 'قيد يومية عام',
            sourceModule: 'MANUAL',
            lines,
            createdBy: AuthService.getCurrentUser()?.fullName || 'المحاسب المالي'
          });

          showToast('تم ترحيل القيد بنجاح', `تم إصدار القيد رقم ${newEntry.entryNumber} واعتماده بالدفتر`, 'success');
          closeModal();
          this.loadData();
        } catch (err) {
          showToast('فشل ترحيل القيد', err.message, 'error');
          submitBtn.disabled = false;
          submitBtn.textContent = 'اعتماد وترحيل القيد';
        }
      };
    }

    this.recalculateModalBalance();
  }

  recalculateModalBalance() {
    let sumDebit = 0;
    let sumCredit = 0;

    const rows = document.querySelectorAll('.je-line-row');
    rows.forEach(r => {
      const debit = parseFloat(r.querySelector('.input-line-debit')?.value) || 0;
      const credit = parseFloat(r.querySelector('.input-line-credit')?.value) || 0;
      sumDebit += debit;
      sumCredit += credit;
    });

    const diff = Math.round(Math.abs(sumDebit - sumCredit) * 100) / 100;
    const isBalanced = diff === 0 && sumDebit > 0;

    const debitEl = document.getElementById('je-sum-debit');
    const creditEl = document.getElementById('je-sum-credit');
    const diffEl = document.getElementById('je-sum-diff');
    const statusBadge = document.getElementById('je-balance-status-badge');
    const submitBtn = document.getElementById('btn-submit-journal-entry');

    if (debitEl) debitEl.textContent = sumDebit.toLocaleString();
    if (creditEl) creditEl.textContent = sumCredit.toLocaleString();
    if (diffEl) diffEl.textContent = diff.toLocaleString();

    if (statusBadge) {
      if (isBalanced) {
        statusBadge.innerHTML = `<span style="color: #059669;">✓ متوازن وجاهز للترحيل</span>`;
      } else if (sumDebit === 0 && sumCredit === 0) {
        statusBadge.innerHTML = `<span style="color: var(--muted-foreground);">أدخل المبالغ المدينة والدائنة</span>`;
      } else {
        statusBadge.innerHTML = `<span style="color: #dc2626;">⚠️ غير متوازن (الفارق: ${diff.toLocaleString()} SDG)</span>`;
      }
    }

    if (submitBtn) {
      submitBtn.disabled = !isBalanced;
    }
  }

  // =========================================================================
  // EVENT BINDINGS
  // =========================================================================

  bindEvents() {
    // Navigation Tabs
    const tabButtons = this.container.querySelectorAll('.accounting-tab-btn');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        this.activeTab = btn.dataset.tab;
        this.render();
        this.bindEvents();
        if (this.activeTab === 'statements') {
          this.loadStatementContent();
        } else if (this.activeTab === 'ledger') {
          this.loadLedgerContent();
        }
      });
    });

    // Refresh Button
    const refreshBtn = document.getElementById('btn-refresh-accounting');
    if (refreshBtn) {
      refreshBtn.onclick = () => this.loadData();
    }

    // Create Entry Button
    const createBtn = document.getElementById('btn-create-journal-entry');
    if (createBtn) {
      createBtn.onclick = () => this.openCreateJournalModal();
    }

    // Statement Subtabs
    const subtabButtons = this.container.querySelectorAll('.btn-subtab');
    subtabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        this.statementSubTab = btn.dataset.subtab;
        subtabButtons.forEach(b => {
          b.className = b.dataset.subtab === this.statementSubTab ? 'btn btn-sm btn-primary btn-subtab' : 'btn btn-sm btn-secondary btn-subtab';
        });
        this.loadStatementContent();
      });
    });

    // Ledger Account Selector
    const ledgerSelect = document.getElementById('select-ledger-account');
    if (ledgerSelect) {
      ledgerSelect.onchange = (e) => {
        this.selectedLedgerAccountId = e.target.value;
        this.loadLedgerContent();
      };
    }

    // View Ledger From Chart of Accounts Button
    const viewLedgerButtons = this.container.querySelectorAll('.btn-view-ledger');
    viewLedgerButtons.forEach(btn => {
      btn.onclick = () => {
        this.selectedLedgerAccountId = btn.dataset.id;
        this.activeTab = 'ledger';
        this.render();
        this.bindEvents();
        this.loadLedgerContent();
      };
    });

    // Reverse Entry Action
    const reverseButtons = this.container.querySelectorAll('.btn-reverse-entry');
    reverseButtons.forEach(btn => {
      btn.onclick = async () => {
        const id = btn.dataset.id;
        const reason = prompt('سبب عكس هذا القيد:');
        if (!reason || !reason.trim()) return;

        try {
          btn.disabled = true;
          const res = await AccountingService.reverseJournalEntry(id, reason.trim(), AuthService.getCurrentUser()?.fullName || 'المدير المالي');
          showToast('تم عكس القيد بنجاح', `تم إنشاء القيد العكسي رقم ${res.reversalEntry?.entryNumber}`, 'success');
          this.loadData();
        } catch (err) {
          showToast('فشل عكس القيد', err.message, 'error');
          btn.disabled = false;
        }
      };
    });

    // Account Search Input
    const searchInput = document.getElementById('input-account-search');
    if (searchInput) {
      searchInput.oninput = (e) => {
        const q = e.target.value.toLowerCase();
        const rows = document.querySelectorAll('.account-row');
        rows.forEach(r => {
          const text = r.textContent.toLowerCase();
          r.style.display = text.includes(q) ? '' : 'none';
        });
      };
    }

    // Account Type Filter
    const typeFilter = document.getElementById('select-account-type-filter');
    if (typeFilter) {
      typeFilter.onchange = (e) => {
        const type = e.target.value;
        const rows = document.querySelectorAll('.account-row');
        rows.forEach(r => {
          if (!type) {
            r.style.display = '';
          } else {
            const hasType = r.querySelector(`.badge-${this.getAccountTypeBadgeClass(type).replace('badge-', '')}`);
            r.style.display = hasType ? '' : 'none';
          }
        });
      };
    }

    // Trigger statement or ledger load if starting in those tabs
    if (this.activeTab === 'statements') {
      this.loadStatementContent();
    } else if (this.activeTab === 'ledger') {
      this.loadLedgerContent();
    }
  }

  // =========================================================================
  // LABEL & BADGE HELPERS
  // =========================================================================

  getAccountTypeLabel(type) {
    switch (type) {
      case 'ASSET': return 'أصول';
      case 'LIABILITY': return 'خصوم';
      case 'EQUITY': return 'حقوق ملكية';
      case 'REVENUE': return 'إيرادات';
      case 'EXPENSE': return 'مصروفات';
      default: return type;
    }
  }

  getAccountTypeBadgeClass(type) {
    switch (type) {
      case 'ASSET': return 'badge-blue';
      case 'LIABILITY': return 'badge-amber';
      case 'EQUITY': return 'badge-purple';
      case 'REVENUE': return 'badge-green';
      case 'EXPENSE': return 'badge-red';
      default: return 'badge-gray';
    }
  }

  getSourceModuleLabel(source) {
    switch (source) {
      case 'POS_SALES': return 'مبيعات POS';
      case 'PURCHASING': return 'مشتريات';
      case 'PAYMENT': return 'سداد موردين';
      case 'INVENTORY': return 'تسوية جرد';
      case 'MANUAL': return 'قيد يدوي';
      case 'REVERSAL': return 'قيد عكسي';
      default: return source;
    }
  }
}
