import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";
import {
  createOfflineAllocation,
  remainingCapacity,
  consumeOfflineAllocation,
  suspendOfflineAllocation,
  activateOfflineAllocation,
  expireOfflineAllocation,
  replenishOfflineAllocation,
  startReconciliation,
  reconcileOfflineAllocation
} from "../dist/src/domain/inventory/offline-allocation.js";
import { validateAndConsumeOfflineSaleSafety } from "../dist/src/application/sales/offline-sale-safety.js";
import { SqliteSalesPersistence } from "../dist/src/infrastructure/sqlite/sqlite-sales-persistence.js";
import { SalesService } from "../dist/src/application/sales/sales-service.js";
import { money } from "../dist/src/kernel/money.js";
import { openCashSession } from "../dist/src/domain/cash/cash-session.js";

// --- Domain Lifecycle Tests ---

test("A1 Domain: createOfflineAllocation initializes active allocation with valid capacity", () => {
  const a = createOfflineAllocation({
    id: "alloc-01",
    branchId: "branch-01",
    warehouseId: "wh-01",
    deviceId: "dev-01",
    productId: "prod-01",
    allocatedCapacity: 20
  });
  assert.equal(a.state, "ACTIVE");
  assert.equal(a.allocatedCapacity, 20);
  assert.equal(a.consumedCapacity, 0);
  assert.equal(a.releasedCapacity, 0);
  assert.equal(a.version, 0);
  assert.equal(remainingCapacity(a), 20);

  assert.throws(() => createOfflineAllocation({
    id: "alloc-02",
    branchId: "branch-01",
    warehouseId: "wh-01",
    deviceId: "dev-01",
    productId: "prod-01",
    allocatedCapacity: -5
  }), /INVALID_ALLOCATION_CAPACITY/);
});

test("A1 Domain: remainingCapacity calculates allocated - consumed + released accurately", () => {
  const a = {
    id: "alloc-01",
    branchId: "branch-01",
    warehouseId: "wh-01",
    deviceId: "dev-01",
    productId: "prod-01",
    allocatedCapacity: 50,
    consumedCapacity: 30,
    releasedCapacity: 5,
    state: "ACTIVE",
    version: 1
  };
  assert.equal(remainingCapacity(a), 25);
});

test("A1 Domain: consumeOfflineAllocation transitions ACTIVE to EXHAUSTED upon reaching capacity limit", () => {
  const a = createOfflineAllocation({
    id: "alloc-01",
    branchId: "branch-01",
    warehouseId: "wh-01",
    deviceId: "dev-01",
    productId: "prod-01",
    allocatedCapacity: 10
  });

  const partial = consumeOfflineAllocation(a, 6);
  assert.equal(partial.state, "ACTIVE");
  assert.equal(partial.consumedCapacity, 6);
  assert.equal(remainingCapacity(partial), 4);
  assert.equal(partial.version, 1);

  const exhausted = consumeOfflineAllocation(partial, 4);
  assert.equal(exhausted.state, "EXHAUSTED");
  assert.equal(exhausted.consumedCapacity, 10);
  assert.equal(remainingCapacity(exhausted), 0);
  assert.equal(exhausted.version, 2);
});

test("A1 Domain: consumeOfflineAllocation rejects over-consumption and non-positive quantity", () => {
  const a = createOfflineAllocation({
    id: "alloc-01",
    branchId: "branch-01",
    warehouseId: "wh-01",
    deviceId: "dev-01",
    productId: "prod-01",
    allocatedCapacity: 5
  });

  assert.throws(() => consumeOfflineAllocation(a, 6), /OFFLINE_ALLOCATION_EXHAUSTED/);
  assert.throws(() => consumeOfflineAllocation(a, 0), /INVALID_ALLOCATION_CONSUMPTION/);
  assert.throws(() => consumeOfflineAllocation(a, -2), /INVALID_ALLOCATION_CONSUMPTION/);
});

