/**
 * [Feature / Domain]: Platform Administration — Security Audit Service
 * [Multi-Tenancy Context]: Cross-Tenant Immutable Audit Trail (D-038)
 * [Security / Entitlement]: Append-Only Security Compliance Auditor
 */

import { adminStore } from '../state/adminStore.js';
import { AuditAction } from '../domain/constants.js';
import { eventBus, DomainEvents } from '../domain/events.js';

export class AuditService {
  constructor() {
    this._initEventListeners();
  }

  /**
   * Automatically subscribes to domain events to decouple audit side-effects.
   * @private
   */
  _initEventListeners() {
    eventBus.subscribe(DomainEvents.TENANT_PROVISIONED, (event) => {
      this.record({
        action: AuditAction.PROVISION_TENANT,
        tenantCode: event.tenantCode,
        actor: event.actor,
        correlationId: event.correlationId,
        details: `تهيئة مستأجر جديد (${event.tenantName}) وتخصيص خطة ${event.plan} وحساب المشرف ${event.adminUser}`
      });
    });

    eventBus.subscribe(DomainEvents.TENANT_STATUS_CHANGED, (event) => {
      this.record({
        action: event.newStatus === 'ACTIVE' ? AuditAction.ACTIVATE_TENANT : AuditAction.SUSPEND_TENANT,
        tenantCode: event.tenantCode,
        actor: event.actor,
        correlationId: `corr-stat-${Date.now().toString().slice(-4)}`,
        details: `تعديل حالة المستأجر إلى ${event.newStatus}`
      });
    });

    eventBus.subscribe(DomainEvents.CREDENTIALS_ROTATED, (event) => {
      this.record({
        action: AuditAction.ROTATE_CREDENTIALS,
        tenantCode: event.tenantCode,
        actor: event.actor,
        correlationId: `corr-cred-${Date.now().toString().slice(-4)}`,
        details: `تسليم بيانات الاعتماد الأولية لمشرف الصيدلية`
      });
    });
  }

  /**
   * Appends an immutable security record to the audit store.
   *
   * @param {Object} entry
   * @param {string} entry.action
   * @param {string} entry.tenantCode
   * @param {string} entry.actor
   * @param {string} entry.correlationId
   * @param {string} entry.details
   * @returns {Object} Newly committed audit log entry.
   */
  record({ action, tenantCode, actor, correlationId, details }) {
    const entry = {
      id: `aud-${String(adminStore.auditLogs.length + 1).padStart(3, '0')}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      actor,
      action,
      tenantCode,
      details,
      correlationId
    };

    // Immutable append
    adminStore.auditLogs.unshift(entry);
    adminStore.notify('AUDIT_LOG_ADDED', entry);
    return entry;
  }

  /**
   * Retrieves filtered audit records.
   *
   * @param {string} [searchQuery=''] - Optional filter string.
   * @returns {Array<Object>} List of matching audit entries.
   */
  getAuditTrail(searchQuery = '') {
    if (!searchQuery) return adminStore.auditLogs;
    const q = searchQuery.toLowerCase();

    return adminStore.auditLogs.filter(log =>
      log.tenantCode.toLowerCase().includes(q) ||
      log.action.toLowerCase().includes(q) ||
      log.correlationId.toLowerCase().includes(q) ||
      log.details.toLowerCase().includes(q)
    );
  }
}

export const auditService = new AuditService();
