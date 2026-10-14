/**
 * Pricing Component
 * Displays transparent subscription tiers with monthly/annual discount toggle.
 */

import { getLandingState, setBillingCycle, subscribeLandingState } from '../state/landingState.js';

export function renderPricing() {
  const { billingCycle, pricing } = getLandingState();
  const currentPrices = pricing[billingCycle];

  return `
    <section class="section-spacer" id="pricing">
      <div class="container">
        <div class="text-center">
          <span class="section-tag">باقات اشتراك واضحة وشفافة</span>
          <h2 class="section-title">اختر الباقة المناسبة لحجم صيدليتك</h2>
          <p class="section-desc">خطط اشتراك مدروسة لتلائم الصيدليات الفردية، المجمعات الطبية، وسلاسل الصيدليات الكبرى بالجنيه السوداني (SDG).</p>
        </div>

        <!-- Billing Cycle Switcher -->
        <div class="pricing-switch-container">
          <div class="pricing-switch-box" role="radiogroup" aria-label="دورة الفوترة">
            <button class="cycle-btn ${billingCycle === 'monthly' ? 'active' : ''}" 
                    data-billing-cycle="monthly">
              الدفع شهرياً
            </button>
            <button class="cycle-btn ${billingCycle === 'annual' ? 'active' : ''}" 
                    data-billing-cycle="annual">
              الدفع سنوياً
            </button>
          </div>
          <span class="savings-tag">وفر 15% عند الدفع السنوي</span>
        </div>

        <!-- Pricing Cards Grid -->
        <div class="pricing-grid">

          <!-- 1. Community Plan -->
          <div class="pricing-card">
            <div>
              <h3 style="font-size:1.25rem; font-weight:800; color:var(--text-primary); margin-bottom:4px;">باقة الصيدلية الناشئة</h3>
              <p style="font-size:0.875rem; color:var(--text-muted);">للصيدليات الفردية والمجتمعية التي تبحث عن استقرار ودقة.</p>

              <div class="pricing-price">
                <span class="price-amount-val" data-plan-price="community">${currentPrices.community}</span>
                <small class="price-period-val">${currentPrices.periodText}</small>
              </div>

              <div class="pricing-features-list">
                <div class="pricing-feature-row">
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>فرع واحد (صيدلية فردية)</span>
                </div>
                <div class="pricing-feature-row">
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>نقطتي بيع مدمجتين (2 POS Terminals)</span>
                </div>
                <div class="pricing-feature-row">
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>حماية تواريخ الصلاحية آلياً</span>
                </div>
                <div class="pricing-feature-row">
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>العمل المستمر بدون إنترنت</span>
                </div>
                <div class="pricing-feature-row">
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>دعم تحويلات تطبيق بنكك</span>
                </div>
                <div class="pricing-feature-row">
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>نسخ احتياطي محلي وسحابي دوري</span>
                </div>
              </div>
            </div>

            <a href="/pharmacy-erp/" class="btn btn-secondary" style="width:100%; text-align:center;">
              ابدأ بهذه الباقة
            </a>
          </div>

          <!-- 2. Standard Plan (Featured) -->
          <div class="pricing-card featured">
            <span class="featured-pill">الأكثر طلباً للصيدليات النشطة</span>

            <div>
              <h3 style="font-size:1.25rem; font-weight:800; color:var(--text-primary); margin-bottom:4px;">باقة النمو القياسية</h3>
              <p style="font-size:0.875rem; color:var(--text-muted);">للصيدليات المتوسطة والمراكز الصحية ذات معدل دوران دوائي مرتفع.</p>

              <div class="pricing-price">
                <span class="price-amount-val" data-plan-price="standard" style="color:var(--brand-teal);">${currentPrices.standard}</span>
                <small class="price-period-val">${currentPrices.periodText}</small>
              </div>

              <div class="pricing-features-list">
                <div class="pricing-feature-row">
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>حتى 3 فروع صيدلانية متصلة</span>
                </div>
                <div class="pricing-feature-row">
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>حتى 6 نقاط بيع كاشير نشطة (POS)</span>
                </div>
                <div class="pricing-feature-row">
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>إدارة التحويلات بين الفروع والمخزن</span>
                </div>
                <div class="pricing-feature-row">
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>تقارير الأرباح وتكلفة المبيعات اليومية</span>
                </div>
                <div class="pricing-feature-row">
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>سجلات تدقيق مشفرة وتتبع الموظفين</span>
                </div>
                <div class="pricing-feature-row">
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>دعم فني مباشر هاتفياً وعبر واتساب</span>
                </div>
              </div>
            </div>

            <a href="/pharmacy-erp/" class="btn btn-primary" style="width:100%; text-align:center;">
              اختيار باقة النمو (ابدأ الآن)
            </a>
          </div>

          <!-- 3. Enterprise Plan -->
          <div class="pricing-card">
            <div>
              <h3 style="font-size:1.25rem; font-weight:800; color:var(--text-primary); margin-bottom:4px;">باقة السلاسل والمجمعات</h3>
              <p style="font-size:0.875rem; color:var(--text-muted);">للمؤسسات وسلاسل الصيدليات الكبرى التي تتطلب حوكمة مركزية مخصصة.</p>

              <div class="pricing-price">
                <span class="price-amount-val" data-plan-price="enterprise">${currentPrices.enterprise}</span>
                <small class="price-period-val">${currentPrices.periodText}</small>
              </div>

              <div class="pricing-features-list">
                <div class="pricing-feature-row">
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>فروع ونقاط بيع غير محدودة</span>
                </div>
                <div class="pricing-feature-row">
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>لوحة تحكم إدارية مركزية متعددة المستأجرين</span>
                </div>
                <div class="pricing-feature-row">
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>ربط برمجي مخصص (API Integrations)</span>
                </div>
                <div class="pricing-feature-row">
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>سيرفرات مخصصة وضمان تشغيل 99.99%</span>
                </div>
                <div class="pricing-feature-row">
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>مدير حساب صيدلاني وتقني مخصص</span>
                </div>
              </div>
            </div>

            <a href="/platform-admin/" class="btn btn-secondary" style="width:100%; text-align:center;">
              تواصل معنا للتهيئة المخصصة
            </a>
          </div>

        </div>
      </div>
    </section>
  `;
}

export function initPricingEvents() {
  const cycleButtons = document.querySelectorAll('[data-billing-cycle]');

  cycleButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const cycle = btn.getAttribute('data-billing-cycle');
      setBillingCycle(cycle);
    });
  });

  subscribeLandingState(({ billingCycle, pricing }) => {
    // Update cycle buttons active states
    cycleButtons.forEach(btn => {
      if (btn.getAttribute('data-billing-cycle') === billingCycle) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Update prices in DOM
    const currentPrices = pricing[billingCycle];
    const commEl = document.querySelector('[data-plan-price="community"]');
    const stdEl = document.querySelector('[data-plan-price="standard"]');
    const entEl = document.querySelector('[data-plan-price="enterprise"]');
    const periodEls = document.querySelectorAll('.price-period-val');

    if (commEl) commEl.textContent = currentPrices.community;
    if (stdEl) stdEl.textContent = currentPrices.standard;
    if (entEl) entEl.textContent = currentPrices.enterprise;

    periodEls.forEach(el => {
      el.textContent = currentPrices.periodText;
    });
  });
}
