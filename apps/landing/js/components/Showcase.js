/**
 * Showcase Component
 * Interactive Browser Mockup with live tab switcher between:
 * 1. Pharmacy ERP & Inventory FEFO
 * 2. High-speed Offline POS & Bankak Split Payments
 * 3. SaaS Multi-tenant Platform Governance
 */

import { getLandingState, setActiveTab, subscribeLandingState } from '../state/landingState.js';

export function renderShowcase() {
  const { activeTab } = getLandingState();

  return `
    <section class="section-spacer" id="preview">
      <div class="container">
        <div class="text-center">
          <span class="section-tag">استكشف النظام عملياً</span>
          <h2 class="section-title">واجهة موحدة تجمع بين قوة الـ ERP وسرعة الـ POS</h2>
          <p class="section-desc">تنقّل بين واجهات النظام الحية لاكتشاف سلاسة العمليات الصيدلانية ودقة الرقابة المخزنية.</p>
        </div>

        <div class="showcase-shell">
          <!-- Top Window Bar -->
          <div class="browser-bar">
            <div class="browser-dots">
              <span class="browser-dot" style="background:#EF4444;"></span>
              <span class="browser-dot" style="background:#F59E0B;"></span>
              <span class="browser-dot" style="background:#10B981;"></span>
            </div>

            <!-- Tab Switcher -->
            <div class="browser-tabs-group" role="tablist">
              <button class="browser-tab-btn ${activeTab === 'erp' ? 'active' : ''}" 
                      data-showcase-tab="erp" role="tab" aria-selected="${activeTab === 'erp'}">
                منظومة الصيدلية (ERP & Inventory)
              </button>
              <button class="browser-tab-btn ${activeTab === 'pos' ? 'active' : ''}" 
                      data-showcase-tab="pos" role="tab" aria-selected="${activeTab === 'pos'}">
                نقطة البيع وبنكك (POS & Bankak)
              </button>
              <button class="browser-tab-btn ${activeTab === 'admin' ? 'active' : ''}" 
                      data-showcase-tab="admin" role="tab" aria-selected="${activeTab === 'admin'}">
                لوحة المنصة المركزية (Admin)
              </button>
            </div>

            <div style="font-size:0.75rem; color:var(--text-muted); font-family:var(--font-latin);">
              https://app.pharmatech.sd/demo
            </div>
          </div>

          <!-- Body Viewport -->
          <div class="browser-body">

            <!-- TAB 1: PHARMACY ERP -->
            <div class="mockup-tab-pane ${activeTab === 'erp' ? 'active' : ''}" id="mockup-tab-erp">
              <div class="mockup-stats-strip">
                <div class="mock-stat-box">
                  <div class="mock-stat-lbl">
                    <span>مبيعات الوردية اليوم</span>
                    <span style="color:var(--brand-teal); font-weight:700;">↑ +14%</span>
                  </div>
                  <div class="mock-stat-val">482,500 <small style="font-size:0.75rem; color:var(--text-muted);">ج.س</small></div>
                </div>

                <div class="mock-stat-box">
                  <div class="mock-stat-lbl">
                    <span>تنبيهات الصلاحية (FEFO)</span>
                    <span style="color:var(--brand-amber); font-weight:700;">3 دفعات حرجة</span>
                  </div>
                  <div class="mock-stat-val" style="color:var(--brand-amber);">24 <small style="font-size:0.75rem; color:var(--text-muted);">علبة</small></div>
                </div>

                <div class="mock-stat-box">
                  <div class="mock-stat-lbl">
                    <span>نواقص المخزون الدوائي</span>
                    <span style="color:var(--brand-cyan); font-weight:700;">تحت حد الطلب</span>
                  </div>
                  <div class="mock-stat-val">8 <small style="font-size:0.75rem; color:var(--text-muted);">أصناف</small></div>
                </div>

                <div class="mock-stat-box">
                  <div class="mock-stat-lbl">
                    <span>أوامر التوريد الجارية</span>
                    <span style="color:var(--brand-teal); font-weight:700;">قيد الاستلام</span>
                  </div>
                  <div class="mock-stat-val">3 <small style="font-size:0.75rem; color:var(--text-muted);">شحنات</small></div>
                </div>
              </div>

              <!-- Inventory FEFO Table -->
              <table class="mockup-table">
                <thead>
                  <tr>
                    <th>اسم الصنف الدوائي</th>
                    <th>رقم التشغيلة (Batch)</th>
                    <th>تاريخ الانتهاء</th>
                    <th>حالة الصلاحية (FEFO Guard)</th>
                    <th>المخزون المتوفر</th>
                    <th>سعر العلبة</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style="font-weight:700; color:var(--text-primary);">Augmentin 1g Tablets (14 tab)</td>
                    <td><span class="num">AUG-2024-B9</span></td>
                    <td><span class="num">2026-11-30</span></td>
                    <td><span class="fefo-pill fefo-safe">✓ أولوية صرف (صالح)</span></td>
                    <td><span class="num">48</span> علبة</td>
                    <td><span class="num">18,500</span> ج.س</td>
                  </tr>
                  <tr>
                    <td style="font-weight:700; color:var(--text-primary);">Panadol Extra 500mg (24 caplets)</td>
                    <td><span class="num">PAN-8812</span></td>
                    <td><span class="num">2026-12-15</span></td>
                    <td><span class="fefo-pill fefo-safe">✓ دفعة آمنة</span></td>
                    <td><span class="num">120</span> علبة</td>
                    <td><span class="num">4,200</span> ج.س</td>
                  </tr>
                  <tr>
                    <td style="font-weight:700; color:var(--text-primary);">Cetal Cold & Flu Syrup 120ml</td>
                    <td><span class="num">CTL-3104</span></td>
                    <td><span class="num">2026-05-10</span></td>
                    <td><span class="fefo-pill fefo-warn">⚠️ تنبيه: متبقي &lt; 90 يوم</span></td>
                    <td><span class="num">14</span> علبة</td>
                    <td><span class="num">3,800</span> ج.س</td>
                  </tr>
                  <tr>
                    <td style="font-weight:700; color:var(--text-primary);">Insulin Mixtard 30 HM 100IU</td>
                    <td><span class="num">INS-9011</span></td>
                    <td><span class="num">2027-04-20</span></td>
                    <td><span class="fefo-pill fefo-safe">✓ دفعة آمنة (تبريد 2-8°C)</span></td>
                    <td><span class="num">32</span> فيال</td>
                    <td><span class="num">22,000</span> ج.س</td>
                  </tr>
                  <tr>
                    <td style="font-weight:700; color:var(--text-primary);">Amoxicillin 500mg Capsules</td>
                    <td><span class="num">AMX-4421</span></td>
                    <td><span class="num">2026-02-01</span></td>
                    <td><span class="fefo-pill fefo-danger">⛔ محظور الصرف (منتهي)</span></td>
                    <td><span class="num">2</span> علبة (محجوز)</td>
                    <td><span class="num">6,500</span> ج.س</td>
                  </tr>
                </tbody>
              </table>

              <div style="margin-top:var(--space-4); display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:0.8rem; color:var(--text-muted);">
                  معتمد وفق متطلبات التوزيع الصيدلاني الجيد في السودان.
                </span>
                <a href="/pharmacy-erp/" class="btn btn-ghost btn-sm">
                  فتح لوحة إدارة الصيدلية الحية ←
                </a>
              </div>
            </div>

            <!-- TAB 2: INTEGRATED POS & BANKAK -->
            <div class="mockup-tab-pane ${activeTab === 'pos' ? 'active' : ''}" id="mockup-tab-pos">
              <div class="pos-terminal-grid">
                <!-- Products catalog -->
                <div>
                  <div class="pos-search-box">
                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <span>امسح الباركود أو ابحث باسم الدواء (F2 للبحث السريع)...</span>
                  </div>

                  <div class="pos-prods-grid">
                    <div class="pos-prod-card">
                      <h4>Augmentin 1g</h4>
                      <p>18,500 ج.س</p>
                      <div style="font-size:0.725rem; color:var(--text-muted); margin-top:2px;">مخزون: 48 (FEFO 1st)</div>
                    </div>
                    <div class="pos-prod-card">
                      <h4>Panadol Extra</h4>
                      <p>4,200 ج.س</p>
                      <div style="font-size:0.725rem; color:var(--text-muted); margin-top:2px;">شريط: 2,100 ج.س</div>
                    </div>
                    <div class="pos-prod-card">
                      <h4>Cataflam 50mg</h4>
                      <p>5,800 ج.س</p>
                      <div style="font-size:0.725rem; color:var(--text-muted); margin-top:2px;">مخزون: 85 علبة</div>
                    </div>
                    <div class="pos-prod-card">
                      <h4>Flagyl 500mg</h4>
                      <p>3,100 ج.س</p>
                      <div style="font-size:0.725rem; color:var(--text-muted); margin-top:2px;">مخزون: 62 علبة</div>
                    </div>
                    <div class="pos-prod-card">
                      <h4>C-Ravit Effervescent</h4>
                      <p>7,400 ج.س</p>
                      <div style="font-size:0.725rem; color:var(--text-muted); margin-top:2px;">مخزون: 30 أنبوبة</div>
                    </div>
                    <div class="pos-prod-card">
                      <h4>Omega 3 Fish Oil</h4>
                      <p>14,000 ج.س</p>
                      <div style="font-size:0.725rem; color:var(--text-muted); margin-top:2px;">مخزون: 19 عبوة</div>
                    </div>
                  </div>

                  <div style="background:var(--hero-badge-bg); border:1px solid var(--hero-badge-border); border-radius:var(--radius-md); padding:10px var(--space-4); margin-top:var(--space-3); font-size:0.8rem; display:flex; justify-content:space-between; align-items:center;">
                    <span style="color:var(--hero-badge-text); font-weight:700;">
                      ✓ وضع عدم الاتصال (Offline POS نشط): الفواتير تُحفظ محلياً وتُطبع فورياً
                    </span>
                    <span class="num" style="color:var(--text-muted);">طابعة: EPSON TM-T88 80mm</span>
                  </div>
                </div>

                <!-- Cart & Payment Simulation -->
                <div class="pos-cart-panel">
                  <div>
                    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-subtle); padding-bottom:8px; margin-bottom:12px;">
                      <span style="font-weight:700; color:var(--text-primary);">فاتورة كاشير: #INV-8419</span>
                      <span style="font-size:0.75rem; color:var(--brand-teal); font-weight:700;">● مفتوحة</span>
                    </div>

                    <div style="display:flex; flex-direction:column; gap:8px;">
                      <div style="display:flex; justify-content:space-between; font-size:0.85rem;">
                        <div>
                          <div style="font-weight:700; color:var(--text-primary);">Augmentin 1g × 1 علبة</div>
                          <div style="font-size:0.725rem; color:var(--text-muted);">تشغيلة: AUG-2024-B9</div>
                        </div>
                        <span class="num" style="font-weight:700;">18,500 ج.س</span>
                      </div>
                      <div style="display:flex; justify-content:space-between; font-size:0.85rem;">
                        <div>
                          <div style="font-weight:700; color:var(--text-primary);">Panadol Extra × 1 شريط (تجزئة)</div>
                          <div style="font-size:0.725rem; color:var(--text-muted);">شريط 12 حبة</div>
                        </div>
                        <span class="num" style="font-weight:700;">2,100 ج.س</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div class="receipt-summary-box">
                      <div style="display:flex; justify-content:space-between; font-size:0.8rem; color:var(--text-muted); margin-bottom:4px;">
                        <span>المجموع:</span>
                        <span class="num">20,600 ج.س</span>
                      </div>
                      <div style="display:flex; justify-content:space-between; font-size:1rem; font-weight:800; color:var(--text-primary);">
                        <span>الإجمالي الصافي:</span>
                        <span class="num" style="color:var(--brand-teal); font-size:1.15rem;">20,600 ج.س</span>
                      </div>
                    </div>

                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
                      <button class="btn btn-secondary btn-sm" style="background:rgba(0,179,126,0.12); color:var(--brand-teal); border-color:rgba(0,179,126,0.3);">
                        💵 نقداً (Cash)
                      </button>
                      <button class="btn btn-secondary btn-sm" style="background:rgba(0,82,204,0.12); color:var(--brand-blue); border-color:rgba(0,82,204,0.3);">
                        📱 بنكك (Bankak QR)
                      </button>
                    </div>

                    <div style="text-align:center; margin-top:8px;">
                      <a href="/pharmacy-erp/" class="btn btn-ghost btn-sm" style="width:100%;">
                        فتح نقطة البيع الحية (POS) ←
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- TAB 3: PLATFORM ADMIN -->
            <div class="mockup-tab-pane ${activeTab === 'admin' ? 'active' : ''}" id="mockup-tab-admin">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:var(--space-4);">
                <div>
                  <h3 style="font-size:1.05rem; font-weight:800; color:var(--text-primary); margin-bottom:2px;">حوكمة المنشآت الصيدلانية المركزية</h3>
                  <p style="font-size:0.85rem; color:var(--text-muted);">إدارة المستأجرين، الصلاحيات، وسجلات التدقيق التشفيرية غير القابلة للتعديل.</p>
                </div>
                <a href="/platform-admin/" class="btn btn-primary btn-sm">
                  دخول لوحة المنصة
                </a>
              </div>

              <!-- Tenants List -->
              <div style="display:flex; flex-direction:column; gap:var(--space-3);">
                <div style="background:var(--bg-surface); border:1px solid var(--border-subtle); border-radius:var(--radius-md); padding:var(--space-4); display:flex; justify-content:space-between; align-items:center;">
                  <div>
                    <h4 style="font-size:0.95rem; font-weight:700; color:var(--text-primary); margin-bottom:2px;">صيدلية الأمل المركزية — الخرطوم (السوق العربي)</h4>
                    <p style="font-size:0.8rem; color:var(--text-muted);">المعرف: <span class="num">tenant_alamal_01</span> | الفروع: 3 | نقاط البيع: 6 | المخزن الرئيسي نشط</p>
                  </div>
                  <div style="display:flex; align-items:center; gap:8px;">
                    <span class="fefo-pill fefo-safe">باقة المؤسسات (Enterprise)</span>
                    <span style="color:var(--brand-teal); font-size:0.75rem; font-weight:700;">● متصل</span>
                  </div>
                </div>

                <div style="background:var(--bg-surface); border:1px solid var(--border-subtle); border-radius:var(--radius-md); padding:var(--space-4); display:flex; justify-content:space-between; align-items:center;">
                  <div>
                    <h4 style="font-size:0.95rem; font-weight:700; color:var(--text-primary); margin-bottom:2px;">مجمع صيدليات النيلين — أم درمان (شارع الوادي)</h4>
                    <p style="font-size:0.8rem; color:var(--text-muted);">المعرف: <span class="num">tenant_neelain_02</span> | الفروع: 2 | نقاط البيع: 4 | نظام FEFO مفعل</p>
                  </div>
                  <div style="display:flex; align-items:center; gap:8px;">
                    <span class="fefo-pill" style="background:rgba(0,163,255,0.12); color:var(--brand-cyan);">باقة النمو (Standard)</span>
                    <span style="color:var(--brand-teal); font-size:0.75rem; font-weight:700;">● متصل</span>
                  </div>
                </div>

                <div style="background:var(--bg-surface); border:1px solid var(--border-subtle); border-radius:var(--radius-md); padding:var(--space-4); display:flex; justify-content:space-between; align-items:center;">
                  <div>
                    <h4 style="font-size:0.95rem; font-weight:700; color:var(--text-primary); margin-bottom:2px;">صيدلية السلام — بورتسودان (حي الشاطئ)</h4>
                    <p style="font-size:0.8rem; color:var(--text-muted);">المعرف: <span class="num">tenant_salam_03</span> | الفروع: 1 | نقاط البيع: 2 | مبيعات أوفلاين مؤكدة</p>
                  </div>
                  <div style="display:flex; align-items:center; gap:8px;">
                    <span class="fefo-pill" style="background:rgba(0,179,126,0.12); color:var(--brand-teal);">باقة الصيدلية (Community)</span>
                    <span style="color:var(--brand-teal); font-size:0.75rem; font-weight:700;">● متصل</span>
                  </div>
                </div>
              </div>

              <div style="margin-top:var(--space-4); background:var(--bg-surface-subtle); border:1px solid var(--border-subtle); border-radius:var(--radius-md); padding:10px var(--space-4); display:flex; justify-content:space-between; align-items:center; font-size:0.775rem;">
                <span style="color:var(--text-muted);">
                  بصمة التشفير غير القابلة للتعديل (Audit Root Hash): 
                  <code class="num" style="color:var(--brand-blue);">e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855</code>
                </span>
                <span style="color:var(--brand-teal); font-weight:700;">سجل التدقيق سليم 100%</span>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  `;
}

export function initShowcaseEvents() {
  const tabButtons = document.querySelectorAll('[data-showcase-tab]');
  const tabPanes = {
    erp: document.getElementById('mockup-tab-erp'),
    pos: document.getElementById('mockup-tab-pos'),
    admin: document.getElementById('mockup-tab-admin')
  };

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-showcase-tab');
      setActiveTab(tabId);
    });
  });

  subscribeLandingState(({ activeTab }) => {
    // Update button states
    tabButtons.forEach(btn => {
      const isCurrent = btn.getAttribute('data-showcase-tab') === activeTab;
      if (isCurrent) {
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
      } else {
        btn.classList.remove('active');
        btn.setAttribute('aria-selected', 'false');
      }
    });

    // Update pane visibility
    Object.keys(tabPanes).forEach(id => {
      const pane = tabPanes[id];
      if (!pane) return;
      if (id === activeTab) {
        pane.classList.add('active');
      } else {
        pane.classList.remove('active');
      }
    });
  });
}