test("A1 Domain: consumeOfflineAllocation rejects consumption when state is not ACTIVE", () => {
  const a = createOfflineAllocation({
    id: "alloc-01",
    branchId: "branch-01",
    warehouseId: "wh-01",
    deviceId: "dev-01",
    productId: "prod-01",
    allocatedCapacity: 10
  });
  const suspended = suspendOfflineAllocation(a);
  assert.throws(() => consumeOfflineAllocation(suspended, 1), /OFFLINE_ALLOCATION_UNAVAILABLE/);

  const expired = expireOfflineAllocation(a);
  assert.throws(() => consumeOfflineAllocation(expired, 1), /OFFLINE_ALLOCATION_UNAVAILABLE/);
});

test("A1 Domain: suspendOfflineAllocation transitions ACTIVE and EXHAUSTED to SUSPENDED", () => {
  const a = createOfflineAllocation({
    id: "alloc-01",
    branchId: "branch-01",
    warehouseId: "wh-01",
    deviceId: "dev-01",
    productId: "prod-01",
    allocatedCapacity: 10
  });
  const s1 = suspendOfflineAllocation(a);
  assert.equal(s1.state, "SUSPENDED");
  assert.equal(s1.version, 1);

  const exhausted = consumeOfflineAllocation(a, 10);
  const s2 = suspendOfflineAllocation(exhausted);
  assert.equal(s2.state, "SUSPENDED");
  assert.equal(s2.version, 2);

  assert.throws(() => suspendOfflineAllocation(s1), /INVALID_ALLOCATION_TRANSITION/);
});

test("A1 Domain: activateOfflineAllocation reactivates SUSPENDED to ACTIVE when remaining capacity > 0", () => {
  const a = createOfflineAllocation({
    id: "alloc-01",
    branchId: "branch-01",
    warehouseId: "wh-01",
    deviceId: "dev-01",
    productId: "prod-01",
    allocatedCapacity: 10
  });
  const suspended = suspendOfflineAllocation(a);
  const active = activateOfflineAllocation(suspended);
  assert.equal(active.state, "ACTIVE");
  assert.equal(active.version, 2);

  // When remaining capacity is 0, activation is rejected
  const exhausted = consumeOfflineAllocation(a, 10);
  const suspendedEmpty = suspendOfflineAllocation(exhausted);
  assert.throws(() => activateOfflineAllocation(suspendedEmpty), /CANNOT_ACTIVATE_EMPTY_ALLOCATION/);

  // Calling activate on non-SUSPENDED throws INVALID_ALLOCATION_TRANSITION
  assert.throws(() => activateOfflineAllocation(a), /INVALID_ALLOCATION_TRANSITION/);
});

test("A1 Domain: expireOfflineAllocation transitions ACTIVE to EXPIRED", () => {
  const a = createOfflineAllocation({
    id: "alloc-01",
    branchId: "branch-01",
    warehouseId: "wh-01",
    deviceId: "dev-01",
    productId: "prod-01",
    allocatedCapacity: 10
  });
  const exp = expireOfflineAllocation(a);
  assert.equal(exp.state, "EXPIRED");
  assert.equal(exp.version, 1);

  assert.throws(() => expireOfflineAllocation(exp), /INVALID_ALLOCATION_TRANSITION/);
});

test("A1 Domain: replenishOfflineAllocation adds capacity and transitions EXHAUSTED to ACTIVE", () => {
  const a = createOfflineAllocation({
    id: "alloc-01",
    branchId: "branch-01",
    warehouseId: "wh-01",
    deviceId: "dev-01",
    productId: "prod-01",
    allocatedCapacity: 5
  });
  const exhausted = consumeOfflineAllocation(a, 5);
  assert.equal(exhausted.state, "EXHAUSTED");

  const replenished = replenishOfflineAllocation(exhausted, 15);
  assert.equal(replenished.state, "ACTIVE");
  assert.equal(replenished.allocatedCapacity, 20);
  assert.equal(remainingCapacity(replenished), 15);
  assert.equal(replenished.version, 2);

  // Rejects invalid additions
  assert.throws(() => replenishOfflineAllocation(exhausted, 0), /INVALID_ALLOCATION_CAPACITY/);
  assert.throws(() => replenishOfflineAllocation(exhausted, -5), /INVALID_ALLOCATION_CAPACITY/);
});

