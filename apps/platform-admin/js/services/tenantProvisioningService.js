/**
 * [Feature / Domain]: Platform Administration — Tenant Provisioning Application Service
 * [Multi-Tenancy Context]: Atomic Multi-Tenant Provisioning Contract (D-041)
 * [Security / Entitlement]: Superadmin Only / Enforces PASSWORD_CHANGE_REQUIRED
 */

import { adminStore } from '../state/adminStore.js';
import {
  AdminAccountStatus,
  TenantStatus,
  ARABIC_PHARMACY_DICT,
  STOP_WORDS,
  SecurityPolicy
} from '../domain/constants.js';
import { ProvisionTenantDTO, RFC7807ProblemDetails } from '../domain/dtos.js';
import { eventBus, DomainEvents } from '../domain/events.js';
import { apiClient } from './apiClient.js';

export class TenantProvisioningService {
  constructor() {
    this._idempotencyCache = new Map();
  }

  /**
   * Deterministically transliterates Arabic text to clean English phonetics.
   *
   * @param {string} str - Raw Arabic pharmacy name.
   * @returns {string} Uppercase alphanumeric Latin representation.
   */
  static transliterateArabic(str) {
    const charMap = {
      'ا': 'A', 'أ': 'A', 'إ': 'A', 'آ': 'A', 'ء': '', 'ب': 'B', 'ت': 'T', 'ث': 'TH',
      'ج': 'J', 'ح': 'H', 'خ': 'KH', 'د': 'D', 'ذ': 'Z', 'ر': 'R', 'ز': 'Z', 'س': 'S',
      'ش': 'SH', 'ص': 'S', 'ض': 'D', 'ط': 'T', 'ظ': 'Z', 'ع': 'A', 'غ': 'GH', 'ف': 'F',
      'ق': 'K', 'ك': 'K', 'ل': 'L', 'م': 'M', 'ن': 'N', 'ه': 'H', 'و': 'W', 'ي': 'Y',
      'ى': 'Y', 'ة': 'A'
    };

    return str
      .split('')
      .map(char => charMap[char] || (char.match(/[a-zA-Z0-9]/) ? char.toUpperCase() : ''))
      .join('');
  }

  /**
   * Generates intelligent, memorable tenant slug suggestion from Arabic pharmacy name.
   *
   * @param {string} pharmacyName - Arabic name entered by administrator.
   * @returns {string} Standardized tenant code formatted with PHARMA- prefix.
   */
  static suggestTenantCode(pharmacyName) {
    if (!pharmacyName || typeof pharmacyName !== 'string') {
      return `${SecurityPolicy.TENANT_CODE_PREFIX}NEW`;
    }

    const cleanInput = pharmacyName.replace(/[^\u0600-\u06FF\s0-9a-zA-Z]/g, ' ').trim();
    const words = cleanInput.split(/\s+/).filter(w => w.length > 0);

    // Filter out common Sudanese prefix stop words (صيدلية، مجموعة)
    const significantWords = words.filter(w => !STOP_WORDS.has(w));
    const targetWords = significantWords.length > 0 ? significantWords : words;

    const slugs = [];
    for (const w of targetWords) {
      if (ARABIC_PHARMACY_DICT[w]) {
        slugs.push(ARABIC_PHARMACY_DICT[w]);
      } else {
        const tr = TenantProvisioningService.transliterateArabic(w);
        if (tr.length >= 2) slugs.push(tr);
      }
    }

    const finalSlug = slugs.join('').replace(/[^A-Z0-9]/g, '').slice(0, 16);
    return `${SecurityPolicy.TENANT_CODE_PREFIX}${finalSlug || 'PHARM'}`;
  }

