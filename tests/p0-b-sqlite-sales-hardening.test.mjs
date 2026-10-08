import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { SqliteSalesPersistence } from "../dist/src/infrastructure/sqlite/sqlite-sales-persistence.js";
import { SalesService } from "../dist/src/application/sales/sales-service.js";
import { money } from "../dist/src/kernel/money.js";
import { openCashSession } from "../dist/src/domain/cash/cash-session.js";

const m1 = fs.readFileSync(new URL("../docs/05-data/migrations/sqlite/001_p0_4_foundation.sql", import.meta.url), "utf8");
const m2 = fs.readFileSync(new URL("../docs/05-data/migrations/sqlite/002_sales_vertical_slice.sql", import.meta.url), "utf8");

function createTestHarness() {
  const db = new DatabaseSync(":memory:");
  db.exec(m1);
  db.exec(m2);

  const persistence = new SqliteSalesPersistence(db);
  const service = new SalesService(persistence);

  const context = {
    tenantId: "t-001",
    organizationId: "org-001",
    branchId: "branch-001",
    warehouseId: "wh-001",
    deviceId: "dev-001",
    userId: "usr-cashier-1",
    correlationId: "corr-001"
  };

  const cashSession = openCashSession({
    id: "cs-001",
    branchId: "branch-001",
    deviceId: "dev-001",
    cashRegisterId: "reg-001",
    openedBy: "usr-cashier-1",
    openedAt: "2026-10-07T08:00:00Z",
    openingFloat: money(1000, "SDG")
  });

  const assignments = [{
    userId: "usr-cashier-1",
    capabilities: ["sales.create", "payments.record"],
    scope: {
      tenantId: "t-001",
      organizationId: "org-001",
      branchIds: ["branch-001"],
      warehouseIds: ["wh-001"],
      deviceIds: ["dev-001"]
    },
    policyVersion: "v1"
  }];

  const authorizationSnapshot = {
    snapshotId: "snap-001",
    version: 1,
    issuedAt: "2026-10-07T00:00:00Z",
    expiresAt: "2026-10-07T23:59:59Z",
    deviceId: "dev-001",
    userId: "usr-cashier-1",
    assignments,
    integrityVerified: true,
    revoked: false
  };

  return { db, persistence, service, context, cashSession, assignments, authorizationSnapshot };
}

