import type { DatabaseSync } from "node:sqlite";
import type { RequestContext } from "../../application/context.js";
import type { OutboxEvent, OutboxStore } from "../outbox.js";

interface OutboxRow {
  event_id: string;
  event_type: string;
  aggregate_id: string;
  aggregate_version: number;
  occurred_at: string;
  tenant_id: string;
  organization_id: string;
  branch_id: string | null;
  device_id: string | null;
  correlation_id: string;
  payload: string;
  status: string;
}

export class SqliteOutboxStore implements OutboxStore {
  constructor(private readonly db: DatabaseSync) {
    this.ensureSchema();
  }

  private ensureSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS outbox_events (
        event_id TEXT PRIMARY KEY,
        event_type TEXT NOT NULL,
        aggregate_id TEXT NOT NULL,
        aggregate_version INTEGER NOT NULL,
        occurred_at TEXT NOT NULL,
        tenant_id TEXT NOT NULL,
        organization_id TEXT NOT NULL,
        branch_id TEXT,
        device_id TEXT,
        correlation_id TEXT NOT NULL,
        payload TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'PENDING'
      );
      CREATE INDEX IF NOT EXISTS ix_outbox_events_status_time ON outbox_events(status, occurred_at);
    `);
  }

  async append(event: OutboxEvent, _context: RequestContext): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO outbox_events (
        event_id, event_type, aggregate_id, aggregate_version,
        occurred_at, tenant_id, organization_id, branch_id,
        device_id, correlation_id, payload, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      event.eventId,
      event.eventType,
      event.aggregateId,
      event.aggregateVersion,
      event.occurredAt,
      event.tenantId,
      event.organizationId,
      event.branchId ?? null,
      event.deviceId ?? null,
      event.correlationId,
      typeof event.payload === "string" ? event.payload : JSON.stringify(event.payload),
      event.status ?? "PENDING"
    );
  }

  async getPending(limit = 50): Promise<readonly OutboxEvent[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM outbox_events
      WHERE status = 'PENDING'
      ORDER BY occurred_at ASC
      LIMIT ?
    `);

    const rows = stmt.all(limit) as unknown as OutboxRow[];
    return rows.map((r) => this.mapRow(r));
  }

  async markDispatched(eventId: string): Promise<void> {
    const stmt = this.db.prepare(`
      UPDATE outbox_events
      SET status = 'DISPATCHED'
      WHERE event_id = ?
    `);
    stmt.run(eventId);
  }

  async markFailed(eventId: string, _reason: string): Promise<void> {
    const stmt = this.db.prepare(`
      UPDATE outbox_events
      SET status = 'FAILED'
      WHERE event_id = ?
    `);
    stmt.run(eventId);
  }

  async getAll(): Promise<readonly OutboxEvent[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM outbox_events
      ORDER BY occurred_at ASC
    `);
    const rows = stmt.all() as unknown as OutboxRow[];
    return rows.map((r) => this.mapRow(r));
  }

  private mapRow(r: OutboxRow): OutboxEvent {
    let parsedPayload: unknown;
    try {
      parsedPayload = JSON.parse(r.payload);
    } catch {
      parsedPayload = r.payload;
    }

    return {
      eventId: r.event_id,
      eventType: r.event_type,
      aggregateId: r.aggregate_id,
      aggregateVersion: r.aggregate_version,
      occurredAt: r.occurred_at,
      tenantId: r.tenant_id,
      organizationId: r.organization_id,
      ...(r.branch_id ? { branchId: r.branch_id } : {}),
      ...(r.device_id ? { deviceId: r.device_id } : {}),
      correlationId: r.correlation_id,
      payload: parsedPayload,
      status: r.status
    };
  }
}
