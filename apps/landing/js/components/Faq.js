/**
 * FAQ Component
 * Displays collapsible interactive accordion answering critical operational and technical questions.
 */

export function renderFaq() {
  return `
    <section class="section-spacer" id="faq">
      <div class="container">
        <div class="text-center">
          <span class="section-tag">إجابات استفساراتكم</span>
          <h2 class="section-title">الأسئلة الشائعة حول المنظومة</h2>
          <p class="section-desc">كل ما تحتاج معرفته عن التثبيت، المزامنة، الدفع، والدعم الفني الصيدلاني.</p>
        </div>

        <div class="faq-list">
          <div class="faq-item active">
            <button class="faq-question-btn">
              <span>كيف يعمل النظام في حال انقطاع شبكة الإنترنت؟</span>
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div class="faq-answer-pane">
              تم تصميم نظام فارماتك ليعمل بكفاءة كاملة مع أو بدون إنترنت، حيث يتم حفظ البيانات على جهازك بأمان. يمكنك الاستمرار في مسح الباركود، بيع الأدوية، تجزئة الأشرطة، وطباعة إيصالات الكاشير الحرارية بشكل طبيعي تماماً. وفور توفر الإنترنت، يقوم النظام بإرسال كافة الفواتير تلقائياً دون أي تدخل يدوي.
            </div>
          </div>

          <div class="faq-item">
            <button class="faq-question-btn">
              <span>كيف يمنع النظام هدر الأدوية وانتهاء صلاحيتها على الأرفف؟</span>
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div class="faq-answer-pane">
              يقوم النظام بربط كل صنف برقم التشغيلة وتاريخ انتهاء الصلاحية الخاص بها. وعند مسح باركود الدواء، يوجه النظام الكاشير آلياً إلى صرف العلب الأقرب انتهاءً أولاً لمنع تراكم الأدوية القديمة. كما يقوم النظام بتنبيه مدير الصيدلية قبل 90 يوماً من تاريخ الانتهاء، ويمنع بيع أي دواء منتهي الصلاحية بصورة قطعية.
            </div>
          </div>

          <div class="faq-item">
            <button class="faq-question-btn">
              <span>هل يدعم النظام الدفع عبر تطبيق بنكك والدفع المختلط؟</span>
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div class="faq-answer-pane">
              نعم، يدعم النظام كلاً من الدفع النقدي (Cash)، التحويل المباشر عبر تطبيق بنكك (مع إمكانية تسجيل وتوثيق رقم العملية المرجعي لتفادي التحويلات الوهمية)، والبطاقات المصرفية. كما يتيح للعميل دفع جزء من الفاتورة نقداً والباقي عبر تطبيق بنكك مع إظهار التفاصيل بدقة على الإيصال.
            </div>
          </div>

          <div class="faq-item">
            <button class="faq-question-btn">
              <span>هل يمكنني نقل بيانات الأدوية والمخزون الحالية من نظامي القديم؟</span>
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div class="faq-answer-pane">
              بكل تأكيد. يتضمن فارماتك معالج استيراد ذكي يدعم ملفات Excel و CSV مع خاصية التعرف الصيدلاني الذكي (Smart Transliteration) لمطابقة الأسماء التجارية والعلمية للأدوية تلقائياً، وفريق الدعم الفني لدينا يتولى مساعدة الصيدلية في ترحيل المخزون بسلاسة ودون توقف في العمل.
            </div>
          </div>

          <div class="faq-item">
            <button class="faq-question-btn">
              <span>ما هي متطلبات الأجهزة اللازمة لتشغيل النظام؟</span>
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div class="faq-answer-pane">
              يعمل فارماتك على أي جهاز كمبيوتر أو لابتوب حديث بنظام Windows أو Mac أو Linux، ويدعم كافة طابعات الإيصالات الحرارية القياسية (80mm و 58mm عبر USB أو الشبكة)، وقارئات الباركود القياسية 1D و 2D، وأدراج النقدية الإلكترونية.
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}

export function initFaqEvents() {
  const faqItems = document.querySelectorAll('.faq-item');

  faqItems.forEach(item => {
    const btn = item.querySelector('.faq-question-btn');
    if (!btn) return;

    btn.addEventListener('click', () => {
      const isActive = item.classList.contains('active');

      // Close other items
      faqItems.forEach(other => {
        if (other !== item) other.classList.remove('active');
      });

      // Toggle current
      if (isActive) {
        item.classList.remove('active');
      } else {
        item.classList.add('active');
      }
    });
  });
}
