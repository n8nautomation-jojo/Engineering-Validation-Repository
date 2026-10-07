import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { SqliteSalesPersistence } from "../dist/src/infrastructure/sqlite/sqlite-sales-persistence.js";
import { SalesService } from "../dist/src/application/sales/sales-service.js";
import { money } from "../dist/src/kernel/money.js";
import { openCashSession, closeCashSession } from "../dist/src/domain/cash/cash-session.js";

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

test("PR B: Rejects sale if batch is expired", async () => {
  const { db, service, context, cashSession, assignments } = createTestHarness();

  seedBatch(db, {
    id: "batch-expired",
    organizationId: "org-001",
    warehouseId: "wh-001",
    productId: "prod-expired",
    batchNumber: "BN-EXP",
    expiryDate: "2026-09-01", // Past date
    quantity: 20,
    status: "ACTIVE",
    version: 0
  });

  await assert.rejects(
    () => service.processSale({
      idempotencyKey: "idem-exp-001",
      correlationId: "corr-exp",
      context,
      cashSession,
      assignments,
      now: "2026-10-07T10:00:00Z",
      lines: [{ productId: "prod-expired", quantity: 1, unitPrice: money(10, "SDG") }],
      payments: [{ method: "CASH", amount: money(10, "SDG") }]
    }),
    /EXPIRED_BATCH/
  );

  db.close();
});

test("PR B: Rejects sale if inventory stock is insufficient", async () => {
  const { db, service, context, cashSession, assignments } = createTestHarness();

  seedBatch(db, {
    id: "batch-small",
    organizationId: "org-001",
    warehouseId: "wh-001",
    productId: "prod-scarce",
    batchNumber: "BN-SCARCE",
    expiryDate: "2027-01-01",
    quantity: 3,
    status: "ACTIVE",
    version: 0
  });

  await assert.rejects(
    () => service.processSale({
      idempotencyKey: "idem-insuf-001",
      correlationId: "corr-insuf",
      context,
      cashSession,
      assignments,
      now: "2026-10-07T10:00:00Z",
      lines: [{ productId: "prod-scarce", quantity: 5, unitPrice: money(10, "SDG") }],
      payments: [{ method: "CASH", amount: money(50, "SDG") }]
    }),
    /INSUFFICIENT_STOCK/
  );

  db.close();
});

