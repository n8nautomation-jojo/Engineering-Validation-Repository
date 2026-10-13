/**
 * [Feature / Domain]: Platform Administration — Data Transfer Objects & Error Specifications
 * [Multi-Tenancy Context]: Zero Mass Assignment & Strong Validation
 * [Security / Entitlement]: RFC 7807 Problem Details Normalization
 */

import { PlanTier, SecurityPolicy } from './constants.js';

/**
 * Standard RFC 7807 Problem Details Error Class.
 * Prevents internal database or stack leaks to client consumers.
 */
export class RFC7807ProblemDetails extends Error {
  /**
   * @param {string} title - Short human-readable summary of problem.
   * @param {number} status - HTTP status code equivalent.
   * @param {string} detail - Specific explanation of this occurrence.
   * @param {Array<{name: string, reason: string}>} [invalidParams=[]] - Parameter violation details.
   */
  constructor(title, status, detail, invalidParams = []) {
    super(detail);
    this.name = 'RFC7807ProblemDetails';
    this.type = `https://pharmatech.sd/errors/${status}`;
    this.title = title;
    this.status = status;
    this.detail = detail;
    this.invalidParams = invalidParams;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Strongly-typed DTO for tenant provisioning requests.
 * Explicitly maps inputs to prevent Mass Assignment vulnerabilities.
 */
export class ProvisionTenantDTO {
  /**
   * @param {Object} params
   * @param {string} params.tenantCode
   * @param {string} params.tenantName
   * @param {string} params.orgName
   * @param {string} params.branchName
   * @param {string} params.adminUser
   * @param {string} params.plan
   * @param {string} [params.idempotencyKey]
   */
  constructor({ tenantCode, tenantName, orgName, branchName, adminUser, plan, idempotencyKey }) {
    this.tenantCode = tenantCode;
    this.tenantName = tenantName;
    this.orgName = orgName;
    this.branchName = branchName;
    this.adminUser = adminUser;
    this.plan = plan;
    this.idempotencyKey = idempotencyKey || null;
    Object.freeze(this);
  }

  /**
   * Factory validator enforcing zero mass-assignment and RFC 7807 compliance.
   *
   * @param {Record<string, unknown>} raw - Untrusted input payload from client form.
   * @returns {ProvisionTenantDTO} Validated and sanitized DTO.
   * @throws {RFC7807ProblemDetails} On any schema or semantic constraint violation.
   */
  static fromRaw(raw) {
    // SECURITY: Guard clause against null or non-object payloads
    if (!raw || typeof raw !== 'object') {
      throw new RFC7807ProblemDetails('Bad Request', 400, 'Payload must be a non-null JSON object');
    }

    const errors = [];

    const tenantName = String(raw.tenantName || '').trim();
    if (tenantName.length < 3) {
      errors.push({ name: 'tenantName', reason: 'Pharmacy commercial name must be at least 3 characters' });
    }

    const orgName = String(raw.orgName || '').trim();
    if (orgName.length < 3) {
      errors.push({ name: 'orgName', reason: 'Legal organization name must be at least 3 characters' });
    }

    const branchName = String(raw.branchName || '').trim();
    if (branchName.length < 3) {
      errors.push({ name: 'branchName', reason: 'Branch designation must be at least 3 characters' });
    }

    const adminUser = String(raw.adminUser || '').trim().toLowerCase();
    if (!/^[a-z0-9_]{3,24}$/.test(adminUser)) {
      errors.push({ name: 'adminUser', reason: 'Admin username must be 3-24 alphanumeric characters or underscores' });
    }

    const rawCode = String(raw.tenantCode || '').trim().toUpperCase();
    const cleanCode = rawCode.startsWith(SecurityPolicy.TENANT_CODE_PREFIX)
      ? rawCode
      : `${SecurityPolicy.TENANT_CODE_PREFIX}${rawCode}`;

    if (!/^PHARMA-[A-Z0-9_-]{3,30}$/.test(cleanCode)) {
      errors.push({ name: 'tenantCode', reason: 'Tenant code must start with PHARMA- followed by valid uppercase alphanumeric slug' });
    }

    const plan = String(raw.plan || '').trim().toUpperCase();
    if (!Object.values(PlanTier).includes(plan)) {
      errors.push({ name: 'plan', reason: `Subscription plan must be one of: ${Object.values(PlanTier).join(', ')}` });
    }

    // DEFENSIVE: Early return on accumulated validation failures
    if (errors.length > 0) {
      throw new RFC7807ProblemDetails(
        'Validation Failed',
        422,
        'One or more fields failed validation constraints',
        errors
      );
    }

    return new ProvisionTenantDTO({
      tenantCode: cleanCode,
      tenantName,
      orgName,
      branchName,
      adminUser,
      plan,
      idempotencyKey: raw.idempotencyKey ? String(raw.idempotencyKey).trim() : null
    });
  }
}
