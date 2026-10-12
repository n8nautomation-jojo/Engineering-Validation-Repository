import type { SalesPersistence, SalesExecutionPlan } from "../../persistence/sales-contracts.js";
import type { Batch } from "../../domain/inventory/batch.js";
import type { OfflineSafetyAllocation } from "../../domain/inventory/offline-allocation.js";
import type { OutboxEvent } from "../outbox.js";
import type { AuditRecord, IdempotencyRecord } from "../../persistence/contracts.js";
import type { InventoryTransaction, StockMovement } from "../../domain/inventory/inventory-transaction.js";
import type { SaleLine } from "../../domain/sales/sale.js";
import type { Payment } from "../../domain/sales/payment.js";
import { money } from "../../kernel/money.js";
import { quantity } from "../../kernel/quantity.js";

export interface PostgresQueryable {
  query<T = unknown>(text: string, values?: readonly unknown[]): Promise<{ rows: T[]; rowCount?: number | null }>;
}

export interface PostgresPoolLike extends PostgresQueryable {
  connect(): Promise<PostgresClientLike>;
}

export interface PostgresClientLike extends PostgresQueryable {
  release(): void;
}

type BatchRow = {
  id: string; organization_id: string; warehouse_id: string; product_id: string;
  batch_number: string; expiry_date: string; quantity: string | number; status: string; version: number;
};

type AllocationRow = {
  id: string; branch_id: string; warehouse_id: string; device_id: string; product_id: string;
  allocated_capacity: string | number; consumed_capacity: string | number; released_capacity: string | number;
  state: string; version: number;
  issued_at?: Date | string | null; valid_from?: Date | string | null; expires_at?: Date | string | null;
};

type OutboxRow = {
  event_id: string; event_type: string; aggregate_id: string; aggregate_version: number;
  occurred_at: string | Date; tenant_id: string; organization_id: string; branch_id: string | null;
  device_id: string | null; correlation_id: string; payload: unknown; status: string;
};

type AuditRow = {
  id: string; occurred_at: string | Date; actor_id: string; action: string; resource_type: string;
  resource_id: string; tenant_id: string; organization_id: string; branch_id: string | null;
  device_id: string | null; correlation_id: string; reason: string | null; before_json: unknown; after_json: unknown;
};

function formatTimestamp(value: string | Date): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  return String(value);
}

function parseJsonField<T = unknown>(field: unknown): T {
  if (field === null || field === undefined) return null as unknown as T;
  if (typeof field === "string") {
    return JSON.parse(field) as T;
  }
  return field as T;
}

export class PostgresSalesPersistence implements SalesPersistence {
  constructor(private readonly db: PostgresQueryable | PostgresPoolLike) {}

  private isPool(target: PostgresQueryable | PostgresPoolLike): target is PostgresPoolLike {
    return typeof (target as PostgresPoolLike).connect === "function";
  }

  private async withTransaction<T>(fn: (client: PostgresQueryable) => Promise<T>): Promise<T> {
    if (this.isPool(this.db)) {
      const client = await this.db.connect();
      try {
        await client.query("BEGIN");
        const result = await fn(client);
        await client.query("COMMIT");
        return result;
      } catch (error) {
        try {
          await client.query("ROLLBACK");
        } catch {
          // ignore rollback failure if connection was lost
        }
        throw error;
      } finally {
        client.release();
      }
    } else {
      await this.db.query("BEGIN");
      try {
        const result = await fn(this.db);
        await this.db.query("COMMIT");
        return result;
      } catch (error) {
        try {
          await this.db.query("ROLLBACK");
        } catch {
          // ignore rollback failure
        }
        throw error;
      }
    }
  }

  async findIdempotency(key: string, commandName: string): Promise<IdempotencyRecord | null> {
    const res = await this.db.query<{
      key: string; command_name: string; request_hash: string; response_status: number;
      response_body: unknown; created_at: string | Date;
    }>(
      "SELECT key, command_name, request_hash, response_status, response_body, created_at FROM idempotency_records WHERE key = $1 AND command_name = $2",
      [key, commandName]
    );
    const row = res.rows[0];
    if (!row) return null;
    return {
      key: row.key,
      commandName: row.command_name,
      requestHash: row.request_hash,
      responseStatus: row.response_status,
      responseBody: parseJsonField(row.response_body),
      createdAt: formatTimestamp(row.created_at)
    };
  }

