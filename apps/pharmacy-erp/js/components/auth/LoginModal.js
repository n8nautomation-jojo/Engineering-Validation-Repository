/**
 * PharmaTech — Master Login & Security Modal Coordinator Component
 * Orchestrates LoginForm and PasswordChangeModal with security defenses
 */

import { AuthService } from '../../services/authService.js';
import { LoginForm } from './LoginForm.js';
import { PasswordChangeModal } from './PasswordChangeModal.js';
import { showToast } from '../Toast.js';

export class LoginModal {
  constructor() {
    this.dialog = document.getElementById('dialog-login');
    this.closeBtn = document.getElementById('btn-close-login-dialog');
    this.container = document.getElementById('login-modal-body-container');

    this.loginForm = null;
    this.passwordChangeModal = null;
    this.forced = true; // True when app requires authentication to proceed

    this.init();
  }

  init() {
    this.closeBtn?.addEventListener('click', () => {
      // Allow closing only if already authenticated (e.g. user opened switch modal)
      if (AuthService.isAuthenticated()) {
        this.close();
      } else {
        showToast('تسجيل الدخول مطلوب', 'يرجى تسجيل الدخول لمتابعة العمل على الصيدلية', 'warning');
      }
    });

    this.dialog?.addEventListener('click', (e) => {
      if (e.target === this.dialog && AuthService.isAuthenticated()) {
        this.close();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.dialog && !this.dialog.classList.contains('hidden') && AuthService.isAuthenticated()) {
        this.close();
      }
    });

    // Global Event Listener to trigger Login Dialog
    window.addEventListener('OPEN_LOGIN_DIALOG', () => {
      this.open();
    });
  }

  open() {
    if (!this.dialog) return;
    this.showLoginForm();
    this.dialog.classList.remove('hidden');
  }

  close() {
    this.dialog?.classList.add('hidden');
  }

  showLoginForm() {
    if (!this.container) return;

    this.loginForm = new LoginForm('login-modal-body-container', async (credentials) => {
      await this.handleLogin(credentials);
    });
    this.loginForm.render();
  }

  showPasswordChange(tempToken, user) {
    if (!this.container) return;

    this.passwordChangeModal = new PasswordChangeModal(
      'login-modal-body-container',
      async ({ tempToken, newPassword, confirmPassword }) => {
        await this.handlePasswordChange(tempToken, newPassword, confirmPassword);
      },
      () => {
        this.showLoginForm();
      }
    );
    this.passwordChangeModal.render(tempToken, user);
  }

  async handleLogin({ username, password, tenantCode, rememberMe }) {
    const submitBtn = this.dialog?.querySelector('#btn-do-login');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = 'جاري التحقق من الهوية والصلاحيات...';
    }

    try {
      const result = await AuthService.login(username, password, tenantCode, rememberMe);

      if (result.requirePasswordChange) {
        showToast('تنبيه أمني', result.message || 'يرجى تعيين كلمة مرور جديدة قبل المتابعة', 'warning');
        this.showPasswordChange(result.tempToken, result.user);
        return;
      }

      showToast(
        `مرحباً، ${result.user?.fullName || ''}`,
        `تم تسجيل الدخول بنجاح بصلاحية (${result.user?.roleNameAr || 'صيدلي'})`,
        'success'
      );

      this.close();
    } catch (err) {
      console.error('Login action error:', err);
      const msg = err.message || 'تعذر تسجيل الدخول';
      if (msg.includes('ACCOUNT_LOCKED_TEMPORARILY')) {
        showToast('تم قفل الحساب مؤقتاً', 'تجاوزت الحد المسموح لمحاولات الدخول الخاطئة (5 محاولات). انتظر 15 دقيقة.', 'error');
      } else if (msg.includes('SECURITY_VIOLATION')) {
        showToast('تم حظر المحاولة', 'تم رصد رموز غير صالحة أو محاولة حقن غير مصرح بها.', 'error');
      } else {
        showToast('خطأ في تسجيل الدخول', 'اسم المستخدم أو كلمة المرور غير صحيحة.', 'error');
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" x2="3" y1="12" y2="12"/></svg>
          تسجيل الدخول للمنظومة
        `;
      }
    }
  }

  async handlePasswordChange(tempToken, newPassword, confirmPassword) {
    const submitBtn = this.dialog?.querySelector('#btn-submit-change-pass');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'جاري التحديث والتشفير...';
    }

    try {
      const result = await AuthService.changePassword(tempToken, newPassword, confirmPassword);
      showToast('تم تفعيل الحساب بنجاح', result.message || 'تم تحديث كلمة المرور وتفعيل الحساب بالكامل', 'success');
      this.close();
    } catch (err) {
      console.error('Password change error:', err);
      showToast('خطأ في تغيير كلمة المرور', err.message || 'يرجى التأكد من تطابق كلمة المرور وقوتها', 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'حفظ وتفعيل الحساب';
      }
    }
  }
}
