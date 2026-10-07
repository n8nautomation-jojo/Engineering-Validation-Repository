import type { AuditRecord, AuditStore } from "../persistence/contracts.js";

export interface ImmutableAuditStore extends AuditStore {
  append(record:AuditRecord):Promise<void>;
}

export function createAuditRecord(input:AuditRecord):AuditRecord {
  return Object.freeze({...input});
}
