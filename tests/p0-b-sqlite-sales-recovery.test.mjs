import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { SqliteSalesPersistence } from "../dist/src/infrastructure/sqlite/sqlite-sales-persistence.js";
import { SalesService } from "../dist/src/application/sales/sales-service.js";
import { money } from "../dist/src/kernel/money.js";
import { openCashSession } from "../dist/src/domain/cash/cash-session.js";

const m1 = fs.readFileSync(new URL("../docs/05-data/migrations/sqlite/001_p0_4_foundation.sql", import.meta.url), "utf8");
const m2 = fs.readFileSync(new URL("../docs/05-data/migrations/sqlite/002_sales_vertical_slice.sql", import.meta.url), "utf8");

const testDbPath = path.resolve("./tests/test-recovery-disk.db");

function cleanup() {
  if (fs.existsSync(testDbPath)) {
    try { fs.unlinkSync(testDbPath); } catch {}
  }
}

test("PR B: Process Crash/Restart Simulation - committed sales survive process termination and remain idempotent", async () => {
  cleanup();

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

  // Phase 1: Initialize database file and execute Sale 1
  let db1 = new DatabaseSync(testDbPath);
  db1.exec(m1);
  db1.exec(m2);

  db1.prepare(`
    INSERT INTO batches (id, organization_id, warehouse_id, product_id, batch_number, expiry_date, quantity, status, version)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run("batch-disk-1", "org-001", "wh-001", "prod-disk-1", "BN-DISK", "2027-01-01", 100, "ACTIVE", 0);

  const persistence1 = new SqliteSalesPersistence(db1);
  const service1 = new SalesService(persistence1);

  const saleCommand = {
    idempotencyKey: "idem-disk-key-001",
    correlationId: "corr-disk-001",
    context,
    cashSession,
    assignments,
    now: "2026-10-07T10:00:00Z",
    lines: [{ productId: "prod-disk-1", quantity: 8, unitPrice: money(25, "SDG") }],
    payments: [{ method: "CASH", amount: money(200, "SDG") }]
  };

  const result1 = await service1.processSale(saleCommand);
  assert.equal(result1.status, "COMPLETED");

  // Simulate abrupt process termination: close handle and release
  db1.close();

  // Phase 2: Start new process instance connecting to existing database file
  const db2 = new DatabaseSync(testDbPath);
  const persistence2 = new SqliteSalesPersistence(db2);
  const service2 = new SalesService(persistence2);

  // Verify Sale 1 persisted cleanly on disk
  const recoveredSale = await persistence2.getSale(result1.saleId);
  assert.ok(recoveredSale);
  assert.equal(recoveredSale.totalAmount, 200);
  assert.equal(recoveredSale.status, "COMPLETED");
  assert.equal(recoveredSale.lines.length, 1);
  assert.equal(recoveredSale.lines[0].quantity, 8);

  // Verify stock movement on disk
  const movements = await persistence2.getStockMovements(result1.inventoryTransactionId);
  assert.equal(movements.length, 1);
  assert.equal(movements[0].quantity.value, 8);

  // Verify batch projection on disk
  const batch = await persistence2.getBatch("batch-disk-1");
  assert.equal(batch.quantity.value, 92);

  // Verify outbox event on disk
  const outboxEvents = await persistence2.getOutboxEvents(result1.saleId);
  assert.equal(outboxEvents.length, 1);
  assert.equal(outboxEvents[0].eventType, "sale.completed");

  // Verify idempotency replay across process restarts
  const replayResult = await service2.processSale(saleCommand);
  assert.deepEqual(replayResult, result1);

  // Verify no duplicate sales created on disk after replay
  const totalSales = db2.prepare("SELECT count(*) as n FROM sales").get().n;
  assert.equal(totalSales, 1);

  db2.close();
  cleanup();
});

test("PR B: Process Crash/Restart Simulation - aborted transaction during crash leaves no orphan records", async () => {
  cleanup();

  const db1 = new DatabaseSync(testDbPath);
  db1.exec(m1);
  db1.exec(m2);

  // Begin transaction and insert uncommitted dummy sale
  db1.exec("BEGIN");
  db1.prepare(`
    INSERT INTO sales (
      id, tenant_id, organization_id, branch_id, warehouse_id, device_id,
      cash_session_id, status, currency, total_amount, created_at, version,
      idempotency_key, correlation_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run("uncommitted-sale", "t1", "o1", "b1", "w1", "d1", "cs1", "COMPLETED", "SDG", 100, "2026-10-07T00:00:00Z", 0, "k1", "c1");

  // Explicitly close without COMMIT (simulating sudden termination during active write)
  db1.close();

  // Re-open in fresh process
  const db2 = new DatabaseSync(testDbPath);
  const salesCount = db2.prepare("SELECT count(*) as n FROM sales").get().n;
  assert.equal(salesCount, 0, "Uncommitted transaction must not leave orphan records on disk");

  db2.close();
  cleanup();
});
