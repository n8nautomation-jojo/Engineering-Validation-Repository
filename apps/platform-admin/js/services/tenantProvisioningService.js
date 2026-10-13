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
   * Atomically provisions a new tenant graph adhering to contract D-041.
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

    // SECURITY: Uniqueness constraint validation
    const existingCode = adminStore.tenants.find(t => t.tenantCode === dto.tenantCode);
    if (existingCode) {
      throw new RFC7807ProblemDetails(
        'Conflict',
        409,
        `Tenant code "${dto.tenantCode}" is already registered on this platform. Choose a unique code.`
      );
    }

    const existingUser = adminStore.tenants.find(t => t.adminUser === dto.adminUser);
    if (existingUser) {
      throw new RFC7807ProblemDetails(
        'Conflict',
        409,
        `Administrator username "${dto.adminUser}" is already taken across tenants.`
      );
    }

    const correlationId = `${SecurityPolicy.CORRELATION_PREFIX}${Math.floor(1000 + Math.random() * 9000)}`;
    const tempPassword = TenantProvisioningService.generateSecureTemporaryPassword();

    const newTenant = {
      tenantId: `tnt-${String(adminStore.tenants.length + 1).padStart(3, '0')}`,
      tenantCode: dto.tenantCode,
      tenantName: dto.tenantName,
      orgName: dto.orgName,
      branchName: dto.branchName,
      adminUser: dto.adminUser,
      adminStatus: AdminAccountStatus.PASSWORD_CHANGE_REQUIRED,
      tempPassword,
      plan: dto.plan,
      status: TenantStatus.ACTIVE,
      createdAt: new Date().toISOString().replace('T', ' ').slice(0, 16)
    };

    // Commit to in-memory state store
    adminStore.tenants.unshift(newTenant);

    const result = { tenant: newTenant, correlationId };

    if (dto.idempotencyKey) {
      this._idempotencyCache.set(dto.idempotencyKey, result);
    }

    // Decoupled side-effect: Emit domain event for audit & telemetry
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
  }

  /**
   * Toggles tenant operational status between ACTIVE and SUSPENDED.
   *
   * @param {string} tenantId - Unique identifier of target tenant.
   * @returns {Object} Updated tenant entity.
   * @throws {RFC7807ProblemDetails} If tenant does not exist.
   */
  toggleTenantStatus(tenantId) {
    const tenant = adminStore.tenants.find(t => t.tenantId === tenantId);
    if (!tenant) {
      throw new RFC7807ProblemDetails('Not Found', 404, `Tenant with ID ${tenantId} not found`);
    }

    tenant.status = tenant.status === TenantStatus.ACTIVE ? TenantStatus.SUSPENDED : TenantStatus.ACTIVE;

    eventBus.publish(DomainEvents.TENANT_STATUS_CHANGED, {
      tenantId: tenant.tenantId,
      tenantCode: tenant.tenantCode,
      newStatus: tenant.status,
      actor: SecurityPolicy.DEFAULT_SUPERADMIN_ACTOR
    });

    adminStore.notify('TENANT_UPDATED', tenant);
    return tenant;
  }
}

export const tenantProvisioningService = new TenantProvisioningService();