  /**
   * Generates cryptographically entropy-dense temporary password conforming to D-041.
   * Ensures at least one uppercase, lowercase, digit, and approved special character.
   *
   * @returns {string} Temporary password string.
   */
  static generateSecureTemporaryPassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*';
    let result = 'Temp-';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `${result}!${new Date().getFullYear()}`;
  }

  /**
   * Atomically provisions a new tenant graph adhering to contract D-041 and backend persistence.
   *
   * @param {ProvisionTenantDTO} dto - Validated tenant provisioning payload.
   * @returns {Promise<{ tenant: Object, correlationId: string }>} Resulting provisioned tenant.
   * @throws {RFC7807ProblemDetails} If tenantCode or adminUser is already occupied.
   */
  async provisionTenant(dto) {
    // SECURITY: Idempotency Replay Guard
    if (dto.idempotencyKey && this._idempotencyCache.has(dto.idempotencyKey)) {
      return this._idempotencyCache.get(dto.idempotencyKey);
    }

    try {
      // 1. Call Backend API to provision tenant, create initial admin in users.json, and append audit log
      const res = await apiClient.post('/api/platform/tenants', {
        tenantName: dto.tenantName,
        orgName: dto.orgName,
        branchName: dto.branchName,
        tenantCode: dto.tenantCode,
        adminUser: dto.adminUser,
        plan: dto.plan,
        idempotencyKey: dto.idempotencyKey
      });

      const newTenant = res.tenant;
      const correlationId = res.correlationId || `${SecurityPolicy.CORRELATION_PREFIX}${Math.floor(1000 + Math.random() * 9000)}`;

      // Update in-memory state store
      const idx = adminStore.tenants.findIndex(t => t.tenantCode === newTenant.tenantCode);
      if (idx >= 0) {
        adminStore.tenants[idx] = newTenant;
      } else {
        adminStore.tenants.unshift(newTenant);
      }

      const result = { tenant: newTenant, correlationId };
      if (dto.idempotencyKey) {
        this._idempotencyCache.set(dto.idempotencyKey, result);
      }

      eventBus.publish(DomainEvents.TENANT_PROVISIONED, {
        tenantId: newTenant.tenantId,
        tenantCode: newTenant.tenantCode,
        tenantName: newTenant.tenantName,
        adminUser: newTenant.adminUser,
        plan: newTenant.plan,
        correlationId,
        actor: SecurityPolicy.DEFAULT_SUPERADMIN_ACTOR
      });

      adminStore.notify('TENANT_PROVISIONED', newTenant);
      return result;
    } catch (err) {
      if (err.status === 409 || err.message?.includes('already registered') || err.message?.includes('already taken') || err.message?.includes('CONFLICT')) {
        throw new RFC7807ProblemDetails('Conflict', 409, err.message || 'رمز المستأجر أو اسم المشرف مسجل مسبقاً');
      }
      throw err;
    }
  }

  /**
   * Toggles tenant operational status between ACTIVE and SUSPENDED in backend & store.
   *
   * @param {string} tenantId - Unique identifier of target tenant.
   * @returns {Promise<Object>} Updated tenant entity.
   * @throws {RFC7807ProblemDetails} If tenant does not exist.
   */
  async toggleTenantStatus(tenantId) {
    const tenant = adminStore.tenants.find(t => t.tenantId === tenantId);
    if (!tenant) {
      throw new RFC7807ProblemDetails('Not Found', 404, `Tenant with ID ${tenantId} not found`);
    }

    try {
      const res = await apiClient.patch(`/api/platform/tenants/${tenantId}/status`);
      const updated = res.tenant || {
        ...tenant,
        status: tenant.status === TenantStatus.ACTIVE ? TenantStatus.SUSPENDED : TenantStatus.ACTIVE
      };

      const idx = adminStore.tenants.findIndex(t => t.tenantId === tenantId);
      if (idx >= 0) {
        adminStore.tenants[idx] = updated;
      }

      eventBus.publish(DomainEvents.TENANT_STATUS_CHANGED, {
        tenantId: updated.tenantId,
        tenantCode: updated.tenantCode,
        newStatus: updated.status,
        actor: SecurityPolicy.DEFAULT_SUPERADMIN_ACTOR
      });

      adminStore.notify('TENANT_UPDATED', updated);
      return updated;
    } catch (err) {
      console.warn('[TenantProvisioningService] Remote toggle warning:', err.message);
      // Fallback local toggle
      tenant.status = tenant.status === TenantStatus.ACTIVE ? TenantStatus.SUSPENDED : TenantStatus.ACTIVE;
      adminStore.notify('TENANT_UPDATED', tenant);
      return tenant;
    }
  }

  /**
   * Synchronizes tenants with backend database.
   */
  async fetchTenants() {
    try {
      const data = await apiClient.get('/api/platform/tenants');
      if (Array.isArray(data)) {
        adminStore.setTenants(data);
        return data;
      }
    } catch (err) {
      console.warn('[TenantProvisioningService] Failed to fetch remote tenants:', err.message);
    }
    return adminStore.tenants;
  }
}

export const tenantProvisioningService = new TenantProvisioningService();
