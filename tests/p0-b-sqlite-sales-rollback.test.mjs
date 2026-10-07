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

const failureStages = [
  "AFTER_SALE_INSERT",
  "AFTER_LINE_INSERT",
  "AFTER_PAYMENT_INSERT",
  "AFTER_INVENTORY_TX_INSERT",
  "AFTER_STOCK_MOVEMENT_INSERT",
  "AFTER_ALLOCATION_CONSUMPTION",
  "AFTER_OUTBOX_INSERT",
  "AFTER_AUDIT_INSERT",
  "AFTER_IDEMPOTENCY_INSERT"
];

for (const stage of failureStages) {
  test(`PR B: Rollback verification on failure injection at ${stage}`, async () => {
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

    // Seed batch
    db.prepare(`
      INSERT INTO batches (id, organization_id, warehouse_id, product_id, batch_number, expiry_date, quantity, status, version)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run("batch-fail-test", "org-001", "wh-001", "prod-fail", "BN-FAIL", "2027-01-01", 50, "ACTIVE", 0);

    // Seed allocation
    db.prepare(`
      INSERT INTO offline_allocations (id, branch_id, warehouse_id, device_id, product_id, allocated_capacity, consumed_capacity, released_capacity, state, version)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run("alloc-fail-test", "branch-001", "wh-001", "dev-001", "prod-fail", 30, 0, 0, "ACTIVE", 0);

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

    // Attempt sale with failure injection at the specific stage
    await assert.rejects(
      () => service.processSale({
        idempotencyKey: `idem-fail-${stage}`,
        correlationId: `corr-fail-${stage}`,
        context,
        cashSession,
        assignments,
        authorizationSnapshot,
        offline: true,
        now: "2026-10-07T10:00:00Z",
        lines: [{ productId: "prod-fail", quantity: 5, unitPrice: money(20, "SDG") }],
        payments: [{ method: "CASH", amount: money(100, "SDG") }],
        failureInjectionStage: stage
      }),
      new RegExp(`INJECTED_FAILURE_${stage}`)
    );

    // Verify complete rollback: zero partial business or side effects in ANY table
    assert.equal(db.prepare("SELECT count(*) as n FROM sales").get().n, 0, `sales table must be empty after rollback at ${stage}`);
    assert.equal(db.prepare("SELECT count(*) as n FROM sale_lines").get().n, 0, `sale_lines table must be empty after rollback at ${stage}`);
    assert.equal(db.prepare("SELECT count(*) as n FROM payments").get().n, 0, `payments table must be empty after rollback at ${stage}`);
    assert.equal(db.prepare("SELECT count(*) as n FROM inventory_transactions").get().n, 0, `inventory_transactions must be empty after rollback at ${stage}`);
    assert.equal(db.prepare("SELECT count(*) as n FROM stock_movements").get().n, 0, `stock_movements must be empty after rollback at ${stage}`);
    assert.equal(db.prepare("SELECT count(*) as n FROM outbox_events").get().n, 0, `outbox_events must be empty after rollback at ${stage}`);
    assert.equal(db.prepare("SELECT count(*) as n FROM audit_records").get().n, 0, `audit_records must be empty after rollback at ${stage}`);
    assert.equal(db.prepare("SELECT count(*) as n FROM idempotency_records").get().n, 0, `idempotency_records must be empty after rollback at ${stage}`);

    // Verify batch quantity is untouched (50)
    const batch = await persistence.getBatch("batch-fail-test");
    assert.equal(batch.quantity.value, 50, `batch quantity must remain 50 after rollback at ${stage}`);

    // Verify offline allocation consumed capacity is untouched (0)
    const alloc = await persistence.getOfflineAllocation("alloc-fail-test");
    assert.equal(alloc.consumedCapacity, 0, `allocation consumedCapacity must remain 0 after rollback at ${stage}`);

    db.close();
  });
}
