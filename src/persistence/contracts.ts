import type { RequestContext } from "../application/context.js";
import type { ConflictRecord } from "../infrastructure/conflict-store.js";
import type { ConflictResolutionRequest } from "../application/sync/conflict-resolution.js";

export interface Transaction {
  readonly id: string;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}
export interface TransactionManager { begin(context: RequestContext): Promise<Transaction>; }
export interface VersionedRecord { readonly id: string; readonly version: number; }
export interface VersionedRepository<T extends VersionedRecord> {
  get(id: string): Promise<T | null>;
  insert(record: T): Promise<void>;
  update(record: T, expectedVersion: number): Promise<void>;
}
export interface IdempotencyRecord {
  readonly key: string; readonly commandName: string; readonly requestHash: string;
  readonly responseStatus: number; readonly responseBody: unknown; readonly createdAt: string;
}
export interface IdempotencyStore {
  find(key: string, commandName: string): Promise<IdempotencyRecord | null>;
  put(record: IdempotencyRecord): Promise<void>;
}
export interface AuditRecord {
  readonly id: string; readonly occurredAt: string; readonly actorId: string; readonly action: string;
  readonly resourceType: string; readonly resourceId: string; readonly tenantId: string;
  readonly organizationId: string; readonly branchId?: string; readonly deviceId?: string;
  readonly correlationId: string; readonly reason?: string; readonly before?: unknown; readonly after?: unknown;
}
export interface AuditStore { append(record: AuditRecord): Promise<void>; }

export interface ConflictResolutionPersistence {
  findConflict(id: string): Promise<ConflictRecord | null>;
  insertConflict(record: ConflictRecord): Promise<void>;
  updateConflict(id: string, record: ConflictRecord): Promise<void>;
  findResolutionFingerprint(conflictId: string): Promise<string | null>;
  appendAudit(record: AuditRecord): Promise<void>;
}

export interface ConflictResolutionUnitOfWork {
  execute<T>(request: ConflictResolutionRequest, operation: (persistence: ConflictResolutionPersistence) => Promise<T>): Promise<T>;
}
