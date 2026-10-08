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
    userId: "usr-cashier-1"
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

  return { db, persistence, service, context, cashSession, assignments };
}

function seedBatch(db, b) {
  db.prepare(`
    INSERT INTO batches (id, organization_id, warehouse_id, product_id, batch_number, expiry_date, quantity, status, version)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(b.id, b.organizationId, b.warehouseId, b.productId, b.batchNumber, b.expiryDate, b.quantity, b.status, b.version);
}

function seedAllocation(db, a) {
  db.prepare(`
    INSERT INTO offline_allocations (id, branch_id, warehouse_id, device_id, product_id, allocated_capacity, consumed_capacity, released_capacity, state, version)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(a.id, a.branchId, a.warehouseId, a.deviceId, a.productId, a.allocatedCapacity, a.consumedCapacity, a.releasedCapacity, a.state, a.version);
}

test("PR B: Happy path - complete retail sale persists atomically with all side effects", async () => {
  const { db, persistence, service, context, cashSession, assignments } = createTestHarness();

  seedBatch(db, {
    id: "batch-1",
    organizationId: "org-001",
    warehouseId: "wh-001",
    productId: "prod-paracetamol",
    batchNumber: "BN-001",
    expiryDate: "2027-12-31",
    quantity: 50,
    status: "ACTIVE",
    version: 0
  });

  const res = await service.processSale({
    idempotencyKey: "idem-sale-001",
    correlationId: "corr-001",
    context,
    cashSession,
    assignments,
    now: "2026-10-07T10:00:00Z",
    lines: [{
      productId: "prod-paracetamol",
      quantity: 5,
      unitPrice: money(100, "SDG")
    }],
    payments: [{
      method: "CASH",
      amount: money(500, "SDG")
    }]
  });

  assert.equal(res.status, "COMPLETED");
  assert.equal(res.totalAmount, 500);
  assert.equal(res.currency, "SDG");

  // Verify Sale
  const savedSale = await persistence.getSale(res.saleId);
  assert.ok(savedSale);
  assert.equal(savedSale.totalAmount, 500);
  assert.equal(savedSale.status, "COMPLETED");
  assert.equal(savedSale.lines.length, 1);
  assert.equal(savedSale.lines[0].productId, "prod-paracetamol");
  assert.equal(savedSale.lines[0].batchId, "batch-1");
  assert.equal(savedSale.lines[0].quantity, 5);

  // Verify Payment
  assert.equal(savedSale.payments.length, 1);
  assert.equal(savedSale.payments[0].method, "CASH");
  assert.equal(savedSale.payments[0].amount.amount, 500);
  assert.equal(savedSale.payments[0].verificationStatus, "NOT_REQUIRED");

  // Verify Inventory Transaction & Stock Movement
  const invTx = await persistence.getInventoryTransaction(res.inventoryTransactionId);
  assert.ok(invTx);
  assert.equal(invTx.status, "POSTED");
  assert.equal(invTx.sourceType, "SALE");
  assert.equal(invTx.sourceId, res.saleId);
  assert.equal(invTx.movements.length, 1);
  assert.equal(invTx.movements[0].direction, "OUT");
  assert.equal(invTx.movements[0].quantity.value, 5);
  assert.equal(invTx.movements[0].batchId, "batch-1");

  // Verify Batch projection deducted
  const batch = await persistence.getBatch("batch-1");
  assert.ok(batch);
  assert.equal(batch.quantity.value, 45);

  // Verify Outbox Event
  const outboxEvents = await persistence.getOutboxEvents(res.saleId);
  assert.equal(outboxEvents.length, 1);
  assert.equal(outboxEvents[0].eventType, "sale.completed");
  assert.equal(outboxEvents[0].aggregateId, res.saleId);

  // Verify Audit Record
  const auditRecords = await persistence.getAuditRecords(res.saleId);
  assert.equal(auditRecords.length, 1);
  assert.equal(auditRecords[0].action, "SALE_COMPLETED");
  assert.equal(auditRecords[0].actorId, "usr-cashier-1");

  db.close();
});

test("PR B: Multi-line sale for same product consumes batches deterministically according to FEFO", async () => {
  const { db, persistence, service, context, cashSession, assignments } = createTestHarness();

  // Batch 1 expires sooner (2026-11-01), quantity 10
  seedBatch(db, {
    id: "batch-early",
    organizationId: "org-001",
    warehouseId: "wh-001",
    productId: "prod-amoxicillin",
    batchNumber: "BN-EARLY",
    expiryDate: "2026-11-01",
    quantity: 10,
    status: "ACTIVE",
    version: 0
  });

  // Batch 2 expires later (2027-05-01), quantity 20
  seedBatch(db, {
    id: "batch-later",
    organizationId: "org-001",
    warehouseId: "wh-001",
    productId: "prod-amoxicillin",
    batchNumber: "BN-LATER",
    expiryDate: "2027-05-01",
    quantity: 20,
    status: "ACTIVE",
    version: 0
  });

  // Line 1 asks for 6 units -> gets batch-early
  // Line 2 asks for 4 units -> gets remaining 4 from batch-early (depleting it)
  // Line 3 asks for 5 units -> gets batch-later
  const res = await service.processSale({
    idempotencyKey: "idem-multi-line-001",
    correlationId: "corr-multi",
    context,
    cashSession,
    assignments,
    now: "2026-10-07T10:00:00Z",
    lines: [
      { productId: "prod-amoxicillin", quantity: 6, unitPrice: money(50, "SDG") },
      { productId: "prod-amoxicillin", quantity: 4, unitPrice: money(50, "SDG") },
      { productId: "prod-amoxicillin", quantity: 5, unitPrice: money(50, "SDG") }
    ],
    payments: [{ method: "CASH", amount: money(750, "SDG") }]
  });

  assert.equal(res.status, "COMPLETED");

  const sale = await persistence.getSale(res.saleId);
  assert.equal(sale.lines.length, 3);
  assert.equal(sale.lines[0].batchId, "batch-early");
  assert.equal(sale.lines[1].batchId, "batch-early");
  assert.equal(sale.lines[2].batchId, "batch-later");

  const earlyBatch = await persistence.getBatch("batch-early");
  assert.equal(earlyBatch.quantity.value, 0);
  assert.equal(earlyBatch.status, "DEPLETED");

  const laterBatch = await persistence.getBatch("batch-later");
  assert.equal(laterBatch.quantity.value, 15);

  const movements = await persistence.getStockMovements(res.inventoryTransactionId);
  assert.equal(movements.length, 3);
  assert.equal(movements.reduce((acc, m) => acc + m.quantity.value, 0), 15);

  db.close();
});

test("PR B: Offline sale consumes device allocation atomically in the same transaction", async () => {
  const { db, persistence, service, context, cashSession, assignments } = createTestHarness();

  seedBatch(db, {
    id: "batch-offline-1",
    organizationId: "org-001",
    warehouseId: "wh-001",
    productId: "prod-ibuprofen",
    batchNumber: "BN-IBU",
    expiryDate: "2027-10-01",
    quantity: 100,
    status: "ACTIVE",
    version: 0
  });

  seedAllocation(db, {
    id: "alloc-001",
    branchId: "branch-001",
    warehouseId: "wh-001",
    deviceId: "dev-001",
    productId: "prod-ibuprofen",
    allocatedCapacity: 20,
    consumedCapacity: 5,
    releasedCapacity: 0,
    state: "ACTIVE",
    version: 1
  });

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

  const res = await service.processSale({
    idempotencyKey: "idem-offline-001",
    correlationId: "corr-offline",
    context,
    cashSession,
    assignments,
    authorizationSnapshot,
    offline: true,
    now: "2026-10-07T10:00:00Z",
    lines: [{
      productId: "prod-ibuprofen",
      quantity: 10,
      unitPrice: money(30, "SDG")
    }],
    payments: [{
      method: "CASH",
      amount: money(300, "SDG")
    }]
  });

  assert.equal(res.status, "COMPLETED");
  assert.equal(res.offline, true);

  // Verify offline allocation updated from 5 to 15 consumed
  const alloc = await persistence.getOfflineAllocation("alloc-001");
  assert.ok(alloc);
  assert.equal(alloc.consumedCapacity, 15);
  assert.equal(alloc.state, "ACTIVE");
  assert.equal(alloc.version, 2);

  db.close();
});

test("PR B: Split payment records CASH as NOT_REQUIRED and non-cash as PENDING", async () => {
  const { db, persistence, service, context, cashSession, assignments } = createTestHarness();

  seedBatch(db, {
    id: "batch-split-1",
    organizationId: "org-001",
    warehouseId: "wh-001",
    productId: "prod-split",
    batchNumber: "BN-SPLIT",
    expiryDate: "2027-10-01",
    quantity: 10,
    status: "ACTIVE",
    version: 0
  });

  const res = await service.processSale({
    idempotencyKey: "idem-split-001",
    correlationId: "corr-split",
    context,
    cashSession,
    assignments,
    now: "2026-10-07T10:00:00Z",
    lines: [{
      productId: "prod-split",
      quantity: 2,
      unitPrice: money(500, "SDG")
    }],
    payments: [
      { method: "CASH", amount: money(400, "SDG") },
      { method: "MOBILE_MONEY", amount: money(600, "SDG") }
    ]
  });

  assert.equal(res.status, "COMPLETED");

  const sale = await persistence.getSale(res.saleId);
  assert.equal(sale.payments.length, 2);

  const cashPay = sale.payments.find(p => p.method === "CASH");
  assert.equal(cashPay.amount.amount, 400);
  assert.equal(cashPay.verificationStatus, "NOT_REQUIRED");

  const mobilePay = sale.payments.find(p => p.method === "MOBILE_MONEY");
  assert.equal(mobilePay.amount.amount, 600);
  assert.equal(mobilePay.verificationStatus, "PENDING");

  db.close();
});
