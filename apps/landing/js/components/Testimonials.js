/**
 * Testimonials Component
 * Displays social proof from Sudanese pharmacists in Khartoum, Omdurman, and Port Sudan.
 */

export function renderTestimonials() {
  return `
    <section class="section-spacer" id="testimonials">
      <div class="container">
        <div class="text-center">
          <span class="section-tag">شهادات وتجارب حية</span>
          <h2 class="section-title">صيادلة يثقون في فارماتك يومياً</h2>
          <p class="section-desc">آراء واقعية من زملاء المهنة الذين اعتمدوا النظام في إدارة صيدلياتهم عبر مختلف الولايات.</p>
        </div>

        <div class="testimonials-grid">
          <!-- 1. Dr. Osman -->
          <div class="testimonial-card">
            <div>
              <div style="color:#F59E0B; margin-bottom:12px; font-size:1.1rem;">★★★★★</div>
              <p class="testimonial-quote">
                "أكبر مشكلة كانت تواجهنا هي هدر الأدوية بسبب انتهاء الصلاحيات والبيع العشوائي. منذ تطبيق نظام فارماتك وتفعيل خاصية FEFO الصارمة، انخفض الهدر الدوائي لدينا بنسبة 100%، وسرعة الكاشير زادت بشكل ملحوظ."
              </p>
            </div>
            <div class="author-meta">
              <div class="author-avatar-circle">د.ع</div>
              <div>
                <h4 style="font-size:0.95rem; font-weight:700; color:var(--text-primary);">د. عثمان الصديق</h4>
                <p style="font-size:0.8rem; color:var(--text-muted);">مدير صيدلية الأمل — الخرطوم</p>
              </div>
            </div>
          </div>

          <!-- 2. Dr. Sara -->
          <div class="testimonial-card">
            <div>
              <div style="color:#F59E0B; margin-bottom:12px; font-size:1.1rem;">★★★★★</div>
              <p class="testimonial-quote">
                "انقطاع الإنترنت والكهرباء كان يعطل عملنا لساعات في نقطة البيع. الميزة الحقيقية في فارماتك هي ثباتها التام في وضع الأوفلاين؛ نبيع ونطبع إيصالات الكاشير للزبائن دون أي تأخير، والبيانات تتزامن تلقائياً."
              </p>
            </div>
            <div class="author-meta">
              <div class="author-avatar-circle" style="background:linear-gradient(135deg, #00A3FF, #6366F1);">د.س</div>
              <div>
                <h4 style="font-size:0.95rem; font-weight:700; color:var(--text-primary);">د. سارة عبد الرحمن</h4>
                <p style="font-size:0.8rem; color:var(--text-muted);">صيدلية النيلين — أم درمان</p>
              </div>
            </div>
          </div>

          <!-- 3. Dr. Tariq -->
          <div class="testimonial-card">
            <div>
              <div style="color:#F59E0B; margin-bottom:12px; font-size:1.1rem;">★★★★★</div>
              <p class="testimonial-quote">
                "الدفع عبر تطبيق بنكك كان يسبب لنا مشاكل في مطابقة الحسابات يومياً. نظام فارماتك يتيح إدخال وتأكيد رقم التحويل فورياً مع تقسيم الدفع، وتقرير الوردية في نهاية اليوم يظهر بدقة سنت واحد."
              </p>
            </div>
            <div class="author-meta">
              <div class="author-avatar-circle" style="background:linear-gradient(135deg, #10B981, #0052CC);">د.ط</div>
              <div>
                <h4 style="font-size:0.95rem; font-weight:700; color:var(--text-primary);">د. طارق إبراهيم</h4>
                <p style="font-size:0.8rem; color:var(--text-muted);">مجموعة السلام الطبية — بورتسودان</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}
