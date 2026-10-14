/**
 * PharmaTech — User Profile & Session Controls Sub-Component
 * Displays authenticated identity, active branch, and switch user / logout triggers
 */

import { AuthService } from '../../services/authService.js';

export class UserMenuModal {
  constructor() {
    this.dialog = document.getElementById('dialog-user-menu');
    this.closeBtn = document.getElementById('btn-close-user-menu');
    this.logoutBtn = null;
    this.settingsBtn = null;
    this.helpBtn = null;

    this.init();
  }

  init() {
    this.closeBtn?.addEventListener('click', () => this.close());
    this.dialog?.addEventListener('click', (e) => {
      if (e.target === this.dialog) this.close();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.dialog && !this.dialog.classList.contains('hidden')) {
        this.close();
      }
    });
  }

  open() {
    if (!this.dialog) return;
    const user = AuthService.getCurrentUser();
    this.render(user);
    this.dialog.classList.remove('hidden');
  }

  close() {
    this.dialog?.classList.add('hidden');
  }

  render(user) {
    const body = this.dialog.querySelector('.dialog-content-body');
    if (!body) return;

    const initial = (user?.fullName || 'أم').slice(0, 2);
    const isCashier = user?.role === 'CASHIER';

    body.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:16px;">
        <!-- User Identity Card -->
        <div style="display:flex; align-items:center; gap:14px; padding:14px; background:var(--muted); border:1px solid var(--border); border-radius:12px;">
          <div style="width:52px; height:52px; border-radius:50%; background:${isCashier ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, var(--primary), #0070f3)'}; color:#fff; display:flex; align-items:center; justify-content:center; font-size:18px; font-weight:800; box-shadow:0 4px 12px ${isCashier ? 'rgba(16,185,129,0.25)' : 'rgba(0,82,204,0.25)'};">
            ${initial}
          </div>
          <div style="flex:1;">
            <div style="display:flex; align-items:center; gap:8px;">
              <strong style="font-size:15px; color:var(--foreground);">${user?.fullName || 'د. أحمد الطاهر'}</strong>
              <span class="badge" style="background:${isCashier ? '#10b98120' : '#0052cc18'}; color:${isCashier ? '#059669' : 'var(--primary)'}; font-size:11px; font-weight:700; padding:2px 8px; border-radius:12px;">
                ${user?.roleNameAr || (isCashier ? 'كاشير بيع سريع' : 'صيدلي مسؤول')}
              </span>
            </div>
            <small style="color:var(--muted-foreground); font-size:12px; display:block; margin-top:2px;">
              اسم المستخدم: <strong dir="ltr" style="color:var(--foreground);">${user?.username || 'ahmed_pharma'}</strong> · رمز المنشأة: <strong dir="ltr" style="color:var(--foreground);">${user?.tenantCode || 'PHARMA-NILEIN'}</strong>
            </small>
            <small style="color:var(--muted-foreground); font-size:11.5px; display:flex; align-items:center; gap:4px; margin-top:4px;">
              <span style="display:inline-block; width:7px; height:7px; border-radius:50%; background:${isCashier ? '#10b981' : '#0052cc'};"></span>
              ${isCashier ? 'صلاحيات كاشير مقيدة (نقطة البيع · سجل الفواتير · الورديات)' : 'كامل الصلاحيات الإدارية والمالية (مدير الصيدلية)'}
            </small>
          </div>
        </div>

        <!-- Menu Action Options -->
        <div style="display:flex; flex-direction:column; gap:8px;">
          ${!isCashier ? `
            <button type="button" class="btn-table-action" id="btn-user-menu-settings" style="display:flex; align-items:center; gap:10px; width:100%; justify-content:flex-start; height:42px; padding:0 12px; font-size:13px; font-weight:600;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
              <span>إعدادات الصيدلية والمنظومة (Settings)</span>
            </button>
          ` : ''}

          <button type="button" class="btn-table-action" id="btn-user-menu-help" style="display:flex; align-items:center; gap:10px; width:100%; justify-content:flex-start; height:42px; padding:0 12px; font-size:13px; font-weight:600;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 4.24 4.24"/><path d="m14.83 9.17 4.24-4.24"/><path d="m14.83 14.83 4.24 4.24"/><path d="m9.17 14.83-4.24 4.24"/><circle cx="12" cy="12" r="4"/></svg>
            <span>المساعدة واختصارات لوحة المفاتيح</span>
          </button>

          <button type="button" class="btn-table-action" id="btn-user-menu-logout" style="display:flex; align-items:center; gap:10px; width:100%; justify-content:flex-start; height:42px; padding:0 12px; font-size:13px; font-weight:700; color:#ef4444; border-color:#fecaca;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
            <span>تبديل المستخدم أو تسجيل الخروج (Logout)</span>
          </button>
        </div>
      </div>
    `;

    this.attachMenuEvents();
  }

  attachMenuEvents() {
    this.settingsBtn = this.dialog.querySelector('#btn-user-menu-settings');
    this.helpBtn = this.dialog.querySelector('#btn-user-menu-help');
    this.logoutBtn = this.dialog.querySelector('#btn-user-menu-logout');

    this.settingsBtn?.addEventListener('click', () => {
      this.close();
      window.dispatchEvent(new CustomEvent('OPEN_SETTINGS_DIALOG'));
    });

    this.helpBtn?.addEventListener('click', () => {
      this.close();
      window.dispatchEvent(new CustomEvent('OPEN_HELP_DIALOG'));
    });

    this.logoutBtn?.addEventListener('click', async () => {
      this.close();
      await AuthService.logout();
      window.dispatchEvent(new CustomEvent('OPEN_LOGIN_DIALOG'));
    });
  }
}
