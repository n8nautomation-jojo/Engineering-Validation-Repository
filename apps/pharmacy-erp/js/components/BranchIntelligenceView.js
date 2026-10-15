/**
 * PharmaTech — Multi-Branch Operations & Smart Rebalancing View (Ergonomic UX 2.0)
 * 1-Click Inter-Branch Stock Transfers, Network Executive KPIs, and Zero Academic Boilerplate
 */

import { BranchIntelligenceService } from '../services/branchIntelligenceService.js';
import { showToast } from './Toast.js';
import { AuthService } from '../services/authService.js';

export class BranchIntelligenceView {
  constructor() {
    this.container = document.getElementById('branches-view');
    this.activeTab = 'rebalancing'; // 'rebalancing' | 'performance' | 'expiry' | 'governance'
    this.period = 'TODAY';
    this.analytics = null;
    this.rebalancingRecs = [];
    this.expiryMatrix = null;
    this.governanceHealth = [];

    this.init();
  }

  init() {
    if (!this.container) return;
    this.render();
    this.bindEvents();
  }

  async loadData() {
    try {
      this.analytics = await BranchIntelligenceService.fetchConsolidatedAnalytics(this.period);
      this.rebalancingRecs = await BranchIntelligenceService.fetchRebalancingRecommendations();
      this.expiryMatrix = await BranchIntelligenceService.fetchExpiryRiskMatrix();
      this.governanceHealth = await BranchIntelligenceService.fetchGovernanceHealth();

      this.render();
      this.bindEvents();
    } catch (err) {
      console.error('[BranchIntelligenceView] Error loading data:', err);
      showToast('خطأ في تحميل تحليلات الفروع', err.message, 'error');
    }
  }

  render() {
    if (!this.container) return;

    const summary = this.analytics?.summary || {
      totalBranchesCount: 4,
      networkTotalRevenue: 0,
      totalTransactions: 0,
      averageBasketValue: 0,
      networkProfitEstimate: 0
    };

    const paymentSplit = this.analytics?.paymentSplit || {
      cash: { amount: 0, percent: 50 },
      bankak: { amount: 0, percent: 50 }
    };

    this.container.innerHTML = `
      <div class="branches-view-container">
        <!-- View Header -->
        <div class="view-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 4px;">
          <div class="view-title-group">
            <div style="display: flex; align-items: center; gap: 8px;">
              <h1 class="view-title" style="margin: 0; font-size: 1.4rem; font-weight: 800;">شبكة الفروع والتحويلات الذكية</h1>
              <span class="chip chip-success" style="font-size: 11px;">4 فروع تشغيلية</span>
            </div>
            <p class="view-subtitle" style="margin: 2px 0 0; font-size: 0.85rem; color: var(--muted-foreground);">
              موازنة المخزون بين الفروع، مقارنة المبيعات، ومراقبة سيولة الخزائن
            </p>
          </div>
          <div class="view-actions" style="display: flex; gap: 8px;">
            <select id="select-branch-period" class="form-input" style="width: 130px; height: 36px; font-size: 0.85rem;">
              <option value="TODAY" ${this.period === 'TODAY' ? 'selected' : ''}>اليوم (مباشر)</option>
              <option value="WEEK" ${this.period === 'WEEK' ? 'selected' : ''}>هذا الأسبوع</option>
              <option value="MONTH" ${this.period === 'MONTH' ? 'selected' : ''}>هذا الشهر</option>
            </select>
            <button id="btn-refresh-branches" class="btn btn-secondary btn-sm" title="تحديث البيانات">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
              </svg>
              تحديث
            </button>
          </div>
        </div>

        <!-- Network Executive KPI Banner -->
        <div class="network-kpi-grid">
          <div class="card kpi-card" style="border-right: 4px solid #0284c7;">
            <div class="kpi-label">إجمالي مبيعات شبكة الفروع</div>
            <div class="kpi-value" style="color: #0284c7;">${summary.networkTotalRevenue.toLocaleString()} SDG</div>
            <div class="kpi-sub">عبر ${summary.totalBranchesCount} فروع نشطة</div>
          </div>

          <div class="card kpi-card" style="border-right: 4px solid #10b981;">
            <div class="kpi-label">أرباح الشبكة التقديرية</div>
            <div class="kpi-value" style="color: #10b981;">${summary.networkProfitEstimate.toLocaleString()} SDG</div>
            <div class="kpi-sub">متوسط هامش ربح: 28%</div>
          </div>

          <div class="card kpi-card" style="border-right: 4px solid #8b5cf6;">
            <div class="kpi-label">إجمالي الفواتير والوصفات</div>
            <div class="kpi-value" style="color: #8b5cf6;">${summary.totalTransactions.toLocaleString()}</div>
            <div class="kpi-sub">متوسط الفاتورة: ${summary.averageBasketValue.toLocaleString()} SDG</div>
          </div>

          <div class="card kpi-card" style="border-right: 4px solid #f59e0b;">
            <div class="kpi-label">مبيعات بنكك الإلكترونية</div>
            <div class="kpi-value" style="color: #f59e0b;">${paymentSplit.bankak.percent}%</div>
            <div class="kpi-sub">النقدية: ${paymentSplit.cash.percent}% | بنكك: ${paymentSplit.bankak.percent}%</div>
          </div>
        </div>

        <!-- Navigation Tabs (Action-First) -->
        <div class="branch-tabs-nav">
          <button class="branch-tab-btn ${this.activeTab === 'rebalancing' ? 'active' : ''}" data-tab="rebalancing">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 1l4 4-4 4"/>
              <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
              <path d="M7 23l-4-4 4-4"/>
              <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
            </svg>
            الموازنة والتحويلات الذكية (${this.rebalancingRecs.length})
          </button>
          <button class="branch-tab-btn ${this.activeTab === 'performance' ? 'active' : ''}" data-tab="performance">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="20" x2="18" y2="10"></line>
              <line x1="12" y1="20" x2="12" y2="4"></line>
              <line x1="6" y1="20" x2="6" y2="14"></line>
            </svg>
            ترتيب وأداء الفروع
          </button>
          <button class="branch-tab-btn ${this.activeTab === 'expiry' ? 'active' : ''}" data-tab="expiry">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            رادار الصلاحيات (FEFO)
          </button>
          <button class="branch-tab-btn ${this.activeTab === 'governance' ? 'active' : ''}" data-tab="governance">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            </svg>
            الخزائن والرقابة (${this.governanceHealth.length})
          </button>
        </div>

        <!-- Tab Content Body -->
        <div class="branch-tab-content">
          ${this.renderActiveTabContent()}
        </div>
      </div>
    `;
  }

