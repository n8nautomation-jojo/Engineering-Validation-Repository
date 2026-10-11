import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";
import pg from "pg";
import { PostgresSalesPersistence } from "../dist/src/infrastructure/sql/postgres-sales-persistence.js";
import { SqliteSalesPersistence } from "../dist/src/infrastructure/sqlite/sqlite-sales-persistence.js";
import { SalesService } from "../dist/src/application/sales/sales-service.js";
import { money } from "../dist/src/kernel/money.js";
import { openCashSession } from "../dist/src/domain/cash/cash-session.js";

const { Pool } = pg;
const databaseUrl = process.env.DATABASE_URL;
if (process.env.POSTGRES_REQUIRED === "true" && !databaseUrl) {
  throw new Error("FAIL: DATABASE_URL is required when POSTGRES_REQUIRED=true. PostgreSQL tests must not be skipped.");
}
const shouldRun = Boolean(databaseUrl);
const maybe = (name, fn) => test(name, { skip: !shouldRun }, fn);

const pgFoundation = fs.readFileSync(new URL("../docs/05-data/migrations/postgresql/001_p0_4_foundation.sql", import.meta.url), "utf8");
const pgSalesMigration = fs.readFileSync(new URL("../docs/05-data/migrations/postgresql/003_sales_vertical_slice.sql", import.meta.url), "utf8");
const pgValidityMigration = fs.readFileSync(new URL("../docs/05-data/migrations/postgresql/004_offline_allocation_validity.sql", import.meta.url), "utf8");

const sqliteFoundation = fs.readFileSync(new URL("../docs/05-data/migrations/sqlite/001_p0_4_foundation.sql", import.meta.url), "utf8");
const sqliteSalesMigration = fs.readFileSync(new URL("../docs/05-data/migrations/sqlite/002_sales_vertical_slice.sql", import.meta.url), "utf8");

async function setupPostgresDb(pool) {
  await pool.query(pgFoundation);
  await pool.query(pgSalesMigration);
  await pool.query(pgValidityMigration);
  await pool.query(`
    TRUNCATE
      sale_lines, payments, stock_movements,
      sales, inventory_transactions, offline_allocations,
      batches, outbox_events, audit_records, idempotency_records
    CASCADE
  `);
}

function createTestContext() {
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

  return { context, cashSession, assignments, authorizationSnapshot };
}

async function seedPgBatch(pool, b) {
  await pool.query(`
    INSERT INTO batches (id, organization_id, warehouse_id, product_id, batch_number, expiry_date, quantity, status, version)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
  `, [b.id, b.organizationId, b.warehouseId, b.productId, b.batchNumber, b.expiryDate, b.quantity, b.status, b.version]);
}

async function seedPgAllocation(pool, a) {
  const issuedAt = a.issuedAt ?? "2026-01-01T00:00:00.000Z";
  const validFrom = a.validFrom ?? "2026-01-01T00:00:00.000Z";
  const expiresAt = a.expiresAt ?? "2099-12-31T23:59:59.000Z";
  await pool.query(`
    INSERT INTO offline_allocations (id, branch_id, warehouse_id, device_id, product_id, allocated_capacity, consumed_capacity, released_capacity, state, version, issued_at, valid_from, expires_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
  `, [a.id, a.branchId, a.warehouseId, a.deviceId, a.productId, a.allocatedCapacity, a.consumedCapacity, a.releasedCapacity, a.state, a.version, issuedAt, validFrom, expiresAt]);
}