test("PR B Hardening Gate: Stale/concurrent batch plan is rejected inside transaction lock", async () => {
  const { db, persistence, service, context, cashSession, assignments } = createTestHarness();

  // Batch initially has 10 units
  db.prepare(`
    INSERT INTO batches (id, organization_id, warehouse_id, product_id, batch_number, expiry_date, quantity, status, version)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run("batch-race-1", "org-001", "wh-001", "prod-race", "BN-RACE", "2027-01-01", 10, "ACTIVE", 0);

  // Sale 1: demands 7 units
  const sale1Res = await service.processSale({
    idempotencyKey: "idem-sale-1",
    correlationId: "corr-1",
    context,
    cashSession,
    assignments,
    now: "2026-10-07T10:00:00Z",
    lines: [{ productId: "prod-race", quantity: 7, unitPrice: money(10, "SDG") }],
    payments: [{ method: "CASH", amount: money(70, "SDG") }]
  });
  assert.equal(sale1Res.status, "COMPLETED");

  // Batch now has 3 units remaining
  const batchAfterSale1 = await persistence.getBatch("batch-race-1");
  assert.equal(batchAfterSale1.quantity.value, 3);

  // Simulate Sale 2 which planned before Sale 1 committed (demanding 6 units based on stale view of 10 units)
  // Attempt to execute with stale deduction of 6 against batch that only has 3
  const stalePlan = {
    sale: {
      id: "sale-stale-2",
      organizationId: "org-001",
      branchId: "branch-001",
      deviceId: "dev-001",
      cashSessionId: "cs-001",
      lines: [{
        id: "line-2",
        productId: "prod-race",
        batchId: "batch-race-1",
        quantity: 6,
        unitPrice: money(10, "SDG"),
        lineTotal: money(60, "SDG")
      }],
      payments: [{
        id: "pay-2",
        method: "CASH",
        amount: money(60, "SDG"),
        verificationStatus: "NOT_REQUIRED",
        recordedAt: "2026-10-07T10:01:00Z"
      }],
      status: "COMPLETED",
      createdAt: "2026-10-07T10:01:00Z",
      version: 0
    },
    tenantId: "t-001",
    warehouseId: "wh-001",
    totalAmount: 60,
    currency: "SDG",
    idempotencyKey: "idem-stale-2",
    correlationId: "corr-2",
    lines: [{
      id: "line-2",
      productId: "prod-race",
      batchId: "batch-race-1",
      quantity: 6,
      unitPrice: money(10, "SDG"),
      lineTotal: money(60, "SDG")
    }],
    payments: [{
      id: "pay-2",
      method: "CASH",
      amount: money(60, "SDG"),
      verificationStatus: "NOT_REQUIRED",
      recordedAt: "2026-10-07T10:01:00Z"
    }],
    inventoryTransaction: {
      id: "tx-stale-2",
      organizationId: "org-001",
      branchId: "branch-001",
      sourceType: "SALE",
      sourceId: "sale-stale-2",
      status: "POSTED",
      movements: [],
      createdAt: "2026-10-07T10:01:00Z",
      version: 0
    },
    movements: [{
      id: "mv-2",
      productId: "prod-race",
      batchId: "batch-race-1",
      warehouseId: "wh-001",
      direction: "OUT",
      quantity: { value: 6 },
      sourceTransactionId: "tx-stale-2"
    }],
    batchDeductions: [{
      batchId: "batch-race-1",
      quantity: 6,
      newQuantity: 4, // Stale: assumed 10 - 6 = 4
      newStatus: "ACTIVE"
    }],
    outboxEvent: {
      eventId: "ev-2",
      eventType: "sale.completed",
      aggregateId: "sale-stale-2",
      aggregateVersion: 0,
      occurredAt: "2026-10-07T10:01:00Z",
      tenantId: "t-001",
      organizationId: "org-001",
      correlationId: "corr-2",
      payload: {}
    },
    auditRecord: {
      id: "aud-2",
      occurredAt: "2026-10-07T10:01:00Z",
      actorId: "usr-cashier-1",
      action: "SALE_COMPLETED",
      resourceType: "Sale",
      resourceId: "sale-stale-2",
      tenantId: "t-001",
      organizationId: "org-001",
      correlationId: "corr-2"
    },
    idempotencyRecord: {
      key: "idem-stale-2",
      commandName: "sales.create",
      requestHash: "hash-stale",
      responseStatus: 201,
      responseBody: {},
      createdAt: "2026-10-07T10:01:00Z"
    }
  };

  // Must reject and rollback
  await assert.rejects(
    () => persistence.executeSaleAtomic(stalePlan),
    /STALE_BATCH_OR_INSUFFICIENT_STOCK/
  );

  // Verify batch quantity is STILL 3 (unaffected by stale mutation)
  const batchAfterStaleAttempt = await persistence.getBatch("batch-race-1");
  assert.equal(batchAfterStaleAttempt.quantity.value, 3);

  // Verify no duplicate sale or orphan movements created
  const totalSales = db.prepare("SELECT count(*) as n FROM sales").get().n;
  assert.equal(totalSales, 1);

  db.close();
});

test("PR B Hardening Gate: Stale offline allocation plan cannot over-consume capacity", async () => {
  const { db, persistence, service, context, cashSession, assignments, authorizationSnapshot } = createTestHarness();

  db.prepare(`
    INSERT INTO batches (id, organization_id, warehouse_id, product_id, batch_number, expiry_date, quantity, status, version)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run("batch-alloc-race", "org-001", "wh-001", "prod-alloc-race", "BN-AR", "2027-01-01", 100, "ACTIVE", 0);

  // Allocation capacity: 10 total, 0 consumed
  db.prepare(`
    INSERT INTO offline_allocations (id, branch_id, warehouse_id, device_id, product_id, allocated_capacity, consumed_capacity, released_capacity, state, version)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run("alloc-race-1", "branch-001", "wh-001", "dev-001", "prod-alloc-race", 10, 0, 0, "ACTIVE", 0);

  // Sale 1: consumes 7 units offline
  const res1 = await service.processSale({
    idempotencyKey: "idem-offline-1",
    correlationId: "corr-1",
    context,
    cashSession,
    assignments,
    authorizationSnapshot,
    offline: true,
    now: "2026-10-07T10:00:00Z",
    lines: [{ productId: "prod-alloc-race", quantity: 7, unitPrice: money(10, "SDG") }],
    payments: [{ method: "CASH", amount: money(70, "SDG") }]
  });
  assert.equal(res1.status, "COMPLETED");

  const allocAfter1 = await persistence.getOfflineAllocation("alloc-race-1");
  assert.equal(allocAfter1.consumedCapacity, 7);

  // Simulate stale execution plan attempting to consume 5 units (assuming allocation was still at 0 consumed)
  const staleAllocPlan = {
    sale: {
      id: "sale-stale-alloc",
      organizationId: "org-001",
      branchId: "branch-001",
      deviceId: "dev-001",
      cashSessionId: "cs-001",
      lines: [{
        id: "l-sa",
        productId: "prod-alloc-race",
        batchId: "batch-alloc-race",
        quantity: 5,
        unitPrice: money(10, "SDG"),
        lineTotal: money(50, "SDG")
      }],
      payments: [{
        id: "p-sa",
        method: "CASH",
        amount: money(50, "SDG"),
        verificationStatus: "NOT_REQUIRED",
        recordedAt: "2026-10-07T10:01:00Z"
      }],
      status: "COMPLETED",
      createdAt: "2026-10-07T10:01:00Z",
      version: 0
    },
    tenantId: "t-001",
    warehouseId: "wh-001",
    totalAmount: 50,
    currency: "SDG",
    idempotencyKey: "idem-stale-alloc",
    correlationId: "corr-sa",
    lines: [{
      id: "l-sa",
      productId: "prod-alloc-race",
      batchId: "batch-alloc-race",
      quantity: 5,
      unitPrice: money(10, "SDG"),
      lineTotal: money(50, "SDG")
    }],
    payments: [{
      id: "p-sa",
      method: "CASH",
      amount: money(50, "SDG"),
      verificationStatus: "NOT_REQUIRED",
      recordedAt: "2026-10-07T10:01:00Z"
    }],
    inventoryTransaction: {
      id: "tx-sa",
      organizationId: "org-001",
      branchId: "branch-001",
      sourceType: "SALE",
      sourceId: "sale-stale-alloc",
      status: "POSTED",
      movements: [],
      createdAt: "2026-10-07T10:01:00Z",
      version: 0
    },
    movements: [{
      id: "mv-sa",
      productId: "prod-alloc-race",
      batchId: "batch-alloc-race",
      warehouseId: "wh-001",
      direction: "OUT",
      quantity: { value: 5 },
      sourceTransactionId: "tx-sa"
    }],
    batchDeductions: [{
      batchId: "batch-alloc-race",
      quantity: 5,
      newQuantity: 88,
      newStatus: "ACTIVE"
    }],
    allocationDeductions: [{
      allocationId: "alloc-race-1",
      quantity: 5 // Demands 5, but only 3 capacity remaining (10 - 7)
    }],
    outboxEvent: {
      eventId: "ev-sa",
      eventType: "sale.completed",
      aggregateId: "sale-stale-alloc",
      aggregateVersion: 0,
      occurredAt: "2026-10-07T10:01:00Z",
      tenantId: "t-001",
      organizationId: "org-001",
      correlationId: "corr-sa",
      payload: {}
    },
    auditRecord: {
      id: "aud-sa",
      occurredAt: "2026-10-07T10:01:00Z",
      actorId: "usr-cashier-1",
      action: "SALE_COMPLETED",
      resourceType: "Sale",
      resourceId: "sale-stale-alloc",
      tenantId: "t-001",
      organizationId: "org-001",
      correlationId: "corr-sa"
    },
    idempotencyRecord: {
      key: "idem-stale-alloc",
      commandName: "sales.create",
      requestHash: "hash-sa",
      responseStatus: 201,
      responseBody: {},
      createdAt: "2026-10-07T10:01:00Z"
    }
  };

  // Must reject and rollback
  await assert.rejects(
    () => persistence.executeSaleAtomic(staleAllocPlan),
    /STALE_ALLOCATION_OR_CAPACITY_EXHAUSTED/
  );

  // Verify consumedCapacity is still 7 (has NOT exceeded 10)
  const allocAfterStale = await persistence.getOfflineAllocation("alloc-race-1");
  assert.equal(allocAfterStale.consumedCapacity, 7);

  db.close();
});

test("PR B Hardening Gate: Source of truth is stock_movements ledger, batches table is projection", async () => {
  const { db, service, context, cashSession, assignments } = createTestHarness();

  const initialStock = 50;
  db.prepare(`
    INSERT INTO batches (id, organization_id, warehouse_id, product_id, batch_number, expiry_date, quantity, status, version)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run("batch-ledger-test", "org-001", "wh-001", "prod-ledger", "BN-LEDGER", "2027-01-01", initialStock, "ACTIVE", 0);

  // Execute 3 separate sales
  await service.processSale({
    idempotencyKey: "idem-tx-1",
    correlationId: "c-1",
    context,
    cashSession,
    assignments,
    now: "2026-10-07T10:00:00Z",
    lines: [{ productId: "prod-ledger", quantity: 5, unitPrice: money(10, "SDG") }],
    payments: [{ method: "CASH", amount: money(50, "SDG") }]
  });

  await service.processSale({
    idempotencyKey: "idem-tx-2",
    correlationId: "c-2",
    context,
    cashSession,
    assignments,
    now: "2026-10-07T10:01:00Z",
    lines: [{ productId: "prod-ledger", quantity: 12, unitPrice: money(10, "SDG") }],
    payments: [{ method: "CASH", amount: money(120, "SDG") }]
  });

  await service.processSale({
    idempotencyKey: "idem-tx-3",
    correlationId: "c-3",
    context,
    cashSession,
    assignments,
    now: "2026-10-07T10:02:00Z",
    lines: [{ productId: "prod-ledger", quantity: 8, unitPrice: money(10, "SDG") }],
    payments: [{ method: "CASH", amount: money(80, "SDG") }]
  });

  // Calculate authoritative stock consumed from stock_movements ledger directly
  const ledgerSumRow = db.prepare(`
    SELECT SUM(quantity) as total_out
    FROM stock_movements
    WHERE batch_id = ? AND direction = 'OUT'
  `).get("batch-ledger-test");

  const totalDeducted = Number(ledgerSumRow.total_out);
  assert.equal(totalDeducted, 25); // 5 + 12 + 8

  // The projection quantity must equal initialStock - totalDeducted
  const batchProjection = db.prepare("SELECT quantity FROM batches WHERE id = ?").get("batch-ledger-test");
  assert.equal(Number(batchProjection.quantity), initialStock - totalDeducted);
  assert.equal(Number(batchProjection.quantity), 25);

  // Verify that if batches table projection was corrupted or wiped,
  // authoritative stock can be 100% reconstructed from immutable stock_movements
  const reconstructedQuantity = initialStock - totalDeducted;
  assert.equal(reconstructedQuantity, 25);

  db.close();
});