test("A1 Domain: replenishOfflineAllocation rejects replenishment when allocation is EXPIRED or SUSPENDED", () => {
  const a = createOfflineAllocation({
    id: "alloc-01",
    branchId: "branch-01",
    warehouseId: "wh-01",
    deviceId: "dev-01",
    productId: "prod-01",
    allocatedCapacity: 5
  });
  const expired = expireOfflineAllocation(a);
  assert.throws(() => replenishOfflineAllocation(expired, 10), /ALLOCATION_NOT_REPLENISHABLE/);

  const suspended = suspendOfflineAllocation(a);
  assert.throws(() => replenishOfflineAllocation(suspended, 10), /ALLOCATION_NOT_REPLENISHABLE/);
});

test("A1 Domain: startReconciliation allows valid states to transition to RECONCILING", () => {
  const a = createOfflineAllocation({
    id: "alloc-01",
    branchId: "branch-01",
    warehouseId: "wh-01",
    deviceId: "dev-01",
    productId: "prod-01",
    allocatedCapacity: 10
  });
  const r1 = startReconciliation(a);
  assert.equal(r1.state, "RECONCILING");
  assert.equal(r1.version, 1);

  const recResult = reconcileOfflineAllocation(r1);
  assert.equal(recResult.state, "RECONCILED");
  assert.equal(recResult.version, 2);

  // Calling reconcile when not RECONCILING throws
  assert.throws(() => reconcileOfflineAllocation(a), /INVALID_ALLOCATION_TRANSITION/);
});

// --- Application Level Safety Function Tests ---

test("A1 Application: validateAndConsumeOfflineSaleSafety accepts valid offline sales within scope", () => {
  const context = {
    tenantId: "t-001",
    organizationId: "org-001",
    branchId: "branch-001",
    warehouseId: "wh-001",
    deviceId: "dev-001",
    userId: "usr-01",
    correlationId: "corr-001"
  };
  const alloc = createOfflineAllocation({
    id: "alloc-01",
    branchId: "branch-001",
    warehouseId: "wh-001",
    deviceId: "dev-001",
    productId: "prod-01",
    allocatedCapacity: 10
  });

  const result = validateAndConsumeOfflineSaleSafety(context, {
    allocation: alloc,
    productId: "prod-01",
    batchExpired: false,
    fefoEligible: true,
    quantity: 4
  });

  assert.equal(result.state, "ACTIVE");
  assert.equal(result.consumedCapacity, 4);
});

test("A1 Application: validateAndConsumeOfflineSaleSafety rejects scope mismatches", () => {
  const baseContext = {
    tenantId: "t-001",
    organizationId: "org-001",
    branchId: "branch-001",
    warehouseId: "wh-001",
    deviceId: "dev-001",
    userId: "usr-01",
    correlationId: "corr-001"
  };
  const alloc = createOfflineAllocation({
    id: "alloc-01",
    branchId: "branch-001",
    warehouseId: "wh-001",
    deviceId: "dev-001",
    productId: "prod-01",
    allocatedCapacity: 10
  });

  // Branch mismatch
  assert.throws(() => validateAndConsumeOfflineSaleSafety({ ...baseContext, branchId: "other-branch" }, {
    allocation: alloc,
    productId: "prod-01",
    batchExpired: false,
    fefoEligible: true,
    quantity: 1
  }), /BRANCH_SCOPE_MISMATCH/);

  // Device mismatch
  assert.throws(() => validateAndConsumeOfflineSaleSafety({ ...baseContext, deviceId: "other-dev" }, {
    allocation: alloc,
    productId: "prod-01",
    batchExpired: false,
    fefoEligible: true,
    quantity: 1
  }), /DEVICE_SCOPE_MISMATCH/);

  // Warehouse mismatch
  assert.throws(() => validateAndConsumeOfflineSaleSafety({ ...baseContext, warehouseId: "other-wh" }, {
    allocation: alloc,
    productId: "prod-01",
    batchExpired: false,
    fefoEligible: true,
    quantity: 1
  }), /WAREHOUSE_SCOPE_MISMATCH/);

  // Product mismatch
  assert.throws(() => validateAndConsumeOfflineSaleSafety(baseContext, {
    allocation: alloc,
    productId: "wrong-product",
    batchExpired: false,
    fefoEligible: true,
    quantity: 1
  }), /PRODUCT_SCOPE_MISMATCH/);
});

