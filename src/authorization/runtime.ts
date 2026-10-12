import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import type { Capability } from "./capabilities.js";
import { OFFLINE_CLASS } from "./capabilities.js";
import type {
  AuthorizationAssignment,
  AuthorizationRequest,
  AuthorizationDecision,
  AuthorizationSnapshot
} from "./policy.js";
import { authorize } from "./engine.js";
import {
  createAuthorizationSnapshot,
  verifySnapshotSignature,
  revokeAuthorizationSnapshot
} from "./snapshot.js";
import { toAuthorizationAuditEvent } from "./audit.js";
import type { AuditRecord } from "../persistence/contracts.js";
import type { DeviceId, OrganizationId, TenantId, UserId } from "../kernel/types.js";

export interface AuthorizationSnapshotStore {
  saveSnapshot(snapshot: AuthorizationSnapshot): Promise<void>;
  getSnapshot(snapshotId: string): Promise<AuthorizationSnapshot | null>;
  revokeSnapshot(snapshotId: string, revokedAt?: string): Promise<void>;
  findActiveSnapshot(userId: string, deviceId: string, now: string): Promise<AuthorizationSnapshot | null>;
}

export interface AuthorizationAuditSink {
  appendAudit(record: AuditRecord): Promise<void>;
}

export class SqliteAuthorizationSnapshotStore implements AuthorizationSnapshotStore {
  constructor(private readonly db: DatabaseSync) {
    this.ensureSchema();
  }

