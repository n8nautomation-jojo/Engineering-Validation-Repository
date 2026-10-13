/**
 * [Feature / Domain]: Platform Administration — Provisioning Wizard Component
 * [Multi-Tenancy Context]: Zero Mass Assignment Onboarding & Code Auto-Generation
 * [Security / Entitlement]: Contract D-041 Multi-Tenant Provisioning Surface
 */

import { adminStore } from '../state/adminStore.js';
import { PlanTier } from '../domain/constants.js';
import { ProvisionTenantDTO, RFC7807ProblemDetails } from '../domain/dtos.js';
import { TenantProvisioningService, tenantProvisioningService } from '../services/tenantProvisioningService.js';
import { showToast } from './Toast.js';

export class ProvisioningView {
  constructor() {
    this.form = document.getElementById('provisioning-form') || document.getElementById('provisioning-wizard-form');
    this.pharmacyNameInput = document.getElementById('input-pharmacy-name');
    this.orgNameInput = document.getElementById('input-org-name');
    this.branchNameInput = document.getElementById('input-branch-name');
    this.tenantCodeInput = document.getElementById('input-tenant-code');
    this.adminUserInput = document.getElementById('input-admin-user');
    this.selectedPlan = PlanTier.STANDARD;

    // Preview elements
    this.previewCodeEl = document.getElementById('preview-code');
    this.previewNameEl = document.getElementById('preview-name');
    this.previewPlanEl = document.getElementById('preview-plan');
    this.previewAdminEl = document.getElementById('preview-admin');

    this.init();
  }

  init() {
    // Real-time automatic slug transliteration suggestion
    if (this.pharmacyNameInput) {
      this.pharmacyNameInput.addEventListener('input', (e) => {
        const val = e.target.value.trim();
        const suggested = TenantProvisioningService.suggestTenantCode(val);
        if (this.tenantCodeInput) this.tenantCodeInput.value = suggested;

        // Auto-fill legal org and admin username if empty
        if (this.orgNameInput && !this.orgNameInput.value) {
          this.orgNameInput.value = val ? `شركة ${val} للخدمات الطبية` : '';
        }
        if (this.adminUserInput && !this.adminUserInput.value && suggested) {
          const userSlug = suggested.replace('PHARMA-', '').toLowerCase().slice(0, 12);
          this.adminUserInput.value = userSlug ? `${userSlug}_admin` : '';
        }

        this.updatePreview();
      });
    }

    // Plan selection card clicks
    document.querySelectorAll('.plan-option-card').forEach(card => {
      card.addEventListener('click', () => {
        const plan = card.dataset.plan;
        if (!plan) return;

        this.selectedPlan = plan;
        document.querySelectorAll('.plan-option-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        this.updatePreview();
      });
    });

    // Inputs change updates preview
    [this.tenantCodeInput, this.adminUserInput, this.orgNameInput].forEach(inp => {
      inp?.addEventListener('input', () => this.updatePreview());
    });

    // Form Submission
    if (this.form) {
      this.form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handleSubmit();
      });
    }
  }

  updatePreview() {
    if (this.previewNameEl) this.previewNameEl.textContent = this.pharmacyNameInput?.value || '—';
    if (this.previewCodeEl) this.previewCodeEl.textContent = this.tenantCodeInput?.value || 'PHARMA-—';
    if (this.previewPlanEl) this.previewPlanEl.textContent = this.selectedPlan;
    if (this.previewAdminEl) this.previewAdminEl.textContent = this.adminUserInput?.value || '—';
  }

  async handleSubmit() {
    try {
      // SECURITY: Zero Mass Assignment — Validated DTO construction
      const rawPayload = {
        tenantName: this.pharmacyNameInput?.value,
        orgName: this.orgNameInput?.value,
        branchName: this.branchNameInput?.value || 'الفرع الرئيسي',
        tenantCode: this.tenantCodeInput?.value,
        adminUser: this.adminUserInput?.value,
        plan: this.selectedPlan
      };

      const dto = ProvisionTenantDTO.fromRaw(rawPayload);

      // Call Application Service
      const { tenant, correlationId } = await tenantProvisioningService.provisionTenant(dto);

      showToast(
        'تمت تهيئة المستأجر بنجاح',
        `${tenant.tenantName} (${tenant.tenantCode}) · تم تخصيص الرمز ${correlationId}`,
        'success'
      );

      // Reset form
      this.form?.reset();
      this.selectedPlan = PlanTier.STANDARD;
      document.querySelectorAll('.plan-option-card').forEach(c => {
        c.classList.toggle('selected', c.dataset.plan === PlanTier.STANDARD);
      });
      this.updatePreview();

      // Immediately show credential handover modal for security compliance
      adminStore.setSelectedTenantForCredentials(tenant);
    } catch (err) {
      if (err instanceof RFC7807ProblemDetails) {
        const firstReason = err.invalidParams?.[0]?.reason || err.detail;
        showToast(err.title, firstReason, 'danger');
      } else {
        showToast('خطأ غير متوقع', err.message, 'danger');
      }
    }
  }
}