test("A1 Application: validateAndConsumeOfflineSaleSafety rejects non-ACTIVE allocation states", () => {
  const context = {
    tenantId: "t-001",
    organizationId: "org-001",
    branchId: "branch-001",
    warehouseId: "wh-001",
    deviceId: "dev-001",
    userId: "usr-01",
    correlationId: "corr-001"
  };
  const alloc = createOfflineAllocation({
    id: "alloc-01",
    branchId: "branch-001",
    warehouseId: "wh-001",
    deviceId: "dev-001",
    productId: "prod-01",
    allocatedCapacity: 10
  });

  const expired = expireOfflineAllocation(alloc);
  assert.throws(() => validateAndConsumeOfflineSaleSafety(context, {
    allocation: expired,
    productId: "prod-01",
    batchExpired: false,
    fefoEligible: true,
    quantity: 1
  }), /OFFLINE_ALLOCATION_UNAVAILABLE/);

  const suspended = suspendOfflineAllocation(alloc);
  assert.throws(() => validateAndConsumeOfflineSaleSafety(context, {
    allocation: suspended,
    productId: "prod-01",
    batchExpired: false,
    fefoEligible: true,
    quantity: 1
  }), /OFFLINE_ALLOCATION_UNAVAILABLE/);
});

// --- SQLite Persistence & SalesService Integration Tests ---

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
    correlationId: "corr-ctx-001"
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
    issuedAt: "2026-10-11T00:00:00Z",
    expiresAt: "2026-10-11T23:59:59Z",
    deviceId: "dev-001",
    userId: "usr-cashier-1",
    assignments,
    integrityVerified: true,
    revoked: false
  };

  return { db, persistence, service, context, cashSession, assignments, authorizationSnapshot };
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

test("A1 SQLite Integration: SalesService processes offline sale and atomically persists allocation deduction", async () => {
  const { db, persistence, service, context, cashSession, assignments, authorizationSnapshot } = createTestHarness();

  seedBatch(db, {
    id: "batch-1",
    organizationId: "org-001",
    warehouseId: "wh-001",
    productId: "prod-001",
    batchNumber: "BN-001",
    expiryDate: "2027-12-31",
    quantity: 50,
    status: "ACTIVE",
    version: 0
  });

  seedAllocation(db, {
    id: "alloc-01",
    branchId: "branch-001",
    warehouseId: "wh-001",
    deviceId: "dev-001",
    productId: "prod-001",
    allocatedCapacity: 20,
    consumedCapacity: 5,
    releasedCapacity: 0,
    state: "ACTIVE",
    version: 1
  });

  const res = await service.processSale({
    idempotencyKey: "idem-offline-01",
    correlationId: "corr-offline-01",
    context,
    cashSession,
    assignments,
    authorizationSnapshot,
    offline: true,
    now: "2026-10-11T10:00:00Z",
    lines: [{
      productId: "prod-001",
      quantity: 5,
      unitPrice: money(100, "SDG")
    }],
    payments: [{
      method: "CASH",
      amount: money(500, "SDG")
    }]
  });

  assert.equal(res.status, "COMPLETED");
  assert.equal(res.offline, true);

  // Check updated offline allocation in database
  const allocRow = db.prepare("SELECT * FROM offline_allocations WHERE id = ?").get("alloc-01");
  assert.equal(Number(allocRow.consumed_capacity), 10);
  assert.equal(allocRow.state, "ACTIVE");
  assert.equal(Number(allocRow.version), 2);
});