  async findBatchesForProduct(warehouseId: string, productId: string): Promise<readonly Batch[]> {
    const res = await this.db.query<BatchRow>(
      "SELECT id, organization_id, warehouse_id, product_id, batch_number, expiry_date, quantity, status, version FROM batches WHERE warehouse_id = $1 AND product_id = $2 AND status IN ('ACTIVE', 'NEAR_EXPIRY') AND quantity > 0 ORDER BY expiry_date ASC, id ASC",
      [warehouseId, productId]
    );
    return res.rows.map(r => ({
      id: r.id,
      organizationId: r.organization_id,
      warehouseId: r.warehouse_id,
      productId: r.product_id,
      batchNumber: r.batch_number,
      expiryDate: r.expiry_date,
      quantity: quantity(Number(r.quantity)),
      status: r.status as Batch["status"],
      version: Number(r.version)
    }));
  }

  async findOfflineAllocation(branchId: string, deviceId: string, productId: string): Promise<OfflineSafetyAllocation | null> {
    const res = await this.db.query<AllocationRow>(
      "SELECT id, branch_id, warehouse_id, device_id, product_id, allocated_capacity, consumed_capacity, released_capacity, state, version, issued_at, valid_from, expires_at FROM offline_allocations WHERE branch_id = $1 AND device_id = $2 AND product_id = $3 AND state = 'ACTIVE'",
      [branchId, deviceId, productId]
    );
    const row = res.rows[0];
    if (!row) return null;
    return {
      id: row.id,
      branchId: row.branch_id,
      warehouseId: row.warehouse_id,
      deviceId: row.device_id,
      productId: row.product_id,
      allocatedCapacity: Number(row.allocated_capacity),
      consumedCapacity: Number(row.consumed_capacity),
      releasedCapacity: Number(row.released_capacity),
      state: row.state as OfflineSafetyAllocation["state"],
      version: Number(row.version),
      issuedAt: row.issued_at instanceof Date ? row.issued_at.toISOString() : (row.issued_at ?? ""),
      validFrom: row.valid_from instanceof Date ? row.valid_from.toISOString() : (row.valid_from ?? ""),
      expiresAt: row.expires_at instanceof Date ? row.expires_at.toISOString() : (row.expires_at ?? "")
    };
  }

