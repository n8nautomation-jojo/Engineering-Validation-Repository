import type { SyncConflict } from "../domain/sync/conflict.js";

export interface ConflictRecord {
  readonly conflict: SyncConflict;
  readonly requestFingerprint?: string;
  readonly resolvedAt?: string;
}

export interface ConflictStore {
  get(id:string): Promise<ConflictRecord | null>;
  put(record:ConflictRecord): Promise<void>;
  markResolved(id:string, record:ConflictRecord): Promise<void>;
}

export class InMemoryConflictStore implements ConflictStore {
  private readonly records = new Map<string,ConflictRecord>();

  async get(id:string):Promise<ConflictRecord|null> {
    return this.records.get(id) ?? null;
  }

  async put(record:ConflictRecord):Promise<void> {
    if (this.records.has(record.conflict.id)) throw new Error("CONFLICT_ALREADY_EXISTS");
    this.records.set(record.conflict.id,Object.freeze({...record}));
  }

  async markResolved(id:string,record:ConflictRecord):Promise<void> {
    if (!this.records.has(id)) throw new Error("CONFLICT_NOT_FOUND");
    this.records.set(id,Object.freeze({...record}));
  }
}