test("A1 SQLite Integration: SalesService rejects offline sale on warehouse scope mismatch", async () => {
  const { db, service, context, cashSession, assignments, authorizationSnapshot } = createTestHarness();

  seedBatch(db, {
    id: "batch-1",
    organizationId: "org-001",
    warehouseId: "wh-001",
    productId: "prod-001",
    batchNumber: "BN-001",
    expiryDate: "2027-12-31",
    quantity: 50,
    status: "ACTIVE",
    version: 0
  });

  // Allocation is assigned to a different warehouse (wh-DIFFERENT)
  seedAllocation(db, {
    id: "alloc-01",
    branchId: "branch-001",
    warehouseId: "wh-DIFFERENT",
    deviceId: "dev-001",
    productId: "prod-001",
    allocatedCapacity: 20,
    consumedCapacity: 0,
    releasedCapacity: 0,
    state: "ACTIVE",
    version: 0
  });

  await assert.rejects(
    () => service.processSale({
      idempotencyKey: "idem-offline-wh-mismatch",
      correlationId: "corr-wh-01",
      context,
      cashSession,
      assignments,
      authorizationSnapshot,
      offline: true,
      now: "2026-10-11T10:00:00Z",
      lines: [{
        productId: "prod-001",
        quantity: 5,
        unitPrice: money(100, "SDG")
      }],
      payments: [{
        method: "CASH",
        amount: money(500, "SDG")
      }]
    }),
    /WAREHOUSE_SCOPE_MISMATCH/
  );
});

test("A1 SQLite Integration: SalesService rejects offline sale on non-ACTIVE allocation (EXPIRED and SUSPENDED)", async () => {
  const { db, service, context, cashSession, assignments, authorizationSnapshot } = createTestHarness();

  seedBatch(db, {
    id: "batch-1",
    organizationId: "org-001",
    warehouseId: "wh-001",
    productId: "prod-001",
    batchNumber: "BN-001",
    expiryDate: "2027-12-31",
    quantity: 50,
    status: "ACTIVE",
    version: 0
  });

  // 1. Test EXPIRED allocation
  seedAllocation(db, {
    id: "alloc-expired",
    branchId: "branch-001",
    warehouseId: "wh-001",
    deviceId: "dev-001",
    productId: "prod-001",
    allocatedCapacity: 20,
    consumedCapacity: 0,
    releasedCapacity: 0,
    state: "EXPIRED",
    version: 1
  });

  // 1. In SQLite DB, non-ACTIVE allocation is not selected by findOfflineAllocation -> OFFLINE_ALLOCATION_NOT_FOUND
  await assert.rejects(
    () => service.processSale({
      idempotencyKey: "idem-offline-exp",
      correlationId: "corr-exp-01",
      context,
      cashSession,
      assignments,
      authorizationSnapshot,
      offline: true,
      now: "2026-10-11T10:00:00Z",
      lines: [{
        productId: "prod-001",
        quantity: 5,
        unitPrice: money(100, "SDG")
      }],
      payments: [{
        method: "CASH",
        amount: money(500, "SDG")
      }]
    }),
    /OFFLINE_ALLOCATION_NOT_FOUND/
  );

  // 2. Test SUSPENDED allocation in SQLite DB
  db.prepare("UPDATE offline_allocations SET state = 'SUSPENDED' WHERE id = 'alloc-expired'").run();

  await assert.rejects(
    () => service.processSale({
      idempotencyKey: "idem-offline-susp",
      correlationId: "corr-susp-01",
      context,
      cashSession,
      assignments,
      authorizationSnapshot,
      offline: true,
      now: "2026-10-11T10:00:00Z",
      lines: [{
        productId: "prod-001",
        quantity: 5,
        unitPrice: money(100, "SDG")
      }],
      payments: [{
        method: "CASH",
        amount: money(500, "SDG")
      }]
    }),
    /OFFLINE_ALLOCATION_NOT_FOUND/
  );

  // 3. Directly verify SalesService state guard throws OFFLINE_ALLOCATION_UNAVAILABLE if adapter returns non-ACTIVE allocation
  const mockPersistence = {
    findIdempotency: async () => null,
    findBatchesForProduct: async () => [],
    findOfflineAllocation: async () => ({
      id: "alloc-01",
      branchId: context.branchId,
      warehouseId: context.warehouseId,
      deviceId: context.deviceId,
      productId: "prod-001",
      allocatedCapacity: 20,
      consumedCapacity: 0,
      releasedCapacity: 0,
      state: "SUSPENDED",
      version: 1
    }),
    executeSaleAtomic: async () => {},
    getSale: async () => null,
    getInventoryTransaction: async () => null
  };
  const mockService = new SalesService(mockPersistence);

  await assert.rejects(
    () => mockService.processSale({
      idempotencyKey: "idem-mock-susp",
      correlationId: "corr-mock-01",
      context,
      cashSession,
      assignments,
      authorizationSnapshot,
      offline: true,
      now: "2026-10-11T10:00:00Z",
      lines: [{
        productId: "prod-001",
        quantity: 5,
        unitPrice: money(100, "SDG")
      }],
      payments: [{
        method: "CASH",
        amount: money(500, "SDG")
      }]
    }),
    /OFFLINE_ALLOCATION_UNAVAILABLE/
  );
});

