/**
 * PharmaTech — Multi-Branch Intelligence & HQ Governance View (MVP-3)
 * Features:
 *  1. غرفة العمليات والتحليلات المركزية المجمعة (Consolidated Network Analytics & Matrix)
 *  2. محرك الموازنة الذكية للمخزون بين الفروع (Smart Inter-Branch Stock Rebalancing)
 *  3. خريطة مخاطر الصلاحية الموحدة وتوزيع الـ FEFO (Consolidated Expiry Risk Map)
 *  4. الرقابة المركزية وسقوف السيولة النقدية والامتثال (Branch Governance & Health Scores)
 */

import { BranchIntelligenceService } from '../services/branchIntelligenceService.js';
import { showToast } from './Toast.js';
import { AuthService } from '../services/authService.js';

export class BranchIntelligenceView {
  constructor() {
    this.container = document.getElementById('branches-view');
    this.activeTab = 'performance'; // 'performance' | 'rebalancing' | 'expiry' | 'governance'
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
        <div class="view-header">
          <div class="view-title-group">
            <h1 class="view-title">غرفة عمليات وذكاء شبكة الفروع (MVP-3)</h1>
            <p class="view-subtitle">الرقابة المركزية الموحدة، موازنة المخزون بين الفروع، وتحليلات الأداء المالي</p>
          </div>
          <div class="view-actions">
            <select id="select-branch-period" class="form-input" style="width: 150px;">
              <option value="TODAY" ${this.period === 'TODAY' ? 'selected' : ''}>اليوم (مباشر)</option>
              <option value="WEEK" ${this.period === 'WEEK' ? 'selected' : ''}>هذا الأسبوع</option>
              <option value="MONTH" ${this.period === 'MONTH' ? 'selected' : ''}>هذا الشهر</option>
            </select>
            <button id="btn-refresh-branches" class="btn btn-secondary btn-sm" title="تحديث البيانات">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
              </svg>
              تحديث
            </button>
          </div>
        </div>

        <!-- Network Executive KPI Banner -->
        <div class="network-kpi-grid">
          <div class="card kpi-card" style="border-left: 4px solid #0284c7;">
            <div class="kpi-label">إجمالي مبيعات شبكة الفروع</div>
            <div class="kpi-value" style="color: #0284c7;">${summary.networkTotalRevenue.toLocaleString()} SDG</div>
            <div class="kpi-sub">عبر ${summary.totalBranchesCount} فروع تشغيلية نشطة</div>
          </div>

          <div class="card kpi-card" style="border-left: 4px solid #10b981;">
            <div class="kpi-label">أرباح الشبكة التقديرية (Gross Profit)</div>
            <div class="kpi-value" style="color: #10b981;">${summary.networkProfitEstimate.toLocaleString()} SDG</div>
            <div class="kpi-sub">متوسط هامش ربح تشغيلي: 28%</div>
          </div>

          <div class="card kpi-card" style="border-left: 4px solid #8b5cf6;">
            <div class="kpi-label">إجمالي التذاكر والوصفات</div>
            <div class="kpi-value" style="color: #8b5cf6;">${summary.totalTransactions.toLocaleString()}</div>
            <div class="kpi-sub">متوسط سلة المشتريات: ${summary.averageBasketValue.toLocaleString()} SDG</div>
          </div>

          <div class="card kpi-card" style="border-left: 4px solid #f59e0b;">
            <div class="kpi-label">التحول الرقمي للدفع (بنكك / فوري)</div>
            <div class="kpi-value" style="color: #f59e0b;">${paymentSplit.bankak.percent}%</div>
            <div class="kpi-sub">النقدية: ${paymentSplit.cash.percent}% | بنكك: ${paymentSplit.bankak.percent}%</div>
          </div>
        </div>

        <!-- Navigation Tabs -->
        <div class="branch-tabs-nav">
          <button class="branch-tab-btn ${this.activeTab === 'performance' ? 'active' : ''}" data-tab="performance">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="20" x2="18" y2="10"></line>
              <line x1="12" y1="20" x2="12" y2="4"></line>
              <line x1="6" y1="20" x2="6" y2="14"></line>
            </svg>
            مصفوفة مقارنة أداء الفروع
          </button>
          <button class="branch-tab-btn ${this.activeTab === 'rebalancing' ? 'active' : ''}" data-tab="rebalancing">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 1l4 4-4 4"/>
              <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
              <path d="M7 23l-4-4 4-4"/>
              <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
            </svg>
            الموازنة الذكية للمخزون (${this.rebalancingRecs.length})
          </button>
          <button class="branch-tab-btn ${this.activeTab === 'expiry' ? 'active' : ''}" data-tab="expiry">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            خريطة مخاطر الصلاحية الموحدة (FEFO)
          </button>
          <button class="branch-tab-btn ${this.activeTab === 'governance' ? 'active' : ''}" data-tab="governance">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            </svg>
            الرقابة المركزية والسيولة (${this.governanceHealth.length})
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
      case 'performance':
        return this.renderPerformanceTab();
      case 'rebalancing':
        return this.renderRebalancingTab();
      case 'expiry':
        return this.renderExpiryTab();
      case 'governance':
        return this.renderGovernanceTab();
      default:
        return '';
    }
  }

  // =========================================================================
  // TAB 1: CROSS-BRANCH PERFORMANCE MATRIX
  // =========================================================================

  renderPerformanceTab() {
    const matrix = this.analytics?.performanceMatrix || [];

    return `
      <div class="card" style="padding: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <div>
            <h3 class="card-title">ترتيب ومقارنة أداء الفروع في الشبكة</h3>
            <p class="card-subtitle">مقارنة حجم المبيعات ونسبة تحقيق التارجت اليومي ومعدل سلة الشراء</p>
          </div>
        </div>

        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 70px;">الترتيب</th>
                <th style="width: 110px;">رمز الفرع</th>
                <th>اسم الفرع والمدينة</th>
                <th style="width: 140px;">مدير الفرع</th>
                <th style="width: 150px; text-align: left;">مبيعات الفرع</th>
                <th style="width: 100px; text-align: center;">الطلبات</th>
                <th style="width: 180px;">تحقيق الهدف اليومي</th>
                <th style="width: 130px; text-align: left;">متوسط الفاتورة</th>
                <th style="width: 90px; text-align: center;">الحصة</th>
              </tr>
            </thead>
            <tbody>
              ${matrix.map((brn, idx) => `
                <tr>
                  <td style="text-align: center; font-weight: 700;">
                    <span class="badge ${idx === 0 ? 'badge-amber' : 'badge-gray'}" style="border-radius: 50%; width: 26px; height: 26px; display: inline-flex; align-items: center; justify-content: center;">
                      #${idx + 1}
                    </span>
                  </td>
                  <td><code>${brn.branchCode}</code></td>
                  <td>
                    <strong>${brn.branchName}</strong>
                    <div style="font-size: 0.75rem; color: #64748b;">${brn.city}</div>
                  </td>
                  <td>${brn.managerName}</td>
                  <td style="text-align: left; font-family: monospace; font-weight: 700; color: #0284c7;">
                    ${brn.revenue.toLocaleString()} SDG
                  </td>
                  <td style="text-align: center; font-family: monospace;">${brn.ordersCount}</td>
                  <td>
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <div class="progress-bar-bg" style="flex: 1; height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden;">
                        <div style="width: ${Math.min(100, brn.targetAchievedPercent)}%; height: 100%; background: ${brn.targetAchievedPercent >= 90 ? '#10b981' : (brn.targetAchievedPercent >= 60 ? '#0284c7' : '#f59e0b')}; border-radius: 4px;"></div>
                      </div>
                      <span style="font-size: 0.8rem; font-weight: 700; width: 45px; text-align: left;">${brn.targetAchievedPercent}%</span>
                    </div>
                  </td>
                  <td style="text-align: left; font-family: monospace;">${brn.averageBasket.toLocaleString()} SDG</td>
                  <td style="text-align: center; font-weight: 700; color: #64748b;">${brn.revenueSharePercent}%</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // =========================================================================
  // TAB 2: SMART STOCK REBALANCING
  // =========================================================================

  renderRebalancingTab() {
    return `
      <div class="card" style="padding: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 12px;">
          <div>
            <h3 class="card-title">محرك الموازنة الذكية ونقل المخزون بين الفروع</h3>
            <p class="card-subtitle">خوارزمية ذكية ترصد الفائض الراكد في الفروع وتنقله للفروع ذات الطلب المرتفع لتفادي نفاد المخزون</p>
          </div>
          <span class="badge badge-blue" style="font-size: 0.85rem; padding: 6px 12px;">
            تحديث آلي مطابق لقاعدة FEFO
          </span>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 16px;">
          ${this.rebalancingRecs.length === 0 ? `
            <div style="grid-column: 1 / -1; text-align: center; padding: 48px; color: #64748b;">
              المخزون متوازن حالياً عبر شبكة الفروع ولا توجد فجوات حرجة تتطلب تحويلاً
            </div>
          ` : this.rebalancingRecs.map(rec => `
            <div class="card" style="border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; display: flex; flex-direction: column; justify-content: space-between; gap: 12px; background: #ffffff;">
              <div>
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                  <span class="badge ${rec.urgency === 'HIGH' ? 'badge-red' : (rec.urgency === 'MEDIUM' ? 'badge-amber' : 'badge-blue')}">
                    ${rec.urgency === 'HIGH' ? 'عاجل جداً — خطر نفاد' : (rec.urgency === 'MEDIUM' ? 'أولوية متوسطة' : 'تحسين كفاءة وتوازن')}
                  </span>
                  <code style="font-size: 0.75rem; color: #64748b;">${rec.id}</code>
                </div>

                <h4 style="margin: 0 0 6px 0; font-size: 1.05rem; color: #0f172a;">
                  ${rec.productNameAr}
                </h4>
                <div style="font-size: 0.8rem; color: #64748b; margin-bottom: 12px;">
                  ${rec.productName} | تشغيلة: <code>${rec.batchNumber}</code> (صلاحية: ${rec.expiryDate})
                </div>

                <!-- Transfer Flow Route -->
                <div style="background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 10px; margin-bottom: 12px;">
                  <div style="display: flex; align-items: center; justify-content: space-between; font-size: 0.85rem;">
                    <div>
                      <span style="color: #64748b; font-size: 0.75rem; display: block;">الفرع الفائض (المصدر):</span>
                      <strong style="color: #0369a1;">${rec.sourceBranchName}</strong>
                    </div>
                    <div style="color: #0284c7; font-size: 1.25rem;">➔</div>
                    <div>
                      <span style="color: #64748b; font-size: 0.75rem; display: block;">الفرع المحتاج (الوجهة):</span>
                      <strong style="color: #059669;">${rec.destinationBranchName}</strong>
                    </div>
                  </div>
                  <div style="margin-top: 8px; font-size: 0.85rem; font-weight: 700; color: #1e293b;">
                    الكمية المقترحة للنقل: <span style="color: #0284c7; font-size: 1rem;">${rec.recommendedQuantity} عبوة</span>
                  </div>
                </div>

                <p style="font-size: 0.8rem; color: #475569; margin: 0; line-height: 1.4;">
                  ${rec.rationale}
                </p>
              </div>

              <div style="border-top: 1px solid #f1f5f9; padding-top: 12px;">
                <button class="btn btn-primary btn-sm btn-apply-rebalance" data-id="${rec.id}" style="width: 100%; display: flex; justify-content: center; align-items: center; gap: 8px;">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  اعتماد وأمر نقل فوري (1-Click Dispatch)
                </button>
              </div>
            </div>
          `).join('')}
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
      <div class="card" style="padding: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 12px;">
          <div>
            <h3 class="card-title">خريطة مخاطر الصلاحية الموحدة وتوزيع الـ FEFO</h3>
            <p class="card-subtitle">رصد التشغيلات التي تقترب من نهاية صلاحيتها وإعادة توجيهها للفروع ذات الاستهلاك العالي لتفادي التلف</p>
          </div>
          <div style="text-align: left; background: #fff1f2; border: 1px solid #fecdd3; padding: 8px 16px; border-radius: 8px;">
            <span style="font-size: 0.8rem; color: #9f1239; display: block;">إجمالي التعرض المالي للخطر:</span>
            <strong style="color: #e11d48; font-family: monospace; font-size: 1.1rem;">
              ${matrix.totalEstimatedRiskSDG.toLocaleString()} SDG
            </strong>
          </div>
        </div>

        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>اسم الدواء</th>
                <th style="width: 130px;">رقم التشغيلة</th>
                <th style="width: 110px;">تاريخ الصلاحية</th>
                <th style="width: 110px; text-align: center;">الأيام المتبقية</th>
                <th style="width: 100px; text-align: center;">الرصيد المتاح</th>
                <th style="width: 140px; text-align: left;">القيمة المعرضة للخطر</th>
                <th style="width: 170px;">الفرع الحالي</th>
                <th>الإجراء الموصى به</th>
              </tr>
            </thead>
            <tbody>
              ${matrix.batches.length === 0 ? `
                <tr><td colspan="8" style="text-align: center; padding: 24px; color: #64748b;">لا توجد تشغيلات حرجة قريبة الانتهاء حالياً</td></tr>
              ` : matrix.batches.map(b => `
                <tr>
                  <td>
                    <strong>${b.productNameAr}</strong>
                    <div style="font-size: 0.75rem; color: #64748b;">${b.productName}</div>
                  </td>
                  <td><code>${b.batchNumber}</code></td>
                  <td>${b.expiryDate}</td>
                  <td style="text-align: center;">
                    <span class="badge ${b.daysRemaining <= 60 ? 'badge-red' : 'badge-amber'}">
                      ${b.daysRemaining} يوم
                    </span>
                  </td>
                  <td style="text-align: center; font-weight: 700;">${b.availableQuantity}</td>
                  <td style="text-align: left; font-family: monospace; font-weight: 700; color: #e11d48;">
                    ${b.estimatedFinancialRisk.toLocaleString()} SDG
                  </td>
                  <td>${b.currentBranch}</td>
                  <td>
                    <span style="font-size: 0.82rem; color: #0284c7; font-weight: 600;">
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
      <div class="card" style="padding: 20px;">
        <div style="margin-bottom: 16px;">
          <h3 class="card-title">الرقابة المركزية ومؤشرات الامتثال والسيولة</h3>
          <p class="card-subtitle">مراقبة سقوف النقدية بالخزائن، تسوية تعارضات المزامنة، ومؤشر السلامة التشغيلية</p>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px;">
          ${this.governanceHealth.map(gov => `
            <div class="card" style="border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; background: #ffffff;">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                <div>
                  <h4 style="margin: 0; font-size: 1.05rem; color: #0f172a;">${gov.branchName}</h4>
                  <div style="font-size: 0.8rem; color: #64748b; margin-top: 2px;">
                    <code>${gov.branchCode}</code> | المدير: ${gov.managerName}
                  </div>
                </div>
                <span class="badge ${gov.healthScore >= 90 ? 'badge-green' : (gov.healthScore >= 75 ? 'badge-blue' : 'badge-red')}" style="font-size: 0.85rem; padding: 4px 8px;">
                  ${gov.healthScore}% ${gov.healthRating}
                </span>
              </div>

              <!-- Cash in Safe Gauge -->
              <div style="background: #f8fafc; border-radius: 8px; padding: 12px; margin-bottom: 12px; border: 1px solid #e2e8f0;">
                <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 6px;">
                  <span>النقدية بالخزينة:</span>
                  <strong style="font-family: monospace; color: ${gov.liquidity.isExceeded ? '#dc2626' : '#0f172a'};">
                    ${gov.liquidity.currentCashInSafe.toLocaleString()} SDG
                  </strong>
                </div>
                <div class="progress-bar-bg" style="height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden; margin-bottom: 6px;">
                  <div style="width: ${Math.min(100, gov.liquidity.utilizationPercent)}%; height: 100%; background: ${gov.liquidity.isExceeded ? '#dc2626' : (gov.liquidity.utilizationPercent > 75 ? '#f59e0b' : '#0284c7')};"></div>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: #64748b;">
                  <span>سقف الأمان: ${gov.liquidity.liquidityLimit.toLocaleString()} SDG</span>
                  <span>الاستهلاك: ${gov.liquidity.utilizationPercent}%</span>
                </div>
              </div>

              <!-- Compliance Flags -->
              <div>
                <div style="font-size: 0.8rem; font-weight: 700; margin-bottom: 6px; color: #475569;">سجل الملاحظات والإنذارات الرقابية:</div>
                ${gov.flags.length === 0 ? `
                  <div style="font-size: 0.8rem; color: #059669;">✓ لا توجد مخالفات، الفرع يعمل ضمن حدود الأمان المعتمدة</div>
                ` : gov.flags.map(f => `
                  <div style="font-size: 0.8rem; padding: 6px 10px; border-radius: 6px; background: ${f.severity === 'HIGH' ? '#fef2f2' : '#fffbeb'}; color: ${f.severity === 'HIGH' ? '#991b1b' : '#92400e'}; margin-bottom: 4px; border: 1px solid ${f.severity === 'HIGH' ? '#fecaca' : '#fde68a'};">
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
          btn.textContent = 'جاري التنفيذ وتوليد أمر الشحن...';

          const res = await BranchIntelligenceService.applyRebalancingRecommendation(
            recId,
            AuthService.getCurrentUser()?.fullName || 'د. أحمد الطاهر (المدير العام)'
          );

          showToast('تم اعتماد أمر التحويل بنجاح', res.message, 'success');
          this.loadData();
        } catch (err) {
          showToast('فشل تنفيذ أمر التحويل', err.message, 'error');
          btn.disabled = false;
          btn.textContent = 'اعتماد وأمر نقل فوري (1-Click Dispatch)';
        }
      };
    });
  }
}
