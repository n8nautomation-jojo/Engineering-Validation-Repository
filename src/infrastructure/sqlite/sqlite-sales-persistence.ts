import type { DatabaseSync } from "node:sqlite";
import type { SalesPersistence, SalesExecutionPlan } from "../../persistence/sales-contracts.js";
import type { Batch } from "../../domain/inventory/batch.js";
import type { OfflineSafetyAllocation } from "../../domain/inventory/offline-allocation.js";
import type { OutboxEvent } from "../outbox.js";
import type { AuditRecord, IdempotencyRecord } from "../../persistence/contracts.js";
import type { InventoryTransaction, StockMovement } from "../../domain/inventory/inventory-transaction.js";
import type { Sale, SaleLine } from "../../domain/sales/sale.js";
import type { Payment } from "../../domain/sales/payment.js";
import { money } from "../../kernel/money.js";
import { quantity } from "../../kernel/quantity.js";

type BatchRow = {
  id: string; organization_id: string; warehouse_id: string; product_id: string;
  batch_number: string; expiry_date: string; quantity: number; status: string; version: number;
};

type AllocationRow = {
  id: string; branch_id: string; warehouse_id: string; device_id: string; product_id: string;
  allocated_capacity: number; consumed_capacity: number; released_capacity: number; state: string; version: number;
};

type OutboxRow = {
  event_id: string; event_type: string; aggregate_id: string; aggregate_version: number;
  occurred_at: string; tenant_id: string; organization_id: string; branch_id: string | null;
  device_id: string | null; correlation_id: string; payload: string; status: string;
};

type AuditRow = {
  id: string; occurred_at: string; actor_id: string; action: string; resource_type: string;
  resource_id: string; tenant_id: string; organization_id: string; branch_id: string | null;
  device_id: string | null; correlation_id: string; reason: string | null; before_json: string | null; after_json: string | null;
};

export class SqliteSalesPersistence implements SalesPersistence {
  constructor(private readonly db: DatabaseSync) {}

  async findIdempotency(key: string, commandName: string): Promise<IdempotencyRecord | null> {
    const stmt = this.db.prepare(
      "SELECT key, command_name, request_hash, response_status, response_body, created_at FROM idempotency_records WHERE key = ? AND command_name = ?"
    );
    const row = stmt.get(key, commandName) as {
      key: string; command_name: string; request_hash: string; response_status: number; response_body: string; created_at: string;
    } | undefined;
    if (!row) return null;
    return {
      key: row.key,
      commandName: row.command_name,
      requestHash: row.request_hash,
      responseStatus: row.response_status,
      responseBody: JSON.parse(row.response_body),
      createdAt: row.created_at
    };
  }

  async findBatchesForProduct(warehouseId: string, productId: string): Promise<readonly Batch[]> {
    const stmt = this.db.prepare(
      "SELECT id, organization_id, warehouse_id, product_id, batch_number, expiry_date, quantity, status, version FROM batches WHERE warehouse_id = ? AND product_id = ? AND status IN ('ACTIVE', 'NEAR_EXPIRY') AND quantity > 0 ORDER BY expiry_date ASC, id ASC"
    );
    const rows = stmt.all(warehouseId, productId) as unknown as BatchRow[];
    return rows.map(r => ({
      id: r.id,
      organizationId: r.organization_id,
      warehouseId: r.warehouse_id,
      productId: r.product_id,
      batchNumber: r.batch_number,
      expiryDate: r.expiry_date,
      quantity: quantity(r.quantity),
      status: r.status as Batch["status"],
      version: r.version
    }));
  }

