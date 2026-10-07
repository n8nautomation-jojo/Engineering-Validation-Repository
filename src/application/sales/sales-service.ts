import { createHash, randomUUID } from "node:crypto";
import type { RequestContext } from "../context.js";
import { assertTrustedScope } from "../context.js";
import type { AuthorizationAssignment, AuthorizationRequest } from "../../authorization/policy.js";
import { authorize } from "../../authorization/engine.js";
import type { CashSession } from "../../domain/cash/cash-session.js";
import type { Money } from "../../kernel/money.js";
import { money } from "../../kernel/money.js";
import type { Quantity } from "../../kernel/quantity.js";
import { quantity } from "../../kernel/quantity.js";
import type { UUID } from "../../kernel/types.js";
import type { Sale, SaleLine } from "../../domain/sales/sale.js";
import { createSale } from "../../domain/sales/sale.js";
import type { Payment, PaymentMethod } from "../../domain/sales/payment.js";
import { recordPayment } from "../../domain/sales/payment.js";
import type { InventoryTransaction, StockMovement } from "../../domain/inventory/inventory-transaction.js";
import { postInventoryTransaction } from "../../domain/inventory/inventory-transaction.js";
import type { Batch } from "../../domain/inventory/batch.js";
import { consumeOfflineAllocation, remainingCapacity, type OfflineSafetyAllocation } from "../../domain/inventory/offline-allocation.js";
import type { OutboxEvent } from "../../infrastructure/outbox.js";
import type { AuditRecord, IdempotencyRecord } from "../../persistence/contracts.js";
import type { FailureInjectionStage, SalesExecutionPlan, SalesPersistence } from "../../persistence/sales-contracts.js";

export interface CreateSaleLineInput {
  readonly id?: UUID;
  readonly productId: UUID;
  readonly quantity: number;
  readonly unitPrice: Money;
  readonly requestedBatchId?: UUID;
}

export interface CreateSalePaymentInput {
  readonly id?: UUID;
  readonly method: PaymentMethod;
  readonly amount: Money;
}

export interface CreateSaleCommand {
  readonly idempotencyKey: string;
  readonly correlationId: string;
  readonly context: RequestContext;
  readonly cashSession: CashSession;
  readonly lines: readonly CreateSaleLineInput[];
  readonly payments: readonly CreateSalePaymentInput[];
  readonly offline?: boolean;
  readonly now?: string;
  readonly assignments?: readonly AuthorizationAssignment[];
  readonly authorizationSnapshot?: AuthorizationRequest["snapshot"];
  readonly failureInjectionStage?: FailureInjectionStage;
}

export interface CreateSaleResult {
  readonly saleId: UUID;
  readonly status: "COMPLETED";
  readonly totalAmount: number;
  readonly currency: string;
  readonly inventoryTransactionId: UUID;
  readonly outboxEventId: string;
  readonly correlationId: string;
  readonly offline: boolean;
}