test("A1 SQLite Integration: Atomic rollback restores allocation and stock on failure injection", async () => {
  const { db, service, context, cashSession, assignments, authorizationSnapshot } = createTestHarness();

  seedBatch(db, {
    id: "batch-1",
    organizationId: "org-001",
    warehouseId: "wh-001",
    productId: "prod-001",
    batchNumber: "BN-001",
    expiryDate: "2027-12-31",
    quantity: 50,
    status: "ACTIVE",
    version: 0
  });

  seedAllocation(db, {
    id: "alloc-01",
    branchId: "branch-001",
    warehouseId: "wh-001",
    deviceId: "dev-001",
    productId: "prod-001",
    allocatedCapacity: 20,
    consumedCapacity: 5,
    releasedCapacity: 0,
    state: "ACTIVE",
    version: 1
  });

  await assert.rejects(
    () => service.processSale({
      idempotencyKey: "idem-rollback-01",
      correlationId: "corr-rb-01",
      context,
      cashSession,
      assignments,
      authorizationSnapshot,
      offline: true,
      now: "2026-10-11T10:00:00Z",
      failureInjectionStage: "AFTER_ALLOCATION_CONSUMPTION",
      lines: [{
        productId: "prod-001",
        quantity: 5,
        unitPrice: money(100, "SDG")
      }],
      payments: [{
        method: "CASH",
        amount: money(500, "SDG")
      }]
    }),
    /INJECTED_FAILURE_AFTER_ALLOCATION_CONSUMPTION/
  );

  // Allocation capacity remains completely untouched
  const allocRow = db.prepare("SELECT * FROM offline_allocations WHERE id = ?").get("alloc-01");
  assert.equal(Number(allocRow.consumed_capacity), 5);
  assert.equal(Number(allocRow.version), 1);

  // Batch stock remains untouched
  const batchRow = db.prepare("SELECT * FROM batches WHERE id = ?").get("batch-1");
  assert.equal(Number(batchRow.quantity), 50);

  // No sale was inserted
  const saleCount = db.prepare("SELECT count(*) as cnt FROM sales").get();
  assert.equal(Number(saleCount.cnt), 0);
});

