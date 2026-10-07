import type { OrganizationId, TenantId, UserId } from "../kernel/types.js";

export type AuthorityPlane = "PLATFORM_OWNER" | "TENANT_USER";

export type AuthorityContext = Readonly<{
  plane: AuthorityPlane;
  userId: UserId;
  tenantId?: TenantId;
  organizationId?: OrganizationId;
}>;

export function assertPlatformContext(context: AuthorityContext): void {
  if (context.plane !== "PLATFORM_OWNER") {
    throw new Error("PLATFORM_AUTHORITY_REQUIRED");
  }
  if (context.tenantId !== undefined || context.organizationId !== undefined) {
    throw new Error("PLATFORM_CONTEXT_MUST_NOT_CARRY_TENANT_SCOPE");
  }
}

export function assertTenantContext(context: AuthorityContext): void {
  if (context.plane !== "TENANT_USER") {
    throw new Error("TENANT_AUTHORITY_REQUIRED");
  }
  if (context.tenantId === undefined || context.organizationId === undefined) {
    throw new Error("TENANT_CONTEXT_REQUIRED");
  }
}