  private ensureSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS authorization_snapshots (
        snapshot_id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        device_id TEXT NOT NULL,
        tenant_id TEXT NOT NULL,
        organization_id TEXT NOT NULL,
        version INTEGER NOT NULL,
        issued_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        signature TEXT NOT NULL,
        revoked INTEGER NOT NULL DEFAULT 0,
        revoked_at TEXT,
        assignments_json TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_auth_snapshots_user_dev 
        ON authorization_snapshots (user_id, device_id, revoked, expires_at);
    `);
  }

  async saveSnapshot(snapshot: AuthorizationSnapshot): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO authorization_snapshots (
        snapshot_id, user_id, device_id, tenant_id, organization_id,
        version, issued_at, expires_at, signature, revoked, revoked_at, assignments_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      snapshot.snapshotId,
      snapshot.userId,
      snapshot.deviceId,
      snapshot.tenantId ?? "",
      snapshot.organizationId ?? "",
      snapshot.version,
      snapshot.issuedAt,
      snapshot.expiresAt,
      snapshot.signature ?? "",
      snapshot.revoked ? 1 : 0,
      null,
      JSON.stringify(snapshot.assignments)
    );
  }

  async getSnapshot(snapshotId: string): Promise<AuthorizationSnapshot | null> {
    const row = this.db.prepare(`
      SELECT * FROM authorization_snapshots WHERE snapshot_id = ?
    `).get(snapshotId) as {
      snapshot_id: string; user_id: string; device_id: string;
      tenant_id: string; organization_id: string; version: number;
      issued_at: string; expires_at: string; signature: string;
      revoked: number; revoked_at: string | null; assignments_json: string;
    } | undefined;

    if (!row) return null;
    return this.mapRow(row);
  }

  async revokeSnapshot(snapshotId: string, revokedAt?: string): Promise<void> {
    const ts = revokedAt ?? new Date().toISOString();
    const result = this.db.prepare(`
      UPDATE authorization_snapshots SET revoked = 1, revoked_at = ? WHERE snapshot_id = ?
    `).run(ts, snapshotId);
    if (Number(result.changes) === 0) {
      throw new Error("SNAPSHOT_NOT_FOUND");
    }
  }

  async findActiveSnapshot(userId: string, deviceId: string, now: string): Promise<AuthorizationSnapshot | null> {
    const row = this.db.prepare(`
      SELECT * FROM authorization_snapshots 
      WHERE user_id = ? AND device_id = ? AND revoked = 0 AND issued_at <= ? AND expires_at >= ?
      ORDER BY version DESC LIMIT 1
    `).get(userId, deviceId, now, now) as {
      snapshot_id: string; user_id: string; device_id: string;
      tenant_id: string; organization_id: string; version: number;
      issued_at: string; expires_at: string; signature: string;
      revoked: number; revoked_at: string | null; assignments_json: string;
    } | undefined;

    if (!row) return null;
    return this.mapRow(row);
  }

  private mapRow(row: {
    snapshot_id: string; user_id: string; device_id: string;
    tenant_id: string; organization_id: string; version: number;
    issued_at: string; expires_at: string; signature: string;
    revoked: number; revoked_at: string | null; assignments_json: string;
  }): AuthorizationSnapshot {
    const assignments = JSON.parse(row.assignments_json) as readonly AuthorizationAssignment[];
    return Object.freeze({
      snapshotId: row.snapshot_id,
      userId: row.user_id,
      deviceId: row.device_id,
      version: Number(row.version),
      issuedAt: row.issued_at,
      expiresAt: row.expires_at,
      signature: row.signature,
      revoked: Boolean(row.revoked),
      integrityVerified: true,
      assignments,
      ...(row.tenant_id ? { tenantId: row.tenant_id } : {}),
      ...(row.organization_id ? { organizationId: row.organization_id } : {})
    });
  }
}

export interface PgClientLike {
  query(sql: string, params?: unknown[]): Promise<{ rows: any[]; rowCount?: number }>;
}

export class PostgresAuthorizationSnapshotStore implements AuthorizationSnapshotStore {
  constructor(private readonly clientOrPool: PgClientLike) {}

  async ensureSchema(): Promise<void> {
    await this.clientOrPool.query(`
      CREATE TABLE IF NOT EXISTS authorization_snapshots (
        snapshot_id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        device_id TEXT NOT NULL,
        tenant_id TEXT NOT NULL,
        organization_id TEXT NOT NULL,
        version INTEGER NOT NULL,
        issued_at TIMESTAMPTZ NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        signature TEXT NOT NULL,
        revoked BOOLEAN NOT NULL DEFAULT FALSE,
        revoked_at TIMESTAMPTZ,
        assignments_json JSONB NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_pg_auth_snapshots_user_dev 
        ON authorization_snapshots (user_id, device_id, revoked, expires_at);
    `);
  }

  async saveSnapshot(snapshot: AuthorizationSnapshot): Promise<void> {
    await this.clientOrPool.query(`
      INSERT INTO authorization_snapshots (
        snapshot_id, user_id, device_id, tenant_id, organization_id,
        version, issued_at, expires_at, signature, revoked, revoked_at, assignments_json
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (snapshot_id) DO UPDATE SET
        version = EXCLUDED.version,
        expires_at = EXCLUDED.expires_at,
        signature = EXCLUDED.signature,
        revoked = EXCLUDED.revoked,
        revoked_at = EXCLUDED.revoked_at,
        assignments_json = EXCLUDED.assignments_json
    `, [
      snapshot.snapshotId,
      snapshot.userId,
      snapshot.deviceId,
      snapshot.tenantId ?? "",
      snapshot.organizationId ?? "",
      snapshot.version,
      snapshot.issuedAt,
      snapshot.expiresAt,
      snapshot.signature ?? "",
      snapshot.revoked,
      null,
      JSON.stringify(snapshot.assignments)
    ]);
  }

  async getSnapshot(snapshotId: string): Promise<AuthorizationSnapshot | null> {
    const res = await this.clientOrPool.query(`
      SELECT * FROM authorization_snapshots WHERE snapshot_id = $1
    `, [snapshotId]);
    const row = res.rows[0];
    if (!row) return null;
    return this.mapRow(row);
  }

  async revokeSnapshot(snapshotId: string, revokedAt?: string): Promise<void> {
    const ts = revokedAt ?? new Date().toISOString();
    const res = await this.clientOrPool.query(`
      UPDATE authorization_snapshots SET revoked = TRUE, revoked_at = $1 WHERE snapshot_id = $2
    `, [ts, snapshotId]);
    if ((res.rowCount ?? 0) === 0) {
      throw new Error("SNAPSHOT_NOT_FOUND");
    }
  }

  async findActiveSnapshot(userId: string, deviceId: string, now: string): Promise<AuthorizationSnapshot | null> {
    const res = await this.clientOrPool.query(`
      SELECT * FROM authorization_snapshots 
      WHERE user_id = $1 AND device_id = $2 AND revoked = FALSE AND issued_at <= $3 AND expires_at >= $3
      ORDER BY version DESC LIMIT 1
    `, [userId, deviceId, now]);
    const row = res.rows[0];
    if (!row) return null;
    return this.mapRow(row);
  }

  private mapRow(row: any): AuthorizationSnapshot {
    const assignments = typeof row.assignments_json === "string"
      ? JSON.parse(row.assignments_json)
      : row.assignments_json;
    return Object.freeze({
      snapshotId: row.snapshot_id,
      userId: row.user_id,
      deviceId: row.device_id,
      version: Number(row.version),
      issuedAt: row.issued_at instanceof Date ? row.issued_at.toISOString() : String(row.issued_at),
      expiresAt: row.expires_at instanceof Date ? row.expires_at.toISOString() : String(row.expires_at),
      signature: row.signature,
      revoked: Boolean(row.revoked),
      integrityVerified: true,
      assignments,
      ...(row.tenant_id ? { tenantId: row.tenant_id } : {}),
      ...(row.organization_id ? { organizationId: row.organization_id } : {})
    });
  }
}

export const SENSITIVE_CAPABILITIES_REQUIRING_INDEPENDENT_APPROVAL: readonly Capability[] = [
  "inventory.adjust.approve",
  "sync.conflict.resolve",
  "cash.sessions.reconcile",
  "payments.verify.manual",
  "authorization.manage",
  "allocations.replenish"
];

export class AuthorizationRuntime {
  constructor(
    private readonly snapshotStore?: AuthorizationSnapshotStore,
    private readonly auditSink?: AuthorizationAuditSink,
    private readonly secretKey?: string
  ) {}

  async authorize(
    request: AuthorizationRequest,
    assignments: readonly AuthorizationAssignment[]
  ): Promise<AuthorizationDecision> {
    // 1. Inherent SoD guard check for sensitive capabilities requiring independent approval
    let effectiveRequest = request;
    if (!request.sod?.independentApprovalRequired) {
      if (SENSITIVE_CAPABILITIES_REQUIRING_INDEPENDENT_APPROVAL.includes(request.capability)) {
        if (request.reason?.startsWith("creator:") || (request as any).creatorUserId) {
          const creatorUserId = (request as any).creatorUserId ?? request.reason?.split("creator:")[1]?.trim();
          effectiveRequest = {
            ...request,
            sod: {
              independentApprovalRequired: true,
              creatorUserId
            }
          };
        }
      }
    }

    // 2. Perform authoritative engine evaluation
    const decision = authorize(effectiveRequest, assignments);

    // 3. Automated audit logging for sensitive decisions
    if (decision.auditRequired && this.auditSink) {
      const auditEvent = toAuthorizationAuditEvent({
        decision,
        actorUserId: request.context.userId,
        tenantId: request.context.tenantId,
        organizationId: request.context.organizationId,
        occurredAt: request.now,
        correlationId: (request as any).correlationId ?? randomUUID(),
        ...(request.context.deviceId ? { deviceId: request.context.deviceId } : {}),
        ...(request.context.branchId ? { branchId: request.context.branchId } : {}),
        ...(request.context.warehouseId ? { warehouseId: request.context.warehouseId } : {}),
        ...(request.resource ? { resource: JSON.stringify(request.resource) } : {})
      });

      const auditRecord: AuditRecord = {
        id: randomUUID(),
        occurredAt: auditEvent.occurredAt,
        actorId: auditEvent.actorUserId,
        action: `authorization.${decision.allowed ? "allowed" : "denied"}`,
        resourceType: "CAPABILITY",
        resourceId: auditEvent.capability,
        tenantId: auditEvent.tenantId,
        organizationId: auditEvent.organizationId,
        correlationId: auditEvent.correlationId,
        reason: auditEvent.reason,
        ...(auditEvent.branchId ? { branchId: auditEvent.branchId } : {}),
        ...(auditEvent.deviceId ? { deviceId: auditEvent.deviceId } : {}),
        after: {
          decision: auditEvent.decision,
          capability: auditEvent.capability,
          ...(auditEvent.policyVersion ? { policyVersion: auditEvent.policyVersion } : {}),
          ...(auditEvent.snapshotVersion !== undefined ? { snapshotVersion: auditEvent.snapshotVersion } : {}),
          ...(auditEvent.resource ? { resource: auditEvent.resource } : {})
        }
      };

      try {
        await this.auditSink.appendAudit(auditRecord);
      } catch {
        // Keep audit sink exceptions from breaking authorization flow if in disconnected fallback
      }
    }

    return decision;
  }

  async issueSnapshot(params: {
    snapshotId?: string;
    userId: UserId;
    deviceId: DeviceId;
    tenantId: TenantId;
    organizationId: OrganizationId;
    assignments: readonly AuthorizationAssignment[];
    issuedAt?: string;
    expiresAt?: string;
    durationMs?: number;
    version?: number;
  }): Promise<AuthorizationSnapshot> {
    const issuedAt = params.issuedAt ?? new Date().toISOString();
    const durationMs = params.durationMs ?? 24 * 60 * 60 * 1000;
    const expiresAt = params.expiresAt ?? new Date(Date.parse(issuedAt) + durationMs).toISOString();

    const snapshot = createAuthorizationSnapshot({
      snapshotId: params.snapshotId ?? randomUUID(),
      version: params.version ?? 1,
      issuedAt,
      expiresAt,
      deviceId: params.deviceId,
      userId: params.userId,
      tenantId: params.tenantId,
      organizationId: params.organizationId,
      assignments: params.assignments,
      ...(this.secretKey ? { secretKey: this.secretKey } : {})
    });

    if (this.snapshotStore) {
      await this.snapshotStore.saveSnapshot(snapshot);
    }

    if (this.auditSink) {
      await this.auditSink.appendAudit({
        id: randomUUID(),
        occurredAt: issuedAt,
        actorId: params.userId,
        action: "authorization.snapshot.issued",
        resourceType: "AUTHORIZATION_SNAPSHOT",
        resourceId: snapshot.snapshotId,
        tenantId: params.tenantId,
        organizationId: params.organizationId,
        deviceId: params.deviceId,
        correlationId: randomUUID(),
        reason: "Offline authorization snapshot issued",
        after: {
          snapshotId: snapshot.snapshotId,
          version: snapshot.version,
          expiresAt: snapshot.expiresAt,
          signature: snapshot.signature
        }
      });
    }

    return snapshot;
  }

  async revokeSnapshot(snapshotId: string, reason?: string, now?: string): Promise<void> {
    const ts = now ?? new Date().toISOString();
    if (this.snapshotStore) {
      await this.snapshotStore.revokeSnapshot(snapshotId, ts);
    }

    if (this.auditSink) {
      await this.auditSink.appendAudit({
        id: randomUUID(),
        occurredAt: ts,
        actorId: "system",
        action: "authorization.snapshot.revoked",
        resourceType: "AUTHORIZATION_SNAPSHOT",
        resourceId: snapshotId,
        tenantId: "unknown",
        organizationId: "unknown",
        correlationId: randomUUID(),
        reason: reason ?? "Revocation command executed",
        after: {
          snapshotId,
          revokedAt: ts
        }
      });
    }
  }

  verifySnapshot(
    snapshot: AuthorizationSnapshot,
    now: string,
    deviceId: DeviceId,
    userId: UserId
  ): { valid: boolean; reason?: string } {
    if (snapshot.userId !== userId) {
      return { valid: false, reason: "SNAPSHOT_USER_MISMATCH" };
    }
    if (snapshot.deviceId !== deviceId) {
      return { valid: false, reason: "SNAPSHOT_DEVICE_MISMATCH" };
    }
    if (snapshot.revoked) {
      return { valid: false, reason: "SNAPSHOT_REVOKED" };
    }
    if (snapshot.signature && !verifySnapshotSignature(snapshot, this.secretKey)) {
      return { valid: false, reason: "SNAPSHOT_INTEGRITY_COMPROMISED" };
    }
    const issued = Date.parse(snapshot.issuedAt);
    const expires = Date.parse(snapshot.expiresAt);
    const current = Date.parse(now);
    if (!Number.isFinite(issued) || !Number.isFinite(expires) || !Number.isFinite(current)) {
      return { valid: false, reason: "INVALID_TEMPORAL_WINDOW" };
    }
    if (current < issued || current > expires) {
      return { valid: false, reason: "SNAPSHOT_EXPIRED" };
    }
    return { valid: true };
  }
}