test("PR B: Rejects sale if offline allocation capacity is exhausted", async () => {
  const { db, service, context, cashSession, assignments } = createTestHarness();

  seedBatch(db, {
    id: "batch-plenty",
    organizationId: "org-001",
    warehouseId: "wh-001",
    productId: "prod-alloc-test",
    batchNumber: "BN-PLENTY",
    expiryDate: "2027-01-01",
    quantity: 100,
    status: "ACTIVE",
    version: 0
  });

  // Allocation capacity: 10 total, 9 consumed => 1 remaining
  seedAllocation(db, {
    id: "alloc-tight",
    branchId: "branch-001",
    warehouseId: "wh-001",
    deviceId: "dev-001",
    productId: "prod-alloc-test",
    allocatedCapacity: 10,
    consumedCapacity: 9,
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

  // Demand 2 units > 1 remaining
  await assert.rejects(
    () => service.processSale({
      idempotencyKey: "idem-alloc-exh-001",
      correlationId: "corr-alloc",
      context,
      cashSession,
      assignments,
      authorizationSnapshot,
      offline: true,
      now: "2026-10-07T10:00:00Z",
      lines: [{ productId: "prod-alloc-test", quantity: 2, unitPrice: money(10, "SDG") }],
      payments: [{ method: "CASH", amount: money(20, "SDG") }]
    }),
    /OFFLINE_ALLOCATION_EXHAUSTED/
  );

  db.close();
});

test("PR B: Rejects explicit batch selection that violates FEFO ordering", async () => {
  const { db, service, context, cashSession, assignments } = createTestHarness();

  seedBatch(db, {
    id: "batch-first",
    organizationId: "org-001",
    warehouseId: "wh-001",
    productId: "prod-fefo-test",
    batchNumber: "BN-1",
    expiryDate: "2026-11-01",
    quantity: 10,
    status: "ACTIVE",
    version: 0
  });

  seedBatch(db, {
    id: "batch-second",
    organizationId: "org-001",
    warehouseId: "wh-001",
    productId: "prod-fefo-test",
    batchNumber: "BN-2",
    expiryDate: "2027-05-01",
    quantity: 10,
    status: "ACTIVE",
    version: 0
  });

  // Client attempts to explicitly request batch-second when batch-first has available stock
  await assert.rejects(
    () => service.processSale({
      idempotencyKey: "idem-fefo-viol-001",
      correlationId: "corr-fefo",
      context,
      cashSession,
      assignments,
      now: "2026-10-07T10:00:00Z",
      lines: [{
        productId: "prod-fefo-test",
        quantity: 2,
        unitPrice: money(10, "SDG"),
        requestedBatchId: "batch-second"
      }],
      payments: [{ method: "CASH", amount: money(20, "SDG") }]
    }),
    /FEFO_VIOLATION/
  );

  db.close();
});

test("PR B: Rejects sale if cash session is closed", async () => {
  const { db, service, context, cashSession, assignments } = createTestHarness();

  seedBatch(db, {
    id: "batch-ok",
    organizationId: "org-001",
    warehouseId: "wh-001",
    productId: "prod-cs-test",
    batchNumber: "BN-OK",
    expiryDate: "2027-01-01",
    quantity: 10,
    status: "ACTIVE",
    version: 0
  });

  const closedSession = closeCashSession(cashSession, "2026-10-07T09:00:00Z");

  await assert.rejects(
    () => service.processSale({
      idempotencyKey: "idem-cs-closed-001",
      correlationId: "corr-cs",
      context,
      cashSession: closedSession,
      assignments,
      now: "2026-10-07T10:00:00Z",
      lines: [{ productId: "prod-cs-test", quantity: 1, unitPrice: money(10, "SDG") }],
      payments: [{ method: "CASH", amount: money(10, "SDG") }]
    }),
    /CASH_SESSION_NOT_OPEN/
  );

  db.close();
});

test("PR B: Rejects sale if actor lacks sales.create capability", async () => {
  const { db, service, context, cashSession } = createTestHarness();

  seedBatch(db, {
    id: "batch-ok",
    organizationId: "org-001",
    warehouseId: "wh-001",
    productId: "prod-auth-test",
    batchNumber: "BN-OK",
    expiryDate: "2027-01-01",
    quantity: 10,
    status: "ACTIVE",
    version: 0
  });

  const unauthAssignments = [{
    userId: "usr-cashier-1",
    capabilities: ["sales.read"], // missing sales.create
    scope: {
      tenantId: "t-001",
      organizationId: "org-001",
      branchIds: ["branch-001"],
      warehouseIds: ["wh-001"],
      deviceIds: ["dev-001"]
    },
    policyVersion: "v1"
  }];

  await assert.rejects(
    () => service.processSale({
      idempotencyKey: "idem-unauth-001",
      correlationId: "corr-unauth",
      context,
      cashSession,
      assignments: unauthAssignments,
      now: "2026-10-07T10:00:00Z",
      lines: [{ productId: "prod-auth-test", quantity: 1, unitPrice: money(10, "SDG") }],
      payments: [{ method: "CASH", amount: money(10, "SDG") }]
    }),
    /UNAUTHORIZED: CAPABILITY_OR_SCOPE_DENIED/
  );

  db.close();
});

test("PR B: Rejects sale if payment amount does not match total lines amount", async () => {
  const { db, service, context, cashSession, assignments } = createTestHarness();

  seedBatch(db, {
    id: "batch-ok",
    organizationId: "org-001",
    warehouseId: "wh-001",
    productId: "prod-pay-test",
    batchNumber: "BN-OK",
    expiryDate: "2027-01-01",
    quantity: 10,
    status: "ACTIVE",
    version: 0
  });

  await assert.rejects(
    () => service.processSale({
      idempotencyKey: "idem-mismatch-001",
      correlationId: "corr-mismatch",
      context,
      cashSession,
      assignments,
      now: "2026-10-07T10:00:00Z",
      lines: [{ productId: "prod-pay-test", quantity: 2, unitPrice: money(50, "SDG") }], // total 100
      payments: [{ method: "CASH", amount: money(80, "SDG") }] // paid 80
    }),
    /PAYMENT_AMOUNT_MISMATCH/
  );

  db.close();
});
