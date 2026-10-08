import type { UUID, TenantId, OrganizationId, BranchId, DeviceId, WarehouseId } from "../kernel/types.js";
import type { Sale, SaleLine } from "../domain/sales/sale.js";
import type { Payment } from "../domain/sales/payment.js";
import type { InventoryTransaction, StockMovement } from "../domain/inventory/inventory-transaction.js";
import type { Batch } from "../domain/inventory/batch.js";
import type { OfflineSafetyAllocation } from "../domain/inventory/offline-allocation.js";
import type { OutboxEvent } from "../infrastructure/outbox.js";
import type { AuditRecord, IdempotencyRecord } from "./contracts.js";

export type FailureInjectionStage =
  | "AFTER_SALE_INSERT"
  | "AFTER_LINE_INSERT"
  | "AFTER_PAYMENT_INSERT"
  | "AFTER_INVENTORY_TX_INSERT"
  | "AFTER_STOCK_MOVEMENT_INSERT"
  | "AFTER_ALLOCATION_CONSUMPTION"
  | "AFTER_OUTBOX_INSERT"
  | "AFTER_AUDIT_INSERT"
  | "AFTER_IDEMPOTENCY_INSERT";

export interface AllocationDeduction {
  readonly allocationId: string;
  readonly quantity: number;
}

export interface SalesExecutionPlan {
  readonly sale: Sale;
  readonly tenantId: TenantId;
  readonly warehouseId: WarehouseId;
  readonly totalAmount: number;
  readonly currency: string;
  readonly idempotencyKey: string;
  readonly correlationId: string;
  readonly lines: readonly SaleLine[];
  readonly payments: readonly Payment[];
  readonly inventoryTransaction: InventoryTransaction;
  readonly movements: readonly StockMovement[];
  readonly batchDeductions: readonly { readonly batchId: UUID; readonly quantity: number; readonly newQuantity: number; readonly newStatus: Batch["status"] }[];
  readonly updatedAllocation?: OfflineSafetyAllocation;
  readonly allocationDeductions?: readonly AllocationDeduction[];
  readonly outboxEvent: OutboxEvent;
  readonly auditRecord: AuditRecord;
  readonly idempotencyRecord: IdempotencyRecord;
  readonly failureInjectionStage?: FailureInjectionStage;
}

export interface SalesPersistence {
  findIdempotency(key: string, commandName: string): Promise<IdempotencyRecord | null>;
  findBatchesForProduct(warehouseId: string, productId: string): Promise<readonly Batch[]>;
  findOfflineAllocation(branchId: string, deviceId: string, productId: string): Promise<OfflineSafetyAllocation | null>;
  executeSaleAtomic(plan: SalesExecutionPlan): Promise<void>;
  getSale(saleId: string): Promise<{
    id: string;
    tenantId: string;
    organizationId: string;
    branchId: string;
    warehouseId: string | null;
    deviceId: string;
    cashSessionId: string;
    status: string;
    currency: string;
    totalAmount: number;
    createdAt: string;
    version: number;
    lines: readonly SaleLine[];
    payments: readonly Payment[];
  } | null>;
  getInventoryTransaction(id: string): Promise<InventoryTransaction | null>;
  getStockMovements(inventoryTransactionId: string): Promise<readonly StockMovement[]>;
  getBatch(id: string): Promise<Batch | null>;
  getOfflineAllocation(id: string): Promise<OfflineSafetyAllocation | null>;
  getOutboxEvents(aggregateId?: string): Promise<readonly OutboxEvent[]>;
  getAuditRecords(resourceId: string): Promise<readonly AuditRecord[]>;
}
