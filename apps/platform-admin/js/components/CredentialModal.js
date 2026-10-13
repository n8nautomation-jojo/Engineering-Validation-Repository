/**
 * [Feature / Domain]: Platform Administration — Credential Handover Modal Component
 * [Multi-Tenancy Context]: Secure One-Time Credential Delivery (D-041)
 * [Security / Entitlement]: Masked Credential Delivery & Audit Trigger
 */

import { adminStore } from '../state/adminStore.js';
import { eventBus, DomainEvents } from '../domain/events.js';
import { showToast } from './Toast.js';

export class CredentialModal {
  constructor() {
    this.backdrop = document.getElementById('modal-credential-handover');
    this.closeBtn = document.getElementById('btn-close-credential-modal');
    this.dismissBtn = document.getElementById('btn-dismiss-credential-modal');
    this.copyBtn = document.getElementById('btn-copy-credentials');

    this.tenantNameEl = document.getElementById('cred-pharmacy-name');
    this.tenantCodeEl = document.getElementById('cred-tenant-code');
    this.adminUserEl = document.getElementById('cred-admin-user');
    this.tempPasswordEl = document.getElementById('cred-temp-password');

    this.currentTenant = null;

    this.init();
  }

  init() {
    this.closeBtn?.addEventListener('click', () => this.close());
    this.dismissBtn?.addEventListener('click', () => this.close());

    this.copyBtn?.addEventListener('click', () => {
      if (!this.currentTenant) return;

      const text = [
        `منظومة فارماتك السحابية — بيانات الدخول الأولية`,
        `اسم الصيدلية: ${this.currentTenant.tenantName}`,
        `رمز المستأجر: ${this.currentTenant.tenantCode}`,
        `اسم المستخدم: ${this.currentTenant.adminUser}`,
        `كلمة المرور المؤقتة: ${this.currentTenant.tempPassword}`,
        `تنبيه: يجب تغيير كلمة المرور فور تسجيل الدخول الأول.`
      ].join('\n');

      navigator.clipboard.writeText(text).then(() => {
        showToast('تم نسخ بيانات الدخول', 'جاهزة للمشاركة الآمنة مع مشرف الصيدلية', 'success');
      }).catch(() => {
        showToast('تم النسخ', 'يرجى التأكد من صلاحيات الحافظة', 'info');
      });
    });

    adminStore.subscribe((event, payload) => {
      if (event === 'CREDENTIALS_MODAL_REQUESTED' && payload) {
        this.open(payload);
      }
    });
  }

  open(tenant) {
    this.currentTenant = tenant;

    if (this.tenantNameEl) this.tenantNameEl.textContent = tenant.tenantName;
    if (this.tenantCodeEl) this.tenantCodeEl.textContent = tenant.tenantCode;
    if (this.adminUserEl) this.adminUserEl.textContent = tenant.adminUser;
    if (this.tempPasswordEl) this.tempPasswordEl.textContent = tenant.tempPassword;

    this.backdrop?.classList.remove('hidden');

    // Emit event for security auditing
    eventBus.publish(DomainEvents.CREDENTIALS_ROTATED, {
      tenantCode: tenant.tenantCode,
      actor: 'platform-superadmin'
    });
  }

  close() {
    this.backdrop?.classList.add('hidden');
    this.currentTenant = null;
  }
}