test("A1 SQLite Integration: SalesService rejects offline sale when demanded quantity exceeds remaining capacity", async () => {
  const { db, service, context, cashSession, assignments, authorizationSnapshot } = createTestHarness();

  seedBatch(db, {
    id: "batch-1",
    organizationId: "org-001",
    warehouseId: "wh-001",
    productId: "prod-001",
    batchNumber: "BN-001",
    expiryDate: "2027-12-31",
    quantity: 50,
    status: "ACTIVE",
    version: 0
  });

  seedAllocation(db, {
    id: "alloc-01",
    branchId: "branch-001",
    warehouseId: "wh-001",
    deviceId: "dev-001",
    productId: "prod-001",
    allocatedCapacity: 10,
    consumedCapacity: 8,
    releasedCapacity: 0,
    state: "ACTIVE",
    version: 1
  });

  // Attempting to consume 5 when remaining is only 2
  await assert.rejects(
    () => service.processSale({
      idempotencyKey: "idem-exhaust-01",
      correlationId: "corr-exhaust-01",
      context,
      cashSession,
      assignments,
      authorizationSnapshot,
      offline: true,
      now: "2026-10-11T10:00:00Z",
      lines: [{
        productId: "prod-001",
        quantity: 5,
        unitPrice: money(100, "SDG")
      }],
      payments: [{
        method: "CASH",
        amount: money(500, "SDG")
      }]
    }),
    /OFFLINE_ALLOCATION_EXHAUSTED/
  );
});

test("A1 SQLite Integration: Multi-product offline sale atomically deducts both allocations", async () => {
  const { db, persistence, service, context, cashSession, assignments, authorizationSnapshot } = createTestHarness();

  seedBatch(db, {
    id: "batch-p1",
    organizationId: "org-001",
    warehouseId: "wh-001",
    productId: "prod-001",
    batchNumber: "BN-001",
    expiryDate: "2027-12-31",
    quantity: 50,
    status: "ACTIVE",
    version: 0
  });
  seedBatch(db, {
    id: "batch-p2",
    organizationId: "org-001",
    warehouseId: "wh-001",
    productId: "prod-002",
    batchNumber: "BN-002",
    expiryDate: "2027-12-31",
    quantity: 50,
    status: "ACTIVE",
    version: 0
  });

  seedAllocation(db, {
    id: "alloc-p1",
    branchId: "branch-001",
    warehouseId: "wh-001",
    deviceId: "dev-001",
    productId: "prod-001",
    allocatedCapacity: 20,
    consumedCapacity: 0,
    releasedCapacity: 0,
    state: "ACTIVE",
    version: 1
  });
  seedAllocation(db, {
    id: "alloc-p2",
    branchId: "branch-001",
    warehouseId: "wh-001",
    deviceId: "dev-001",
    productId: "prod-002",
    allocatedCapacity: 15,
    consumedCapacity: 5,
    releasedCapacity: 0,
    state: "ACTIVE",
    version: 1
  });

  const res = await service.processSale({
    idempotencyKey: "idem-multi-prod-01",
    correlationId: "corr-multi-01",
    context,
    cashSession,
    assignments,
    authorizationSnapshot,
    offline: true,
    now: "2026-10-11T10:00:00Z",
    lines: [
      {
        productId: "prod-001",
        quantity: 4,
        unitPrice: money(100, "SDG")
      },
      {
        productId: "prod-002",
        quantity: 6,
        unitPrice: money(50, "SDG")
      }
    ],
    payments: [{
      method: "CASH",
      amount: money(700, "SDG")
    }]
  });

  assert.equal(res.status, "COMPLETED");
  assert.equal(res.totalAmount, 700);

  const row1 = db.prepare("SELECT * FROM offline_allocations WHERE id = ?").get("alloc-p1");
  assert.equal(Number(row1.consumed_capacity), 4);
  assert.equal(row1.state, "ACTIVE");

  const row2 = db.prepare("SELECT * FROM offline_allocations WHERE id = ?").get("alloc-p2");
  assert.equal(Number(row2.consumed_capacity), 11);
  assert.equal(row2.state, "ACTIVE");
});

