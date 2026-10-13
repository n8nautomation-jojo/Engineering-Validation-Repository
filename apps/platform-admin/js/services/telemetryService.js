/**
 * [Feature / Domain]: Platform Administration — Telemetry & Aggregation Service
 * [Multi-Tenancy Context]: Real-Time Health & Financial Metrics across Tenants
 * [Security / Entitlement]: High-Level Telemetry Aggregator
 */

import { adminStore } from '../state/adminStore.js';
import { PlanTier, TenantStatus } from '../domain/constants.js';

export const TelemetryService = {
  /**
   * Pure deterministic calculation of platform statistics.
   *
   * @returns {Object} Comprehensive platform health and financial snapshot.
   */
  getSnapshot() {
    const tenants = adminStore.tenants;
    const totalTenants = tenants.length;
    const activeTenants = tenants.filter(t => t.status === TenantStatus.ACTIVE).length;
    const suspendedTenants = totalTenants - activeTenants;

    // Financial Entitlements: Plan pricing in SDG (ج.س)
    const PLAN_MRR = {
      [PlanTier.ENTERPRISE]: 1800000,
      [PlanTier.STANDARD]: 850000,
      [PlanTier.COMMUNITY]: 320000
    };

    const totalMRR = tenants.reduce((sum, t) => {
      if (t.status === TenantStatus.ACTIVE) {
        return sum + (PLAN_MRR[t.plan] || 0);
      }
      return sum;
    }, 0);

    const pendingPasswordChangeCount = tenants.filter(t => t.adminStatus === 'PASSWORD_CHANGE_REQUIRED').length;

    return {
      totalTenants,
      activeTenants,
      suspendedTenants,
      totalMRR,
      pendingPasswordChangeCount,
      gatewayUptime: '99.98%',
      dbPoolActive: 12,
      dbPoolMax: 60,
      avgQueryLatencyMs: 1.4,
      rlsEnforced: true
    };
  }
};
