/**
 * Hero Component
 * Renders the top value proposition, trust proof points, and entry CTAs.
 */

export function renderHero() {
  return `
    <section class="hero-wrapper">
      <div class="container">
        <div class="hero-pill-badge">
          <span class="pulse-dot"></span>
          <span>منظومة الصيدليات ونقاط البيع السحابية</span>
        </div>

        <h1 class="hero-title">
          إدارة الصيدليات ونقاط البيع، <span class="gradient-text">بكل سهولة ودقة.</span>
        </h1>

        <p class="hero-lead">
          منظومة سحابية متكاملة تضمن استقرار عمليات البيع، وتتبع الصلاحيات بدقة، مع ربط مباشر وآمن للدفع عبر «بنكك».
        </p>

        <div class="hero-ctas">
          <a href="/pharmacy-erp/" class="btn btn-primary btn-lg" title="دخول نقطة البيع والمنظومة">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span>دخول نقطة البيع والمنظومة</span>
          </a>

          <a href="/platform-admin/" class="btn btn-secondary btn-lg" title="لوحة المنصة المركزية">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span>لوحة إدارة المنصة (Admin)</span>
          </a>

          <a href="#preview" class="btn btn-ghost btn-lg">
            <span>مشاهدة العرض الحي</span>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </a>
        </div>

        <!-- Trust Points Row -->
        <div class="trust-row">
          <div class="trust-item">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>صرف الأدوية الأقرب انتهاءً أولاً لمنع الهدر</span>
          </div>

          <div class="trust-item">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span>استمرار البيع وحفظ الفواتير حتى عند انقطاع الإنترنت</span>
          </div>

          <div class="trust-item">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span>سجل تدقيق آمن وموثق لجميع العمليات المالية</span>
          </div>

          <div class="trust-item">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span>دعم مباشر للتحويلات البنكية عبر بنكك والدفع المختلط</span>
          </div>
        </div>
      </div>
    </section>
  `;
}
