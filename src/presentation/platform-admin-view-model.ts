export interface TenantProvisioningInput {
  readonly tenantCode: string;
  readonly tenantName: string;
  readonly orgCode: string;
  readonly orgName: string;
  readonly branchCode: string;
  readonly branchName: string;
  readonly adminUsername: string;
  readonly adminEmail: string;
  readonly subscriptionPlan: "STANDARD" | "ENTERPRISE" | "COMMUNITY";
  readonly correlationId?: string;
}

export interface TenantRecord {
  readonly tenantId: string;
  readonly tenantCode: string;
  readonly tenantName: string;
  readonly orgId: string;
  readonly branchId: string;
  readonly adminUserId: string;
  readonly adminUsername: string;
  readonly adminStatus: "PASSWORD_CHANGE_REQUIRED" | "ACTIVE";
  readonly temporaryPassword: string;
  readonly subscriptionPlan: string;
  readonly subscriptionStatus: "ACTIVE" | "SUSPENDED" | "GRACE_PERIOD";
  readonly createdAt: string;
}

export interface PlatformAuditEvent {
  readonly id: string;
  readonly timestamp: string;
  readonly actor: string;
  readonly action: string;
  readonly tenantCode: string;
  readonly details: string;
  readonly correlationId: string;
}

export interface PlatformHealthTelemetry {
  readonly apiStatus: "HEALTHY" | "DEGRADED" | "DOWN";
  readonly syncPipelineStatus: "OPTIMAL" | "CONGESTED" | "PAUSED";
  readonly activeTenantsCount: number;
  readonly conflictBacklogCount: number;
  readonly lastAuditSyncTime: string;
}

export class PlatformAdminViewModel {
  private _tenants: Map<string, TenantRecord> = new Map();
  private _auditLog: PlatformAuditEvent[] = [];
  private _currentUser = "platform-superadmin";

  constructor() {
    // Seed initial demo tenant if needed
  }

  public get tenants(): readonly TenantRecord[] {
    return Array.from(this._tenants.values());
  }

  public get auditLog(): readonly PlatformAuditEvent[] {
    return this._auditLog.slice().reverse(); // Newest first
  }

  public getHealthTelemetry(): PlatformHealthTelemetry {
    return {
      apiStatus: "HEALTHY",
      syncPipelineStatus: "OPTIMAL",
      activeTenantsCount: this._tenants.size,
      conflictBacklogCount: 0,
      lastAuditSyncTime: new Date().toISOString()
    };
  }

  public provisionTenant(input: TenantProvisioningInput): { success: boolean; tenant?: TenantRecord; error?: string } {
    const correlationId = input.correlationId ?? `corr-admin-${Date.now()}`;

    // Validation
    if (!input.tenantCode || !input.tenantName || !input.adminUsername) {
      return { success: false, error: "MISSING_REQUIRED_PROVISIONING_FIELDS" };
    }

    // Idempotency check: if tenantCode exists, return existing record
    const existing = this._tenants.get(input.tenantCode.toUpperCase());
    if (existing) {
      return { success: true, tenant: existing };
    }

    const timestamp = new Date().toISOString();
    const tempPassword = `Temp-${Math.random().toString(36).substring(2, 8).toUpperCase()}!2026`;
    const tenantId = `tnt-${Date.now().toString(36)}`;
    const orgId = `org-${Date.now().toString(36)}`;
    const branchId = `brn-${Date.now().toString(36)}`;
    const adminUserId = `usr-${Date.now().toString(36)}`;

    const newTenant: TenantRecord = {
      tenantId,
      tenantCode: input.tenantCode.toUpperCase(),
      tenantName: input.tenantName,
      orgId,
      branchId,
      adminUserId,
      adminUsername: input.adminUsername,
      adminStatus: "PASSWORD_CHANGE_REQUIRED",
      temporaryPassword: tempPassword,
      subscriptionPlan: input.subscriptionPlan,
      subscriptionStatus: "ACTIVE",
      createdAt: timestamp
    };

    this._tenants.set(newTenant.tenantCode, newTenant);

    // Append-only audit record
    this._auditLog.push({
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp,
      actor: this._currentUser,
      action: "PROVISION_TENANT",
      tenantCode: newTenant.tenantCode,
      details: `Provisioned tenant ${newTenant.tenantName} with initial admin ${newTenant.adminUsername} in state PASSWORD_CHANGE_REQUIRED`,
      correlationId
    });

    return { success: true, tenant: newTenant };
  }

  public updateSubscriptionStatus(tenantCode: string, newStatus: "ACTIVE" | "SUSPENDED" | "GRACE_PERIOD"): boolean {
    const tenant = this._tenants.get(tenantCode.toUpperCase());
    if (!tenant) return false;

    const updated: TenantRecord = {
      ...tenant,
      subscriptionStatus: newStatus
    };
    this._tenants.set(tenantCode.toUpperCase(), updated);

    this._auditLog.push({
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor: this._currentUser,
      action: "UPDATE_SUBSCRIPTION_STATUS",
      tenantCode,
      details: `Changed subscription status from ${tenant.subscriptionStatus} to ${newStatus}`,
      correlationId: `corr-sub-${Date.now()}`
    });

    return true;
  }

  /**
   * Enforces D-038 & D-041 customer data privacy boundary.
   * Platform administrators are strictly prohibited from viewing patient or prescription data.
   */
  public queryClinicalRecords(): never {
    throw new Error("PRIVACY_BOUNDARY_VIOLATION: Platform administrative console cannot access customer clinical or prescription data.");
  }
}