  async executeSaleAtomic(plan: SalesExecutionPlan): Promise<void> {
    await this.withTransaction(async client => {
      // 0. Acquire locks on all required batch rows upfront in deterministic global order
      // Aggregates requested deductions per batchId to handle duplicate batch entries safely.
      // Acquiring FOR UPDATE before child foreign-key inserts (sale_lines, stock_movements)
      // prevents PostgreSQL foreign-key ShareLock deadlocks (40P01).
      const aggregatedBatchDeductions = new Map<string, number>();
      for (const b of plan.batchDeductions) {
        const cur = aggregatedBatchDeductions.get(b.batchId) ?? 0;
        aggregatedBatchDeductions.set(b.batchId, cur + b.quantity);
      }

      const txDate = (plan.now ?? plan.sale?.createdAt ?? new Date().toISOString()).slice(0, 10);
      const sortedBatchIds = Array.from(aggregatedBatchDeductions.keys()).sort();
      for (const batchId of sortedBatchIds) {
        const requiredQty = aggregatedBatchDeductions.get(batchId)!;
        const res = await client.query<{ quantity: string | number; status: string; expiry_date: string }>(
          "SELECT quantity, status, expiry_date FROM batches WHERE id = $1 FOR UPDATE",
          [batchId]
        );
        const row = res.rows[0];
        if (
          !row ||
          (row.status !== "ACTIVE" && row.status !== "NEAR_EXPIRY") ||
          (row.expiry_date && row.expiry_date <= txDate) ||
          Number(row.quantity) < requiredQty
        ) {
          throw new Error("STALE_BATCH_OR_INSUFFICIENT_STOCK");
        }
      }

      // 1. Sale
      await client.query(`
        INSERT INTO sales (
          id, tenant_id, organization_id, branch_id, warehouse_id, device_id,
          cash_session_id, status, currency, total_amount, created_at, version,
          idempotency_key, correlation_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      `, [
        plan.sale.id,
        plan.tenantId,
        plan.sale.organizationId,
        plan.sale.branchId,
        plan.warehouseId,
        plan.sale.deviceId,
        plan.sale.cashSessionId,
        plan.sale.status,
        plan.currency,
        plan.totalAmount,
        plan.sale.createdAt,
        plan.sale.version,
        plan.idempotencyKey,
        plan.correlationId
      ]);
      if (plan.failureInjectionStage === "AFTER_SALE_INSERT") {
        throw new Error("INJECTED_FAILURE_AFTER_SALE_INSERT");
      }

      // 2. Sale lines
      for (const line of plan.lines) {
        await client.query(`
          INSERT INTO sale_lines (
            id, sale_id, product_id, batch_id, quantity,
            unit_price_amount, unit_price_currency,
            line_total_amount, line_total_currency
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
          line.id,
          plan.sale.id,
          line.productId,
          line.batchId,
          line.quantity,
          line.unitPrice.amount,
          line.unitPrice.currency,
          line.lineTotal.amount,
          line.lineTotal.currency
        ]);
      }
      if (plan.failureInjectionStage === "AFTER_LINE_INSERT") {
        throw new Error("INJECTED_FAILURE_AFTER_LINE_INSERT");
      }

      // 3. Payments
      for (const p of plan.payments) {
        await client.query(`
          INSERT INTO payments (
            id, sale_id, method, amount_value, currency, verification_status, recorded_at, reference
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          p.id,
          plan.sale.id,
          p.method,
          p.amount.amount,
          p.amount.currency,
          p.verificationStatus,
          p.recordedAt,
          null
        ]);
      }
      if (plan.failureInjectionStage === "AFTER_PAYMENT_INSERT") {
        throw new Error("INJECTED_FAILURE_AFTER_PAYMENT_INSERT");
      }

      // 4. Inventory Transaction
      await client.query(`
        INSERT INTO inventory_transactions (
          id, tenant_id, organization_id, branch_id, source_type, source_id, reversal_of_transaction_id, status, created_at, version
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        plan.inventoryTransaction.id,
        plan.tenantId,
        plan.inventoryTransaction.organizationId,
        plan.inventoryTransaction.branchId,
        plan.inventoryTransaction.sourceType,
        plan.inventoryTransaction.sourceId,
        plan.inventoryTransaction.reversalOfTransactionId ?? null,
        plan.inventoryTransaction.status,
        plan.inventoryTransaction.createdAt,
        plan.inventoryTransaction.version
      ]);
      if (plan.failureInjectionStage === "AFTER_INVENTORY_TX_INSERT") {
        throw new Error("INJECTED_FAILURE_AFTER_INVENTORY_TX_INSERT");
      }

      // 5. Stock Movements & Batches projection update
      for (const m of plan.movements) {
        await client.query(`
          INSERT INTO stock_movements (
            id, inventory_transaction_id, product_id, batch_id, warehouse_id, direction, quantity, source_transaction_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          m.id,
          plan.inventoryTransaction.id,
          m.productId,
          m.batchId,
          m.warehouseId,
          m.direction,
          m.quantity.value,
          m.sourceTransactionId
        ]);
      }

      // Guarded atomic update: decrements quantity only if current quantity >= requested deduction
      for (const batchId of sortedBatchIds) {
        const totalDeduction = aggregatedBatchDeductions.get(batchId)!;
        const result = await client.query(`
          UPDATE batches
          SET quantity = quantity - $1,
              status = CASE WHEN quantity - $2 = 0 THEN 'DEPLETED' ELSE status END,
              version = version + 1
          WHERE id = $3
            AND quantity >= $4
            AND status IN ('ACTIVE', 'NEAR_EXPIRY')
            AND (expiry_date IS NULL OR expiry_date > $5)
        `, [totalDeduction, totalDeduction, batchId, totalDeduction, txDate]);
        if (Number(result.rowCount ?? 0) !== 1) {
          throw new Error("STALE_BATCH_OR_INSUFFICIENT_STOCK");
        }
      }
      if (plan.failureInjectionStage === "AFTER_STOCK_MOVEMENT_INSERT") {
        throw new Error("INJECTED_FAILURE_AFTER_STOCK_MOVEMENT_INSERT");
      }

      // 6. Offline Allocation update (if applicable) with guarded concurrency protection
      if (plan.allocationDeductions && plan.allocationDeductions.length > 0) {
        for (const alloc of plan.allocationDeductions) {
          const res = await client.query<{
            allocated_capacity: string | number; consumed_capacity: string | number;
            released_capacity: string | number; state: string;
            valid_from: Date | string | null; expires_at: Date | string | null;
            lock_acquired_at: Date | string;
          }>(
            "SELECT allocated_capacity, consumed_capacity, released_capacity, state, valid_from, expires_at, clock_timestamp() as lock_acquired_at FROM offline_allocations WHERE id = $1 FOR UPDATE",
            [alloc.allocationId]
          );
          const row = res.rows[0];
          if (!row) throw new Error("OFFLINE_ALLOCATION_NOT_FOUND");
          if (row.state !== "ACTIVE") throw new Error("OFFLINE_ALLOCATION_UNAVAILABLE");
          if (!row.valid_from || !row.expires_at) throw new Error("OFFLINE_ALLOCATION_INVALID");

          const lockTimeMs = row.lock_acquired_at instanceof Date ? row.lock_acquired_at.getTime() : Date.parse(row.lock_acquired_at as string);
          const validFromMs = row.valid_from instanceof Date ? row.valid_from.getTime() : Date.parse(row.valid_from as string);
          const expiresAtMs = row.expires_at instanceof Date ? row.expires_at.getTime() : Date.parse(row.expires_at as string);

          if (lockTimeMs < validFromMs) throw new Error("OFFLINE_ALLOCATION_NOT_YET_VALID");
          if (lockTimeMs >= expiresAtMs) throw new Error("OFFLINE_ALLOCATION_EXPIRED");

          const rem = Number(row.allocated_capacity) - Number(row.consumed_capacity) + Number(row.released_capacity);
          if (rem < alloc.quantity) {
            throw new Error("STALE_ALLOCATION_OR_CAPACITY_EXHAUSTED");
          }
        }

        for (const alloc of plan.allocationDeductions) {
          const result = await client.query(`
            UPDATE offline_allocations
            SET consumed_capacity = consumed_capacity + $1,
                state = CASE WHEN (allocated_capacity - (consumed_capacity + $2) + released_capacity) <= 0 THEN 'EXHAUSTED' ELSE state END,
                version = version + 1
            WHERE id = $3
              AND state = 'ACTIVE'
              AND (valid_from IS NULL OR valid_from <= clock_timestamp())
              AND (expires_at IS NULL OR expires_at > clock_timestamp())
              AND (allocated_capacity - consumed_capacity + released_capacity) >= $4
          `, [alloc.quantity, alloc.quantity, alloc.allocationId, alloc.quantity]);
          if (Number(result.rowCount ?? 0) !== 1) {
            throw new Error("STALE_ALLOCATION_OR_CAPACITY_EXHAUSTED");
          }
        }
      } else if (plan.updatedAllocation) {
        await client.query(`
          UPDATE offline_allocations SET consumed_capacity = $1, state = $2, version = $3 WHERE id = $4
        `, [
          plan.updatedAllocation.consumedCapacity,
          plan.updatedAllocation.state,
          plan.updatedAllocation.version,
          plan.updatedAllocation.id
        ]);
      }
      if (plan.failureInjectionStage === "AFTER_ALLOCATION_CONSUMPTION") {
        throw new Error("INJECTED_FAILURE_AFTER_ALLOCATION_CONSUMPTION");
      }

      // 7. Outbox
      await client.query(`
        INSERT INTO outbox_events (
          event_id, event_type, aggregate_id, aggregate_version, occurred_at,
          tenant_id, organization_id, branch_id, device_id, correlation_id, payload, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `, [
        plan.outboxEvent.eventId,
        plan.outboxEvent.eventType,
        plan.outboxEvent.aggregateId,
        plan.outboxEvent.aggregateVersion,
        plan.outboxEvent.occurredAt,
        plan.outboxEvent.tenantId,
        plan.outboxEvent.organizationId,
        plan.outboxEvent.branchId ?? null,
        plan.outboxEvent.deviceId ?? null,
        plan.outboxEvent.correlationId,
        JSON.stringify(plan.outboxEvent.payload),
        "PENDING"
      ]);
      if (plan.failureInjectionStage === "AFTER_OUTBOX_INSERT") {
        throw new Error("INJECTED_FAILURE_AFTER_OUTBOX_INSERT");
      }

      // 8. Audit Record
      await client.query(`
        INSERT INTO audit_records (
          id, occurred_at, actor_id, action, resource_type, resource_id,
          tenant_id, organization_id, branch_id, device_id, correlation_id,
          reason, before_json, after_json
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      `, [
        plan.auditRecord.id,
        plan.auditRecord.occurredAt,
        plan.auditRecord.actorId,
        plan.auditRecord.action,
        plan.auditRecord.resourceType,
        plan.auditRecord.resourceId,
        plan.auditRecord.tenantId,
        plan.auditRecord.organizationId,
        plan.auditRecord.branchId ?? null,
        plan.auditRecord.deviceId ?? null,
        plan.auditRecord.correlationId,
        plan.auditRecord.reason ?? null,
        plan.auditRecord.before ? JSON.stringify(plan.auditRecord.before) : null,
        plan.auditRecord.after ? JSON.stringify(plan.auditRecord.after) : null
      ]);
      if (plan.failureInjectionStage === "AFTER_AUDIT_INSERT") {
        throw new Error("INJECTED_FAILURE_AFTER_AUDIT_INSERT");
      }

      // 9. Idempotency Record
      await client.query(`
        INSERT INTO idempotency_records (
          key, command_name, request_hash, response_status, response_body, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        plan.idempotencyRecord.key,
        plan.idempotencyRecord.commandName,
        plan.idempotencyRecord.requestHash,
        plan.idempotencyRecord.responseStatus,
        JSON.stringify(plan.idempotencyRecord.responseBody),
        plan.idempotencyRecord.createdAt
      ]);
      if (plan.failureInjectionStage === "AFTER_IDEMPOTENCY_INSERT") {
        throw new Error("INJECTED_FAILURE_AFTER_IDEMPOTENCY_INSERT");
      }
    });
  }

  async getSale(saleId: string): Promise<{
    id: string; tenantId: string; organizationId: string; branchId: string; warehouseId: string | null;
    deviceId: string; cashSessionId: string; status: string; currency: string; totalAmount: number;
    createdAt: string; version: number; lines: readonly SaleLine[]; payments: readonly Payment[];
  } | null> {
    const saleRes = await this.db.query<Record<string, unknown>>("SELECT * FROM sales WHERE id = $1", [saleId]);
    const saleRow = saleRes.rows[0];
    if (!saleRow) return null;

    const lineRes = await this.db.query<Record<string, unknown>>("SELECT * FROM sale_lines WHERE sale_id = $1 ORDER BY id ASC", [saleId]);
    const payRes = await this.db.query<Record<string, unknown>>("SELECT * FROM payments WHERE sale_id = $1 ORDER BY id ASC", [saleId]);

    const lines: SaleLine[] = lineRes.rows.map(l => ({
      id: String(l.id),
      productId: String(l.product_id),
      batchId: String(l.batch_id),
      quantity: Number(l.quantity),
      unitPrice: money(Number(l.unit_price_amount), String(l.unit_price_currency)),
      lineTotal: money(Number(l.line_total_amount), String(l.line_total_currency))
    }));

    const payments: Payment[] = payRes.rows.map(p => ({
      id: String(p.id),
      method: String(p.method) as Payment["method"],
      amount: money(Number(p.amount_value), String(p.currency)),
      verificationStatus: String(p.verification_status) as Payment["verificationStatus"],
      recordedAt: formatTimestamp(p.recorded_at as string | Date)
    }));

    return {
      id: String(saleRow.id),
      tenantId: String(saleRow.tenant_id),
      organizationId: String(saleRow.organization_id),
      branchId: String(saleRow.branch_id),
      warehouseId: saleRow.warehouse_id ? String(saleRow.warehouse_id) : null,
      deviceId: String(saleRow.device_id),
      cashSessionId: String(saleRow.cash_session_id),
      status: String(saleRow.status),
      currency: String(saleRow.currency),
      totalAmount: Number(saleRow.total_amount),
      createdAt: formatTimestamp(saleRow.created_at as string | Date),
      version: Number(saleRow.version),
      lines,
      payments
    };
  }

  async getInventoryTransaction(id: string): Promise<InventoryTransaction | null> {
    const res = await this.db.query<Record<string, unknown>>("SELECT * FROM inventory_transactions WHERE id = $1", [id]);
    const row = res.rows[0];
    if (!row) return null;
    const movements = await this.getStockMovements(id);
    return {
      id: String(row.id),
      organizationId: String(row.organization_id),
      branchId: String(row.branch_id),
      sourceType: String(row.source_type) as InventoryTransaction["sourceType"],
      sourceId: String(row.source_id),
      ...(row.reversal_of_transaction_id ? { reversalOfTransactionId: String(row.reversal_of_transaction_id) } : {}),
      status: String(row.status) as InventoryTransaction["status"],
      movements,
      createdAt: formatTimestamp(row.created_at as string | Date),
      version: Number(row.version)
    };
  }

  async getStockMovements(inventoryTransactionId: string): Promise<readonly StockMovement[]> {
    const res = await this.db.query<Record<string, unknown>>(
      "SELECT * FROM stock_movements WHERE inventory_transaction_id = $1 ORDER BY id ASC",
      [inventoryTransactionId]
    );
    return res.rows.map(r => ({
      id: String(r.id),
      productId: String(r.product_id),
      batchId: String(r.batch_id),
      warehouseId: String(r.warehouse_id),
      direction: String(r.direction) as StockMovement["direction"],
      quantity: quantity(Number(r.quantity)),
      sourceTransactionId: String(r.source_transaction_id)
    }));
  }

  async getBatch(id: string): Promise<Batch | null> {
    const res = await this.db.query<BatchRow>("SELECT * FROM batches WHERE id = $1", [id]);
    const r = res.rows[0];
    if (!r) return null;
    return {
      id: r.id,
      organizationId: r.organization_id,
      warehouseId: r.warehouse_id,
      productId: r.product_id,
      batchNumber: r.batch_number,
      expiryDate: r.expiry_date,
      quantity: quantity(Number(r.quantity)),
      status: r.status as Batch["status"],
      version: Number(r.version)
    };
  }

  async getOfflineAllocation(id: string): Promise<OfflineSafetyAllocation | null> {
    const res = await this.db.query<AllocationRow>("SELECT * FROM offline_allocations WHERE id = $1", [id]);
    const row = res.rows[0];
    if (!row) return null;
    return {
      id: row.id,
      branchId: row.branch_id,
      warehouseId: row.warehouse_id,
      deviceId: row.device_id,
      productId: row.product_id,
      allocatedCapacity: Number(row.allocated_capacity),
      consumedCapacity: Number(row.consumed_capacity),
      releasedCapacity: Number(row.released_capacity),
      state: row.state as OfflineSafetyAllocation["state"],
      version: Number(row.version),
      issuedAt: row.issued_at instanceof Date ? row.issued_at.toISOString() : (row.issued_at ?? ""),
      validFrom: row.valid_from instanceof Date ? row.valid_from.toISOString() : (row.valid_from ?? ""),
      expiresAt: row.expires_at instanceof Date ? row.expires_at.toISOString() : (row.expires_at ?? "")
    };
  }

  async getOutboxEvents(aggregateId?: string): Promise<readonly OutboxEvent[]> {
    const res = aggregateId
      ? await this.db.query<OutboxRow>("SELECT * FROM outbox_events WHERE aggregate_id = $1 ORDER BY aggregate_version ASC", [aggregateId])
      : await this.db.query<OutboxRow>("SELECT * FROM outbox_events ORDER BY aggregate_version ASC");

    return res.rows.map(r => ({
      eventId: r.event_id,
      eventType: r.event_type,
      aggregateId: r.aggregate_id,
      aggregateVersion: Number(r.aggregate_version),
      occurredAt: formatTimestamp(r.occurred_at),
      tenantId: r.tenant_id,
      organizationId: r.organization_id,
      ...(r.branch_id ? { branchId: r.branch_id } : {}),
      ...(r.device_id ? { deviceId: r.device_id } : {}),
      correlationId: r.correlation_id,
      payload: parseJsonField(r.payload) as Record<string, unknown>
    }));
  }

  async getAuditRecords(resourceId: string): Promise<readonly AuditRecord[]> {
    const res = await this.db.query<AuditRow>(
      "SELECT * FROM audit_records WHERE resource_id = $1 ORDER BY occurred_at ASC",
      [resourceId]
    );
    return res.rows.map(r => ({
      id: r.id,
      occurredAt: formatTimestamp(r.occurred_at),
      actorId: r.actor_id,
      action: r.action,
      resourceType: r.resource_type,
      resourceId: r.resource_id,
      tenantId: r.tenant_id,
      organizationId: r.organization_id,
      ...(r.branch_id ? { branchId: r.branch_id } : {}),
      ...(r.device_id ? { deviceId: r.device_id } : {}),
      correlationId: r.correlation_id,
      ...(r.reason ? { reason: r.reason } : {}),
      ...(r.before_json ? { before: parseJsonField(r.before_json) as Record<string, unknown> } : {}),
      ...(r.after_json ? { after: parseJsonField(r.after_json) as Record<string, unknown> } : {})
    }));
  }
}
