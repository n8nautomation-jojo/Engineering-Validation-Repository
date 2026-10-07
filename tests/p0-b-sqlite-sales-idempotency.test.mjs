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

test("PR B: Idempotent replay returns exact prior result without creating any duplicate side effects", async () => {
  const { db, persistence, service, context, cashSession, assignments } = createTestHarness();

  seedBatch(db, {
    id: "batch-idem-1",
    organizationId: "org-001",
    warehouseId: "wh-001",
    productId: "prod-idem",
    batchNumber: "BN-IDEM",
    expiryDate: "2027-01-01",
    quantity: 100,
    status: "ACTIVE",
    version: 0
  });

  const command = {
    idempotencyKey: "idem-key-duplicate-test",
    correlationId: "corr-idem-1",
    context,
    cashSession,
    assignments,
    now: "2026-10-07T10:00:00Z",
    lines: [{ productId: "prod-idem", quantity: 10, unitPrice: money(50, "SDG") }],
    payments: [{ method: "CASH", amount: money(500, "SDG") }]
  };

  // First call
  const firstResult = await service.processSale(command);
  assert.equal(firstResult.status, "COMPLETED");

  // Record table counts after first call
  const countSales1 = db.prepare("SELECT count(*) as n FROM sales").get().n;
  const countLines1 = db.prepare("SELECT count(*) as n FROM sale_lines").get().n;
  const countPayments1 = db.prepare("SELECT count(*) as n FROM payments").get().n;
  const countInvTx1 = db.prepare("SELECT count(*) as n FROM inventory_transactions").get().n;
  const countMovements1 = db.prepare("SELECT count(*) as n FROM stock_movements").get().n;
  const countOutbox1 = db.prepare("SELECT count(*) as n FROM outbox_events").get().n;
  const countAudit1 = db.prepare("SELECT count(*) as n FROM audit_records").get().n;
  const countIdem1 = db.prepare("SELECT count(*) as n FROM idempotency_records").get().n;
  const batchAfterFirst = await persistence.getBatch("batch-idem-1");

  assert.equal(countSales1, 1);
  assert.equal(countLines1, 1);
  assert.equal(countPayments1, 1);
  assert.equal(countInvTx1, 1);
  assert.equal(countMovements1, 1);
  assert.equal(countOutbox1, 1);
  assert.equal(countAudit1, 1);
  assert.equal(countIdem1, 1);
  assert.equal(batchAfterFirst.quantity.value, 90);

  // Second call with identical payload
  const secondResult = await service.processSale(command);
  assert.deepEqual(secondResult, firstResult);

  // Verify counts remain EXACTLY unchanged
  const countSales2 = db.prepare("SELECT count(*) as n FROM sales").get().n;
  const countLines2 = db.prepare("SELECT count(*) as n FROM sale_lines").get().n;
  const countPayments2 = db.prepare("SELECT count(*) as n FROM payments").get().n;
  const countInvTx2 = db.prepare("SELECT count(*) as n FROM inventory_transactions").get().n;
  const countMovements2 = db.prepare("SELECT count(*) as n FROM stock_movements").get().n;
  const countOutbox2 = db.prepare("SELECT count(*) as n FROM outbox_events").get().n;
  const countAudit2 = db.prepare("SELECT count(*) as n FROM audit_records").get().n;
  const countIdem2 = db.prepare("SELECT count(*) as n FROM idempotency_records").get().n;
  const batchAfterSecond = await persistence.getBatch("batch-idem-1");

  assert.equal(countSales2, 1);
  assert.equal(countLines2, 1);
  assert.equal(countPayments2, 1);
  assert.equal(countInvTx2, 1);
  assert.equal(countMovements2, 1);
  assert.equal(countOutbox2, 1);
  assert.equal(countAudit2, 1);
  assert.equal(countIdem2, 1);
  assert.equal(batchAfterSecond.quantity.value, 90); // Quantity deducted only once

  db.close();
});

test("PR B: Reusing idempotency key with conflicting request payload is rejected", async () => {
  const { db, service, context, cashSession, assignments } = createTestHarness();

  seedBatch(db, {
    id: "batch-idem-2",
    organizationId: "org-001",
    warehouseId: "wh-001",
    productId: "prod-idem-2",
    batchNumber: "BN-IDEM-2",
    expiryDate: "2027-01-01",
    quantity: 100,
    status: "ACTIVE",
    version: 0
  });

  const baseCommand = {
    idempotencyKey: "idem-conflict-key-001",
    correlationId: "corr-1",
    context,
    cashSession,
    assignments,
    now: "2026-10-07T10:00:00Z",
    lines: [{ productId: "prod-idem-2", quantity: 5, unitPrice: money(10, "SDG") }],
    payments: [{ method: "CASH", amount: money(50, "SDG") }]
  };

  await service.processSale(baseCommand);

  // Different request using the same key
  const conflictingCommand = {
    ...baseCommand,
    lines: [{ productId: "prod-idem-2", quantity: 6, unitPrice: money(10, "SDG") }],
    payments: [{ method: "CASH", amount: money(60, "SDG") }]
  };

  await assert.rejects(
    () => service.processSale(conflictingCommand),
    /IDEMPOTENCY_KEY_REUSE_WITH_DIFFERENT_REQUEST/
  );

  db.close();
});