function hashRequest(command: CreateSaleCommand): string {
  const payload = {
    tenantId: command.context.tenantId,
    organizationId: command.context.organizationId,
    branchId: command.context.branchId,
    warehouseId: command.context.warehouseId,
    deviceId: command.context.deviceId,
    cashSessionId: command.cashSession.id,
    lines: command.lines.map(l => ({
      productId: l.productId,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      requestedBatchId: l.requestedBatchId
    })),
    payments: command.payments.map(p => ({
      method: p.method,
      amount: p.amount
    }))
  };
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export class SalesService {
  constructor(private readonly persistence: SalesPersistence) {}

  async processSale(command: CreateSaleCommand): Promise<CreateSaleResult> {
    const context: RequestContext = {
      ...command.context,
      correlationId: command.context.correlationId || command.correlationId
    };
    assertTrustedScope(context);

    if (!context.branchId) throw new Error("BRANCH_SCOPE_REQUIRED");
    if (!context.warehouseId) throw new Error("WAREHOUSE_SCOPE_REQUIRED");
    if (!context.deviceId) throw new Error("DEVICE_SCOPE_REQUIRED");
    if (!context.userId) throw new Error("USER_SCOPE_REQUIRED");

    const now = command.now ?? new Date().toISOString();
    const today = now.slice(0, 10);
    const isOffline = Boolean(command.offline);

    // 1. Authorization
    if (command.assignments) {
      const authDecision = authorize(
        {
          context,
          capability: "sales.create",
          offline: isOffline,
          now,
          ...(command.authorizationSnapshot ? { snapshot: command.authorizationSnapshot } : {}),
          resource: {
            tenantId: context.tenantId,
            organizationId: context.organizationId,
            branchId: context.branchId,
            warehouseId: context.warehouseId,
            deviceId: context.deviceId
          }
        },
        command.assignments
      );
      if (!authDecision.allowed) {
        throw new Error(`UNAUTHORIZED: ${authDecision.reason}`);
      }
    }

    // 2. Cash Session Validation
    if (command.cashSession.status !== "OPEN") throw new Error("CASH_SESSION_NOT_OPEN");
    if (command.cashSession.branchId !== context.branchId) throw new Error("CASH_SESSION_BRANCH_MISMATCH");
    if (command.cashSession.deviceId !== context.deviceId) throw new Error("CASH_SESSION_DEVICE_MISMATCH");

    if (command.lines.length === 0) throw new Error("SALE_REQUIRES_LINES");
    if (command.payments.length === 0) throw new Error("SALE_REQUIRES_PAYMENTS");

    // 3. Idempotency Check
    const commandName = "sales.create";
    const requestHash = hashRequest(command);
    const existingIdem = await this.persistence.findIdempotency(command.idempotencyKey, commandName);
    if (existingIdem) {
      if (existingIdem.requestHash !== requestHash) {
        throw new Error("IDEMPOTENCY_KEY_REUSE_WITH_DIFFERENT_REQUEST");
      }
      return existingIdem.responseBody as CreateSaleResult;
    }

    // 4. Currency and Lines Total Calculation
    const saleCurrency = command.lines[0]?.unitPrice.currency;
    if (!saleCurrency) throw new Error("CURRENCY_REQUIRED");

    let totalAmount = 0;
    const productDemands = new Map<string, number>();

    for (const line of command.lines) {
      if (line.quantity <= 0 || !Number.isFinite(line.quantity)) throw new Error("INVALID_LINE_QUANTITY");
      if (line.unitPrice.currency !== saleCurrency) throw new Error("CURRENCY_MISMATCH");
      const lineTotal = line.quantity * line.unitPrice.amount;
      totalAmount += lineTotal;

      const currentDemand = productDemands.get(line.productId) ?? 0;
      productDemands.set(line.productId, currentDemand + line.quantity);
    }

    // Validate payments cover totalAmount
    let totalPayment = 0;
    for (const p of command.payments) {
      if (p.amount.currency !== saleCurrency) throw new Error("PAYMENT_CURRENCY_MISMATCH");
      if (p.amount.amount <= 0 || !Number.isFinite(p.amount.amount)) throw new Error("INVALID_PAYMENT_AMOUNT");
      totalPayment += p.amount.amount;
    }

    if (Math.abs(totalPayment - totalAmount) > 0.0001) {
      throw new Error("PAYMENT_AMOUNT_MISMATCH");
    }

    // 5. Multi-line FEFO and Offline Allocation Resolution
    const batchDeductions: { batchId: UUID; quantity: number; newQuantity: number; newStatus: Batch["status"] }[] = [];
    const allocationDeductions: { allocationId: string; quantity: number }[] = [];
    const resolvedSaleLines: SaleLine[] = [];
    const stockMovements: StockMovement[] = [];
    const inventoryTxId = randomUUID();
    let updatedAllocation: OfflineSafetyAllocation | undefined;

    for (const [productId, totalDemanded] of productDemands.entries()) {
      // Offline Allocation Check
      if (isOffline) {
        const allocation = await this.persistence.findOfflineAllocation(context.branchId, context.deviceId, productId);
        if (!allocation) throw new Error("OFFLINE_ALLOCATION_NOT_FOUND");
        if (allocation.state !== "ACTIVE") throw new Error("OFFLINE_ALLOCATION_UNAVAILABLE");
        if (totalDemanded > remainingCapacity(allocation)) throw new Error("OFFLINE_ALLOCATION_EXHAUSTED");
        updatedAllocation = consumeOfflineAllocation(allocation, totalDemanded);
        allocationDeductions.push({ allocationId: allocation.id, quantity: totalDemanded });
      }

      // Query eligible batches in warehouse
      const availableBatches = await this.persistence.findBatchesForProduct(context.warehouseId, productId);
      if (availableBatches.length === 0) throw new Error("INSUFFICIENT_STOCK");

      // Verify not expired and sorted by FEFO
      const eligibleBatches = availableBatches.filter(b => {
        if (b.status !== "ACTIVE" && b.status !== "NEAR_EXPIRY") return false;
        return b.quantity.value > 0;
      });

      const totalAvailable = eligibleBatches.reduce((acc, b) => acc + b.quantity.value, 0);
      if (totalAvailable < totalDemanded) throw new Error("INSUFFICIENT_STOCK");

      // Check lines for this product
      const productLines = command.lines.filter(l => l.productId === productId);
      const batchRemainingMap = new Map<string, number>(eligibleBatches.map(b => [b.id, b.quantity.value]));

      for (const line of productLines) {
        let selectedBatch: Batch | undefined;

        if (line.requestedBatchId) {
          const found = eligibleBatches.find(b => b.id === line.requestedBatchId);
          if (!found) throw new Error("REQUESTED_BATCH_NOT_FOUND");
          if (found.expiryDate <= today) throw new Error("EXPIRED_BATCH");

          // Enforce FEFO: verify no earlier expiring batch is being skipped
          const earlierBatch = eligibleBatches.find(b =>
            b.id !== found.id &&
            b.expiryDate < found.expiryDate &&
            (batchRemainingMap.get(b.id) ?? 0) > 0
          );
          if (earlierBatch) throw new Error("FEFO_VIOLATION");

          selectedBatch = found;
        } else {
          // Automatic FEFO selection: pick earliest available batch
          for (const b of eligibleBatches) {
            if (b.expiryDate <= today) throw new Error("EXPIRED_BATCH");
            const rem = batchRemainingMap.get(b.id) ?? 0;
            if (rem >= line.quantity) {
              selectedBatch = b;
              break;
            }
          }
          if (!selectedBatch) {
            selectedBatch = eligibleBatches.find(b => (batchRemainingMap.get(b.id) ?? 0) > 0);
          }
        }

        if (!selectedBatch) throw new Error("INSUFFICIENT_STOCK");
        if (selectedBatch.expiryDate <= today) throw new Error("EXPIRED_BATCH");

        const curRem = batchRemainingMap.get(selectedBatch.id) ?? 0;
        if (curRem < line.quantity) throw new Error("INSUFFICIENT_STOCK");

        batchRemainingMap.set(selectedBatch.id, curRem - line.quantity);

        const lineId = line.id ?? randomUUID();
        resolvedSaleLines.push({
          id: lineId,
          productId: line.productId,
          batchId: selectedBatch.id,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          lineTotal: money(line.quantity * line.unitPrice.amount, line.unitPrice.currency)
        });

        stockMovements.push({
          id: randomUUID(),
          productId: line.productId,
          batchId: selectedBatch.id,
          warehouseId: context.warehouseId,
          direction: "OUT",
          quantity: quantity(line.quantity),
          sourceTransactionId: inventoryTxId
        });
      }

      // Record deductions for batches
      for (const b of eligibleBatches) {
        const remaining = batchRemainingMap.get(b.id) ?? b.quantity.value;
        const deducted = b.quantity.value - remaining;
        if (deducted > 0) {
          batchDeductions.push({
            batchId: b.id,
            quantity: deducted,
            newQuantity: remaining,
            newStatus: remaining === 0 ? "DEPLETED" : b.status
          });
        }
      }
    }

    // 6. Build Sale & Payments
    const saleId = randomUUID();
    const payments: Payment[] = command.payments.map(p =>
      recordPayment({
        id: p.id ?? randomUUID(),
        method: p.method,
        amount: p.amount,
        recordedAt: now
      })
    );

    const sale: Sale = createSale({
      id: saleId,
      organizationId: context.organizationId,
      branchId: context.branchId,
      deviceId: context.deviceId,
      cashSessionId: command.cashSession.id,
      lines: resolvedSaleLines,
      payments,
      createdAt: now
    });

    // 7. Build Inventory Transaction
    const inventoryTx: InventoryTransaction = postInventoryTransaction({
      id: inventoryTxId,
      organizationId: context.organizationId,
      branchId: context.branchId,
      sourceType: "SALE",
      sourceId: saleId,
      movements: stockMovements,
      createdAt: now
    });

    // 8. Build Outbox Event
    const outboxEventId = randomUUID();
    const outboxEvent: OutboxEvent = {
      eventId: outboxEventId,
      eventType: "sale.completed",
      aggregateId: saleId,
      aggregateVersion: sale.version,
      occurredAt: now,
      tenantId: context.tenantId,
      organizationId: context.organizationId,
      branchId: context.branchId,
      deviceId: context.deviceId,
      correlationId: command.correlationId,
      payload: {
        saleId,
        status: "COMPLETED",
        totalAmount,
        currency: saleCurrency,
        lineCount: resolvedSaleLines.length,
        lines: resolvedSaleLines.map(l => ({
          productId: l.productId,
          batchId: l.batchId,
          quantity: l.quantity,
          lineTotal: l.lineTotal.amount
        })),
        payments: payments.map(p => ({
          method: p.method,
          amount: p.amount.amount,
          verificationStatus: p.verificationStatus
        }))
      }
    };

    // 9. Build Audit Record
    const auditRecord: AuditRecord = {
      id: randomUUID(),
      occurredAt: now,
      actorId: context.userId,
      action: "SALE_COMPLETED",
      resourceType: "Sale",
      resourceId: saleId,
      tenantId: context.tenantId,
      organizationId: context.organizationId,
      branchId: context.branchId,
      deviceId: context.deviceId,
      correlationId: command.correlationId,
      reason: "Standard retail sale completion",
      before: null,
      after: {
        saleId,
        totalAmount,
        currency: saleCurrency,
        status: "COMPLETED",
        inventoryTransactionId: inventoryTxId
      }
    };

    const result: CreateSaleResult = {
      saleId,
      status: "COMPLETED",
      totalAmount,
      currency: saleCurrency,
      inventoryTransactionId: inventoryTxId,
      outboxEventId,
      correlationId: command.correlationId,
      offline: isOffline
    };

    // 10. Build Idempotency Record
    const idempotencyRecord: IdempotencyRecord = {
      key: command.idempotencyKey,
      commandName,
      requestHash,
      responseStatus: 201,
      responseBody: result,
      createdAt: now
    };

    // 11. Execute Atomic Transaction Plan
    const plan: SalesExecutionPlan = {
      sale,
      tenantId: context.tenantId,
      warehouseId: context.warehouseId,
      totalAmount,
      currency: saleCurrency,
      idempotencyKey: command.idempotencyKey,
      correlationId: command.correlationId,
      lines: resolvedSaleLines,
      payments,
      inventoryTransaction: inventoryTx,
      movements: stockMovements,
      batchDeductions,
      ...(updatedAllocation ? { updatedAllocation } : {}),
      ...(allocationDeductions.length > 0 ? { allocationDeductions } : {}),
      outboxEvent,
      auditRecord,
      idempotencyRecord,
      ...(command.failureInjectionStage ? { failureInjectionStage: command.failureInjectionStage } : {})
    };

    await this.persistence.executeSaleAtomic(plan);

    return result;
  }
}
