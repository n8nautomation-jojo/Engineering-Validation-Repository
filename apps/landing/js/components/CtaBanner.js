/**
 * CtaBanner Component
 * High-conversion bottom banner driving user action to ERP & Admin portals.
 */

export function renderCtaBanner() {
  return `
    <section class="container">
      <div class="cta-banner-wrapper">
        <h2>جاهز للارتقاء بإدارة صيدليتك إلى المستوى القياسي العالمي؟</h2>
        <p>ابدأ اليوم بتجربة فارماتك واستمتع برقابة تامة على المخزون، وسرعة استثنائية في نقطة البيع، وحماية كاملة ضد هدر الصلاحيات ومخاطر انقطاع الشبكة.</p>

        <div style="display:flex; justify-content:center; gap:16px; flex-wrap:wrap;">
          <a href="/pharmacy-erp/" class="btn btn-secondary btn-lg" style="background:#FFFFFF; color:#0A2540; font-weight:800; border:none; box-shadow:0 8px 24px rgba(0,0,0,0.25);">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span>دخول منظومة الصيدلية ونقطة البيع</span>
          </a>

          <a href="/platform-admin/" class="btn btn-ghost btn-lg" style="border-color:rgba(255,255,255,0.4); color:#FFFFFF;">
            <span>لوحة إدارة المنصة (Admin Console)</span>
          </a>
        </div>
      </div>
    </section>
  `;
}
