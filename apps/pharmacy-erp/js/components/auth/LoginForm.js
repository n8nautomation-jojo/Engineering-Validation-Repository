/**
 * PharmaTech — Enterprise Login Form Sub-Component
 * Clean credentials input, injection prevention, demo quick-select badges, and feedback
 */

export class LoginForm {
  constructor(containerId, onSubmitCallback) {
    this.container = document.getElementById(containerId);
    this.onSubmit = onSubmitCallback;
    this.showPassword = false;
  }

  render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <form id="auth-login-form" novalidate style="display:flex; flex-direction:column; gap:16px;">
        <!-- Username Field -->
        <div>
          <label style="display:block; font-size:12px; font-weight:700; margin-bottom:6px; color:var(--foreground);">
            اسم المستخدم أو المعرف الوظيفي
          </label>
          <div class="field" style="display:flex; align-items:center; gap:8px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--muted-foreground);"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            <input 
              type="text" 
              name="username" 
              id="login-username-input" 
              placeholder="مثال: ahmed_pharma" 
              required 
              autocomplete="username" 
              style="width:100%; border:none; background:transparent; font-size:13.5px; outline:none;" 
            />
          </div>
        </div>

        <!-- Password Field with Reveal Toggle -->
        <div>
          <label style="display:block; font-size:12px; font-weight:700; margin-bottom:6px; color:var(--foreground);">
            كلمة المرور
          </label>
          <div class="field" style="display:flex; align-items:center; gap:8px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--muted-foreground);"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            <input 
              type="password" 
              name="password" 
              id="login-password-input" 
              placeholder="••••••••••••" 
              required 
              autocomplete="current-password" 
              style="width:100%; border:none; background:transparent; font-size:13.5px; outline:none;" 
            />
            <button type="button" id="btn-toggle-password-reveal" class="icon-btn" style="width:28px; height:28px; padding:0;" title="إظهار / إخفاء كلمة المرور">
              <svg id="eye-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
          </div>
        </div>

        <!-- Optional Pharmacy / Tenant Code -->
        <div>
          <label style="display:block; font-size:11.5px; font-weight:600; margin-bottom:6px; color:var(--muted-foreground);">
            رمز المنشأة الصيدلانية (اختياري)
          </label>
          <div class="field" style="display:flex; align-items:center; gap:8px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--muted-foreground);"><path d="M3 21h18M3 7v14M21 7v14M6 11h12M6 15h12M6 19h12"/></svg>
            <input 
              type="text" 
              name="tenantCode" 
              id="login-tenant-input" 
              placeholder="مثال: PHARMA-NILEIN (أو اتركه فارغاً للفرع الافتراضي)" 
              dir="ltr"
              style="width:100%; border:none; background:transparent; font-size:12.5px; outline:none;" 
            />
          </div>
        </div>

        <!-- Remember Me Checkbox -->
        <div style="display:flex; align-items:center; justify-content:space-between; margin-top:4px;">
          <label style="display:flex; align-items:center; gap:8px; font-size:12px; cursor:pointer; color:var(--foreground);">
            <input type="checkbox" id="login-remember-cb" checked style="width:16px; height:16px; accent-color:var(--primary); cursor:pointer;" />
            تذكر جلستي على هذا الجهاز
          </label>
          <span style="font-size:11px; color:#10b981; display:flex; align-items:center; gap:4px;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            اتصال محمي ومشفر
          </span>
        </div>

        <!-- Submit Button -->
        <div style="margin-top:10px;">
          <button type="submit" id="btn-do-login" class="btn-primary" style="width:100%; height:44px; font-size:14px; font-weight:700; border-radius:10px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" x2="3" y1="12" y2="12"/></svg>
            تسجيل الدخول للمنظومة
          </button>
        </div>