  renderActiveTabContent() {
    switch (this.activeTab) {
      case 'rebalancing':
        return this.renderRebalancingTab();
      case 'performance':
        return this.renderPerformanceTab();
      case 'expiry':
        return this.renderExpiryTab();
      case 'governance':
        return this.renderGovernanceTab();
      default:
        return '';
    }
  }

  // =========================================================================
  // TAB 1: SMART STOCK REBALANCING (HIGH EFFICIENCY ACTION-CARDS)
  // =========================================================================

  renderRebalancingTab() {
    return `
      <div class="card" style="padding: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; flex-wrap: wrap; gap: 10px; border-bottom: 1px solid var(--border); padding-bottom: 10px;">
          <div>
            <h3 class="card-title" style="margin: 0; font-size: 1.1rem; font-weight: 800;">تحويلات المخزون المقترحة لسد النواقص</h3>
            <span style="font-size: 0.8rem; color: var(--muted-foreground);">نقل الأدوية الفائضة الراكدة إلى الفروع ذات الطلب المرتفع لتفادي نفاد الصنف</span>
          </div>
          <span class="badge badge-green" style="font-size: 0.8rem; padding: 4px 10px;">
            تطبيق فوري بقواعد FEFO
          </span>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 14px;">
          ${this.rebalancingRecs.length === 0 ? `
            <div style="grid-column: 1 / -1; text-align: center; padding: 36px; color: var(--muted-foreground);">
              المخزون متوازن حالياً عبر كافة الفروع ولا توجد نواقص حرجة
            </div>
          ` : this.rebalancingRecs.map(rec => `
            <div class="card" style="border: 1px solid var(--border); border-radius: 10px; padding: 14px; display: flex; flex-direction: column; justify-content: space-between; gap: 10px; background: var(--card);">
              <div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                  <span class="badge ${rec.urgency === 'HIGH' ? 'badge-red' : (rec.urgency === 'MEDIUM' ? 'badge-amber' : 'badge-blue')}">
                    ${rec.urgency === 'HIGH' ? '⚡ عاجل جداً — خطر نفاد' : (rec.urgency === 'MEDIUM' ? 'أولوية متوسطة' : 'تحسين توازن')}
                  </span>
                  <code style="font-size: 0.75rem; color: var(--muted-foreground);">${rec.id}</code>
                </div>

                <h4 style="margin: 0 0 2px 0; font-size: 1rem; font-weight: 800; color: var(--foreground);">
                  ${rec.productNameAr}
                </h4>
                <div style="font-size: 0.75rem; color: var(--muted-foreground); margin-bottom: 10px;">
                  تشغيلة: <code>${rec.batchNumber}</code> · صلاحية: ${rec.expiryDate}
                </div>

                <!-- Transfer Flow Route -->
                <div style="background: var(--background); border: 1px solid var(--border); border-radius: 8px; padding: 10px; margin-bottom: 10px;">
                  <div style="display: flex; align-items: center; justify-content: space-between; font-size: 0.82rem;">
                    <div>
                      <span style="color: var(--muted-foreground); font-size: 0.75rem; display: block;">من (المصدر الفائض):</span>
                      <strong style="color: #0369a1;">${rec.sourceBranchName}</strong>
                    </div>
                    <div style="color: var(--primary); font-size: 1.1rem; font-weight: 800;">➔</div>
                    <div>
                      <span style="color: var(--muted-foreground); font-size: 0.75rem; display: block;">إلى (الوجهة المحتاجة):</span>
                      <strong style="color: #059669;">${rec.destinationBranchName}</strong>
                    </div>
                  </div>
                  <div style="margin-top: 8px; font-size: 0.85rem; font-weight: 800; color: var(--foreground); display: flex; justify-content: space-between; align-items: center; border-top: 1px dashed var(--border); padding-top: 6px;">
                    <span>الكمية المطلوبة:</span>
                    <strong style="color: var(--primary); font-size: 1rem; font-family: var(--font-mono);">${rec.recommendedQuantity} عبوة</strong>
                  </div>
                </div>
              </div>

              <div>
                <button class="btn btn-primary btn-sm btn-apply-rebalance" data-id="${rec.id}" style="width: 100%; height: 38px; display: flex; justify-content: center; align-items: center; gap: 6px; font-weight: 800; font-size: 0.85rem;">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  اعتماد وأمر نقل فوري
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // =========================================================================
  // TAB 2: CROSS-BRANCH PERFORMANCE MATRIX
  // =========================================================================

  renderPerformanceTab() {
    const matrix = this.analytics?.performanceMatrix || [];

    return `
      <div class="card" style="padding: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px solid var(--border); padding-bottom: 10px;">
          <div>
            <h3 class="card-title" style="margin: 0; font-size: 1.1rem; font-weight: 800;">ترتيب وأداء الفروع</h3>
            <span style="font-size: 0.8rem; color: var(--muted-foreground);">مقارنة مبيعات اليوم ونسبة تحقيق الهدف اليومي</span>
          </div>
        </div>

        <div class="table-responsive">
          <table class="data-table" style="font-size: 0.85rem;">
            <thead>
              <tr>
                <th style="width: 60px; text-align: center;">الترتيب</th>
                <th>اسم الفرع والمدينة</th>
                <th style="width: 130px;">مدير الفرع</th>
                <th style="width: 140px; text-align: left;">مبيعات اليوم (ج.س)</th>
                <th style="width: 80px; text-align: center;">الطلبات</th>
                <th style="width: 180px;">تحقيق الهدف</th>
                <th style="width: 120px; text-align: left;">متوسط الفاتورة (ج.س)</th>
              </tr>
            </thead>
            <tbody>
              ${matrix.map((brn, idx) => `
                <tr>
                  <td style="text-align: center; font-weight: 800;">
                    <span class="badge ${idx === 0 ? 'badge-amber' : 'badge-gray'}" style="border-radius: 50%; width: 24px; height: 24px; display: inline-flex; align-items: center; justify-content: center;">
                      #${idx + 1}
                    </span>
                  </td>
                  <td>
                    <strong>${brn.branchName}</strong>
                    <div style="font-size: 0.75rem; color: var(--muted-foreground);">${brn.city} · <code>${brn.branchCode}</code></div>
                  </td>
                  <td>${brn.managerName}</td>
                  <td style="text-align: left; font-family: var(--font-mono); font-weight: 800; color: #0284c7;">
                    ${brn.revenue.toLocaleString()}
                  </td>
                  <td style="text-align: center; font-family: var(--font-mono);">${brn.ordersCount}</td>
                  <td>
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <div class="progress-bar-bg" style="flex: 1; height: 7px; background: var(--border); border-radius: 4px; overflow: hidden;">
                        <div style="width: ${Math.min(100, brn.targetAchievedPercent)}%; height: 100%; background: ${brn.targetAchievedPercent >= 90 ? '#10b981' : (brn.targetAchievedPercent >= 60 ? '#0284c7' : '#f59e0b')}; border-radius: 4px;"></div>
                      </div>
                      <span style="font-size: 0.78rem; font-weight: 700; width: 42px; text-align: left;">${brn.targetAchievedPercent}%</span>
                    </div>
                  </td>
                  <td style="text-align: left; font-family: var(--font-mono);">${brn.averageBasket.toLocaleString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // =========================================================================
  // TAB 3: CONSOLIDATED FEFO EXPIRY MAP
  // =========================================================================

  renderExpiryTab() {
    const matrix = this.expiryMatrix || { batches: [], totalEstimatedRiskSDG: 0 };

    return `
      <div class="card" style="padding: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 10px; border-bottom: 1px solid var(--border); padding-bottom: 10px;">
          <div>
            <h3 class="card-title" style="margin: 0; font-size: 1.1rem; font-weight: 800;">رادار الصلاحيات الأقرب انتهاءً (FEFO)</h3>
            <span style="font-size: 0.8rem; color: var(--muted-foreground);">التشغيلات التي تقترب من نهاية الصلاحية لتصريفها أولاً</span>
          </div>
          <div style="text-align: left; background: #fff1f2; border: 1px solid #fecdd3; padding: 6px 12px; border-radius: 8px;">
            <span style="font-size: 0.75rem; color: #9f1239; display: block;">قيمة المعرض للمخاطرة:</span>
            <strong style="color: #e11d48; font-family: var(--font-mono); font-size: 1rem;">
              ${matrix.totalEstimatedRiskSDG.toLocaleString()} SDG
            </strong>
          </div>
        </div>

        <div class="table-responsive">
          <table class="data-table" style="font-size: 0.85rem;">
            <thead>
              <tr>
                <th>اسم الدواء</th>
                <th style="width: 120px;">التشغيلة</th>
                <th style="width: 100px;">الصلاحية</th>
                <th style="width: 100px; text-align: center;">المتبقي</th>
                <th style="width: 90px; text-align: center;">الرصيد</th>
                <th style="width: 130px; text-align: left;">القيمة المالية</th>
                <th style="width: 150px;">الفرع</th>
                <th>الإجراء الموصى به</th>
              </tr>
            </thead>
            <tbody>
              ${matrix.batches.length === 0 ? `
                <tr><td colspan="8" style="text-align: center; padding: 24px; color: var(--muted-foreground);">لا توجد تشغيلات حرجة قريبة الانتهاء</td></tr>
              ` : matrix.batches.map(b => `
                <tr>
                  <td>
                    <strong>${b.productNameAr}</strong>
                  </td>
                  <td><code>${b.batchNumber}</code></td>
                  <td>${b.expiryDate}</td>
                  <td style="text-align: center;">
                    <span class="badge ${b.daysRemaining <= 60 ? 'badge-red' : 'badge-amber'}">
                      ${b.daysRemaining} يوم
                    </span>
                  </td>
                  <td style="text-align: center; font-weight: 700;">${b.availableQuantity}</td>
                  <td style="text-align: left; font-family: var(--font-mono); font-weight: 700; color: #e11d48;">
                    ${b.estimatedFinancialRisk.toLocaleString()} SDG
                  </td>
                  <td>${b.currentBranch}</td>
                  <td>
                    <span style="font-size: 0.8rem; color: #0284c7; font-weight: 700;">
                      ${b.suggestedAction}
                    </span>
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
  // TAB 4: BRANCH GOVERNANCE & CASH SAFEGUARDS
  // =========================================================================

  renderGovernanceTab() {
    return `
      <div class="card" style="padding: 16px;">
        <div style="margin-bottom: 12px; border-bottom: 1px solid var(--border); padding-bottom: 10px;">
          <h3 class="card-title" style="margin: 0; font-size: 1.1rem; font-weight: 800;">سقوف نقدية الخزائن والرقابة</h3>
          <span style="font-size: 0.8rem; color: var(--muted-foreground);">السيولة النقدية في كل فرع وسقف الأمان المعتمد</span>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px;">
          ${this.governanceHealth.map(gov => `
            <div class="card" style="border: 1px solid var(--border); border-radius: 10px; padding: 14px; background: var(--card);">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                <div>
                  <h4 style="margin: 0; font-size: 1rem; font-weight: 800; color: var(--foreground);">${gov.branchName}</h4>
                  <div style="font-size: 0.75rem; color: var(--muted-foreground); margin-top: 2px;">
                    <code>${gov.branchCode}</code> · المدير: ${gov.managerName}
                  </div>
                </div>
                <span class="badge ${gov.healthScore >= 90 ? 'badge-green' : (gov.healthScore >= 75 ? 'badge-blue' : 'badge-red')}">
                  ${gov.healthScore}% ${gov.healthRating}
                </span>
              </div>

              <!-- Cash in Safe Gauge -->
              <div style="background: var(--background); border-radius: 8px; padding: 10px; margin-bottom: 10px; border: 1px solid var(--border);">
                <div style="display: flex; justify-content: space-between; font-size: 0.82rem; margin-bottom: 4px;">
                  <span>النقدية بالخزينة:</span>
                  <strong style="font-family: var(--font-mono); color: ${gov.liquidity.isExceeded ? '#dc2626' : 'var(--foreground)'};">
                    ${gov.liquidity.currentCashInSafe.toLocaleString()} SDG
                  </strong>
                </div>
                <div class="progress-bar-bg" style="height: 7px; background: var(--border); border-radius: 4px; overflow: hidden; margin-bottom: 4px;">
                  <div style="width: ${Math.min(100, gov.liquidity.utilizationPercent)}%; height: 100%; background: ${gov.liquidity.isExceeded ? '#dc2626' : (gov.liquidity.utilizationPercent > 75 ? '#f59e0b' : '#0284c7')};"></div>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--muted-foreground);">
                  <span>سقف الأمان: ${gov.liquidity.liquidityLimit.toLocaleString()} SDG</span>
                  <span>الاستهلاك: ${gov.liquidity.utilizationPercent}%</span>
                </div>
              </div>

              <!-- Compliance Flags -->
              <div>
                ${gov.flags.length === 0 ? `
                  <div style="font-size: 0.78rem; color: #059669; font-weight: 600;">✓ الخزينة ضمن حدود الأمان المعتمدة</div>
                ` : gov.flags.map(f => `
                  <div style="font-size: 0.78rem; padding: 4px 8px; border-radius: 6px; background: ${f.severity === 'HIGH' ? '#fef2f2' : '#fffbeb'}; color: ${f.severity === 'HIGH' ? '#991b1b' : '#92400e'}; margin-bottom: 4px; border: 1px solid ${f.severity === 'HIGH' ? '#fecaca' : '#fde68a'};">
                    ⚠️ ${f.message}
                  </div>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // =========================================================================
  // EVENT BINDINGS
  // =========================================================================

  bindEvents() {
    // Navigation Tabs
    const tabButtons = this.container.querySelectorAll('.branch-tab-btn');
    tabButtons.forEach(btn => {
      btn.onclick = () => {
        this.activeTab = btn.dataset.tab;
        this.render();
        this.bindEvents();
      };
    });

    // Refresh Button
    const refreshBtn = document.getElementById('btn-refresh-branches');
    if (refreshBtn) {
      refreshBtn.onclick = () => this.loadData();
    }

    // Period Selector
    const periodSelect = document.getElementById('select-branch-period');
    if (periodSelect) {
      periodSelect.onchange = (e) => {
        this.period = e.target.value;
        this.loadData();
      };
    }

    // Apply Rebalancing Recommendation (1-Click Dispatch)
    const applyButtons = this.container.querySelectorAll('.btn-apply-rebalance');
    applyButtons.forEach(btn => {
      btn.onclick = async () => {
        const recId = btn.dataset.id;
        try {
          btn.disabled = true;
          btn.textContent = 'جاري النقل والتوليد...';

          const res = await BranchIntelligenceService.applyRebalancingRecommendation(
            recId,
            AuthService.getCurrentUser()?.fullName || 'د. أحمد الطاهر (المدير العام)'
          );

          showToast('تم اعتماد أمر التحويل بنجاح', res.message, 'success');
          this.loadData();
        } catch (err) {
          showToast('فشل تنفيذ أمر التحويل', err.message, 'error');
          btn.disabled = false;
          btn.textContent = 'اعتماد وأمر نقل فوري';
        }
      };
    });
  }
}
