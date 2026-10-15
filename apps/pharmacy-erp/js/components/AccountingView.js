/**
 * PharmaTech — Accounting & Financial Management View (MVP-2 / Module Boundary)
 * Features:
 *  1. دليل وشجرة الحسابات الصيدلانية (Chart of Accounts)
 *  2. قيود اليومية العامة المزدوجة (General Journal & Balanced Entry Creator)
 *  3. القوائم المالية الفورية (Trial Balance, Income Statement, Balance Sheet)
 *  4. كشف حساب الأستاذ العام التفاعلي (General Ledger Statement)
 */

import { AccountingService } from '../services/accountingService.js';
import { showToast } from './Toast.js';
import { AuthService } from '../services/authService.js';

export class AccountingView {
  constructor() {
    this.container = document.getElementById('accounting-view');
    this.activeTab = 'accounts'; // 'accounts' | 'journal' | 'statements' | 'ledger'
    this.statementSubTab = 'trial-balance'; // 'trial-balance' | 'income-statement' | 'balance-sheet'
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

    this.container.innerHTML = `
      <div class="accounting-view-container">
        <!-- View Header -->
        <div class="view-header">
          <div class="view-title-group">
            <h1 class="view-title">الإدارة المحاسبية والمالية العامة (MVP-2)</h1>
            <p class="view-subtitle">دليل الحسابات، قيود اليومية المزدوجة، ميزان المراجعة، والقوائم المالية الختامية</p>
          </div>
          <div class="view-actions">
            <button id="btn-refresh-accounting" class="btn btn-secondary btn-sm" title="تحديث البيانات">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
              </svg>
              تحديث
            </button>
            <button id="btn-create-journal-entry" class="btn btn-primary btn-sm">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              قيد يومية جديد
            </button>
          </div>
        </div>

        <!-- Navigation Tabs -->
        <div class="accounting-tabs-nav">
          <button class="accounting-tab-btn ${this.activeTab === 'accounts' ? 'active' : ''}" data-tab="accounts">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
            دليل الحسابات (${this.accounts.length})
          </button>
          <button class="accounting-tab-btn ${this.activeTab === 'journal' ? 'active' : ''}" data-tab="journal">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
            </svg>
            قيود اليومية العامة (${this.journalEntries.length})
          </button>
          <button class="accounting-tab-btn ${this.activeTab === 'statements' ? 'active' : ''}" data-tab="statements">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="20" x2="18" y2="10"></line>
              <line x1="12" y1="20" x2="12" y2="4"></line>
              <line x1="6" y1="20" x2="6" y2="14"></line>
            </svg>
            القوائم المالية والختامية
          </button>
          <button class="accounting-tab-btn ${this.activeTab === 'ledger' ? 'active' : ''}" data-tab="ledger">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
            </svg>
            كشف حساب الأستاذ العام
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
      case 'accounts':
        return this.renderAccountsTab();
      case 'journal':
        return this.renderJournalTab();
      case 'statements':
        return this.renderStatementsTab();
      case 'ledger':
        return this.renderLedgerTab();
      default:
        return '';
    }
  }

  // =========================================================================
  // TAB 1: CHART OF ACCOUNTS
  // =========================================================================

  renderAccountsTab() {
    return `
      <div class="chart-of-accounts-view card">
        <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
          <div>
            <h3 class="card-title">شجرة الحسابات الصيدلانية القياسية</h3>
            <p class="card-subtitle">تصنيف الأصول، الخصوم، حقوق الملكية، الإيرادات، وتكلفة البضاعة المباعة</p>
          </div>
          <div style="display: flex; gap: 8px;">
            <input type="text" id="input-account-search" class="form-input" placeholder="بحث بالرمز أو الاسم..." style="width: 220px;">
            <select id="select-account-type-filter" class="form-input" style="width: 150px;">
              <option value="">كافة الأنواع</option>
              <option value="ASSET">الأصول (Assets)</option>
              <option value="LIABILITY">الخصوم (Liabilities)</option>
              <option value="EQUITY">حقوق الملكية (Equity)</option>
              <option value="REVENUE">الإيرادات (Revenue)</option>
              <option value="EXPENSE">المصروفات (Expenses)</option>
            </select>
          </div>
        </div>
        <div class="table-responsive">
          <table class="data-table" id="table-chart-of-accounts">
            <thead>
              <tr>
                <th style="width: 120px;">رمز الحساب</th>
                <th>اسم الحساب المحاسبي</th>
                <th style="width: 140px;">النوع المحاسبي</th>
                <th style="width: 110px;">طبيعة الحساب</th>
                <th style="width: 110px;">التصنيف</th>
                <th style="width: 160px; text-align: left;">الرصيد الدفتري الحالي</th>
                <th style="width: 90px; text-align: center;">كشف الأستاذ</th>
              </tr>
            </thead>
            <tbody>
              ${this.accounts.map(acc => `
                <tr class="account-row ${acc.category === 'HEADER' ? 'is-header-account' : ''}" style="${acc.category === 'HEADER' ? 'background: rgba(14, 165, 233, 0.05); font-weight: 700;' : ''}">
                  <td><code style="font-weight: 700; color: #0284c7;">${acc.code}</code></td>
                  <td>
                    <div style="padding-right: ${acc.category === 'POSTABLE' ? '24px' : '0'};">
                      ${acc.category === 'POSTABLE' ? '↳ ' : ''}<strong>${acc.name}</strong>
                      ${acc.nameEn ? `<span style="display: block; font-size: 0.75rem; color: #64748b;">${acc.nameEn}</span>` : ''}
                    </div>
                  </td>
                  <td>
                    <span class="badge ${this.getAccountTypeBadgeClass(acc.type)}">
                      ${this.getAccountTypeLabel(acc.type)}
                    </span>
                  </td>
                  <td>
                    <span class="badge ${acc.normalBalance === 'DEBIT' ? 'badge-blue' : 'badge-amber'}">
                      ${acc.normalBalance === 'DEBIT' ? 'مدين (Dr)' : 'دائن (Cr)'}
                    </span>
                  </td>
                  <td>
                    <span style="font-size: 0.8rem; color: #64748b;">
                      ${acc.category === 'HEADER' ? 'رئيسي' : acc.category === 'GROUP' ? 'مجموعة' : 'فرعي مرحّل'}
                    </span>
                  </td>
                  <td style="text-align: left; font-weight: 700; font-family: monospace;">
                    ${Number(acc.currentBalance).toLocaleString()} SDG
                  </td>
                  <td style="text-align: center;">
                    ${acc.category === 'POSTABLE' ? `
                      <button class="btn btn-secondary btn-xs btn-view-ledger" data-id="${acc.id}" title="عرض كشف الحساب">
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
  // TAB 2: GENERAL JOURNAL ENTRIES
  // =========================================================================

  renderJournalTab() {
    return `
      <div class="journal-entries-view card">
        <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
          <div>
            <h3 class="card-title">سجل قيود اليومية العامة المزدوجة</h3>
            <p class="card-subtitle">القيود المرحّلة من نقاط البيع، المشتريات، تسويات الجرد، والقيود اليدوية</p>
          </div>
          <div style="display: flex; gap: 8px;">
            <select id="select-journal-module-filter" class="form-input" style="width: 160px;">
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

        <div style="display: flex; flex-direction: column; gap: 16px; padding: 16px;">
          ${this.journalEntries.length === 0 ? `
            <div style="text-align: center; padding: 48px; color: #64748b;">
              لا توجد قيود يومية مسجلة حالياً
            </div>
          ` : this.journalEntries.map(entry => `
            <div class="card journal-entry-card" style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
              <div class="journal-entry-header" style="background: #f8fafc; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; flex-wrap: wrap; gap: 8px;">
                <div style="display: flex; align-items: center; gap: 12px;">
                  <span style="font-weight: 700; font-family: monospace; color: #0284c7; font-size: 1rem;">${entry.entryNumber}</span>
                  <span class="badge ${entry.status === 'POSTED' ? 'badge-green' : 'badge-red'}">
                    ${entry.status === 'POSTED' ? 'مرحّل معتمد' : 'معكوس (Reversed)'}
                  </span>
                  <span class="badge badge-purple">${this.getSourceModuleLabel(entry.sourceModule)}</span>
                  ${entry.referenceId ? `<span style="font-size: 0.8rem; color: #64748b;">مرجع: <code>${entry.referenceId}</code></span>` : ''}
                </div>
                <div style="display: flex; align-items: center; gap: 16px;">
                  <span style="font-size: 0.85rem; color: #64748b;">${new Date(entry.entryDate).toLocaleString('ar-SD')}</span>
                  ${entry.status === 'POSTED' ? `
                    <button class="btn btn-secondary btn-xs btn-reverse-entry" data-id="${entry.id}" style="color: #dc2626; border-color: #fca5a5;">
                      عكس القيد
                    </button>
                  ` : `
                    <span style="font-size: 0.8rem; color: #dc2626;">معكوس بالقيد ${entry.reversedByEntryId || ''}</span>
                  `}
                </div>
              </div>

              <div style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9;">
                <strong style="color: #1e293b;">البيان: </strong>${entry.description}
                <div style="font-size: 0.8rem; color: #64748b; margin-top: 4px;">بواسطة: ${entry.createdBy}</div>
              </div>

              <div class="table-responsive">
                <table class="data-table" style="margin: 0; font-size: 0.875rem;">
                  <thead>
                    <tr style="background: #ffffff;">
                      <th style="width: 110px;">رمز الحساب</th>
                      <th>اسم الحساب المحاسبي</th>
                      <th>الشرح / البيان التفصيلي</th>
                      <th style="width: 140px; text-align: left; color: #0284c7;">مدين (Debit)</th>
                      <th style="width: 140px; text-align: left; color: #d97706;">دائن (Credit)</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${entry.lines.map(line => `
                      <tr>
                        <td><code>${line.accountCode}</code></td>
                        <td><strong>${line.accountNameAr}</strong></td>
                        <td style="color: #64748b;">${line.narration || '—'}</td>
                        <td style="text-align: left; font-family: monospace; font-weight: 700;">
                          ${line.debit > 0 ? Number(line.debit).toLocaleString() : '—'}
                        </td>
                        <td style="text-align: left; font-family: monospace; font-weight: 700;">
                          ${line.credit > 0 ? Number(line.credit).toLocaleString() : '—'}
                        </td>
                      </tr>
                    `).join('')}
                    <tr style="background: #f8fafc; font-weight: 700;">
                      <td colspan="3" style="text-align: right;">إجمالي القيد المزدوج:</td>
                      <td style="text-align: left; font-family: monospace; color: #0284c7;">
                        ${Number(entry.totalAmount).toLocaleString()} SDG
                      </td>
                      <td style="text-align: left; font-family: monospace; color: #d97706;">
                        ${Number(entry.totalAmount).toLocaleString()} SDG
                      </td>
                    </tr>
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
  // TAB 3: FINANCIAL STATEMENTS
  // =========================================================================

  renderStatementsTab() {
    return `
      <div class="statements-view card">
        <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
          <div>
            <h3 class="card-title">القوائم والتقارير المالية الصيدلانية</h3>
            <p class="card-subtitle">التحقق من التوازن المحاسبي، الأرباح والخسائر، والموقف المالي للشركة</p>
          </div>
          <div class="statement-subtabs-nav" style="display: flex; gap: 8px;">
            <button class="btn btn-sm ${this.statementSubTab === 'trial-balance' ? 'btn-primary' : 'btn-secondary'} btn-subtab" data-subtab="trial-balance">
              ميزان المراجعة
            </button>
            <button class="btn btn-sm ${this.statementSubTab === 'income-statement' ? 'btn-primary' : 'btn-secondary'} btn-subtab" data-subtab="income-statement">
              قائمة الدخل والأرباح
            </button>
            <button class="btn btn-sm ${this.statementSubTab === 'balance-sheet' ? 'btn-primary' : 'btn-secondary'} btn-subtab" data-subtab="balance-sheet">
              الميزانية العمومية
            </button>
          </div>
        </div>

        <div id="statement-dynamic-container" style="padding: 16px;">
          <div style="text-align: center; padding: 24px; color: #64748b;">
            جاري احتساب وتجميع القوائم المالية من دفتر الأستاذ...
          </div>
        </div>
      </div>
    `;
  }

  // =========================================================================
  // TAB 4: GENERAL LEDGER STATEMENT
  // =========================================================================

  renderLedgerTab() {
    const postableAccounts = this.accounts.filter(a => a.category === 'POSTABLE');

    return `
      <div class="ledger-view card">
        <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
          <div>
            <h3 class="card-title">كشف حساب الأستاذ العام التفصيلي</h3>
            <p class="card-subtitle">حركة الحسابات الفردية ورصيدها المتراكم مع أرقام القيود والمستندات</p>
          </div>
          <div style="display: flex; gap: 8px; align-items: center;">
            <label style="font-size: 0.875rem; font-weight: 600;">اختر الحساب:</label>
            <select id="select-ledger-account" class="form-input" style="width: 280px;">
              ${postableAccounts.map(acc => `
                <option value="${acc.id}" ${acc.id === this.selectedLedgerAccountId ? 'selected' : ''}>
                  ${acc.code} — ${acc.name}
                </option>
              `).join('')}
            </select>
          </div>
        </div>

        <div id="ledger-dynamic-container" style="padding: 16px;">
          <div style="text-align: center; padding: 24px; color: #64748b;">
            جاري تحميل كشف حساب الأستاذ...
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
      if (this.statementSubTab === 'trial-balance') {
        const tb = await AccountingService.fetchTrialBalance();
        container.innerHTML = `
          <div style="margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; background: ${tb.isBalanced ? '#ecfdf5' : '#fef2f2'}; border: 1px solid ${tb.isBalanced ? '#a7f3d0' : '#fecaca'}; padding: 12px 16px; border-radius: 8px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 1.25rem;">${tb.isBalanced ? '✓' : '⚠️'}</span>
              <div>
                <strong>${tb.isBalanced ? 'ميزان المراجعة متوازن ومطابق للأصول المحاسبية' : 'تنبيه: ميزان المراجعة غير متوازن'}</strong>
                <div style="font-size: 0.8rem; color: #64748b;">تاريخ الاستخراج: ${new Date(tb.asOfDate).toLocaleString('ar-SD')}</div>
              </div>
            </div>
            <div style="text-align: left;">
              <div style="font-size: 0.85rem; color: #64748b;">إجمالي حركة الميزان:</div>
              <strong style="font-size: 1.1rem; font-family: monospace;">${tb.totalDebits.toLocaleString()} SDG</strong>
            </div>
          </div>

          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width: 100px;">الرمز</th>
                  <th>اسم الحساب المحاسبي</th>
                  <th style="width: 120px;">النوع</th>
                  <th style="width: 140px; text-align: left;">حركة المدين</th>
                  <th style="width: 140px; text-align: left;">حركة الدائن</th>
                  <th style="width: 150px; text-align: left; color: #0284c7;">رصيد مدين</th>
                  <th style="width: 150px; text-align: left; color: #d97706;">رصيد دائن</th>
                </tr>
              </thead>
              <tbody>
                ${tb.rows.map(r => `
                  <tr>
                    <td><code>${r.code}</code></td>
                    <td><strong>${r.name}</strong></td>
                    <td><span class="badge ${this.getAccountTypeBadgeClass(r.type)}">${this.getAccountTypeLabel(r.type)}</span></td>
                    <td style="text-align: left; font-family: monospace;">${r.totalDebit > 0 ? r.totalDebit.toLocaleString() : '—'}</td>
                    <td style="text-align: left; font-family: monospace;">${r.totalCredit > 0 ? r.totalCredit.toLocaleString() : '—'}</td>
                    <td style="text-align: left; font-family: monospace; font-weight: 700; color: #0284c7;">
                      ${r.netDebit > 0 ? r.netDebit.toLocaleString() : '—'}
                    </td>
                    <td style="text-align: left; font-family: monospace; font-weight: 700; color: #d97706;">
                      ${r.netCredit > 0 ? r.netCredit.toLocaleString() : '—'}
                    </td>
                  </tr>
                `).join('')}
                <tr style="background: #f8fafc; font-weight: 800; font-size: 1rem; border-top: 2px solid #cbd5e1;">
                  <td colspan="5" style="text-align: right;">المجموع الإجمالي:</td>
                  <td style="text-align: left; font-family: monospace; color: #0284c7;">${tb.totalDebits.toLocaleString()} SDG</td>
                  <td style="text-align: left; font-family: monospace; color: #d97706;">${tb.totalCredits.toLocaleString()} SDG</td>
                </tr>
              </tbody>
            </table>
          </div>
        `;
      } else if (this.statementSubTab === 'income-statement') {
        const is = await AccountingService.fetchIncomeStatement();
        container.innerHTML = `
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 24px;">
            <div class="card" style="padding: 16px; border-left: 4px solid #10b981;">
              <div style="font-size: 0.85rem; color: #64748b;">إجمالي الإيرادات الصيدلانية</div>
              <div style="font-size: 1.5rem; font-weight: 800; color: #10b981; font-family: monospace;">
                ${is.totalRevenue.toLocaleString()} SDG
              </div>
            </div>
            <div class="card" style="padding: 16px; border-left: 4px solid #f59e0b;">
              <div style="font-size: 0.85rem; color: #64748b;">تكلفة البضاعة المباعة (COGS)</div>
              <div style="font-size: 1.5rem; font-weight: 800; color: #f59e0b; font-family: monospace;">
                ${is.totalCogs.toLocaleString()} SDG
              </div>
            </div>
            <div class="card" style="padding: 16px; border-left: 4px solid #0284c7;">
              <div style="font-size: 0.85rem; color: #64748b;">إجمالي الربح (Gross Profit)</div>
              <div style="font-size: 1.5rem; font-weight: 800; color: #0284c7; font-family: monospace;">
                ${is.grossProfit.toLocaleString()} SDG
              </div>
              <div style="font-size: 0.8rem; color: #64748b; margin-top: 4px;">الهامش: ${is.grossProfitMargin}%</div>
            </div>
            <div class="card" style="padding: 16px; border-left: 4px solid ${is.netProfit >= 0 ? '#059669' : '#dc2626'};">
              <div style="font-size: 0.85rem; color: #64748b;">صافي الأرباح التشغيلية (Net Profit)</div>
              <div style="font-size: 1.5rem; font-weight: 800; color: ${is.netProfit >= 0 ? '#059669' : '#dc2626'}; font-family: monospace;">
                ${is.netProfit.toLocaleString()} SDG
              </div>
              <div style="font-size: 0.8rem; color: #64748b; margin-top: 4px;">صافي الهامش: ${is.netProfitMargin}%</div>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
            <div class="card" style="padding: 16px;">
              <h4 style="margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">تفاصيل الإيرادات</h4>
              <table style="width: 100%; font-size: 0.875rem;">
                ${is.revenueDetails.map(r => `
                  <tr>
                    <td style="padding: 6px 0;">${r.name}</td>
                    <td style="text-align: left; font-family: monospace; font-weight: 700;">${r.amount.toLocaleString()} SDG</td>
                  </tr>
                `).join('')}
              </table>
            </div>

            <div class="card" style="padding: 16px;">
              <h4 style="margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">تكلفة البضاعة والمصروفات</h4>
              <table style="width: 100%; font-size: 0.875rem;">
                ${is.cogsDetails.map(c => `
                  <tr>
                    <td style="padding: 6px 0;">${c.name}</td>
                    <td style="text-align: left; font-family: monospace; font-weight: 700; color: #f59e0b;">${c.amount.toLocaleString()} SDG</td>
                  </tr>
                `).join('')}
                ${is.operatingExpenseDetails.map(o => `
                  <tr>
                    <td style="padding: 6px 0;">${o.name}</td>
                    <td style="text-align: left; font-family: monospace; font-weight: 700; color: #dc2626;">${o.amount.toLocaleString()} SDG</td>
                  </tr>
                `).join('')}
              </table>
            </div>
          </div>
        `;
      } else if (this.statementSubTab === 'balance-sheet') {
        const bs = await AccountingService.fetchBalanceSheet();
        container.innerHTML = `
          <div style="margin-bottom: 24px; background: ${bs.isEquationBalanced ? '#ecfdf5' : '#fef2f2'}; border: 1px solid ${bs.isEquationBalanced ? '#a7f3d0' : '#fecaca'}; padding: 16px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <h4 style="color: ${bs.isEquationBalanced ? '#065f46' : '#991b1b'}; margin-bottom: 4px;">
                ${bs.isEquationBalanced ? '✓ المعادلة المحاسبية الذهبية متوازنة تماماً' : '⚠️ خلل في توازن المعادلة المحاسبية'}
              </h4>
              <p style="font-size: 0.875rem; color: #64748b; margin: 0;">الأصول (${bs.totalAssets.toLocaleString()}) = الخصوم (${bs.totalLiabilities.toLocaleString()}) + حقوق الملكية (${bs.totalEquity.toLocaleString()})</p>
            </div>
            <div style="font-family: monospace; font-weight: 800; font-size: 1.25rem;">
              الفارق: ${bs.variance} SDG
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
            <!-- Assets Side -->
            <div class="card" style="padding: 16px; border-top: 4px solid #0284c7;">
              <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 12px;">
                <h4 style="margin: 0; color: #0284c7;">الأصول والموجودات (Assets)</h4>
                <strong style="font-family: monospace; font-size: 1.1rem;">${bs.totalAssets.toLocaleString()} SDG</strong>
              </div>
              <table style="width: 100%; font-size: 0.875rem;">
                ${bs.assets.map(a => `
                  <tr>
                    <td style="padding: 6px 0;"><strong>${a.code}</strong> — ${a.name}</td>
                    <td style="text-align: left; font-family: monospace;">${a.netDebit.toLocaleString()} SDG</td>
                  </tr>
                `).join('')}
              </table>
            </div>

            <!-- Liabilities & Equity Side -->
            <div style="display: flex; flex-direction: column; gap: 16px;">
              <div class="card" style="padding: 16px; border-top: 4px solid #d97706;">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 12px;">
                  <h4 style="margin: 0; color: #d97706;">الخصوم والالتزامات (Liabilities)</h4>
                  <strong style="font-family: monospace; font-size: 1.1rem;">${bs.totalLiabilities.toLocaleString()} SDG</strong>
                </div>
                <table style="width: 100%; font-size: 0.875rem;">
                  ${bs.liabilities.map(l => `
                    <tr>
                      <td style="padding: 6px 0;"><strong>${l.code}</strong> — ${l.name}</td>
                      <td style="text-align: left; font-family: monospace;">${l.netCredit.toLocaleString()} SDG</td>
                    </tr>
                  `).join('')}
                </table>
              </div>

              <div class="card" style="padding: 16px; border-top: 4px solid #10b981;">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 12px;">
                  <h4 style="margin: 0; color: #10b981;">حقوق الملكية (Equity)</h4>
                  <strong style="font-family: monospace; font-size: 1.1rem;">${bs.totalEquity.toLocaleString()} SDG</strong>
                </div>
                <table style="width: 100%; font-size: 0.875rem;">
                  ${bs.equity.map(e => `
                    <tr>
                      <td style="padding: 6px 0;"><strong>${e.code}</strong> — ${e.name}</td>
                      <td style="text-align: left; font-family: monospace;">${e.netCredit.toLocaleString()} SDG</td>
                    </tr>
                  `).join('')}
                  <tr style="background: rgba(16, 185, 129, 0.05); font-weight: 700;">
                    <td style="padding: 6px 0;">+ صافي أرباح الفترة المالية الحالية</td>
                    <td style="text-align: left; font-family: monospace; color: #059669;">${bs.currentPeriodNetProfit.toLocaleString()} SDG</td>
                  </tr>
                </table>
              </div>
            </div>
          </div>
        `;
      }
    } catch (err) {
      container.innerHTML = `<div style="color: #dc2626; padding: 16px;">خطأ في إعداد القائمة المالية: ${err.message}</div>`;
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
        <div style="display: flex; justify-content: space-between; align-items: center; background: #f8fafc; padding: 16px; border-radius: 8px; margin-bottom: 16px; border: 1px solid #e2e8f0; flex-wrap: wrap; gap: 12px;">
          <div>
            <h4 style="margin: 0; color: #0284c7; font-size: 1.1rem;">
              <code>${ledger.account.code}</code> — ${ledger.account.name}
            </h4>
            <div style="font-size: 0.85rem; color: #64748b; margin-top: 4px;">
              النوع: ${this.getAccountTypeLabel(ledger.account.type)} | طبيعة الحساب: ${ledger.account.normalBalance === 'DEBIT' ? 'مدين' : 'دائن'}
            </div>
          </div>
          <div style="display: flex; gap: 24px; font-family: monospace;">
            <div>
              <span style="font-size: 0.8rem; color: #64748b; display: block;">الرصيد الافتتاحي:</span>
              <strong>${ledger.openingBalance.toLocaleString()} SDG</strong>
            </div>
            <div>
              <span style="font-size: 0.8rem; color: #64748b; display: block;">الرصيد الختامي:</span>
              <strong style="color: #0284c7; font-size: 1.1rem;">${ledger.closingBalance.toLocaleString()} SDG</strong>
            </div>
          </div>
        </div>

        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 100px;">التاريخ</th>
                <th style="width: 140px;">رقم القيد</th>
                <th>البيان والشرح</th>
                <th style="width: 100px;">المصدر</th>
                <th style="width: 130px; text-align: left; color: #0284c7;">مدين (Dr)</th>
                <th style="width: 130px; text-align: left; color: #d97706;">دائن (Cr)</th>
                <th style="width: 150px; text-align: left; font-weight: 700;">الرصيد التراكمي</th>
              </tr>
            </thead>
            <tbody>
              ${ledger.transactions.length === 0 ? `
                <tr><td colspan="7" style="text-align: center; padding: 24px; color: #64748b;">لا توجد حركات مسجلة لهذا الحساب</td></tr>
              ` : ledger.transactions.map(tx => `
                <tr>
                  <td>${new Date(tx.entryDate).toLocaleDateString('ar-SD')}</td>
                  <td><code style="font-weight: 700; color: #0284c7;">${tx.entryNumber}</code></td>
                  <td>${tx.narration || tx.description}</td>
                  <td><span class="badge badge-purple">${this.getSourceModuleLabel(tx.sourceModule)}</span></td>
                  <td style="text-align: left; font-family: monospace; font-weight: 600;">${tx.debit > 0 ? tx.debit.toLocaleString() : '—'}</td>
                  <td style="text-align: left; font-family: monospace; font-weight: 600;">${tx.credit > 0 ? tx.credit.toLocaleString() : '—'}</td>
                  <td style="text-align: left; font-family: monospace; font-weight: 700; color: #1e293b;">
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
        <div class="modal-content" style="max-width: 850px; width: 95%;">
          <div class="modal-header">
            <div>
              <h3 class="modal-title">إنشاء قيد يومية عام جديد (Double-Entry)</h3>
              <p class="modal-subtitle">يشترط النظام المحاسبي توازن طرفي القيد المدين والدائن بدقة</p>
            </div>
            <button class="modal-close-btn" id="btn-close-journal-modal">&times;</button>
          </div>

          <div class="modal-body" style="padding: 16px;">
            <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 16px; margin-bottom: 16px;">
              <div>
                <label class="form-label">تاريخ القيد:</label>
                <input type="date" id="input-je-date" class="form-input" value="${new Date().toISOString().slice(0, 10)}">
              </div>
              <div>
                <label class="form-label">بيان وشرح القيد العام:</label>
                <input type="text" id="input-je-desc" class="form-input" placeholder="مثال: تسوية نقدية لمصروفات الصيدلية">
              </div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <label class="form-label" style="font-weight: 700;">أطراف وسطور القيد المحاسبي:</label>
              <button type="button" id="btn-add-je-line" class="btn btn-secondary btn-xs">
                + إضافة سطر محاسبي
              </button>
            </div>

            <div class="table-responsive" style="max-height: 280px; overflow-y: auto;">
              <table class="data-table" id="table-je-lines" style="margin: 0; font-size: 0.85rem;">
                <thead>
                  <tr>
                    <th>الحساب المحاسبي</th>
                    <th style="width: 200px;">البيان التفصيلي للسطر</th>
                    <th style="width: 140px; text-align: left;">مدين (Debit)</th>
                    <th style="width: 140px; text-align: left;">دائن (Credit)</th>
                    <th style="width: 40px;"></th>
                  </tr>
                </thead>
                <tbody id="tbody-je-lines">
                  <!-- Row 1: Debit Side -->
                  <tr class="je-line-row">
                    <td>
                      <select class="form-input select-line-account" style="font-size: 0.85rem;">
                        ${postableAccounts.map(a => `<option value="${a.id}">${a.code} - ${a.name}</option>`).join('')}
                      </select>
                    </td>
                    <td><input type="text" class="form-input input-line-narration" placeholder="شرح السطر"></td>
                    <td><input type="number" step="0.01" class="form-input input-line-debit" value="0" style="text-align: left;"></td>
                    <td><input type="number" step="0.01" class="form-input input-line-credit" value="0" style="text-align: left;"></td>
                    <td style="text-align: center;"><button type="button" class="btn btn-danger btn-xs btn-remove-line">&times;</button></td>
                  </tr>
                  <!-- Row 2: Credit Side -->
                  <tr class="je-line-row">
                    <td>
                      <select class="form-input select-line-account" style="font-size: 0.85rem;">
                        ${postableAccounts.map(a => `<option value="${a.id}" ${a.code === '4110' ? 'selected' : ''}>${a.code} - ${a.name}</option>`).join('')}
                      </select>
                    </td>
                    <td><input type="text" class="form-input input-line-narration" placeholder="شرح السطر"></td>
                    <td><input type="number" step="0.01" class="form-input input-line-debit" value="0" style="text-align: left;"></td>
                    <td><input type="number" step="0.01" class="form-input input-line-credit" value="0" style="text-align: left;"></td>
                    <td style="text-align: center;"><button type="button" class="btn btn-danger btn-xs btn-remove-line">&times;</button></td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Balance Validator Summary Bar -->
            <div id="je-balance-summary" style="margin-top: 16px; padding: 12px 16px; border-radius: 8px; background: #f8fafc; border: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
              <div id="je-balance-status-badge" style="font-weight: 700;">
                <span style="color: #dc2626;">⚠️ القيد غير متوازن: المدين لا يساوي الدائن</span>
              </div>
              <div style="display: flex; gap: 24px; font-family: monospace;">
                <div>إجمالي المدين: <strong id="je-sum-debit" style="color: #0284c7;">0.00</strong></div>
                <div>إجمالي الدائن: <strong id="je-sum-credit" style="color: #d97706;">0.00</strong></div>
                <div>الفارق: <strong id="je-sum-diff" style="color: #dc2626;">0.00</strong></div>
              </div>
            </div>
          </div>

          <div class="modal-footer" style="display: flex; justify-content: space-between; align-items: center; padding: 16px;">
            <button type="button" class="btn btn-secondary" id="btn-cancel-je-modal">إلغاء</button>
            <button type="button" class="btn btn-primary" id="btn-submit-journal-entry" disabled>
              ترحيل واعتماد القيد المحاسبي
            </button>
          </div>
        </div>
      </div>
    `;

    this.bindModalEvents();
  }

  bindModalEvents() {
    const overlay = document.getElementById('journal-modal-overlay');
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
            <select class="form-input select-line-account" style="font-size: 0.85rem;">
              ${postableAccounts.map(a => `<option value="${a.id}">${a.code} - ${a.name}</option>`).join('')}
            </select>
          </td>
          <td><input type="text" class="form-input input-line-narration" placeholder="شرح السطر"></td>
          <td><input type="number" step="0.01" class="form-input input-line-debit" value="0" style="text-align: left;"></td>
          <td><input type="number" step="0.01" class="form-input input-line-credit" value="0" style="text-align: left;"></td>
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
          submitBtn.textContent = 'ترحيل واعتماد القيد المحاسبي';
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
        statusBadge.innerHTML = `<span style="color: #059669;">✓ القيد متوازن تماماً وجاهز للترحيل</span>`;
      } else if (sumDebit === 0 && sumCredit === 0) {
        statusBadge.innerHTML = `<span style="color: #64748b;">يرجى إدخال المبالغ المدينة والدائنة</span>`;
      } else {
        statusBadge.innerHTML = `<span style="color: #dc2626;">⚠️ القيد غير متوازن (الفارق: ${diff.toLocaleString()} SDG)</span>`;
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
        const reason = prompt('يرجى كتابة سبب عكس وتصحيح هذا القيد المحاسبي:');
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
