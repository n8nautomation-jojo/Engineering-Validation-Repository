import type { PlatformProvisionedGraph } from "../domain/platform/platform-administration.js";
import type { PlatformProvisioningResult, TemporaryCredentialDescriptor } from "../application/platform/provisioning-contract.js";
import type { IdempotencyRecord, Transaction } from "./contracts.js";

export interface PlatformTransaction extends Transaction {
  query<T = unknown>(text: string, values?: readonly unknown[]): Promise<{ rows: T[] }>;
}

export interface PlatformAdministrationPersistence {
  provisionAtomic(input: {
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
  }): Promise<PlatformProvisioningResult>;

  findProvisioningIdempotency(
    key: string,
    commandName: "platform.tenants.provision",
    requestHash: string
  ): Promise<PlatformProvisioningResult | null>;
}
