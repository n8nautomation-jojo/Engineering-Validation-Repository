import type { PlatformProvisionedGraph } from "../../domain/platform/platform-administration.js";
import type { PlatformProvisioningResult, TemporaryCredentialDescriptor } from "../../application/platform/provisioning-contract.js";
import type { IdempotencyRecord } from "../../persistence/contracts.js";
import type { PlatformAdministrationPersistence, PlatformTransaction } from "../../persistence/platform-contracts.js";

export class PostgresPlatformAdministrationPersistence implements PlatformAdministrationPersistence {
  constructor(private readonly db: { query<T = unknown>(text: string, values?: readonly unknown[]): Promise<{ rows: T[] }> }) {}

  async provisionAtomic(input: {
    transaction: PlatformTransaction;
    graph: PlatformProvisionedGraph;
    credential: TemporaryCredentialDescriptor;
    idempotency: IdempotencyRecord;
    audit: {
      actorId: string;
      action: "PLATFORM_TENANT_PROVISIONED";
      correlationId: string;
      reason: string;
      resourceId: string;
    };
  }): Promise<PlatformProvisioningResult> {
    const tx = input.transaction;
    const g = input.graph;
    const query = tx.query.bind(tx);

    await query("insert into platform_tenants(id,code,name,status,version) values($1,$2,$3,$4,$5)",
      [g.tenant.id,g.tenant.code,g.tenant.name,g.tenant.status,g.tenant.version]);
    await query("insert into platform_organizations(id,tenant_id,name,legal_name,status,version) values($1,$2,$3,$4,$5,$6)",
      [g.organization.id,g.organization.tenantId,g.organization.name,g.organization.legalName ?? null,g.organization.status,g.organization.version]);
    await query("insert into platform_branches(id,organization_id,name,code,status,version) values($1,$2,$3,$4,$5,$6)",
      [g.branch.id,g.branch.organizationId,g.branch.name,g.branch.code,g.branch.status,g.branch.version]);
    await query("insert into platform_subscriptions(id,tenant_id,plan_code,status,starts_at,ends_at,version) values($1,$2,$3,$4,$5,$6,$7)",
      [g.subscription.id,g.subscription.tenantId,g.subscription.planCode,g.subscription.status,g.subscription.startsAt,g.subscription.endsAt ?? null,g.subscription.version]);
    await query("insert into platform_users(id,tenant_id,organization_id,branch_id,username,display_name,status,credential_id,credential_expires_at,version) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)",
      [g.initialAdmin.id,g.initialAdmin.tenantId,g.initialAdmin.organizationId,g.initialAdmin.branchId,g.initialAdmin.username,g.initialAdmin.displayName,g.initialAdmin.status,input.credential.credentialId,input.credential.expiresAt,g.initialAdmin.version]);
    await query("insert into platform_idempotency(command_name,idempotency_key,request_hash,response_json) values($1,$2,$3,$4)",
      [input.idempotency.commandName,input.idempotency.key,input.idempotency.requestHash,JSON.stringify(input.idempotency.responseBody)]);
    await query("insert into platform_audit(id,actor_id,action,resource_type,resource_id,correlation_id,reason,after_json) values(gen_random_uuid(),$1,$2,$3,$4,$5,$6,$7)",
      [input.audit.actorId,input.audit.action,"TENANT",g.tenant.id,input.audit.correlationId,input.audit.reason,JSON.stringify({tenantId:g.tenant.id,organizationId:g.organization.id,branchId:g.branch.id,userId:g.initialAdmin.id})]);

    return input.idempotency.responseBody as PlatformProvisioningResult;
  }

  async findProvisioningIdempotency(
    key: string,
    commandName: "platform.tenants.provision",
    requestHash: string
  ): Promise<PlatformProvisioningResult | null> {
    const r = await this.db.query<{ request_hash: string; response_json: PlatformProvisioningResult }>(
      "select request_hash,response_json from platform_idempotency where command_name=$1 and idempotency_key=$2",
      [commandName,key]
    );
    const row = r.rows[0];
    if (!row) return null;
    if (row.request_hash !== requestHash) throw new Error("IDEMPOTENCY_KEY_REUSE_WITH_DIFFERENT_REQUEST");
    return row.response_json;
  }
}