// 1. Successful atomic sale
maybe("P0 PostgreSQL: Happy path - complete retail sale persists atomically with all side effects", async (t) => {
  const pool = new Pool({ connectionString: databaseUrl });
  t.after(async () => pool.end());
  await setupPostgresDb(pool);

  const persistence = new PostgresSalesPersistence(pool);
  const service = new SalesService(persistence);
  const { context, cashSession, assignments } = createTestContext();

  await seedPgBatch(pool, {
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
    idempotencyKey: "idem-sale-pg-001",
    correlationId: "corr-pg-001",
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

  // Read-back verification: Sale
  const savedSale = await persistence.getSale(res.saleId);
  assert.ok(savedSale);
  assert.equal(savedSale.totalAmount, 500);
  assert.equal(savedSale.status, "COMPLETED");
  assert.equal(savedSale.lines.length, 1);
  assert.equal(savedSale.lines[0].productId, "prod-paracetamol");
  assert.equal(savedSale.lines[0].batchId, "batch-1");
  assert.equal(savedSale.lines[0].quantity, 5);

  // Read-back verification: Payment
  assert.equal(savedSale.payments.length, 1);
  assert.equal(savedSale.payments[0].method, "CASH");
  assert.equal(savedSale.payments[0].amount.amount, 500);

  // Read-back verification: Inventory Transaction & Stock Movement
  const invTx = await persistence.getInventoryTransaction(res.inventoryTransactionId);
  assert.ok(invTx);
  assert.equal(invTx.status, "POSTED");
  assert.equal(invTx.sourceType, "SALE");
  assert.equal(invTx.sourceId, res.saleId);
  assert.equal(invTx.movements.length, 1);
  assert.equal(invTx.movements[0].direction, "OUT");
  assert.equal(invTx.movements[0].quantity.value, 5);

  // Read-back verification: Batch projection deduction
  const batch = await persistence.getBatch("batch-1");
  assert.ok(batch);
  assert.equal(batch.quantity.value, 45);

  // Read-back verification: Outbox Event
  const outboxEvents = await persistence.getOutboxEvents(res.saleId);
  assert.equal(outboxEvents.length, 1);
  assert.equal(outboxEvents[0].eventType, "sale.completed");
  assert.equal(outboxEvents[0].aggregateId, res.saleId);

  // Read-back verification: Audit Record
  const auditRecords = await persistence.getAuditRecords(res.saleId);
  assert.equal(auditRecords.length, 1);
  assert.equal(auditRecords[0].action, "SALE_COMPLETED");
  assert.equal(auditRecords[0].actorId, "usr-cashier-1");

  // Read-back verification: Idempotency Record
  const idem = await persistence.findIdempotency("idem-sale-pg-001", "sales.create");
  assert.ok(idem);
  assert.equal(idem.responseStatus, 201);
});

// 2. Multi-line sale
maybe("P0 PostgreSQL: Multi-line sale with split payments and multiple batches", async (t) => {
  const pool = new Pool({ connectionString: databaseUrl });
  t.after(async () => pool.end());
  await setupPostgresDb(pool);

  const persistence = new PostgresSalesPersistence(pool);
  const service = new SalesService(persistence);
  const { context, cashSession, assignments } = createTestContext();

  await seedPgBatch(pool, {
    id: "batch-multi-1",
    organizationId: "org-001",
    warehouseId: "wh-001",
    productId: "prod-item-1",
    batchNumber: "BN-M1",
    expiryDate: "2027-01-01",
    quantity: 100,
    status: "ACTIVE",
    version: 0
  });

  await seedPgBatch(pool, {
    id: "batch-multi-2",
    organizationId: "org-001",
    warehouseId: "wh-001",
    productId: "prod-item-2",
    batchNumber: "BN-M2",
    expiryDate: "2028-01-01",
    quantity: 50,
    status: "ACTIVE",
    version: 0
  });

  const res = await service.processSale({
    idempotencyKey: "idem-multi-001",
    correlationId: "corr-multi-001",
    context,
    cashSession,
    assignments,
    now: "2026-10-07T11:00:00Z",
    lines: [
      { productId: "prod-item-1", quantity: 10, unitPrice: money(50, "SDG") },
      { productId: "prod-item-2", quantity: 2, unitPrice: money(250, "SDG") }
    ],
    payments: [
      { method: "CASH", amount: money(600, "SDG") },
      { method: "CARD", amount: money(400, "SDG") }
    ]
  });

  assert.equal(res.status, "COMPLETED");
  assert.equal(res.totalAmount, 1000);

  const savedSale = await persistence.getSale(res.saleId);
  assert.ok(savedSale);
  assert.equal(savedSale.lines.length, 2);
  assert.equal(savedSale.payments.length, 2);

  const b1 = await persistence.getBatch("batch-multi-1");
  const b2 = await persistence.getBatch("batch-multi-2");
  assert.equal(b1.quantity.value, 90);
  assert.equal(b2.quantity.value, 48);

  const invTx = await persistence.getInventoryTransaction(res.inventoryTransactionId);
  assert.equal(invTx.movements.length, 2);
});

// 3. FEFO batch consumption
maybe("P0 PostgreSQL: FEFO consumption - earliest expiring batch is consumed first", async (t) => {
  const pool = new Pool({ connectionString: databaseUrl });
  t.after(async () => pool.end());
  await setupPostgresDb(pool);

  const persistence = new PostgresSalesPersistence(pool);
  const service = new SalesService(persistence);
  const { context, cashSession, assignments } = createTestContext();

  await seedPgBatch(pool, {
    id: "batch-fefo-later",
    organizationId: "org-001",
    warehouseId: "wh-001",
    productId: "prod-fefo",
    batchNumber: "BN-LATER",
    expiryDate: "2028-06-01",
    quantity: 20,
    status: "ACTIVE",
    version: 0
  });

  await seedPgBatch(pool, {
    id: "batch-fefo-earlier",
    organizationId: "org-001",
    warehouseId: "wh-001",
    productId: "prod-fefo",
    batchNumber: "BN-EARLY",
    expiryDate: "2027-01-01",
    quantity: 20,
    status: "ACTIVE",
    version: 0
  });

  // 1. FEFO violation: requesting later batch when earlier batch is available must fail
  await assert.rejects(
    () => service.processSale({
      idempotencyKey: "idem-fefo-viol",
      correlationId: "corr-fefo-viol",
      context,
      cashSession,
      assignments,
      now: "2026-10-07T12:00:00Z",
      lines: [{ productId: "prod-fefo", quantity: 5, unitPrice: money(10, "SDG"), requestedBatchId: "batch-fefo-later" }],
      payments: [{ method: "CASH", amount: money(50, "SDG") }]
    }),
    /FEFO_VIOLATION/
  );

  // 2. Automatic FEFO: consumes earliest expiring batch first
  const res1 = await service.processSale({
    idempotencyKey: "idem-fefo-001",
    correlationId: "corr-fefo-001",
    context,
    cashSession,
    assignments,
    now: "2026-10-07T12:00:00Z",
    lines: [{ productId: "prod-fefo", quantity: 10, unitPrice: money(10, "SDG") }],
    payments: [{ method: "CASH", amount: money(100, "SDG") }]
  });

  assert.equal(res1.status, "COMPLETED");

  const bEarly1 = await persistence.getBatch("batch-fefo-earlier");
  const bLate1 = await persistence.getBatch("batch-fefo-later");
  assert.equal(bEarly1.quantity.value, 10);
  assert.equal(bLate1.quantity.value, 20);

  // 3. Exhaust remaining 10 in earlier batch
  await service.processSale({
    idempotencyKey: "idem-fefo-002",
    correlationId: "corr-fefo-002",
    context,
    cashSession,
    assignments,
    now: "2026-10-07T12:05:00Z",
    lines: [{ productId: "prod-fefo", quantity: 10, unitPrice: money(10, "SDG") }],
    payments: [{ method: "CASH", amount: money(100, "SDG") }]
  });

  const bEarlyDepleted = await persistence.getBatch("batch-fefo-earlier");
  assert.equal(bEarlyDepleted.quantity.value, 0);
  assert.equal(bEarlyDepleted.status, "DEPLETED");

  // 4. Next sale now automatically consumes from later batch
  await service.processSale({
    idempotencyKey: "idem-fefo-003",
    correlationId: "corr-fefo-003",
    context,
    cashSession,
    assignments,
    now: "2026-10-07T12:10:00Z",
    lines: [{ productId: "prod-fefo", quantity: 5, unitPrice: money(10, "SDG") }],
    payments: [{ method: "CASH", amount: money(50, "SDG") }]
  });

  const bLateDeducted = await persistence.getBatch("batch-fefo-later");
  assert.equal(bLateDeducted.quantity.value, 15);
});

// 4. Expired batch rejection
maybe("P0 PostgreSQL: Expired batch is rejected from active sale", async (t) => {
  const pool = new Pool({ connectionString: databaseUrl });
  t.after(async () => pool.end());
  await setupPostgresDb(pool);

  const persistence = new PostgresSalesPersistence(pool);
  const service = new SalesService(persistence);
  const { context, cashSession, assignments } = createTestContext();

  await seedPgBatch(pool, {
    id: "batch-expired",
    organizationId: "org-001",
    warehouseId: "wh-001",
    productId: "prod-exp",
    batchNumber: "BN-EXP",
    expiryDate: "2025-01-01",
    quantity: 10,
    status: "EXPIRED",
    version: 0
  });

  await assert.rejects(
    () => service.processSale({
      idempotencyKey: "idem-exp-001",
      correlationId: "corr-exp-001",
      context,
      cashSession,
      assignments,
      now: "2026-10-07T12:00:00Z",
      lines: [{ productId: "prod-exp", quantity: 5, unitPrice: money(10, "SDG") }],
      payments: [{ method: "CASH", amount: money(50, "SDG") }]
    }),
    /INSUFFICIENT_STOCK/
  );
});

// 5. Insufficient stock rejection
maybe("P0 PostgreSQL: Insufficient stock raises error and prevents any insert", async (t) => {
  const pool = new Pool({ connectionString: databaseUrl });
  t.after(async () => pool.end());
  await setupPostgresDb(pool);

  const persistence = new PostgresSalesPersistence(pool);
  const service = new SalesService(persistence);
  const { context, cashSession, assignments } = createTestContext();

  await seedPgBatch(pool, {
    id: "batch-low",
    organizationId: "org-001",
    warehouseId: "wh-001",
    productId: "prod-low",
    batchNumber: "BN-LOW",
    expiryDate: "2028-01-01",
    quantity: 3,
    status: "ACTIVE",
    version: 0
  });

  await assert.rejects(
    () => service.processSale({
      idempotencyKey: "idem-low-001",
      correlationId: "corr-low-001",
      context,
      cashSession,
      assignments,
      now: "2026-10-07T12:00:00Z",
      lines: [{ productId: "prod-low", quantity: 10, unitPrice: money(10, "SDG") }],
      payments: [{ method: "CASH", amount: money(100, "SDG") }]
    }),
    /INSUFFICIENT_STOCK/
  );

  const count = await pool.query("SELECT count(*)::int as n FROM sales");
  assert.equal(count.rows[0].n, 0);
});

// 6. Offline allocation consumption
maybe("P0 PostgreSQL: Offline allocation consumption updates consumed_capacity", async (t) => {
  const pool = new Pool({ connectionString: databaseUrl });
  t.after(async () => pool.end());
  await setupPostgresDb(pool);

  const persistence = new PostgresSalesPersistence(pool);
  const service = new SalesService(persistence);
  const { context, cashSession, assignments, authorizationSnapshot } = createTestContext();

  await seedPgBatch(pool, {
    id: "batch-off-1",
    organizationId: "org-001",
    warehouseId: "wh-001",
    productId: "prod-off",
    batchNumber: "BN-OFF",
    expiryDate: "2028-01-01",
    quantity: 50,
    status: "ACTIVE",
    version: 0
  });

  await seedPgAllocation(pool, {
    id: "alloc-off-1",
    branchId: "branch-001",
    warehouseId: "wh-001",
    deviceId: "dev-001",
    productId: "prod-off",
    allocatedCapacity: 20,
    consumedCapacity: 0,
    releasedCapacity: 0,
    state: "ACTIVE",
    version: 0
  });

  const res = await service.processSale({
    idempotencyKey: "idem-off-001",
    correlationId: "corr-off-001",
    context,
    cashSession,
    assignments,
    authorizationSnapshot,
    offline: true,
    now: "2026-10-07T12:00:00Z",
    lines: [{ productId: "prod-off", quantity: 8, unitPrice: money(10, "SDG") }],
    payments: [{ method: "CASH", amount: money(80, "SDG") }]
  });

  assert.equal(res.status, "COMPLETED");

  const alloc = await persistence.getOfflineAllocation("alloc-off-1");
  assert.ok(alloc);
  assert.equal(alloc.consumedCapacity, 8);
  assert.equal(alloc.state, "ACTIVE");
});

// 7. Idempotent replay
maybe("P0 PostgreSQL: Idempotent replay returns cached result without duplicate side-effects", async (t) => {
  const pool = new Pool({ connectionString: databaseUrl });
  t.after(async () => pool.end());
  await setupPostgresDb(pool);

  const persistence = new PostgresSalesPersistence(pool);
  const service = new SalesService(persistence);
  const { context, cashSession, assignments } = createTestContext();

  await seedPgBatch(pool, {
    id: "batch-idem-1",
    organizationId: "org-001",
    warehouseId: "wh-001",
    productId: "prod-idem",
    batchNumber: "BN-IDEM",
    expiryDate: "2028-01-01",
    quantity: 50,
    status: "ACTIVE",
    version: 0
  });

  const saleInput = {
    idempotencyKey: "idem-replay-001",
    correlationId: "corr-replay-001",
    context,
    cashSession,
    assignments,
    now: "2026-10-07T12:00:00Z",
    lines: [{ productId: "prod-idem", quantity: 5, unitPrice: money(20, "SDG") }],
    payments: [{ method: "CASH", amount: money(100, "SDG") }]
  };

  const first = await service.processSale(saleInput);
  const second = await service.processSale(saleInput);

  assert.equal(second.saleId, first.saleId);
  assert.equal(second.status, first.status);

  // Assert single sale row and exactly 45 batch stock
  const saleCount = await pool.query("SELECT count(*)::int as n FROM sales");
  assert.equal(saleCount.rows[0].n, 1);

  const batch = await persistence.getBatch("batch-idem-1");
  assert.equal(batch.quantity.value, 45);
});

// 8. Idempotency fingerprint mismatch rejection
maybe("P0 PostgreSQL: Idempotency reuse with different payload is rejected", async (t) => {
  const pool = new Pool({ connectionString: databaseUrl });
  t.after(async () => pool.end());
  await setupPostgresDb(pool);

  const persistence = new PostgresSalesPersistence(pool);
  const service = new SalesService(persistence);
  const { context, cashSession, assignments } = createTestContext();

  await seedPgBatch(pool, {
    id: "batch-idem-diff",
    organizationId: "org-001",
    warehouseId: "wh-001",
    productId: "prod-idem-diff",
    batchNumber: "BN-IDEM-DIFF",
    expiryDate: "2028-01-01",
    quantity: 50,
    status: "ACTIVE",
    version: 0
  });

  await service.processSale({
    idempotencyKey: "idem-conflict-001",
    correlationId: "corr-diff-001",
    context,
    cashSession,
    assignments,
    now: "2026-10-07T12:00:00Z",
    lines: [{ productId: "prod-idem-diff", quantity: 5, unitPrice: money(20, "SDG") }],
    payments: [{ method: "CASH", amount: money(100, "SDG") }]
  });

  await assert.rejects(
    () => service.processSale({
      idempotencyKey: "idem-conflict-001",
      correlationId: "corr-diff-002",
      context,
      cashSession,
      assignments,
      now: "2026-10-07T12:00:00Z",
      lines: [{ productId: "prod-idem-diff", quantity: 10, unitPrice: money(20, "SDG") }],
      payments: [{ method: "CASH", amount: money(200, "SDG") }]
    }),
    /IDEMPOTENCY_KEY_REUSE_WITH_DIFFERENT_REQUEST/
  );
});

// 9. Failure Injection Rollback across all 9 critical stages
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
  maybe(`P0 PostgreSQL: Transaction rollback verification on failure injection at ${stage}`, async (t) => {
    const pool = new Pool({ connectionString: databaseUrl });
    t.after(async () => pool.end());
    await setupPostgresDb(pool);

    const persistence = new PostgresSalesPersistence(pool);
    const service = new SalesService(persistence);
    const { context, cashSession, assignments, authorizationSnapshot } = createTestContext();

    await seedPgBatch(pool, {
      id: "batch-fail-pg",
      organizationId: "org-001",
      warehouseId: "wh-001",
      productId: "prod-fail-pg",
      batchNumber: "BN-FAIL-PG",
      expiryDate: "2027-01-01",
      quantity: 50,
      status: "ACTIVE",
      version: 0
    });

    await seedPgAllocation(pool, {
      id: "alloc-fail-pg",
      branchId: "branch-001",
      warehouseId: "wh-001",
      deviceId: "dev-001",
      productId: "prod-fail-pg",
      allocatedCapacity: 30,
      consumedCapacity: 0,
      releasedCapacity: 0,
      state: "ACTIVE",
      version: 0
    });

    await assert.rejects(
      () => service.processSale({
        idempotencyKey: `idem-fail-pg-${stage}`,
        correlationId: `corr-fail-pg-${stage}`,
        context,
        cashSession,
        assignments,
        authorizationSnapshot,
        offline: true,
        now: "2026-10-07T10:00:00Z",
        lines: [{ productId: "prod-fail-pg", quantity: 5, unitPrice: money(20, "SDG") }],
        payments: [{ method: "CASH", amount: money(100, "SDG") }],
        failureInjectionStage: stage
      }),
      new RegExp(`INJECTED_FAILURE_${stage}`)
    );

    // Verify complete rollback: zero residual rows in ANY table
    const s = await pool.query("SELECT count(*)::int as n FROM sales");
    assert.equal(s.rows[0].n, 0, `sales table must be empty after rollback at ${stage}`);

    const sl = await pool.query("SELECT count(*)::int as n FROM sale_lines");
    assert.equal(sl.rows[0].n, 0, `sale_lines must be empty after rollback at ${stage}`);

    const p = await pool.query("SELECT count(*)::int as n FROM payments");
    assert.equal(p.rows[0].n, 0, `payments must be empty after rollback at ${stage}`);

    const it = await pool.query("SELECT count(*)::int as n FROM inventory_transactions");
    assert.equal(it.rows[0].n, 0, `inventory_transactions must be empty after rollback at ${stage}`);

    const sm = await pool.query("SELECT count(*)::int as n FROM stock_movements");
    assert.equal(sm.rows[0].n, 0, `stock_movements must be empty after rollback at ${stage}`);

    const oe = await pool.query("SELECT count(*)::int as n FROM outbox_events");
    assert.equal(oe.rows[0].n, 0, `outbox_events must be empty after rollback at ${stage}`);

    const ar = await pool.query("SELECT count(*)::int as n FROM audit_records");
    assert.equal(ar.rows[0].n, 0, `audit_records must be empty after rollback at ${stage}`);

    const ir = await pool.query("SELECT count(*)::int as n FROM idempotency_records");
    assert.equal(ir.rows[0].n, 0, `idempotency_records must be empty after rollback at ${stage}`);

    // Verify batch quantity is untouched (50)
    const batch = await persistence.getBatch("batch-fail-pg");
    assert.equal(batch.quantity.value, 50, `batch quantity must remain 50 after rollback at ${stage}`);

    // Verify offline allocation is untouched (consumed 0)
    const alloc = await persistence.getOfflineAllocation("alloc-fail-pg");
    assert.equal(alloc.consumedCapacity, 0, `allocation consumedCapacity must remain 0 after rollback at ${stage}`);
  });
}

// 10. Concurrency & Optimistic stock guard protection
maybe("P0 PostgreSQL: Concurrency guard rejects deduction when concurrent writer changes batch version/quantity", async (t) => {
  const pool = new Pool({ connectionString: databaseUrl });
  t.after(async () => pool.end());
  await setupPostgresDb(pool);

  const persistence = new PostgresSalesPersistence(pool);
  const service = new SalesService(persistence);
  const { context, cashSession, assignments } = createTestContext();

  await seedPgBatch(pool, {
    id: "batch-concurrent",
    organizationId: "org-001",
    warehouseId: "wh-001",
    productId: "prod-conc",
    batchNumber: "BN-CONC",
    expiryDate: "2028-01-01",
    quantity: 10,
    status: "ACTIVE",
    version: 0
  });

  // Prepare a sales execution plan based on 10 available units
  const batchBefore = await persistence.findBatchesForProduct("wh-001", "prod-conc");
  assert.equal(batchBefore.length, 1);

  // Direct plan execution test for persistence concurrency guard
  const executionPlan = {
    sale: {
      id: "sale-conc-001",
      organizationId: "org-001",
      branchId: "branch-001",
      deviceId: "dev-001",
      cashSessionId: "cs-001",
      status: "COMPLETED",
      createdAt: "2026-10-07T12:00:00Z",
      version: 0
    },
    tenantId: "t-001",
    warehouseId: "wh-001",
    totalAmount: 50,
    currency: "SDG",
    idempotencyKey: "idem-conc-plan",
    correlationId: "corr-conc-plan",
    lines: [{
      id: "line-conc-1",
      productId: "prod-conc",
      batchId: "batch-concurrent",
      quantity: 5,
      unitPrice: money(10, "SDG"),
      lineTotal: money(50, "SDG")
    }],
    payments: [{
      id: "pay-conc-1",
      method: "CASH",
      amount: money(50, "SDG"),
      verificationStatus: "NOT_REQUIRED",
      recordedAt: "2026-10-07T12:00:00Z"
    }],
    inventoryTransaction: {
      id: "it-conc-1",
      organizationId: "org-001",
      branchId: "branch-001",
      sourceType: "SALE",
      sourceId: "sale-conc-001",
      status: "POSTED",
      createdAt: "2026-10-07T12:00:00Z",
      version: 0
    },
    movements: [{
      id: "sm-conc-1",
      productId: "prod-conc",
      batchId: "batch-concurrent",
      warehouseId: "wh-001",
      direction: "OUT",
      quantity: { value: 5, unit: "UNIT" },
      sourceTransactionId: "it-conc-1"
    }],
    batchDeductions: [{
      batchId: "batch-concurrent",
      quantity: 5,
      newQuantity: 5,
      newStatus: "ACTIVE"
    }],
    outboxEvent: {
      eventId: "oe-conc-1",
      eventType: "sale.completed",
      aggregateId: "sale-conc-001",
      aggregateVersion: 1,
      occurredAt: "2026-10-07T12:00:00Z",
      tenantId: "t-001",
      organizationId: "org-001",
      correlationId: "corr-conc-plan",
      payload: { saleId: "sale-conc-001" }
    },
    auditRecord: {
      id: "ar-conc-1",
      occurredAt: "2026-10-07T12:00:00Z",
      actorId: "usr-cashier-1",
      action: "SALE_COMPLETED",
      resourceType: "Sale",
      resourceId: "sale-conc-001",
      tenantId: "t-001",
      organizationId: "org-001",
      correlationId: "corr-conc-plan"
    },
    idempotencyRecord: {
      key: "idem-conc-plan",
      commandName: "sales.create",
      requestHash: "hash-conc",
      responseStatus: 200,
      responseBody: { ok: true },
      createdAt: "2026-10-07T12:00:00Z"
    }
  };

  // Directly deplete batch behind the back before execution: quantity reduced to 2 (< 5 requested)
  await pool.query("UPDATE batches SET quantity = 2, version = version + 1 WHERE id = $1", ["batch-concurrent"]);

  // Attempting to execute sale requesting 5 units will fail concurrency guard
  await assert.rejects(
    () => persistence.executeSaleAtomic(executionPlan),
    /STALE_BATCH_OR_INSUFFICIENT_STOCK/
  );

  // Verify batch remains at 2 and no sales inserted
  const batchAfter = await persistence.getBatch("batch-concurrent");
  assert.equal(batchAfter.quantity.value, 2);
  const salesCount = await pool.query("SELECT count(*)::int as n FROM sales");
  assert.equal(salesCount.rows[0].n, 0);
});

// 11. Disconnect / Reconnect Recovery Simulation
maybe("P0 PostgreSQL: Process disconnect and reconnect recovery maintains committed state and idempotency", async (t) => {
  // Phase 1: Connect, seed, execute sale, abruptly close pool
  let pool1 = new Pool({ connectionString: databaseUrl });
  await setupPostgresDb(pool1);

  const persistence1 = new PostgresSalesPersistence(pool1);
  const service1 = new SalesService(persistence1);
  const { context, cashSession, assignments } = createTestContext();

  await seedPgBatch(pool1, {
    id: "batch-recover-pg",
    organizationId: "org-001",
    warehouseId: "wh-001",
    productId: "prod-rec-pg",
    batchNumber: "BN-REC-PG",
    expiryDate: "2027-12-31",
    quantity: 100,
    status: "ACTIVE",
    version: 0
  });

  const saleCmd = {
    idempotencyKey: "idem-rec-pg-001",
    correlationId: "corr-rec-pg-001",
    context,
    cashSession,
    assignments,
    now: "2026-10-07T10:00:00Z",
    lines: [{ productId: "prod-rec-pg", quantity: 12, unitPrice: money(50, "SDG") }],
    payments: [{ method: "CASH", amount: money(600, "SDG") }]
  };

  const res1 = await service1.processSale(saleCmd);
  assert.equal(res1.status, "COMPLETED");

  // Abruptly terminate pool 1
  await pool1.end();

  // Phase 2: Create new Pool instance representing fresh process restart
  const pool2 = new Pool({ connectionString: databaseUrl });
  t.after(async () => pool2.end());

  const persistence2 = new PostgresSalesPersistence(pool2);
  const service2 = new SalesService(persistence2);

  // Read-back verification across process boundary
  const recoveredSale = await persistence2.getSale(res1.saleId);
  assert.ok(recoveredSale);
  assert.equal(recoveredSale.totalAmount, 600);
  assert.equal(recoveredSale.lines.length, 1);
  assert.equal(recoveredSale.lines[0].quantity, 12);

  // Batch deducted permanently on disk
  const recoveredBatch = await persistence2.getBatch("batch-recover-pg");
  assert.equal(recoveredBatch.quantity.value, 88);

  // Replay idempotency against fresh restarted process
  const res2 = await service2.processSale(saleCmd);
  assert.equal(res2.saleId, res1.saleId);
  assert.equal(res2.status, "COMPLETED");

  // Confirm no double deduction
  const recoveredBatchAgain = await persistence2.getBatch("batch-recover-pg");
  assert.equal(recoveredBatchAgain.quantity.value, 88);
});

// 12. PostgreSQL / SQLite Parity Verification
test("P0 Parity: SQLite vs PostgreSQL persistence adapters produce identical domain structures", async (t) => {
  // Test SQLite adapter in-memory
  const sqliteDb = new DatabaseSync(":memory:");
  sqliteDb.exec(sqliteFoundation);
  sqliteDb.exec(sqliteSalesMigration);

  const sqlitePersistence = new SqliteSalesPersistence(sqliteDb);
  const sqliteService = new SalesService(sqlitePersistence);
  const { context, cashSession, assignments } = createTestContext();

  sqliteDb.prepare(`
    INSERT INTO batches (id, organization_id, warehouse_id, product_id, batch_number, expiry_date, quantity, status, version)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run("b-parity-1", "org-001", "wh-001", "prod-parity", "BN-PARITY", "2027-12-31", 100, "ACTIVE", 0);

  const sqliteRes = await sqliteService.processSale({
    idempotencyKey: "idem-parity-001",
    correlationId: "corr-parity-001",
    context,
    cashSession,
    assignments,
    now: "2026-10-07T10:00:00Z",
    lines: [{ productId: "prod-parity", quantity: 7, unitPrice: money(25, "SDG") }],
    payments: [{ method: "CASH", amount: money(175, "SDG") }]
  });

  const sqliteSale = await sqlitePersistence.getSale(sqliteRes.saleId);
  const sqliteInvTx = await sqlitePersistence.getInventoryTransaction(sqliteRes.inventoryTransactionId);
  const sqliteBatch = await sqlitePersistence.getBatch("b-parity-1");
  const sqliteOutbox = await sqlitePersistence.getOutboxEvents(sqliteRes.saleId);

  assert.ok(sqliteSale);
  assert.ok(sqliteInvTx);
  assert.ok(sqliteBatch);
  assert.equal(sqliteBatch.quantity.value, 93);

  // If real Postgres is available, verify full structural equivalence
  if (shouldRun) {
    const pool = new Pool({ connectionString: databaseUrl });
    t.after(async () => pool.end());
    await setupPostgresDb(pool);

    const pgPersistence = new PostgresSalesPersistence(pool);
    const pgService = new SalesService(pgPersistence);

    await seedPgBatch(pool, {
      id: "b-parity-1",
      organizationId: "org-001",
      warehouseId: "wh-001",
      productId: "prod-parity",
      batchNumber: "BN-PARITY",
      expiryDate: "2027-12-31",
      quantity: 100,
      status: "ACTIVE",
      version: 0
    });

    const pgRes = await pgService.processSale({
      idempotencyKey: "idem-parity-001",
      correlationId: "corr-parity-001",
      context,
      cashSession,
      assignments,
      now: "2026-10-07T10:00:00Z",
      lines: [{ productId: "prod-parity", quantity: 7, unitPrice: money(25, "SDG") }],
      payments: [{ method: "CASH", amount: money(175, "SDG") }]
    });

    const pgSale = await pgPersistence.getSale(pgRes.saleId);
    const pgInvTx = await pgPersistence.getInventoryTransaction(pgRes.inventoryTransactionId);
    const pgBatch = await pgPersistence.getBatch("b-parity-1");
    const pgOutbox = await pgPersistence.getOutboxEvents(pgRes.saleId);

    // Assert parity
    assert.equal(pgSale.totalAmount, sqliteSale.totalAmount);
    assert.equal(pgSale.currency, sqliteSale.currency);
    assert.equal(pgSale.status, sqliteSale.status);
    assert.equal(pgSale.lines.length, sqliteSale.lines.length);
    assert.equal(pgSale.lines[0].quantity, sqliteSale.lines[0].quantity);
    assert.equal(pgSale.lines[0].unitPrice.amount, sqliteSale.lines[0].unitPrice.amount);
    assert.equal(pgSale.lines[0].lineTotal.amount, sqliteSale.lines[0].lineTotal.amount);
    assert.equal(pgSale.payments.length, sqliteSale.payments.length);
    assert.equal(pgSale.payments[0].method, sqliteSale.payments[0].method);
    assert.equal(pgSale.payments[0].amount.amount, sqliteSale.payments[0].amount.amount);

    assert.equal(pgInvTx.status, sqliteInvTx.status);
    assert.equal(pgInvTx.sourceType, sqliteInvTx.sourceType);
    assert.equal(pgInvTx.movements.length, sqliteInvTx.movements.length);
    assert.equal(pgInvTx.movements[0].direction, sqliteInvTx.movements[0].direction);
    assert.equal(pgInvTx.movements[0].quantity.value, sqliteInvTx.movements[0].quantity.value);

    assert.equal(pgBatch.quantity.value, sqliteBatch.quantity.value);
    assert.equal(pgBatch.status, sqliteBatch.status);

    assert.equal(pgOutbox.length, sqliteOutbox.length);
    assert.equal(pgOutbox[0].eventType, sqliteOutbox[0].eventType);
  }

  sqliteDb.close();
});

// 12. PostgreSQL Lock-wait & Expiry Boundary Tests (A1-FOLLOWUP-EXPIRY)
maybe("P0 PostgreSQL: Lock-wait evaluation rejects allocation that expires while waiting for row lock", async (t) => {
  const pool = new Pool({ connectionString: databaseUrl });
  t.after(async () => pool.end());
  await setupPostgresDb(pool);

  const persistence = new PostgresSalesPersistence(pool);
  const service = new SalesService(persistence);
  const { context, cashSession, assignments, authorizationSnapshot } = createTestContext();

  await seedPgBatch(pool, {
    id: "batch-lock-wait",
    organizationId: "org-001",
    warehouseId: "wh-001",
    productId: "prod-lock-wait",
    batchNumber: "BN-LW",
    expiryDate: "2028-01-01",
    quantity: 50,
    status: "ACTIVE",
    version: 0
  });

  // Allocation with validity window on 2026-10-07 (matching cashier session and snapshot)
  // which will be expired relative to real database clock_timestamp()
  await seedPgAllocation(pool, {
    id: "alloc-lock-wait",
    branchId: "branch-001",
    warehouseId: "wh-001",
    deviceId: "dev-001",
    productId: "prod-lock-wait",
    allocatedCapacity: 20,
    consumedCapacity: 0,
    releasedCapacity: 0,
    state: "ACTIVE",
    version: 0,
    issuedAt: "2026-10-07T00:00:00.000Z",
    validFrom: "2026-10-07T00:00:00.000Z",
    expiresAt: "2026-10-07T23:59:59.000Z"
  });

  const client1 = await pool.connect();
  try {
    // Client 1 holds row lock before sales transaction begins
    await client1.query("BEGIN");
    await client1.query("SELECT * FROM offline_allocations WHERE id = 'alloc-lock-wait' FOR UPDATE");

    // Launch sales service processSale concurrently (which will wait for client 1's lock in DB)
    const salePromise = service.processSale({
      idempotencyKey: "idem-lw-001",
      correlationId: "corr-lw-001",
      context,
      cashSession,
      assignments,
      authorizationSnapshot,
      offline: true,
      now: "2026-10-07T12:00:00Z",
      lines: [{ productId: "prod-lock-wait", quantity: 2, unitPrice: money(50, "SDG") }],
      payments: [{ method: "CASH", amount: money(100, "SDG") }]
    });

    // Wait 200ms to allow client 2 to block on row lock
    await new Promise(r => setTimeout(r, 200));

    // Client 1 commits, releasing the lock
    await client1.query("COMMIT");

    // Client 2 acquires lock, evaluates clock_timestamp() post-lock, and rejects
    await assert.rejects(() => salePromise, /OFFLINE_ALLOCATION_EXPIRED/);
  } finally {
    client1.release();
  }
});

maybe("P0 PostgreSQL: Schema constraint chk_offline_allocations_temporal_integrity blocks invalid writes", async (t) => {
  const pool = new Pool({ connectionString: databaseUrl });
  t.after(async () => pool.end());
  await setupPostgresDb(pool);

  // 1. Direct insert with issued_at > valid_from fails
  await assert.rejects(
    () => pool.query(`
      INSERT INTO offline_allocations (
        id, branch_id, warehouse_id, device_id, product_id,
        allocated_capacity, consumed_capacity, released_capacity,
        state, version, issued_at, valid_from, expires_at
      ) VALUES (
        'alloc-chk-1', 'branch-001', 'wh-001', 'dev-001', 'prod-001',
        10, 0, 0, 'ACTIVE', 0,
        '2026-10-11T12:00:00.000Z', '2026-10-11T10:00:00.000Z', '2026-10-11T18:00:00.000Z'
      )
    `),
    /chk_offline_allocations_temporal_integrity/
  );

  // 2. Direct insert with valid_from >= expires_at fails
  await assert.rejects(
    () => pool.query(`
      INSERT INTO offline_allocations (
        id, branch_id, warehouse_id, device_id, product_id,
        allocated_capacity, consumed_capacity, released_capacity,
        state, version, issued_at, valid_from, expires_at
      ) VALUES (
        'alloc-chk-2', 'branch-001', 'wh-001', 'dev-001', 'prod-001',
        10, 0, 0, 'ACTIVE', 0,
        '2026-10-11T08:00:00.000Z', '2026-10-11T18:00:00.000Z', '2026-10-11T18:00:00.000Z'
      )
    `),
    /chk_offline_allocations_temporal_integrity/
  );
});

// 15. R1 — Real Database Concurrency Validation: Two competing sales on same batch under independent connections
maybe("R1 PostgreSQL: Two concurrent sales on same batch under independent connections enforce atomic stock guard", async (t) => {
  // Use two independent connection pools to guarantee separate physical PostgreSQL connections
  const pool1 = new Pool({ connectionString: databaseUrl, max: 5 });
  const pool2 = new Pool({ connectionString: databaseUrl, max: 5 });
  t.after(async () => {
    await pool1.end();
    await pool2.end();
  });

  await setupPostgresDb(pool1);

  // Deterministic promise-based synchronization barrier (Zero sleep, zero random timing):
  // Guarantees:
  // 1. Both sales read available batches at quantity 10 (pre-checks pass for both).
  // 2. Transaction 1 acquires row lock on batches and updates quantity (10 -> 3).
  // 3. Transaction 2 enters executeSaleAtomic and dispatches SELECT ... FOR UPDATE.
  // 4. In PostgreSQL, connection 2 blocks on the row lock held by connection 1.
  // 5. Connection 1 commits only after connection 2 is confirmed waiting on the lock.
  // 6. Connection 2 unblocks, sees quantity 3 < 7, and throws STALE_BATCH_OR_INSUFFICIENT_STOCK.
  let notifyTx1Locked;
  const tx1HasLocked = new Promise(resolve => { notifyTx1Locked = resolve; });

  let notifyTx2AttemptingLock;
  const tx2AttemptingLock = new Promise(resolve => { notifyTx2AttemptingLock = resolve; });

  // Wrap pool1 connection queries to hold transaction 1 until transaction 2 attempts lock
  const origConnect1 = pool1.connect.bind(pool1);
  pool1.connect = async () => {
    const client = await origConnect1();
    const origQuery = client.query.bind(client);
    client.query = async (text, params) => {
      const res = await origQuery(text, params);
      if (typeof text === "string" && text.includes("UPDATE batches")) {
        // Transaction 1 has acquired row lock and executed guarded update
        notifyTx1Locked();
        // Hold transaction 1 open until transaction 2 enters SELECT ... FOR UPDATE
        await tx2AttemptingLock;
      }
      return res;
    };
    return client;
  };

  // Wrap pool2 connection queries to signal when transaction 2 dispatches lock request
  const origConnect2 = pool2.connect.bind(pool2);
  pool2.connect = async () => {
    const client = await origConnect2();
    const origQuery = client.query.bind(client);
    client.query = async (text, params) => {
      if (typeof text === "string" && text.includes("SELECT quantity, status, expiry_date FROM batches WHERE id = $1 FOR UPDATE")) {
        // Transaction 2 is dispatching SELECT ... FOR UPDATE and will block in PostgreSQL on connection 1's row lock
        notifyTx2AttemptingLock();
      }
      return origQuery(text, params);
    };
    return client;
  };

  const persistence1 = new PostgresSalesPersistence(pool1);
  const persistence2 = new PostgresSalesPersistence(pool2);

  // Persistence 2 waits for tx1 to acquire row lock before executing its transaction
  const origExecute2 = persistence2.executeSaleAtomic.bind(persistence2);
  persistence2.executeSaleAtomic = async (plan) => {
    await tx1HasLocked;
    return origExecute2(plan);
  };

  const service1 = new SalesService(persistence1);
  const service2 = new SalesService(persistence2);

  const { context, cashSession, assignments } = createTestContext();

  const batchId = "batch-r1-concurrent";
  const productId = "prod-r1-concurrent";

  // Controlled scenario: Batch initial stock is exactly 10 units
  await seedPgBatch(pool1, {
    id: batchId,
    organizationId: "org-001",
    warehouseId: "wh-001",
    productId: productId,
    batchNumber: "BN-R1-CONC",
    expiryDate: "2028-12-31",
    quantity: 10,
    status: "ACTIVE",
    version: 0
  });

  // Verify initial quantity in PostgreSQL
  const initialBatch = await persistence1.getBatch(batchId);
  assert.equal(initialBatch.quantity.value, 10);

  // Two concurrent sales commands, each requesting 7 units (7 + 7 = 14 > 10, cannot both succeed)
  const commandA = {
    idempotencyKey: "idem-r1-sale-a",
    correlationId: "corr-r1-sale-a",
    context,
    cashSession,
    assignments,
    now: "2026-10-07T12:00:00Z",
    lines: [{
      productId,
      quantity: 7,
      unitPrice: money(10, "SDG")
    }],
    payments: [{
      method: "CASH",
      amount: money(70, "SDG")
    }]
  };

  const commandB = {
    idempotencyKey: "idem-r1-sale-b",
    correlationId: "corr-r1-sale-b",
    context,
    cashSession,
    assignments,
    now: "2026-10-07T12:00:00Z",
    lines: [{
      productId,
      quantity: 7,
      unitPrice: money(10, "SDG")
    }],
    payments: [{
      method: "CASH",
      amount: money(70, "SDG")
    }]
  };

  // Launch both sales concurrently on two independent PostgreSQL connection pools
  const [resA, resB] = await Promise.allSettled([
    service1.processSale(commandA),
    service2.processSale(commandB)
  ]);

  const fulfilled = [resA, resB].filter(r => r.status === "fulfilled");
  const rejected = [resA, resB].filter(r => r.status === "rejected");

  // 1. Exactly one sale succeeds and the other is rejected
  assert.equal(fulfilled.length, 1, "Exactly one concurrent sale must complete successfully");
  assert.equal(rejected.length, 1, "Exactly one concurrent sale must be rejected");

  const winner = fulfilled[0].value;
  const loserError = rejected[0].reason;

  assert.equal(winner.status, "COMPLETED");
  assert.equal(winner.totalAmount, 70);

  // The competing sale must fail strictly with in-transaction concurrency guard error (NOT in-memory pre-check)
  assert.equal(
    loserError.message,
    "STALE_BATCH_OR_INSUFFICIENT_STOCK",
    "Rejected sale must fail with STALE_BATCH_OR_INSUFFICIENT_STOCK from the in-transaction row lock check"
  );

  // 2. Exact batch stock verification in PostgreSQL: 10 - 7 = exactly 3
  const batchAfter = await pool1.query("SELECT quantity, version, status FROM batches WHERE id = $1", [batchId]);
  assert.equal(Number(batchAfter.rows[0].quantity), 3, "Batch quantity must remain exactly 3; double spend prevented");
  assert.equal(Number(batchAfter.rows[0].version), 1, "Batch version must increment exactly once");
  assert.equal(batchAfter.rows[0].status, "ACTIVE");

  // 3. Isolated data verification: All assertions scoped strictly to operation IDs
  // Winning sale verification
  const winnerSale = await pool1.query("SELECT id, status, total_amount, idempotency_key FROM sales WHERE id = $1", [winner.saleId]);
  assert.equal(winnerSale.rows.length, 1, "Winning sale record must exist in sales table");
  assert.equal(winnerSale.rows[0].status, "COMPLETED");
  assert.equal(Number(winnerSale.rows[0].total_amount), 70);

  const winnerLines = await pool1.query("SELECT sale_id, product_id, quantity FROM sale_lines WHERE sale_id = $1", [winner.saleId]);
  assert.equal(winnerLines.rows.length, 1, "Winning sale line must exist");
  assert.equal(Number(winnerLines.rows[0].quantity), 7);

  const winnerPayments = await pool1.query("SELECT sale_id, amount_value FROM payments WHERE sale_id = $1", [winner.saleId]);
  assert.equal(winnerPayments.rows.length, 1, "Winning payment must exist");
  assert.equal(Number(winnerPayments.rows[0].amount_value), 70);

  const winnerInvTx = await pool1.query("SELECT id, source_id, status FROM inventory_transactions WHERE id = $1", [winner.inventoryTransactionId]);
  assert.equal(winnerInvTx.rows.length, 1, "Winning inventory transaction must exist");
  assert.equal(winnerInvTx.rows[0].status, "POSTED");

  const winnerMovements = await pool1.query("SELECT inventory_transaction_id, quantity, direction FROM stock_movements WHERE inventory_transaction_id = $1", [winner.inventoryTransactionId]);
  assert.equal(winnerMovements.rows.length, 1, "Winning stock movement must exist");
  assert.equal(Number(winnerMovements.rows[0].quantity), 7);
  assert.equal(winnerMovements.rows[0].direction, "OUT");

  const winnerOutbox = await pool1.query("SELECT aggregate_id, event_type FROM outbox_events WHERE aggregate_id = $1", [winner.saleId]);
  assert.equal(winnerOutbox.rows.length, 1, "Winning outbox event must exist");
  assert.equal(winnerOutbox.rows[0].eventType, "sale.completed");

  const winnerAudit = await pool1.query("SELECT resource_id, action FROM audit_records WHERE resource_id = $1", [winner.saleId]);
  assert.equal(winnerAudit.rows.length, 1, "Winning audit record must exist");

  const winnerIdem = await pool1.query("SELECT key FROM idempotency_records WHERE key = $1", [commandA.idempotencyKey]);
  assert.equal(winnerIdem.rows.length, 1, "Winning idempotency record must exist");

  // Complete absence of loser's records scoped strictly to loser's idempotency key and correlation ID
  const loserIdem = await pool1.query("SELECT key FROM idempotency_records WHERE key = $1", [commandB.idempotencyKey]);
  assert.equal(loserIdem.rows.length, 0, "Rejected sale idempotency record must NOT exist");

  const loserAudit = await pool1.query("SELECT resource_id FROM audit_records WHERE correlation_id = $1", [commandB.correlationId]);
  assert.equal(loserAudit.rows.length, 0, "Rejected sale audit record must NOT exist");

  const loserOutbox = await pool1.query("SELECT event_id FROM outbox_events WHERE correlation_id = $1", [commandB.correlationId]);
  assert.equal(loserOutbox.rows.length, 0, "Rejected sale outbox event must NOT exist");

  const loserSales = await pool1.query("SELECT id FROM sales WHERE idempotency_key = $1 OR correlation_id = $2", [commandB.idempotencyKey, commandB.correlationId]);
  assert.equal(loserSales.rows.length, 0, "Rejected sale record must NOT exist");
});

