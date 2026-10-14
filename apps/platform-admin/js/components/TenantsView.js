/**
 * [Feature / Domain]: Platform Administration — Tenants Directory Component
 * [Multi-Tenancy Context]: B2B Tenant Inspection & Status Lifecycle
 * [Security / Entitlement]: Tenant Admin Credential Handover Trigger
 */

import { adminStore } from '../state/adminStore.js';
import { tenantProvisioningService } from '../services/tenantProvisioningService.js';
import { showToast } from './Toast.js';

export class TenantsView {
  constructor() {
    this.tbody = document.getElementById('tenants-table-tbody');
    this.searchInput = document.getElementById('tenant-search-input');
    this.planFilter = document.getElementById('tenant-plan-filter');
    this.countBadge = document.getElementById('tenants-count-badge');

    this.init();
  }

  init() {
    if (this.searchInput) {
      this.searchInput.addEventListener('input', (e) => {
        adminStore.setSearchQuery(e.target.value);
      });
    }

    if (this.planFilter) {
      this.planFilter.addEventListener('change', (e) => {
        adminStore.setPlanFilter(e.target.value);
      });
    }

    adminStore.subscribe((event) => {
      if (['FILTER_CHANGED', 'TENANT_PROVISIONED', 'TENANT_UPDATED', 'TENANTS_LOADED', 'TENANT_STATUS_CHANGED'].includes(event)) {
        this.render();
      }
    });

    this.render();
  }

  getFilteredTenants() {
    const q = adminStore.searchQuery;
    const plan = adminStore.planFilter;

    return adminStore.tenants.filter(t => {
      const matchQuery = !q ||
        t.tenantCode.toLowerCase().includes(q) ||
        t.tenantName.toLowerCase().includes(q) ||
        t.orgName.toLowerCase().includes(q) ||
        t.adminUser.toLowerCase().includes(q);

      const matchPlan = plan === 'ALL' || t.plan === plan;

      return matchQuery && matchPlan;
    });
  }

  render() {
    if (!this.tbody) return;

    const list = this.getFilteredTenants();
    if (this.countBadge) this.countBadge.textContent = list.length;

    if (list.length === 0) {
      this.tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align:center; padding: 40px; color:var(--text-muted);">
            لم يتم العثور على أي مستأجرين يطابقون معايير البحث
          </td>
        </tr>
      `;
      return;
    }

    this.tbody.innerHTML = list.map(t => {
      const hasTempPass = t.adminStatus === 'PASSWORD_CHANGE_REQUIRED';

      return `
        <tr>
          <td>
            <div class="tenant-cell-main">
              <div class="tenant-avatar-badge">${t.tenantCode.slice(7, 9) || 'PH'}</div>
              <div class="tenant-info">
                <strong>${t.tenantName}</strong>
                <small>${t.tenantCode}</small>
              </div>
            </div>
          </td>
          <td>
            <span style="font-size:12.5px; font-weight:600; color:var(--text-secondary);">${t.orgName}</span>
            <small style="display:block; font-size:11px; color:var(--text-muted);">${t.branchName}</small>
          </td>
          <td><span class="plan-badge ${t.plan.toLowerCase()}">${t.plan}</span></td>
          <td>
            <span class="cred-pill ${hasTempPass ? 'must-change' : 'verified'}">
              ${hasTempPass ? '⚠️ كلمة مرور مؤقتة' : '✓ مفعل ومؤكد'}
            </span>
          </td>
          <td>
            <span class="status-pill ${t.status.toLowerCase()}">
              ${t.status === 'ACTIVE' ? 'نشط' : 'معلق'}
            </span>
          </td>
          <td><span class="num">${t.createdAt}</span></td>
          <td>
            <div class="row-actions">
              ${hasTempPass ? `
                <button class="btn-table-action" onclick="window.openCredentialModal('${t.tenantId}')" title="تسليم بيانات الاعتماد">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  بيانات المشرف
                </button>
              ` : ''}
              <button class="btn-table-action" onclick="window.toggleTenantStatus('${t.tenantId}')" title="تغيير حالة المستأجر">
                ${t.status === 'ACTIVE' ? 'تعليق' : 'تفعيل'}
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Make global triggers available for row action buttons
    window.openCredentialModal = (tenantId) => {
      const tenant = adminStore.tenants.find(t => t.tenantId === tenantId);
      if (tenant) adminStore.setSelectedTenantForCredentials(tenant);
    };

    window.toggleTenantStatus = async (tenantId) => {
      try {
        const updated = await tenantProvisioningService.toggleTenantStatus(tenantId);
        showToast(
          updated.status === 'ACTIVE' ? 'تم تفعيل المستأجر' : 'تم تعليق المستأجر',
          `${updated.tenantName} (${updated.tenantCode})`,
          updated.status === 'ACTIVE' ? 'success' : 'warning'
        );
      } catch (err) {
        showToast('خطأ في العملية', err.message, 'danger');
      }
    };
  }
}