  async findOfflineAllocation(branchId: string, deviceId: string, productId: string): Promise<OfflineSafetyAllocation | null> {
    const stmt = this.db.prepare(
      "SELECT id, branch_id, warehouse_id, device_id, product_id, allocated_capacity, consumed_capacity, released_capacity, state, version FROM offline_allocations WHERE branch_id = ? AND device_id = ? AND product_id = ? AND state = 'ACTIVE'"
    );
    const row = stmt.get(branchId, deviceId, productId) as unknown as AllocationRow | undefined;
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
      version: row.version
    };
  }

  async executeSaleAtomic(plan: SalesExecutionPlan): Promise<void> {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      // 1. Sale
      const saleStmt = this.db.prepare(`
        INSERT INTO sales (
          id, tenant_id, organization_id, branch_id, warehouse_id, device_id,
          cash_session_id, status, currency, total_amount, created_at, version,
          idempotency_key, correlation_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      saleStmt.run(
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
      );
      if (plan.failureInjectionStage === "AFTER_SALE_INSERT") throw new Error("INJECTED_FAILURE_AFTER_SALE_INSERT");

      // 2. Sale lines
      const lineStmt = this.db.prepare(`
        INSERT INTO sale_lines (
          id, sale_id, product_id, batch_id, quantity,
          unit_price_amount, unit_price_currency,
          line_total_amount, line_total_currency
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const line of plan.lines) {
        lineStmt.run(
          line.id,
          plan.sale.id,
          line.productId,
          line.batchId,
          line.quantity,
          line.unitPrice.amount,
          line.unitPrice.currency,
          line.lineTotal.amount,
          line.lineTotal.currency
        );
      }
      if (plan.failureInjectionStage === "AFTER_LINE_INSERT") throw new Error("INJECTED_FAILURE_AFTER_LINE_INSERT");

      // 3. Payments
      const payStmt = this.db.prepare(`
        INSERT INTO payments (
          id, sale_id, method, amount_value, currency, verification_status, recorded_at, reference
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const p of plan.payments) {
        payStmt.run(
          p.id,
          plan.sale.id,
          p.method,
          p.amount.amount,
          p.amount.currency,
          p.verificationStatus,
          p.recordedAt,
          null
        );
      }
      if (plan.failureInjectionStage === "AFTER_PAYMENT_INSERT") throw new Error("INJECTED_FAILURE_AFTER_PAYMENT_INSERT");

      // 4. Inventory Transaction
      const invTxStmt = this.db.prepare(`
        INSERT INTO inventory_transactions (
          id, tenant_id, organization_id, branch_id, source_type, source_id, reversal_of_transaction_id, status, created_at, version
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      invTxStmt.run(
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
      );
      if (plan.failureInjectionStage === "AFTER_INVENTORY_TX_INSERT") throw new Error("INJECTED_FAILURE_AFTER_INVENTORY_TX_INSERT");

      // 5. Stock Movements & Batches projection update
      const mvStmt = this.db.prepare(`
        INSERT INTO stock_movements (
          id, inventory_transaction_id, product_id, batch_id, warehouse_id, direction, quantity, source_transaction_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const m of plan.movements) {
        mvStmt.run(
          m.id,
          plan.inventoryTransaction.id,
          m.productId,
          m.batchId,
          m.warehouseId,
          m.direction,
          m.quantity.value,
          m.sourceTransactionId
        );
      }

      // In-transaction re-verification of batches under write lock
      for (const b of plan.batchDeductions) {
        const row = this.db.prepare("SELECT quantity, status, expiry_date FROM batches WHERE id = ?").get(b.batchId) as { quantity: number; status: string; expiry_date: string } | undefined;
        if (!row || (row.status !== "ACTIVE" && row.status !== "NEAR_EXPIRY") || Number(row.quantity) < b.quantity) {
          throw new Error("STALE_BATCH_OR_INSUFFICIENT_STOCK");
        }
      }

      // Guarded atomic update: decrements quantity only if current quantity >= requested deduction
      const updateBatchStmt = this.db.prepare(`
        UPDATE batches
        SET quantity = quantity - ?,
            status = CASE WHEN quantity - ? = 0 THEN 'DEPLETED' ELSE status END,
            version = version + 1
        WHERE id = ?
          AND quantity >= ?
          AND status IN ('ACTIVE', 'NEAR_EXPIRY')
      `);
      for (const b of plan.batchDeductions) {
        const result = updateBatchStmt.run(b.quantity, b.quantity, b.batchId, b.quantity);
        if (Number(result.changes) !== 1) {
          throw new Error("STALE_BATCH_OR_INSUFFICIENT_STOCK");
        }
      }
      if (plan.failureInjectionStage === "AFTER_STOCK_MOVEMENT_INSERT") throw new Error("INJECTED_FAILURE_AFTER_STOCK_MOVEMENT_INSERT");

      // 6. Offline Allocation update (if applicable) with guarded concurrency protection
      if (plan.allocationDeductions && plan.allocationDeductions.length > 0) {
        for (const alloc of plan.allocationDeductions) {
          const row = this.db.prepare("SELECT allocated_capacity, consumed_capacity, released_capacity, state FROM offline_allocations WHERE id = ?").get(alloc.allocationId) as { allocated_capacity: number; consumed_capacity: number; released_capacity: number; state: string } | undefined;
          if (!row || row.state !== "ACTIVE" || (Number(row.allocated_capacity) - Number(row.consumed_capacity) + Number(row.released_capacity)) < alloc.quantity) {
            throw new Error("STALE_ALLOCATION_OR_CAPACITY_EXHAUSTED");
          }
        }

        const allocStmt = this.db.prepare(`
          UPDATE offline_allocations
          SET consumed_capacity = consumed_capacity + ?,
              state = CASE WHEN (allocated_capacity - (consumed_capacity + ?) + released_capacity) <= 0 THEN 'EXHAUSTED' ELSE state END,
              version = version + 1
          WHERE id = ?
            AND state = 'ACTIVE'
            AND (allocated_capacity - consumed_capacity + released_capacity) >= ?
        `);
        for (const alloc of plan.allocationDeductions) {
          const result = allocStmt.run(alloc.quantity, alloc.quantity, alloc.allocationId, alloc.quantity);
          if (Number(result.changes) !== 1) {
            throw new Error("STALE_ALLOCATION_OR_CAPACITY_EXHAUSTED");
          }
        }
      } else if (plan.updatedAllocation) {
        const allocStmt = this.db.prepare(`
          UPDATE offline_allocations SET consumed_capacity = ?, state = ?, version = ? WHERE id = ?
        `);
        allocStmt.run(
          plan.updatedAllocation.consumedCapacity,
          plan.updatedAllocation.state,
          plan.updatedAllocation.version,
          plan.updatedAllocation.id
        );
      }
      if (plan.failureInjectionStage === "AFTER_ALLOCATION_CONSUMPTION") throw new Error("INJECTED_FAILURE_AFTER_ALLOCATION_CONSUMPTION");

      // 7. Outbox
      const outboxStmt = this.db.prepare(`
        INSERT INTO outbox_events (
          event_id, event_type, aggregate_id, aggregate_version, occurred_at,
          tenant_id, organization_id, branch_id, device_id, correlation_id, payload, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      outboxStmt.run(
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
      );
      if (plan.failureInjectionStage === "AFTER_OUTBOX_INSERT") throw new Error("INJECTED_FAILURE_AFTER_OUTBOX_INSERT");

      // 8. Audit Record
      const auditStmt = this.db.prepare(`
        INSERT INTO audit_records (
          id, occurred_at, actor_id, action, resource_type, resource_id,
          tenant_id, organization_id, branch_id, device_id, correlation_id,
          reason, before_json, after_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      auditStmt.run(
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
      );
      if (plan.failureInjectionStage === "AFTER_AUDIT_INSERT") throw new Error("INJECTED_FAILURE_AFTER_AUDIT_INSERT");

      // 9. Idempotency Record
      const idemStmt = this.db.prepare(`
        INSERT INTO idempotency_records (
          key, command_name, request_hash, response_status, response_body, created_at
        ) VALUES (?, ?, ?, ?, ?, ?)
      `);
      idemStmt.run(
        plan.idempotencyRecord.key,
        plan.idempotencyRecord.commandName,
        plan.idempotencyRecord.requestHash,
        plan.idempotencyRecord.responseStatus,
        JSON.stringify(plan.idempotencyRecord.responseBody),
        plan.idempotencyRecord.createdAt
      );
      if (plan.failureInjectionStage === "AFTER_IDEMPOTENCY_INSERT") throw new Error("INJECTED_FAILURE_AFTER_IDEMPOTENCY_INSERT");

      this.db.exec("COMMIT");
    } catch (error) {
      try {
        this.db.exec("ROLLBACK");
      } catch {
        // Rollback failed if not in transaction
      }
      throw error;
    }
  }

  async getSale(saleId: string): Promise<{
    id: string; tenantId: string; organizationId: string; branchId: string; warehouseId: string | null;
    deviceId: string; cashSessionId: string; status: string; currency: string; totalAmount: number;
    createdAt: string; version: number; lines: readonly SaleLine[]; payments: readonly Payment[];
  } | null> {
    const saleRow = this.db.prepare("SELECT * FROM sales WHERE id = ?").get(saleId) as Record<string, unknown> | undefined;
    if (!saleRow) return null;
    const lineRows = this.db.prepare("SELECT * FROM sale_lines WHERE sale_id = ?").all(saleId) as Record<string, unknown>[];
    const payRows = this.db.prepare("SELECT * FROM payments WHERE sale_id = ?").all(saleId) as Record<string, unknown>[];

    const lines: SaleLine[] = lineRows.map(l => ({
      id: String(l.id),
      productId: String(l.product_id),
      batchId: String(l.batch_id),
      quantity: Number(l.quantity),
      unitPrice: money(Number(l.unit_price_amount), String(l.unit_price_currency)),
      lineTotal: money(Number(l.line_total_amount), String(l.line_total_currency))
    }));

    const payments: Payment[] = payRows.map(p => ({
      id: String(p.id),
      method: String(p.method) as Payment["method"],
      amount: money(Number(p.amount_value), String(p.currency)),
      verificationStatus: String(p.verification_status) as Payment["verificationStatus"],
      recordedAt: String(p.recorded_at)
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
      createdAt: String(saleRow.created_at),
      version: Number(saleRow.version),
      lines,
      payments
    };
  }

  async getInventoryTransaction(id: string): Promise<InventoryTransaction | null> {
    const row = this.db.prepare("SELECT * FROM inventory_transactions WHERE id = ?").get(id) as Record<string, unknown> | undefined;
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
      createdAt: String(row.created_at),
      version: Number(row.version)
    };
  }

  async getStockMovements(inventoryTransactionId: string): Promise<readonly StockMovement[]> {
    const rows = this.db.prepare("SELECT * FROM stock_movements WHERE inventory_transaction_id = ?").all(inventoryTransactionId) as Record<string, unknown>[];
    return rows.map(r => ({
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
    const r = this.db.prepare("SELECT * FROM batches WHERE id = ?").get(id) as unknown as BatchRow | undefined;
    if (!r) return null;
    return {
      id: r.id,
      organizationId: r.organization_id,
      warehouseId: r.warehouse_id,
      productId: r.product_id,
      batchNumber: r.batch_number,
      expiryDate: r.expiry_date,
      quantity: quantity(r.quantity),
      status: r.status as Batch["status"],
      version: r.version
    };
  }

  async getOfflineAllocation(id: string): Promise<OfflineSafetyAllocation | null> {
    const r = this.db.prepare("SELECT * FROM offline_allocations WHERE id = ?").get(id) as unknown as AllocationRow | undefined;
    if (!r) return null;
    return {
      id: r.id,
      branchId: r.branch_id,
      warehouseId: r.warehouse_id,
      deviceId: r.device_id,
      productId: r.product_id,
      allocatedCapacity: Number(r.allocated_capacity),
      consumedCapacity: Number(r.consumed_capacity),
      releasedCapacity: Number(r.released_capacity),
      state: r.state as OfflineSafetyAllocation["state"],
      version: r.version
    };
  }

  async getOutboxEvents(aggregateId?: string): Promise<readonly OutboxEvent[]> {
    const sql = aggregateId ? "SELECT * FROM outbox_events WHERE aggregate_id = ?" : "SELECT * FROM outbox_events";
    const rows = (aggregateId ? this.db.prepare(sql).all(aggregateId) : this.db.prepare(sql).all()) as unknown as OutboxRow[];
    return rows.map(r => ({
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
      payload: JSON.parse(r.payload)
    }));
  }

  async getAuditRecords(resourceId: string): Promise<readonly AuditRecord[]> {
    const rows = this.db.prepare("SELECT * FROM audit_records WHERE resource_id = ?").all(resourceId) as unknown as AuditRow[];
    return rows.map(r => ({
      id: r.id,
      occurredAt: r.occurred_at,
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
      ...(r.before_json ? { before: JSON.parse(r.before_json) } : {}),
      ...(r.after_json ? { after: JSON.parse(r.after_json) } : {})
    }));
  }
}
