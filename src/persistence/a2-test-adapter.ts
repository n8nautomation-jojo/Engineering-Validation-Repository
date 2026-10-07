import type { ConflictResolutionRequest } from "../application/sync/conflict-resolution.js";
import type { ConflictRecord } from "../infrastructure/conflict-store.js";
import type { AuditRecord, ConflictResolutionPersistence, ConflictResolutionUnitOfWork } from "./contracts.js";

export class InMemoryConflictResolutionUnitOfWork implements ConflictResolutionUnitOfWork {
  private records = new Map<string, ConflictRecord>();
  public audits: AuditRecord[] = [];
  public committed = 0;
  public rolledBack = 0;

  async execute<T>(
    _request: ConflictResolutionRequest,
    operation: (persistence: ConflictResolutionPersistence) => Promise<T>,
  ): Promise<T> {
    const staged = new Map(this.records);
    const stagedAudits = [...this.audits];

    const persistence: ConflictResolutionPersistence = {
      findConflict: async id => staged.get(id) ?? null,
      insertConflict: async record => {
        if (staged.has(record.conflict.id)) throw new Error("CONFLICT_ALREADY_EXISTS");
        staged.set(record.conflict.id, record);
      },
      updateConflict: async (id, record) => {
        if (!staged.has(id)) throw new Error("CONFLICT_NOT_FOUND");
        staged.set(id, record);
      },
      findResolutionFingerprint: async id => staged.get(id)?.requestFingerprint ?? null,
      appendAudit: async record => {
        stagedAudits.push(Object.freeze({ ...record }));
      },
    };

    try {
      const result = await operation(persistence);
      this.records = staged;
      this.audits = stagedAudits;
      this.committed++;
      return result;
    } catch (error) {
      this.rolledBack++;
      throw error;
    }
  }

  getConflict(id: string): ConflictRecord | null {
    return this.records.get(id) ?? null;
  }
}
