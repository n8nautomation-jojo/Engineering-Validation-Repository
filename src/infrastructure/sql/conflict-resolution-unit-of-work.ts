import { DatabaseSync } from "node:sqlite";
import type { SyncConflict } from "../../domain/sync/conflict.js";
import type { ConflictResolutionRequest } from "../../application/sync/conflict-resolution.js";
import type { ConflictRecord } from "../conflict-store.js";
import type { AuditRecord, ConflictResolutionPersistence, ConflictResolutionUnitOfWork, IdempotencyRecord } from "../../persistence/contracts.js";

export interface SqlQueryResult<T = Record<string, unknown>> {
  rows: T[];
  rowCount: number;
}

export interface SqlTransaction {
  query<T = Record<string, unknown>>(sql: string, params?: readonly unknown[]): Promise<SqlQueryResult<T>>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

export interface SqlConnection {
  beginTransaction(): Promise<SqlTransaction>;
}

export interface ConflictResolutionSqlDialect {
  placeholder(index: number): string;
  json(value: unknown): unknown;
  parseJson(value: unknown): unknown;
  timestamps(value: string): unknown;
}

export const postgresConflictDialect: ConflictResolutionSqlDialect = {
  placeholder(index: number): string { return `$${index}`; },
  json(value: unknown): unknown { return value !== undefined && value !== null ? JSON.stringify(value) : null; },
  parseJson(value: unknown): unknown { return typeof value === "string" ? JSON.parse(value) : value; },
  timestamps(value: string): unknown { return value; }
};

export const sqliteConflictDialect: ConflictResolutionSqlDialect = {
  placeholder(_index: number): string { return "?"; },
  json(value: unknown): unknown { return value !== undefined && value !== null ? JSON.stringify(value) : null; },
  parseJson(value: unknown): unknown { return typeof value === "string" ? JSON.parse(value) : (value ?? []); },
  timestamps(value: string): unknown { return value; }
};

export type ConflictRow = {
  id: string;
  operation_id: string;
  conflict_type: string;
  severity: string;
  state: string;
  resolution_class: string | null;
  original_effect_ids: unknown;
  resulting_effect_ids: unknown;
  created_at: string | Date;
  version: number;
  request_fingerprint: string | null;
  resolved_at: string | Date | null;
};

export function rowToRecord(row: ConflictRow, dialect: ConflictResolutionSqlDialect): ConflictRecord {
  const conflict: Record<string, unknown> = {
    id: row.id,
    operationId: row.operation_id,
    type: row.conflict_type,
    severity: row.severity,
    state: row.state,
    originalEffectIds: dialect.parseJson(row.original_effect_ids),
    resultingEffectIds: dialect.parseJson(row.resulting_effect_ids),
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : (row.created_at as string),
    version: Number(row.version)
  };
  if (row.resolution_class) {
    conflict.resolutionClass = row.resolution_class;
  }
  const record: ConflictRecord = {
    conflict: conflict as unknown as SyncConflict
  };
  if (row.request_fingerprint !== null) {
    (record as { requestFingerprint?: string }).requestFingerprint = row.request_fingerprint;
  }
  if (row.resolved_at !== null) {
    (record as { resolvedAt?: string }).resolvedAt = row.resolved_at instanceof Date ? row.resolved_at.toISOString() : (row.resolved_at as string);
  }
  return record;
}

export class SqlConflictResolutionUnitOfWork implements ConflictResolutionUnitOfWork {
  constructor(
    private readonly connection: SqlConnection,
    private readonly dialect: ConflictResolutionSqlDialect
  ) {}

  async execute<T>(_request: ConflictResolutionRequest, operation: (p: ConflictResolutionPersistence) => Promise<T>): Promise<T> {
    const tx = await this.connection.beginTransaction();
    const persistence = new SqlConflictResolutionPersistence(tx, this.dialect);
    try {
      const result = await operation(persistence);
      await tx.commit();
      return result;
    } catch (error) {
      await tx.rollback();
      throw error;
    }
  }
}

export class SqlConflictResolutionPersistence implements ConflictResolutionPersistence {
  constructor(
    private readonly tx: SqlTransaction,
    private readonly dialect: ConflictResolutionSqlDialect
  ) {}

