/**
 * Features Component
 * Renders the 6 Core Operational Pillars addressing the Sudanese pharmacy market.
 */

export function renderFeatures() {
  return `
    <section class="section-spacer" id="features">
      <div class="container">
        <div class="text-center">
          <span class="section-tag">المزايا التشغيلية المتقدمة</span>
          <h2 class="section-title">محرك تشغيلي متكامل يجمع بين الرقابة الدوائية والسرعة التجارية</h2>
          <p class="section-desc">صُمم كل جزء من فارماتك ليعالج التحديات الحقيقية التي تواجه الصيادلة ومديري الصيدليات في السوق السوداني.</p>
        </div>

        <div class="features-grid">
          <!-- 1. Integrated POS -->
          <div class="feature-card">
            <div class="feature-icon-wrapper teal">
              <svg width="26" height="26" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <h3>نقطة بيع سريعة وسهلة الاستخدام</h3>
            <p>محطة كاشير فائقة السرعة تدعم قارئات الباركود السلكية واللاسلكية، تجزئة الأشرطة والعلب تلقائياً، وطباعة إيصالات 80mm الحرارية مع كود QR في أقل من ثانيتين.</p>
          </div>

          <!-- 2. FEFO Safety -->
          <div class="feature-card">
            <div class="feature-icon-wrapper blue">
              <svg width="26" height="26" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3>حماية تواريخ الصلاحية ومنع الهدر الدوائي</h3>
            <p>إلزام النظام بصرف التشغيلات الأقرب انتهاءً أولاً، تنبيهات مبكرة على الأدوية الراكدة وقريبة الانتهاء (&lt;90 يوم)، وقفل فوري آلي على أي تشغيلة منتهية لمنع صرفها للمرضى.</p>
          </div>

          <!-- 3. Offline Resilience -->
          <div class="feature-card">
            <div class="feature-icon-wrapper cyan">
              <svg width="26" height="26" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3>العمل المستمر حتى بدون إنترنت</h3>
            <p>استمرار عمليات البيع وإصدار الفواتير وطباعتها حتى عند انقطاع الإنترنت التام. تُخزن البيانات مشفرة محلياً وتُزامن فور عودة الاتصال تلقائياً دون تضارب أو فقدان معاملات.</p>
          </div>

          <!-- 4. Bankak & Multi-Payments -->
          <div class="feature-card">
            <div class="feature-icon-wrapper amber">
              <svg width="26" height="26" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3>دعم تطبيق بنكك والمدفوعات المختلطة</h3>
            <p>تسجيل فوري لرقم العملية المرجعية لتحويلات بنكك (Bankak Confirmation)، إمكانية تقسيم الفاتورة الواحدة بين النقد وبنكك والبطاقة، وتفادي الاحتيال والتأكد من مطابقة الحسابات.</p>
          </div>

          <!-- 5. Multi-Branch & Warehouses -->
          <div class="feature-card">
            <div class="feature-icon-wrapper teal">
              <svg width="26" height="26" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3>إدارة الفروع والمستودعات المتعددة</h3>
            <p>كتالوج دوائي موحد، تحويل البضائع بين الفروع والمخزن الرئيسي مع تأكيد الاستلام المتبادل، وتتبع حركة كل صنف وكميات الأمان ونقاط إعادة الطلب بذكاء تشغيلي.</p>
          </div>

          <!-- 6. Immutable Security -->
          <div class="feature-card">
            <div class="feature-icon-wrapper blue">
              <svg width="26" height="26" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3>سجلات أمان وتدقيق غير قابلة للتلاعب</h3>
            <p>توثيق مشفر لكافة التعديلات على الأسعار، إرجاع الفواتير، الجرد المفاجئ، وحركات الصندوق. حماية كاملة لحقوق مالك الصيدلية وصلاحيات محددة لكل صيدلي وكاشير.</p>
          </div>
        </div>
      </div>
    </section>
  `;
}