        <!-- Quick Demo Switcher Badges -->
        <div style="margin-top:8px; padding-top:12px; border-top:1px dashed var(--border);">
          <div style="font-size:11px; font-weight:700; color:var(--muted-foreground); margin-bottom:8px; display:flex; align-items:center; gap:4px;">
            <span>⚡ تسجيل سريع للتجربة والتدقيق (Demo Roles):</span>
          </div>
          <div style="display:flex; flex-direction:column; gap:6px;">
            <button type="button" class="btn-demo-account" data-user="ahmed_pharma" data-pass="Password@2026" data-tenant="PHARMA-NILEIN" style="display:flex; align-items:center; justify-content:space-between; padding:8px 10px; background:var(--muted); border:1px solid var(--border); border-radius:8px; cursor:pointer; text-align:right;">
              <div>
                <strong style="display:block; font-size:12px; color:var(--foreground);">د. أحمد الطاهر (مدير الصيدلية)</strong>
                <small style="color:var(--muted-foreground); font-size:10.5px;">كامل الصلاحيات: مبيعات، تسعير، تقارير وإعدادات</small>
              </div>
              <span class="badge" style="background:#0052cc20; color:var(--primary); font-size:10px; font-weight:700; padding:2px 6px; border-radius:4px;">اختيار</span>
            </button>

            <button type="button" class="btn-demo-account" data-user="sara_cashier" data-pass="Password@2026" data-tenant="PHARMA-NILEIN" style="display:flex; align-items:center; justify-content:space-between; padding:8px 10px; background:var(--muted); border:1px solid var(--border); border-radius:8px; cursor:pointer; text-align:right;">
              <div>
                <strong style="display:block; font-size:12px; color:var(--foreground);">د. سارة الكباشي (كاشير نقطة بيع)</strong>
                <small style="color:var(--muted-foreground); font-size:10.5px;">صلاحية POS والصرف السريع وفتح/إغلاق الوردية</small>
              </div>
              <span class="badge" style="background:#10b98120; color:#10b981; font-size:10px; font-weight:700; padding:2px 6px; border-radius:4px;">اختيار</span>
            </button>

            <button type="button" class="btn-demo-account" data-user="bluenile_admin" data-pass="Temp-9K22!2026" data-tenant="PHARMA-BLUENILE" style="display:flex; align-items:center; justify-content:space-between; padding:8px 10px; background:var(--muted); border:1px solid var(--border); border-radius:8px; cursor:pointer; text-align:right;">
              <div>
                <strong style="display:block; font-size:12px; color:var(--foreground);">حساب جديد (تجربة التغيير الإجباري)</strong>
                <small style="color:var(--muted-foreground); font-size:10.5px;">تجربة تسجيل الدخول لأول مرة وتعيين كلمة مرور جديدة</small>
              </div>
              <span class="badge" style="background:#f59e0b20; color:#d97706; font-size:10px; font-weight:700; padding:2px 6px; border-radius:4px;">اختيار</span>
            </button>
          </div>
        </div>
      </form>
    `;

    this.attachEvents();
  }

  attachEvents() {
    const form = this.container.querySelector('#auth-login-form');
    const usernameInput = this.container.querySelector('#login-username-input');
    const passwordInput = this.container.querySelector('#login-password-input');
    const tenantInput = this.container.querySelector('#login-tenant-input');
    const rememberCb = this.container.querySelector('#login-remember-cb');
    const togglePassBtn = this.container.querySelector('#btn-toggle-password-reveal');

    // Toggle password reveal
    togglePassBtn?.addEventListener('click', () => {
      this.showPassword = !this.showPassword;
      if (passwordInput) {
        passwordInput.type = this.showPassword ? 'text' : 'password';
      }
      const eyeIcon = this.container.querySelector('#eye-icon');
      if (eyeIcon) {
        eyeIcon.innerHTML = this.showPassword
          ? `<path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/>`
          : `<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>`;
      }
    });

    // Quick demo role selection
    const demoButtons = this.container.querySelectorAll('.btn-demo-account');
    demoButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        if (usernameInput) usernameInput.value = btn.dataset.user || '';
        if (passwordInput) passwordInput.value = btn.dataset.pass || '';
        if (tenantInput) tenantInput.value = btn.dataset.tenant || '';
        passwordInput?.focus();
      });
    });

    // Form submit
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = usernameInput?.value.trim() || '';
      const password = passwordInput?.value || '';
      const tenantCode = tenantInput?.value.trim() || '';
      const rememberMe = rememberCb?.checked ?? true;

      if (this.onSubmit) {
        await this.onSubmit({ username, password, tenantCode, rememberMe });
      }
    });
  }
}
