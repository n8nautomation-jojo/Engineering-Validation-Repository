/**
 * PharmaTech — Mandatory First-Login Password Change Sub-Component
 * Implements ADR-013 / D-041 secure temporary credential rotation
 */

export class PasswordChangeModal {
  constructor(containerId, onPasswordChangedCallback, onCancelCallback) {
    this.container = document.getElementById(containerId);
    this.onPasswordChanged = onPasswordChangedCallback;
    this.onCancel = onCancelCallback;
    this.tempToken = null;
    this.user = null;
  }

  render(tempToken, user) {
    if (!this.container) return;
    this.tempToken = tempToken;
    this.user = user;

    this.container.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:16px;">
        <!-- Security Banner -->
        <div style="background:#fffbeb; border:1px solid #fef3c7; border-radius:8px; padding:12px; display:flex; gap:10px; align-items:flex-start;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2" style="flex-shrink:0; margin-top:2px;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <div>
            <strong style="display:block; font-size:12.5px; color:#92400e; font-weight:800;">
              إجراء أمني إلزامي: تعيين كلمة مرور جديدة
            </strong>
            <small style="display:block; color:#b45309; font-size:11px; margin-top:2px; line-height:1.4;">
              مرحباً ${this.user?.fullName || ''}، لقد تم تسجيل دخولك بكلمة مرور مؤقتة تم إنشاؤها من إدارة المنصة. لحماية بيانات الصيدلية، يجب تعيين كلمة مرور شخصية قوية قبل البدء.
            </small>
          </div>
        </div>

        <form id="auth-change-password-form" novalidate style="display:flex; flex-direction:column; gap:14px;">
          <!-- New Password -->
          <div>
            <label style="display:block; font-size:12px; font-weight:700; margin-bottom:6px; color:var(--foreground);">
              كلمة المرور الجديدة
            </label>
            <div class="field" style="display:flex; align-items:center; gap:8px;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--muted-foreground);"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              <input 
                type="password" 
                id="new-password-input" 
                placeholder="أدخل 8 أحرف وأرقام معقدة على الأقل" 
                required 
                style="width:100%; border:none; background:transparent; font-size:13.5px; outline:none;" 
              />
            </div>
          </div>

          <!-- Confirm Password -->
          <div>
            <label style="display:block; font-size:12px; font-weight:700; margin-bottom:6px; color:var(--foreground);">
              تأكيد كلمة المرور الجديدة
            </label>
            <div class="field" style="display:flex; align-items:center; gap:8px;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--muted-foreground);"><path d="m9 12 2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>
              <input 
                type="password" 
                id="confirm-password-input" 
                placeholder="أعد إدخال كلمة المرور للمطابقة" 
                required 
                style="width:100%; border:none; background:transparent; font-size:13.5px; outline:none;" 
              />
            </div>
          </div>

          <!-- Complexity Checklist -->
          <div style="background:var(--muted); border:1px solid var(--border); border-radius:8px; padding:10px; font-size:11px; color:var(--muted-foreground);">
            <div style="font-weight:700; margin-bottom:4px; color:var(--foreground);">ضوابط كلمة المرور الآمنة:</div>
            <div>• لا تقل عن 8 خانات تتضمن أحرفاً وأرقاماً.</div>
            <div>• لا يمكن إعادة استخدام كلمة المرور المؤقتة.</div>
          </div>

          <!-- Actions -->
          <div style="display:flex; gap:10px; margin-top:8px;">
            <button type="button" id="btn-cancel-change-pass" class="btn-table-action" style="flex:1;">
              إلغاء والعودة
            </button>
            <button type="submit" id="btn-submit-change-pass" class="btn-primary" style="flex:2;">
              حفظ وتفعيل الحساب
            </button>
          </div>
        </form>
      </div>
    `;

    this.attachEvents();
  }

  attachEvents() {
    const form = this.container.querySelector('#auth-change-password-form');
    const newPassInput = this.container.querySelector('#new-password-input');
    const confirmPassInput = this.container.querySelector('#confirm-password-input');
    const cancelBtn = this.container.querySelector('#btn-cancel-change-pass');

    cancelBtn?.addEventListener('click', () => {
      if (this.onCancel) this.onCancel();
    });

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const newPassword = newPassInput?.value || '';
      const confirmPassword = confirmPassInput?.value || '';

      if (this.onPasswordChanged) {
        await this.onPasswordChanged({
          tempToken: this.tempToken,
          newPassword,
          confirmPassword
        });
      }
    });
  }
}
