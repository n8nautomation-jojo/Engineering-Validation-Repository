import type { OrganizationId, TenantId, UserId, UUID } from "../../kernel/types.js";
import type { AuthorityContext } from "../../authorization/authority-context.js";
import { assertPlatformContext } from "../../authorization/authority-context.js";

export type ProvisioningSubscription = Readonly<{ planCode: string; status: "ACTIVE" | "TRIAL" | "SUSPENDED"; startsAt: string; endsAt?: string }>;
export type PlatformProvisioningCommand = Readonly<{
  idempotencyKey: string; correlationId: string; reason: string; actor: AuthorityContext;
  tenant: Readonly<{ id: TenantId; name: string; code: string }>;
  organization: Readonly<{ id: OrganizationId; name: string; legalName?: string }>;
  branch: Readonly<{ id: UUID; name: string; code: string }>;
  initialAdmin: Readonly<{ userId: UserId; username: string; displayName: string; temporaryCredentialExpiresAt: string }>;
  subscription: ProvisioningSubscription;
}>;
export type TemporaryCredentialDescriptor = Readonly<{ credentialId: UUID; expiresAt: string; deliveryReference?: string }>;
export type PlatformProvisioningResult = Readonly<{
  tenantId: TenantId; organizationId: OrganizationId; branchId: UUID; initialAdminUserId: UserId;
  initialAdminLifecycle: "PASSWORD_CHANGE_REQUIRED"; temporaryCredential: TemporaryCredentialDescriptor;
  stockCreated: false; pharmacyTransactionsCreated: false;
}>;
export interface TemporaryCredentialService {
  issue(input: { userId: UserId; username: string; expiresAt: string; correlationId: string }): Promise<TemporaryCredentialDescriptor>;
}
export interface PlatformProvisioningPersistence {
  provisionAtomic(input: {
    command: PlatformProvisioningCommand;
    credential: TemporaryCredentialDescriptor;
    result: PlatformProvisioningResult;
    audit: { action: "PLATFORM_TENANT_PROVISIONED"; actorId: string; correlationId: string; reason: string; tenantId: TenantId; organizationId: OrganizationId; branchId: UUID; userId: UserId };
  }): Promise<void>;
  findIdempotentResult(idempotencyKey: string): Promise<PlatformProvisioningResult | null>;
}
export function validatePlatformProvisioning(command: PlatformProvisioningCommand): void {
  assertPlatformContext(command.actor);
  if (!command.idempotencyKey.trim() || !command.correlationId.trim() || !command.reason.trim()) throw new Error("INVALID_PROVISIONING_REQUEST_METADATA");
  if (!command.tenant.name.trim() || !command.tenant.code.trim()) throw new Error("INVALID_TENANT_METADATA");
  if (!command.organization.name.trim()) throw new Error("INVALID_ORGANIZATION_METADATA");
  if (!command.branch.name.trim() || !command.branch.code.trim()) throw new Error("INVALID_BRANCH_METADATA");
  if (!command.initialAdmin.username.trim() || !command.initialAdmin.displayName.trim() || !command.initialAdmin.temporaryCredentialExpiresAt.trim()) throw new Error("INVALID_INITIAL_ADMIN_METADATA");
  if (!command.subscription.planCode.trim() || !command.subscription.startsAt.trim()) throw new Error("INVALID_SUBSCRIPTION_METADATA");
}
export async function provisionPlatformTenant(command: PlatformProvisioningCommand, persistence: PlatformProvisioningPersistence, credentials: TemporaryCredentialService): Promise<PlatformProvisioningResult> {
  validatePlatformProvisioning(command);
  const prior = await persistence.findIdempotentResult(command.idempotencyKey);
  if (prior) return prior;
  const temporaryCredential = await credentials.issue({
    userId: command.initialAdmin.userId, username: command.initialAdmin.username,
    expiresAt: command.initialAdmin.temporaryCredentialExpiresAt, correlationId: command.correlationId
  });
  const result: PlatformProvisioningResult = {
    tenantId: command.tenant.id, organizationId: command.organization.id, branchId: command.branch.id,
    initialAdminUserId: command.initialAdmin.userId, initialAdminLifecycle: "PASSWORD_CHANGE_REQUIRED",
    temporaryCredential, stockCreated: false, pharmacyTransactionsCreated: false
  };
  await persistence.provisionAtomic({
    command,
    credential: temporaryCredential,
    result,
    audit: {
      action: "PLATFORM_TENANT_PROVISIONED", actorId: command.actor.userId, correlationId: command.correlationId,
      reason: command.reason, tenantId: command.tenant.id, organizationId: command.organization.id,
      branchId: command.branch.id, userId: command.initialAdmin.userId
    }
  });
  return result;
}