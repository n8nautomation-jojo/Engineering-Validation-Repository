import type {
  BranchId,
  DeviceId,
  OrganizationId,
  TenantId,
  UserId,
  UUID
} from "./types.js";

export interface Scope {
  readonly tenantId: TenantId;
  readonly organizationId: OrganizationId;
  readonly branchId?: BranchId;
  readonly deviceId?: DeviceId;
  readonly userId: UserId;
}

export type { UUID, TenantId, OrganizationId, BranchId, DeviceId, UserId };
