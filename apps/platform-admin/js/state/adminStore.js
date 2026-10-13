/**
 * [Feature / Domain]: Platform Administration — Central Reactive Store
 * [Multi-Tenancy Context]: Global Cloud Console State Boundary
 * [Security / Entitlement]: Superadmin Console State
 */

import { PlanTier, TenantStatus, AdminAccountStatus } from '../domain/constants.js';

const INITIAL_TENANTS_SEED = [
  {
    tenantId: 'tnt-001',
    tenantCode: 'PHARMA-NILEIN',
    tenantName: 'مجموعة صيدليات النيلين النموذجية',
    orgName: 'شركة النيلين للخدمات الطبية',
    branchName: 'الخرطوم — تقاطع القصر',
    adminUser: 'nilein_admin',
    adminStatus: AdminAccountStatus.ACTIVE,
    tempPassword: 'N/A',
    plan: PlanTier.ENTERPRISE,
    status: TenantStatus.ACTIVE,
    createdAt: '2026-09-01 10:00'
  },
  {
    tenantId: 'tnt-002',
    tenantCode: 'PHARMA-MEDICO',
    tenantName: 'سلسلة صيدليات ميديكو الخرطوم',
    orgName: 'ميديكو كير المحدودة',
    branchName: 'الرياض — شارع المشتل',
    adminUser: 'medico_admin',
    adminStatus: AdminAccountStatus.ACTIVE,
    tempPassword: 'N/A',
    plan: PlanTier.STANDARD,
    status: TenantStatus.ACTIVE,
    createdAt: '2026-09-15 14:30'
  },
  {
    tenantId: 'tnt-003',
    tenantCode: 'PHARMA-OMDURMAN',
    tenantName: 'صيدلية أم درمان المركزية',
    orgName: 'مؤسسة أم درمان الصيدلانية',
    branchName: 'سوق أم درمان الكبير',
    adminUser: 'omdurman_admin',
    adminStatus: AdminAccountStatus.ACTIVE,
    tempPassword: 'N/A',
    plan: PlanTier.COMMUNITY,
    status: TenantStatus.ACTIVE,
    createdAt: '2026-10-01 09:15'
  },
  {
    tenantId: 'tnt-004',
    tenantCode: 'PHARMA-BLUENILE',
    tenantName: 'صيدليات النيل الأزرق',
    orgName: 'شركة النيل الأزرق المحدودة',
    branchName: 'بحري المحطة الوسطى',
    adminUser: 'bluenile_admin',
    adminStatus: AdminAccountStatus.PASSWORD_CHANGE_REQUIRED,
    tempPassword: 'Temp-9K22!2026',
    plan: PlanTier.STANDARD,
    status: TenantStatus.ACTIVE,
    createdAt: '2026-10-10 11:20'
  }
];

const INITIAL_AUDIT_SEED = [
  {
    id: 'aud-001',
    timestamp: '2026-10-10 11:20:04',
    actor: 'platform-superadmin',
    action: 'PROVISION_TENANT',
    tenantCode: 'PHARMA-BLUENILE',
    details: 'تهيئة المستأجر وتعيين المشرف في حالة PASSWORD_CHANGE_REQUIRED',
    correlationId: 'corr-prov-9921'
  },
  {
    id: 'aud-002',
    timestamp: '2026-10-01 09:15:10',
    actor: 'platform-superadmin',
    action: 'PROVISION_TENANT',
    tenantCode: 'PHARMA-OMDURMAN',
    details: 'تهيئة المستأجر وتخصيص خطة COMMUNITY',
    correlationId: 'corr-prov-8812'
  }
];

class AdminStore {
  constructor() {
    this.tenants = [...INITIAL_TENANTS_SEED];
    this.auditLogs = [...INITIAL_AUDIT_SEED];
    this.activeTab = 'overview';
    this.dark = localStorage.getItem('pharmatech_admin_dark') === 'true';
    this.searchQuery = '';
    this.planFilter = 'ALL';
    this.selectedTenantForCredentials = null;

    this._listeners = new Set();
  }

  subscribe(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  notify(event, payload) {
    this._listeners.forEach(fn => {
      try {
        fn(event, payload, this);
      } catch (err) {
        console.error('[AdminStore] Listener error:', err);
      }
    });
  }

  setTheme(isDark) {
    this.dark = isDark;
    localStorage.setItem('pharmatech_admin_dark', isDark);
    this.notify('THEME_CHANGED', isDark);
  }

  setActiveTab(tab) {
    this.activeTab = tab;
    this.notify('TAB_CHANGED', tab);
  }

  setSearchQuery(q) {
    this.searchQuery = q.trim().toLowerCase();
    this.notify('FILTER_CHANGED', { query: this.searchQuery, plan: this.planFilter });
  }

  setPlanFilter(plan) {
    this.planFilter = plan;
    this.notify('FILTER_CHANGED', { query: this.searchQuery, plan: this.planFilter });
  }

  setSelectedTenantForCredentials(tenant) {
    this.selectedTenantForCredentials = tenant;
    this.notify('CREDENTIALS_MODAL_REQUESTED', tenant);
  }
}

export const adminStore = new AdminStore();
