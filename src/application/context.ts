import type {
  BranchId,
  DeviceId,
  OrganizationId,
  TenantId,
  UserId
} from "../kernel/types.js";

export interface RequestContext {
  readonly tenantId: TenantId;
  readonly organizationId: OrganizationId;
  readonly branchId?: BranchId;
  readonly warehouseId?: string;
  readonly deviceId?: DeviceId;
  readonly userId: UserId;
  readonly correlationId: string;
}

export function assertTrustedScope(context: RequestContext): void {
  if (!context.tenantId || !context.organizationId || !context.userId || !context.correlationId) {
    throw new Error("INVALID_TRUSTED_REQUEST_CONTEXT");
  }
}
