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
  reconcileOfflineAllocation,
  normalizeCanonicalUtc,
  parseCanonicalUtc,
  isOfflineAllocationExpired,
  assertOfflineAllocationValid
} from "../dist/src/domain/inventory/offline-allocation.js";
import { validateAndConsumeOfflineSaleSafety } from "../dist/src/application/sales/offline-sale-safety.js";
import { SqliteSalesPersistence, migrateSqliteSalesSchema } from "../dist/src/infrastructure/sqlite/sqlite-sales-persistence.js";
import { SalesService } from "../dist/src/application/sales/sales-service.js";
import { money } from "../dist/src/kernel/money.js";
import { openCashSession } from "../dist/src/domain/cash/cash-session.js";

const VALID_TEMPORAL = {
  issuedAt: "2026-10-11T00:00:00.000Z",
  validFrom: "2026-10-11T00:00:00.000Z",
  expiresAt: "2026-10-11T23:59:59.000Z"
};

// --- Domain Lifecycle Tests ---

test("A1 Domain: createOfflineAllocation initializes active allocation with valid capacity", () => {
  const a = createOfflineAllocation({
    id: "alloc-01",
    branchId: "branch-01",
    warehouseId: "wh-01",
    deviceId: "dev-01",
    productId: "prod-01",
    allocatedCapacity: 20,
    ...VALID_TEMPORAL
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
    allocatedCapacity: -5,
    ...VALID_TEMPORAL
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
    version: 1,
    ...VALID_TEMPORAL
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
    allocatedCapacity: 10,
    ...VALID_TEMPORAL
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
    allocatedCapacity: 5,
    ...VALID_TEMPORAL
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
    allocatedCapacity: 10,
    ...VALID_TEMPORAL
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
    allocatedCapacity: 10,
    ...VALID_TEMPORAL
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
    allocatedCapacity: 10,
    ...VALID_TEMPORAL
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
    allocatedCapacity: 10,
    ...VALID_TEMPORAL
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
    allocatedCapacity: 5,
    ...VALID_TEMPORAL
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
    allocatedCapacity: 5,
    ...VALID_TEMPORAL
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
    allocatedCapacity: 10,
    ...VALID_TEMPORAL
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
    allocatedCapacity: 10,
    ...VALID_TEMPORAL
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
    allocatedCapacity: 10,
    ...VALID_TEMPORAL
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
    allocatedCapacity: 10,
    ...VALID_TEMPORAL
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
const m3 = fs.readFileSync(new URL("../docs/05-data/migrations/sqlite/003_offline_allocation_validity.sql", import.meta.url), "utf8");

function createTestHarness() {
  const db = new DatabaseSync(":memory:");
  db.exec(m1);
  db.exec(m2);
  db.exec(m3);

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
  const issuedAt = a.issuedAt ?? "2026-10-11T00:00:00.000Z";
  const validFrom = a.validFrom ?? "2026-10-11T00:00:00.000Z";
  const expiresAt = a.expiresAt ?? "2026-10-11T23:59:59.000Z";
  db.prepare(`
    INSERT INTO offline_allocations (id, branch_id, warehouse_id, device_id, product_id, allocated_capacity, consumed_capacity, released_capacity, state, version, issued_at, valid_from, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(a.id, a.branchId, a.warehouseId, a.deviceId, a.productId, a.allocatedCapacity, a.consumedCapacity, a.releasedCapacity, a.state, a.version, issuedAt, validFrom, expiresAt);
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
      version: 1,
      ...VALID_TEMPORAL
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

// --- A1-FOLLOWUP-EXPIRY Tests ---

test("A1 Expiry: normalizeCanonicalUtc accepts strict UTC and non-canonical timezone offsets", () => {
  const utc = "2026-10-11T12:00:00.000Z";
  assert.equal(normalizeCanonicalUtc(utc), utc);

  // Normalizes timezone offset to canonical UTC ISO string
  const offset = "2026-10-11T14:00:00.000+02:00";
  assert.equal(normalizeCanonicalUtc(offset), "2026-10-11T12:00:00.000Z");

  // Rejects invalid formats
  assert.throws(() => normalizeCanonicalUtc("invalid-date"), /INVALID_TIMESTAMP_FORMAT/);
  assert.throws(() => normalizeCanonicalUtc("2026-10-11"), /INVALID_TIMESTAMP_FORMAT/);
  assert.throws(() => normalizeCanonicalUtc("2026-13-01T00:00:00.000Z"), /INVALID_TIMESTAMP_FORMAT/);

  // Rejects calendar rollover (e.g., Feb 29 in non-leap year 2026)
  assert.throws(() => normalizeCanonicalUtc("2026-02-29T10:00:00.000Z"), /INVALID_CALENDAR_DATE/);
  // Rejects April 31
  assert.throws(() => normalizeCanonicalUtc("2026-04-31T10:00:00.000Z"), /INVALID_CALENDAR_DATE/);
  // Accepts Feb 29 in leap year 2028
  assert.equal(normalizeCanonicalUtc("2028-02-29T10:00:00.000Z"), "2028-02-29T10:00:00.000Z");
});

test("A1 Expiry: createOfflineAllocation enforces temporal invariants and rejects missing or ordered timestamps", () => {
  const base = {
    id: "alloc-t0",
    branchId: "branch-01",
    warehouseId: "wh-01",
    deviceId: "dev-01",
    productId: "prod-01",
    allocatedCapacity: 10
  };

  // Missing fields throw OFFLINE_ALLOCATION_INVALID
  assert.throws(() => createOfflineAllocation({ ...base }), /OFFLINE_ALLOCATION_INVALID/);
  assert.throws(() => createOfflineAllocation({ ...base, issuedAt: "2026-10-11T00:00:00.000Z" }), /OFFLINE_ALLOCATION_INVALID/);

  // issuedAt > validFrom throws INVALID_ALLOCATION_TEMPORAL_WINDOW
  assert.throws(() => createOfflineAllocation({
    ...base,
    issuedAt: "2026-10-11T12:00:00.000Z",
    validFrom: "2026-10-11T10:00:00.000Z",
    expiresAt: "2026-10-11T18:00:00.000Z"
  }), /INVALID_ALLOCATION_TEMPORAL_WINDOW/);

  // validFrom >= expiresAt throws INVALID_ALLOCATION_TEMPORAL_WINDOW
  assert.throws(() => createOfflineAllocation({
    ...base,
    issuedAt: "2026-10-11T10:00:00.000Z",
    validFrom: "2026-10-11T18:00:00.000Z",
    expiresAt: "2026-10-11T18:00:00.000Z"
  }), /INVALID_ALLOCATION_TEMPORAL_WINDOW/);

  assert.throws(() => createOfflineAllocation({
    ...base,
    issuedAt: "2026-10-11T10:00:00.000Z",
    validFrom: "2026-10-11T19:00:00.000Z",
    expiresAt: "2026-10-11T18:00:00.000Z"
  }), /INVALID_ALLOCATION_TEMPORAL_WINDOW/);
});

test("A1 Expiry: assertOfflineAllocationValid enforces temporal boundaries (inclusive lower, exclusive upper)", () => {
  const alloc = createOfflineAllocation({
    id: "alloc-b",
    branchId: "branch-01",
    warehouseId: "wh-01",
    deviceId: "dev-01",
    productId: "prod-01",
    allocatedCapacity: 10,
    issuedAt: "2026-10-11T08:00:00.000Z",
    validFrom: "2026-10-11T09:00:00.000Z",
    expiresAt: "2026-10-11T17:00:00.000Z"
  });

  // Before validFrom -> NOT_YET_VALID
  assert.throws(() => assertOfflineAllocationValid(alloc, "2026-10-11T08:59:59.999Z"), /OFFLINE_ALLOCATION_NOT_YET_VALID/);

  // Exact validFrom boundary -> VALID (inclusive)
  assert.doesNotThrow(() => assertOfflineAllocationValid(alloc, "2026-10-11T09:00:00.000Z"));

  // Within window -> VALID
  assert.doesNotThrow(() => assertOfflineAllocationValid(alloc, "2026-10-11T12:00:00.000Z"));
  assert.equal(isOfflineAllocationExpired(alloc, "2026-10-11T12:00:00.000Z"), false);

  // 1ms before expiresAt -> VALID
  assert.doesNotThrow(() => assertOfflineAllocationValid(alloc, "2026-10-11T16:59:59.999Z"));

  // Exact expiresAt boundary -> EXPIRED (exclusive upper boundary)
  assert.throws(() => assertOfflineAllocationValid(alloc, "2026-10-11T17:00:00.000Z"), /OFFLINE_ALLOCATION_EXPIRED/);
  assert.equal(isOfflineAllocationExpired(alloc, "2026-10-11T17:00:00.000Z"), true);

  // After expiresAt -> EXPIRED
  assert.throws(() => assertOfflineAllocationValid(alloc, "2026-10-11T17:00:01.000Z"), /OFFLINE_ALLOCATION_EXPIRED/);
});

test("A1 Expiry: validateAndConsumeOfflineSaleSafety rejects expired and future allocations", () => {
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
    id: "alloc-exp-01",
    branchId: "branch-001",
    warehouseId: "wh-001",
    deviceId: "dev-001",
    productId: "prod-01",
    allocatedCapacity: 10,
    issuedAt: "2026-10-11T08:00:00.000Z",
    validFrom: "2026-10-11T09:00:00.000Z",
    expiresAt: "2026-10-11T17:00:00.000Z"
  });

  // Expired at sale time
  assert.throws(() => validateAndConsumeOfflineSaleSafety(context, {
    allocation: alloc,
    productId: "prod-01",
    batchExpired: false,
    fefoEligible: true,
    quantity: 1,
    now: "2026-10-11T17:00:00.000Z"
  }), /OFFLINE_ALLOCATION_EXPIRED/);

  // Future validFrom at sale time
  assert.throws(() => validateAndConsumeOfflineSaleSafety(context, {
    allocation: alloc,
    productId: "prod-01",
    batchExpired: false,
    fefoEligible: true,
    quantity: 1,
    now: "2026-10-11T08:30:00.000Z"
  }), /OFFLINE_ALLOCATION_NOT_YET_VALID/);

  // Valid at sale time consumes safely
  const consumed = validateAndConsumeOfflineSaleSafety(context, {
    allocation: alloc,
    productId: "prod-01",
    batchExpired: false,
    fefoEligible: true,
    quantity: 2,
    now: "2026-10-11T12:00:00.000Z"
  });
  assert.equal(consumed.consumedCapacity, 2);
});

test("A1 SQLite Integration: SalesService rejects sale when current time is past allocation expires_at", async () => {
  const { db, service, context, cashSession, assignments, authorizationSnapshot } = createTestHarness();

  seedBatch(db, {
    id: "batch-exp",
    organizationId: "org-001",
    warehouseId: "wh-001",
    productId: "prod-exp",
    batchNumber: "BN-EXP",
    expiryDate: "2028-12-31",
    quantity: 50,
    status: "ACTIVE",
    version: 0
  });

  seedAllocation(db, {
    id: "alloc-expired-window",
    branchId: "branch-001",
    warehouseId: "wh-001",
    deviceId: "dev-001",
    productId: "prod-exp",
    allocatedCapacity: 20,
    consumedCapacity: 0,
    releasedCapacity: 0,
    state: "ACTIVE",
    version: 0,
    issuedAt: "2026-10-11T08:00:00.000Z",
    validFrom: "2026-10-11T09:00:00.000Z",
    expiresAt: "2026-10-11T12:00:00.000Z"
  });

  // Attempt sale at 12:00:00Z (exactly expiresAt) -> rejected
  await assert.rejects(
    () => service.processSale({
      idempotencyKey: "idem-expired-window-01",
      correlationId: "corr-exp-win",
      context,
      cashSession,
      assignments,
      authorizationSnapshot,
      offline: true,
      now: "2026-10-11T12:00:00.000Z",
      lines: [{ productId: "prod-exp", quantity: 2, unitPrice: money(10, "SDG") }],
      payments: [{ method: "CASH", amount: money(20, "SDG") }]
    }),
    /OFFLINE_ALLOCATION_EXPIRED/
  );

  // Allocation in DB remains untouched
  const allocRow = db.prepare("SELECT * FROM offline_allocations WHERE id = ?").get("alloc-expired-window");
  assert.equal(Number(allocRow.consumed_capacity), 0);
  assert.equal(Number(allocRow.version), 0);
});

test("A1 SQLite Integration: SalesService rejects sale when current time is before valid_from", async () => {
  const { db, service, context, cashSession, assignments, authorizationSnapshot } = createTestHarness();

  seedBatch(db, {
    id: "batch-fut",
    organizationId: "org-001",
    warehouseId: "wh-001",
    productId: "prod-fut",
    batchNumber: "BN-FUT",
    expiryDate: "2028-12-31",
    quantity: 50,
    status: "ACTIVE",
    version: 0
  });

  seedAllocation(db, {
    id: "alloc-fut-window",
    branchId: "branch-001",
    warehouseId: "wh-001",
    deviceId: "dev-001",
    productId: "prod-fut",
    allocatedCapacity: 20,
    consumedCapacity: 0,
    releasedCapacity: 0,
    state: "ACTIVE",
    version: 0,
    issuedAt: "2026-10-11T08:00:00.000Z",
    validFrom: "2026-10-11T14:00:00.000Z",
    expiresAt: "2026-10-11T20:00:00.000Z"
  });

  // Attempt sale at 10:00:00Z (before validFrom 14:00) -> rejected
  await assert.rejects(
    () => service.processSale({
      idempotencyKey: "idem-fut-window-01",
      correlationId: "corr-fut-win",
      context,
      cashSession,
      assignments,
      authorizationSnapshot,
      offline: true,
      now: "2026-10-11T10:00:00.000Z",
      lines: [{ productId: "prod-fut", quantity: 2, unitPrice: money(10, "SDG") }],
      payments: [{ method: "CASH", amount: money(20, "SDG") }]
    }),
    /OFFLINE_ALLOCATION_NOT_YET_VALID/
  );
});

test("A1 SQLite Schema: SQLite triggers enforce temporal consistency on direct writes", () => {
  const db = new DatabaseSync(":memory:");
  db.exec(m1);
  db.exec(m2);
  db.exec(m3);

  // 1. Direct INSERT with issued_at > valid_from fails
  assert.throws(() => {
    db.prepare(`
      INSERT INTO offline_allocations (
        id, branch_id, warehouse_id, device_id, product_id,
        allocated_capacity, consumed_capacity, released_capacity,
        state, version, issued_at, valid_from, expires_at
      ) VALUES (
        'alloc-trg-1', 'b-1', 'wh-1', 'd-1', 'p-1',
        10, 0, 0, 'ACTIVE', 0,
        '2026-10-11T12:00:00.000Z', '2026-10-11T10:00:00.000Z', '2026-10-11T18:00:00.000Z'
      )
    `).run();
  }, /INVALID_ALLOCATION_TEMPORAL_WINDOW/);

  // 2. Direct INSERT with valid_from >= expires_at fails
  assert.throws(() => {
    db.prepare(`
      INSERT INTO offline_allocations (
        id, branch_id, warehouse_id, device_id, product_id,
        allocated_capacity, consumed_capacity, released_capacity,
        state, version, issued_at, valid_from, expires_at
      ) VALUES (
        'alloc-trg-2', 'b-1', 'wh-1', 'd-1', 'p-1',
        10, 0, 0, 'ACTIVE', 0,
        '2026-10-11T08:00:00.000Z', '2026-10-11T18:00:00.000Z', '2026-10-11T18:00:00.000Z'
      )
    `).run();
  }, /INVALID_ALLOCATION_TEMPORAL_WINDOW/);

  // 3. Valid INSERT succeeds
  db.prepare(`
    INSERT INTO offline_allocations (
      id, branch_id, warehouse_id, device_id, product_id,
      allocated_capacity, consumed_capacity, released_capacity,
      state, version, issued_at, valid_from, expires_at
    ) VALUES (
      'alloc-trg-valid', 'b-1', 'wh-1', 'd-1', 'p-1',
      10, 0, 0, 'ACTIVE', 0,
      '2026-10-11T08:00:00.000Z', '2026-10-11T10:00:00.000Z', '2026-10-11T18:00:00.000Z'
    )
  `).run();

  // 4. Direct UPDATE violating temporal invariant fails
  assert.throws(() => {
    db.prepare(`
      UPDATE offline_allocations
      SET valid_from = '2026-10-11T19:00:00.000Z'
      WHERE id = 'alloc-trg-valid'
    `).run();
  }, /INVALID_ALLOCATION_TEMPORAL_WINDOW/);
});

test("A1 SQLite Schema: migrateSqliteSalesSchema is safe and idempotent", () => {
  const db = new DatabaseSync(":memory:");
  db.exec(m1);
  db.exec(m2);

  // First migration run applies columns and triggers
  migrateSqliteSalesSchema(db);

  // Inspect columns exist
  const cols = db.prepare("PRAGMA table_info(offline_allocations)").all();
  const colNames = new Set(cols.map(c => c.name));
  assert.ok(colNames.has("issued_at"));
  assert.ok(colNames.has("valid_from"));
  assert.ok(colNames.has("expires_at"));

  // Second migration run is completely idempotent
  assert.doesNotThrow(() => migrateSqliteSalesSchema(db));
});

test("A1 SQLite Integration: multi-table atomic rollback leaves database untouched when sale fails on expiry", async () => {
  const { db, service, context, cashSession, assignments, authorizationSnapshot } = createTestHarness();

  seedBatch(db, {
    id: "batch-rb-exp",
    organizationId: "org-001",
    warehouseId: "wh-001",
    productId: "prod-rb-exp",
    batchNumber: "BN-RB",
    expiryDate: "2028-12-31",
    quantity: 100,
    status: "ACTIVE",
    version: 0
  });

  seedAllocation(db, {
    id: "alloc-rb-exp",
    branchId: "branch-001",
    warehouseId: "wh-001",
    deviceId: "dev-001",
    productId: "prod-rb-exp",
    allocatedCapacity: 20,
    consumedCapacity: 0,
    releasedCapacity: 0,
    state: "ACTIVE",
    version: 0,
    issuedAt: "2026-10-11T08:00:00.000Z",
    validFrom: "2026-10-11T09:00:00.000Z",
    expiresAt: "2026-10-11T11:00:00.000Z"
  });

  // Attempt sale past expiry (12:00:00Z)
  await assert.rejects(
    () => service.processSale({
      idempotencyKey: "idem-rb-exp-01",
      correlationId: "corr-rb-exp-01",
      context,
      cashSession,
      assignments,
      authorizationSnapshot,
      offline: true,
      now: "2026-10-11T12:00:00.000Z",
      lines: [{ productId: "prod-rb-exp", quantity: 5, unitPrice: money(50, "SDG") }],
      payments: [{ method: "CASH", amount: money(250, "SDG") }]
    }),
    /OFFLINE_ALLOCATION_EXPIRED/
  );

  // 1. Allocation table untouched
  const allocRow = db.prepare("SELECT * FROM offline_allocations WHERE id = ?").get("alloc-rb-exp");
  assert.equal(Number(allocRow.consumed_capacity), 0);
  assert.equal(Number(allocRow.version), 0);

  // 2. Batches table untouched
  const batchRow = db.prepare("SELECT * FROM batches WHERE id = ?").get("batch-rb-exp");
  assert.equal(Number(batchRow.quantity), 100);

  // 3. Sales table has 0 rows
  const salesCount = db.prepare("SELECT count(*) as cnt FROM sales").get();
  assert.equal(Number(salesCount.cnt), 0);

  // 4. Outbox table has 0 rows
  const outboxCount = db.prepare("SELECT count(*) as cnt FROM outbox_events").get();
  assert.equal(Number(outboxCount.cnt), 0);

  // 5. Stock movements has 0 rows
  const smCount = db.prepare("SELECT count(*) as cnt FROM stock_movements").get();
  assert.equal(Number(smCount.cnt), 0);
});

