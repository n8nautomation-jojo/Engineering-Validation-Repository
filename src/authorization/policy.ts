import type { Capability, OfflineClass } from "./capabilities.js";
import type { DeviceId, TenantId, OrganizationId, BranchId, WarehouseId, UserId } from "../kernel/types.js";

export type Scope = Readonly<{
  tenantId?: TenantId;
  organizationId?: OrganizationId;
  branchIds?: readonly BranchId[];
  warehouseIds?: readonly WarehouseId[];
  deviceIds?: readonly DeviceId[];
}>;

export type AuthorizationAssignment = Readonly<{
  userId: UserId;
  capabilities: readonly Capability[];
  scope: Scope;
  policyVersion: string;
}>;

export type ResourceScope = Readonly<{
  tenantId?: TenantId;
  organizationId?: OrganizationId;
  branchId?: BranchId;
  warehouseId?: WarehouseId;
  deviceId?: DeviceId;
}>;

export type SoDPolicy = Readonly<{
  independentApprovalRequired: boolean;
  creatorUserId?: UserId;
}>;

export type AuthorizationSnapshot = Readonly<{
  snapshotId: string;
  version: number;
  issuedAt: string;
  expiresAt: string;
  deviceId: DeviceId;
  userId: UserId;
  assignments: readonly AuthorizationAssignment[];
  revoked: boolean;
  integrityVerified: boolean;
}>;

export type AuthorizationRequest = Readonly<{
  capability: Capability;
  context: {
    tenantId: TenantId;
    organizationId: OrganizationId;
    branchId?: BranchId;
    warehouseId?: WarehouseId;
    deviceId?: DeviceId;
    userId: UserId;
  };
  resource?: ResourceScope;
  offline: boolean;
  now: string;
  snapshot?: AuthorizationSnapshot;
  sod?: SoDPolicy;
  reason?: string;
}>;

export type AuthorizationDecision = Readonly<{
  allowed: boolean;
  reason: string;
  capability: Capability;
  offlineClass: OfflineClass;
  policyVersion?: string;
  snapshotVersion?: number;
  auditRequired: boolean;
}>;