  async findConflict(id: string): Promise<ConflictRecord | null> {
    const r = await this.tx.query<ConflictRow>(
      "SELECT id, operation_id, conflict_type, severity, state, resolution_class, original_effect_ids, resulting_effect_ids, created_at, version, request_fingerprint, resolved_at FROM sync_conflicts WHERE id = " + this.dialect.placeholder(1),
      [id]
    );
    return r.rows[0] ? rowToRecord(r.rows[0], this.dialect) : null;
  }

  async insertConflict(record: ConflictRecord): Promise<void> {
    const values = [
      record.conflict.id,
      record.conflict.operationId,
      record.conflict.type,
      record.conflict.severity,
      record.conflict.state,
      record.conflict.resolutionClass ?? null,
      this.dialect.json(record.conflict.originalEffectIds),
      this.dialect.json(record.conflict.resultingEffectIds),
      this.dialect.timestamps(record.conflict.createdAt),
      record.conflict.version,
      record.requestFingerprint ?? null,
      record.resolvedAt ? this.dialect.timestamps(record.resolvedAt) : null
    ];
    const ps = values.map((_, i) => this.dialect.placeholder(i + 1)).join(", ");
    await this.tx.query(
      `INSERT INTO sync_conflicts (id, operation_id, conflict_type, severity, state, resolution_class, original_effect_ids, resulting_effect_ids, created_at, version, request_fingerprint, resolved_at) VALUES (${ps})`,
      values
    );
  }

  async updateConflict(id: string, record: ConflictRecord): Promise<void> {
    const values = [
      record.conflict.operationId,
      record.conflict.type,
      record.conflict.severity,
      record.conflict.state,
      record.conflict.resolutionClass ?? null,
      this.dialect.json(record.conflict.originalEffectIds),
      this.dialect.json(record.conflict.resultingEffectIds),
      this.dialect.timestamps(record.conflict.createdAt),
      record.conflict.version,
      record.requestFingerprint ?? null,
      record.resolvedAt ? this.dialect.timestamps(record.resolvedAt) : null,
      id
    ];
    const ps = values.map((_, i) => this.dialect.placeholder(i + 1));
    const r = await this.tx.query(
      `UPDATE sync_conflicts SET operation_id=${ps[0]}, conflict_type=${ps[1]}, severity=${ps[2]}, state=${ps[3]}, resolution_class=${ps[4]}, original_effect_ids=${ps[5]}, resulting_effect_ids=${ps[6]}, created_at=${ps[7]}, version=${ps[8]}, request_fingerprint=${ps[9]}, resolved_at=${ps[10]} WHERE id=${ps[11]}`,
      values
    );
    if (r.rowCount !== 1) throw new Error("CONFLICT_NOT_FOUND");
  }

  async findResolutionFingerprint(conflictId: string): Promise<string | null> {
    const r = await this.tx.query<{ request_fingerprint: string | null }>(
      "SELECT request_fingerprint FROM sync_conflicts WHERE id = " + this.dialect.placeholder(1),
      [conflictId]
    );
    return r.rows[0]?.request_fingerprint ?? null;
  }

  async appendAudit(record: AuditRecord): Promise<void> {
    const values = [
      record.id,
      this.dialect.timestamps(record.occurredAt),
      record.actorId,
      record.action,
      record.resourceType,
      record.resourceId,
      record.tenantId,
      record.organizationId,
      record.branchId ?? null,
      record.deviceId ?? null,
      record.correlationId,
      record.reason ?? null,
      record.before !== undefined && record.before !== null ? this.dialect.json(record.before) : null,
      record.after !== undefined && record.after !== null ? this.dialect.json(record.after) : null
    ];
    const ps = values.map((_, i) => this.dialect.placeholder(i + 1)).join(", ");
    await this.tx.query(
      `INSERT INTO audit_records (id, occurred_at, actor_id, action, resource_type, resource_id, tenant_id, organization_id, branch_id, device_id, correlation_id, reason, before_json, after_json) VALUES (${ps})`,
      values
    );
  }

