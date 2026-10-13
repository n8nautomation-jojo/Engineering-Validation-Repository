/**
 * Footer Component
 * Renders footer with 100% natural logo, sitemap links, and real-time health pulse.
 */

export function renderFooter() {
  return `
    <footer class="site-footer">
      <div class="container">
        <div class="footer-top">
          <!-- Natural Logo and brand tagline -->
          <div style="display:flex; align-items:center; gap:var(--space-3);">
            <a href="/" title="PharmaTech OS">
              <img src="/pharmatech-logo.png" alt="PharmaTech OS" class="brand-logo-img" style="height:42px;">
            </a>
            <div>
              <div style="font-size:0.95rem; font-weight:800; color:var(--footer-heading);">PharmaTech OS</div>
              <div style="font-size:0.775rem; color:var(--footer-text);">المنظومة السحابية الموحدة لإدارة الصيدليات ونقاط البيع</div>
            </div>
          </div>

          <div class="footer-links-row">
            <a href="#features" class="footer-link">المميزات</a>
            <a href="#preview" class="footer-link">معاينة النظام</a>
            <a href="#pricing" class="footer-link">الأسعار والباقات</a>
            <a href="#faq" class="footer-link">الأسئلة الشائعة</a>
            <a href="/pharmacy-erp/" class="footer-link" style="color:var(--brand-teal);">Pharma ERP</a>
            <a href="/platform-admin/" class="footer-link" style="color:var(--brand-cyan);">Platform Admin</a>
          </div>
        </div>

        <div class="footer-bottom">
          <div>
            <span>جميع الحقوق محفوظة © 2026 فارماتك للحلول البرمجية الدوائية المتقدمة.</span>
          </div>
          <div id="footer-health-status" style="display:flex; align-items:center; gap:8px;">
            <span style="width:8px; height:8px; border-radius:50%; background:#00B37E; display:inline-block; box-shadow:0 0 8px #00B37E;"></span>
            <span>جميع الأنظمة تعمل بكفاءة (Healthy)</span>
          </div>
        </div>
      </div>
    </footer>
  `;
}

export function initFooterEvents() {
  const statusEl = document.getElementById('footer-health-status');
  if (!statusEl) return;

  fetch('/health')
    .then(r => r.json())
    .then(data => {
      if (data.status === 'healthy') {
        statusEl.innerHTML = `
          <span style="width:8px; height:8px; border-radius:50%; background:#00B37E; display:inline-block; box-shadow:0 0 8px #00B37E;"></span>
          <span>جميع الخدمات تعمل بكفاءة (${data.version || 'Healthy'})</span>
        `;
      }
    })
    .catch(() => {
      // Local graceful fallback
    });
}
