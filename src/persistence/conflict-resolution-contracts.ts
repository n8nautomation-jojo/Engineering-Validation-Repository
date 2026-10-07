import type { ConflictResolutionDecision, ConflictResolutionRequest } from "../application/sync/conflict-resolution.js";
import type { AuditRecord, ConflictResolutionPersistence, ConflictResolutionUnitOfWork } from "./contracts.js";

export type { ConflictResolutionPersistence, ConflictResolutionUnitOfWork };
export type { ConflictResolutionRequest, AuditRecord };

export interface TransactionalResolutionResult {
  readonly replayed: boolean;
  readonly decision: ConflictResolutionDecision;
}

// Compatibility module: contracts.ts is the canonical persistence contract source.