  async saveIdempotency(record: IdempotencyRecord): Promise<void> {
    const values = [
      record.key,
      record.commandName,
      record.requestHash,
      record.responseStatus,
      record.responseBody !== undefined && record.responseBody !== null ? this.dialect.json(record.responseBody) : null,
      this.dialect.timestamps(record.createdAt)
    ];
    const ps = values.map((_, i) => this.dialect.placeholder(i + 1)).join(", ");
    await this.tx.query(
      `INSERT INTO idempotency_records (key, command_name, request_hash, response_status, response_body, created_at) VALUES (${ps})`,
      values
    );
  }

  async findIdempotency(key: string, commandName: string): Promise<IdempotencyRecord | null> {
    const ps1 = this.dialect.placeholder(1);
    const ps2 = this.dialect.placeholder(2);
    const res = await this.tx.query<{
      key: string; command_name: string; request_hash: string;
      response_status: number; response_body: unknown; created_at: string | Date;
    }>(
      `SELECT key, command_name, request_hash, response_status, response_body, created_at FROM idempotency_records WHERE key = ${ps1} AND command_name = ${ps2}`,
      [key, commandName]
    );
    const row = res.rows[0];
    if (!row) return null;
    return {
      key: row.key,
      commandName: row.command_name,
      requestHash: row.request_hash,
      responseStatus: Number(row.response_status),
      responseBody: this.dialect.parseJson(row.response_body),
      createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : (row.created_at as string)
    };
  }
}

export class SqliteConflictResolutionUnitOfWork implements ConflictResolutionUnitOfWork {
  constructor(private readonly db: DatabaseSync) {}

  async execute<T>(request: ConflictResolutionRequest, operation: (p: ConflictResolutionPersistence) => Promise<T>): Promise<T> {
    const db = this.db;
    const connection: SqlConnection = {
      async beginTransaction(): Promise<SqlTransaction> {
        let active = true;
        db.exec("BEGIN");
        return {
          async query<R = Record<string, unknown>>(sql: string, params: readonly unknown[] = []): Promise<SqlQueryResult<R>> {
            const stmt = db.prepare(sql);
            const rows = stmt.all(...(params as any[])) as R[];
            return { rows, rowCount: rows.length };
          },
          async commit(): Promise<void> {
            if (active) {
              db.exec("COMMIT");
              active = false;
            }
          },
          async rollback(): Promise<void> {
            if (active) {
              db.exec("ROLLBACK");
              active = false;
            }
          }
        };
      }
    };
    const uow = new SqlConflictResolutionUnitOfWork(connection, sqliteConflictDialect);
    return uow.execute(request, operation);
  }
}

export interface PgPoolLike {
  connect(): Promise<{
    query(sql: string, params?: unknown[]): Promise<{ rows: any[]; rowCount?: number }>;
    release(): void;
  }>;
}

export class PostgresConflictResolutionUnitOfWork implements ConflictResolutionUnitOfWork {
  constructor(private readonly pool: PgPoolLike) {}

  async execute<T>(request: ConflictResolutionRequest, operation: (p: ConflictResolutionPersistence) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    let inTx = true;
    try {
      await client.query("BEGIN");
      const tx: SqlTransaction = {
        async query<R = Record<string, unknown>>(sql: string, params: readonly unknown[] = []): Promise<SqlQueryResult<R>> {
          const res = await client.query(sql, params as unknown[]);
          return { rows: res.rows as R[], rowCount: res.rowCount ?? res.rows.length };
        },
        async commit(): Promise<void> {
          if (inTx) {
            await client.query("COMMIT");
            inTx = false;
          }
        },
        async rollback(): Promise<void> {
          if (inTx) {
            await client.query("ROLLBACK");
            inTx = false;
          }
        }
      };
      const persistence = new SqlConflictResolutionPersistence(tx, postgresConflictDialect);
      const result = await operation(persistence);
      if (inTx) {
        await tx.commit();
      }
      return result;
    } catch (error) {
      if (inTx) {
        try {
          await client.query("ROLLBACK");
        } catch {
          // ignore rollback error
        }
        inTx = false;
      }
      throw error;
    } finally {
      client.release();
    }
  }
}
