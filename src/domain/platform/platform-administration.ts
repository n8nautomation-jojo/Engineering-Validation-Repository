import type { BranchId, OrganizationId, TenantId, UserId, UUID } from "../../kernel/types.js";

export type PlatformTenantStatus = "ACTIVE" | "SUSPENDED" | "DISABLED";
export type OrganizationStatus = "ACTIVE" | "INACTIVE";
export type BranchStatus = "ACTIVE" | "INACTIVE";
export type SubscriptionStatus = "ACTIVE" | "TRIAL" | "SUSPENDED" | "EXPIRED";
export type PlatformUserStatus = "PROVISIONED" | "PASSWORD_CHANGE_REQUIRED" | "ACTIVE" | "DISABLED" | "LOCKED" | "REVOKED";

export type PlatformTenant = Readonly<{ id: TenantId; name: string; code: string; status: PlatformTenantStatus; version: number }>;
export type PlatformOrganization = Readonly<{ id: OrganizationId; tenantId: TenantId; name: string; legalName?: string; status: OrganizationStatus; version: number }>;
export type PlatformBranch = Readonly<{ id: BranchId; organizationId: OrganizationId; name: string; code: string; status: BranchStatus; version: number }>;
export type PlatformSubscription = Readonly<{ id: UUID; tenantId: TenantId; planCode: string; status: SubscriptionStatus; startsAt: string; endsAt?: string; version: number }>;
export type PlatformUser = Readonly<{ id: UserId; tenantId: TenantId; organizationId: OrganizationId; branchId: BranchId; username: string; displayName: string; status: PlatformUserStatus; version: number }>;

export type PlatformProvisionedGraph = Readonly<{
  tenant: PlatformTenant;
  organization: PlatformOrganization;
  branch: PlatformBranch;
  subscription: PlatformSubscription;
  initialAdmin: PlatformUser;
}>;

export function assertProvisionedGraphInvariant(graph: PlatformProvisionedGraph): void {
  if (graph.organization.tenantId !== graph.tenant.id) throw new Error("PLATFORM_GRAPH_TENANT_MISMATCH");
  if (graph.branch.organizationId !== graph.organization.id) throw new Error("PLATFORM_GRAPH_ORGANIZATION_MISMATCH");
  if (graph.subscription.tenantId !== graph.tenant.id) throw new Error("PLATFORM_GRAPH_SUBSCRIPTION_MISMATCH");
  if (graph.initialAdmin.tenantId !== graph.tenant.id || graph.initialAdmin.organizationId !== graph.organization.id || graph.initialAdmin.branchId !== graph.branch.id) {
    throw new Error("PLATFORM_GRAPH_ADMIN_SCOPE_MISMATCH");
  }
  if (graph.initialAdmin.status !== "PASSWORD_CHANGE_REQUIRED") throw new Error("PLATFORM_GRAPH_ADMIN_LIFECYCLE_INVALID");
}
