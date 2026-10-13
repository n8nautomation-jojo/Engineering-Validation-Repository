/**
 * [Feature / Domain]: Platform Administration — Domain Enums & Constants
 * [Multi-Tenancy Context]: Global Enterprise Platform Boundaries (D-038 / D-041)
 * [Security / Entitlement]: Zero Magic Values / Strict Domain Contracts
 */

/**
 * Strict Subscription Plan Tiers supported by the SaaS platform.
 * Determines multi-tenant resource allocations and capability boundaries.
 * @readonly
 * @enum {string}
 */
export const PlanTier = Object.freeze({
  ENTERPRISE: 'ENTERPRISE',
  STANDARD: 'STANDARD',
  COMMUNITY: 'COMMUNITY'
});

/**
 * Lifecycle states of an onboarded B2B Tenant.
 * @readonly
 * @enum {string}
 */
export const TenantStatus = Object.freeze({
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  PENDING_SETUP: 'PENDING_SETUP'
});

/**
 * Initial security state of the provisioned Tenant Administrator.
 * Under contract D-041, initial provisioning MUST set PASSWORD_CHANGE_REQUIRED.
 * @readonly
 * @enum {string}
 */
export const AdminAccountStatus = Object.freeze({
  PASSWORD_CHANGE_REQUIRED: 'PASSWORD_CHANGE_REQUIRED',
  ACTIVE: 'ACTIVE',
  LOCKED: 'LOCKED'
});

/**
 * Standard security audit actions recorded in the immutable platform log.
 * @readonly
 * @enum {string}
 */
export const AuditAction = Object.freeze({
  PROVISION_TENANT: 'PROVISION_TENANT',
  SUSPEND_TENANT: 'SUSPEND_TENANT',
  ACTIVATE_TENANT: 'ACTIVATE_TENANT',
  ROTATE_CREDENTIALS: 'ROTATE_CREDENTIALS'
});

/**
 * Platform security policies and cryptographic constraints.
 */
export const SecurityPolicy = Object.freeze({
  MIN_PASSWORD_LENGTH: 12,
  CORRELATION_PREFIX: 'corr-prov-',
  TENANT_CODE_PREFIX: 'PHARMA-',
  DEFAULT_SUPERADMIN_ACTOR: 'platform-superadmin'
});

/**
 * Arabic-to-English domain transliteration dictionary for Sudanese pharmaceutical organizations.
 * Ensures generated tenant slugs are deterministic, clean, and conform to URL/database safety.
 */
export const ARABIC_PHARMACY_DICT = Object.freeze({
  'النيل': 'NILE',
  'الأزرق': 'BLUE',
  'الازرق': 'BLUE',
  'النيلين': 'NILEIN',
  'الخرطوم': 'KRT',
  'بحري': 'BAHRI',
  'ام درمان': 'OMDURMAN',
  'أم درمان': 'OMDURMAN',
  'الشفاء': 'SHIFA',
  'الامل': 'AMAL',
  'الأمل': 'AMAL',
  'البلسم': 'BALSAM',
  'ميديكو': 'MEDICO',
  'فارما': 'PHARMA',
  'كير': 'CARE',
  'الصحة': 'HEALTH',
  'الحياة': 'HAYAT',
  'طيبة': 'TIBA',
  'الرحمة': 'RAHMA',
  'السلام': 'SALAM',
  'المركزية': 'CENTRAL',
  'النموذجية': 'MODEL',
  'الرواد': 'RAWAD',
  'التاج': 'TAJ'
});

export const STOP_WORDS = Object.freeze(new Set([
  'صيدلية', 'صيدليات', 'مجموعة', 'شركة', 'سلسلة', 'مركز', 'مؤسسة'
]));
