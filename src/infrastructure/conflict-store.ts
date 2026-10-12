import { DatabaseSync } from "node:sqlite";
import type { SyncConflict } from "../domain/sync/conflict.js";
import {
  rowToRecord,
  type ConflictRow,
  sqliteConflictDialect,
  postgresConflictDialect
} from "./sql/conflict-resolution-unit-of-work.js";

export interface ConflictRecord {
  readonly conflict: SyncConflict;
  readonly requestFingerprint?: string;
  readonly resolvedAt?: string;
}

export interface ConflictStore {
  get(id: string): Promise<ConflictRecord | null>;
  put(record: ConflictRecord): Promise<void>;
  markResolved(id: string, record: ConflictRecord): Promise<void>;
}

export class InMemoryConflictStore implements ConflictStore {
  private readonly records = new Map<string, ConflictRecord>();

  async get(id: string): Promise<ConflictRecord | null> {
    return this.records.get(id) ?? null;
  }

  async put(record: ConflictRecord): Promise<void> {
    if (this.records.has(record.conflict.id)) throw new Error("CONFLICT_ALREADY_EXISTS");
    this.records.set(record.conflict.id, Object.freeze({ ...record }));
  }

  async markResolved(id: string, record: ConflictRecord): Promise<void> {
    if (!this.records.has(id)) throw new Error("CONFLICT_NOT_FOUND");
    this.records.set(id, Object.freeze({ ...record }));
  }
}

export class SqliteConflictStore implements ConflictStore {
  constructor(private readonly db: DatabaseSync) {}

  async get(id: string): Promise<ConflictRecord | null> {
    const row = this.db.prepare(`
      SELECT id, operation_id, conflict_type, severity, state, resolution_class,
             original_effect_ids, resulting_effect_ids, created_at, version,
             request_fingerprint, resolved_at
      FROM sync_conflicts WHERE id = ?
    `).get(id) as ConflictRow | undefined;
    if (!row) return null;
    return rowToRecord(row, sqliteConflictDialect);
  }

  async put(record: ConflictRecord): Promise<void> {
    const existing = await this.get(record.conflict.id);
    if (existing) throw new Error("CONFLICT_ALREADY_EXISTS");
    const stmt = this.db.prepare(`
      INSERT INTO sync_conflicts (
        id, operation_id, conflict_type, severity, state, resolution_class,
        original_effect_ids, resulting_effect_ids, created_at, version,
        request_fingerprint, resolved_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      record.conflict.id,
      record.conflict.operationId,
      record.conflict.type,
      record.conflict.severity,
      record.conflict.state,
      record.conflict.resolutionClass ?? null,
      JSON.stringify(record.conflict.originalEffectIds),
      JSON.stringify(record.conflict.resultingEffectIds),
      record.conflict.createdAt,
      record.conflict.version,
      record.requestFingerprint ?? null,
      record.resolvedAt ?? null
    );
  }

  async markResolved(id: string, record: ConflictRecord): Promise<void> {
    const existing = await this.get(id);
    if (!existing) throw new Error("CONFLICT_NOT_FOUND");
    const stmt = this.db.prepare(`
      UPDATE sync_conflicts
      SET operation_id = ?, conflict_type = ?, severity = ?, state = ?,
          resolution_class = ?, original_effect_ids = ?, resulting_effect_ids = ?,
          created_at = ?, version = ?, request_fingerprint = ?, resolved_at = ?
      WHERE id = ?
    `);
    stmt.run(
      record.conflict.operationId,
      record.conflict.type,
      record.conflict.severity,
      record.conflict.state,
      record.conflict.resolutionClass ?? null,
      JSON.stringify(record.conflict.originalEffectIds),
      JSON.stringify(record.conflict.resultingEffectIds),
      record.conflict.createdAt,
      record.conflict.version,
      record.requestFingerprint ?? null,
      record.resolvedAt ?? null,
      id
    );
  }
}

export interface PgQueryable {
  query(text: string, params?: readonly unknown[]): Promise<{ rows: any[]; rowCount?: number }>;
}

export class PostgresConflictStore implements ConflictStore {
  constructor(private readonly clientOrPool: PgQueryable) {}

  async get(id: string): Promise<ConflictRecord | null> {
    const res = await this.clientOrPool.query(
      "SELECT id, operation_id, conflict_type, severity, state, resolution_class, original_effect_ids, resulting_effect_ids, created_at, version, request_fingerprint, resolved_at FROM sync_conflicts WHERE id = $1",
      [id]
    );
    if (!res.rows[0]) return null;
    return rowToRecord(res.rows[0], postgresConflictDialect);
  }

  async put(record: ConflictRecord): Promise<void> {
    const existing = await this.get(record.conflict.id);
    if (existing) throw new Error("CONFLICT_ALREADY_EXISTS");
    await this.clientOrPool.query(
      `INSERT INTO sync_conflicts (
        id, operation_id, conflict_type, severity, state, resolution_class,
        original_effect_ids, resulting_effect_ids, created_at, version,
        request_fingerprint, resolved_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        record.conflict.id,
        record.conflict.operationId,
        record.conflict.type,
        record.conflict.severity,
        record.conflict.state,
        record.conflict.resolutionClass ?? null,
        JSON.stringify(record.conflict.originalEffectIds),
        JSON.stringify(record.conflict.resultingEffectIds),
        record.conflict.createdAt,
        record.conflict.version,
        record.requestFingerprint ?? null,
        record.resolvedAt ?? null
      ]
    );
  }

  async markResolved(id: string, record: ConflictRecord): Promise<void> {
    const res = await this.clientOrPool.query(
      `UPDATE sync_conflicts
       SET operation_id = $1, conflict_type = $2, severity = $3, state = $4,
           resolution_class = $5, original_effect_ids = $6, resulting_effect_ids = $7,
           created_at = $8, version = $9, request_fingerprint = $10, resolved_at = $11
       WHERE id = $12`,
      [
        record.conflict.operationId,
        record.conflict.type,
        record.conflict.severity,
        record.conflict.state,
        record.conflict.resolutionClass ?? null,
        JSON.stringify(record.conflict.originalEffectIds),
        JSON.stringify(record.conflict.resultingEffectIds),
        record.conflict.createdAt,
        record.conflict.version,
        record.requestFingerprint ?? null,
        record.resolvedAt ?? null,
        id
      ]
    );
    if (Number(res.rowCount ?? 0) !== 1) throw new Error("CONFLICT_NOT_FOUND");
  }
}
