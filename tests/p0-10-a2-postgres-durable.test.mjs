import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import pg from "pg";
const { Pool } = pg;
import { DatabaseSync } from "node:sqlite";
import { PostgresConflictStore, SqliteConflictStore } from "../dist/src/infrastructure/conflict-store.js";
import { PostgresConflictResolutionUnitOfWork, SqliteConflictResolutionUnitOfWork } from "../dist/src/infrastructure/sql/conflict-resolution-unit-of-work.js";
import { resolveConflictTransactionally } from "../dist/src/application/sync/transactional-resolution.js";
import { detectConflict, classifyConflict, triageConflict } from "../dist/src/domain/sync/conflict.js";

const databaseUrl = process.env.DATABASE_URL;
const shouldRun = Boolean(databaseUrl);
const maybe = shouldRun ? test : test.skip;

const pgFoundationSql = fs.readFileSync(new URL("../docs/05-data/migrations/postgresql/001_p0_4_foundation.sql", import.meta.url), "utf8");
const sqliteFoundationSql = fs.readFileSync(new URL("../docs/05-data/migrations/sqlite/001_p0_4_foundation.sql", import.meta.url), "utf8");

async function setupPostgresDb(pool) {
  await pool.query(pgFoundationSql);
  await pool.query("DELETE FROM sync_conflicts; DELETE FROM audit_records; DELETE FROM idempotency_records;");
}

function createSampleConflict(id = "conf-pg-1") {
  return triageConflict(
    classifyConflict(
      detectConflict({
        id,
        operationId: `op-${id}`,
        type: "STOCK_SHORTFALL",
        severity: "P0",
        originalEffectIds: ["effect-orig-1", "effect-orig-2"],
        resultingEffectIds: [],
        createdAt: "2026-10-12T10:00:00.000Z"
      })
    )
  );
}

function createSampleRequest(conflict = createSampleConflict()) {
  return {
    authorization: {
      context: {
        tenantId: "t-001",
        organizationId: "org-001",
        branchId: "branch-001",
        warehouseId: "wh-001",
        deviceId: "pos-01",
        userId: "usr-admin-1",
        correlationId: "corr-conf-01"
      },
      capability: "sync.conflict.resolve",
      offline: false,
      now: "2026-10-12T10:05:00.000Z",
      reason: "Stock shortfall resolved by inventory adjustment"
    },
    assignments: [{
      userId: "usr-admin-1",
      capabilities: ["sync.conflict.resolve"],
      scope: {
        tenantId: "t-001",
        organizationId: "org-001",
        branchIds: ["branch-001"],
        warehouseIds: ["wh-001"],
        deviceIds: ["pos-01"]
      },
      policyVersion: "v1"
    }],
    conflict,
    resolutionClass: "R-HUMAN",
    resultingEffectIds: ["comp-adj-1"]
  };
}

// --- Parity Verification: SQLite vs PostgreSQL (always runs local SQLite side) ---

test("P0-10 Parity: SQLite vs PostgreSQL conflict persistence produce identical domain structures", async (t) => {
  // 1. SQLite execution (always runs)
  const sqliteDb = new DatabaseSync(":memory:");
  sqliteDb.exec(sqliteFoundationSql);

  const sqliteUow = new SqliteConflictResolutionUnitOfWork(sqliteDb);
  const sqliteReq = createSampleRequest(createSampleConflict("conf-parity-1"));
  const sqliteRes = await resolveConflictTransactionally(sqliteReq, "fp-parity-1", sqliteUow);

  const sqliteStore = new SqliteConflictStore(sqliteDb);
  const sqliteRecord = await sqliteStore.get("conf-parity-1");
  const sqliteAudit = sqliteDb.prepare("SELECT * FROM audit_records WHERE resource_id = ?").get("conf-parity-1");

  assert.ok(sqliteRecord);
  assert.equal(sqliteRecord.conflict.id, "conf-parity-1");
  assert.equal(sqliteRecord.conflict.state, "RESOLVED");
  assert.equal(sqliteRecord.conflict.resolutionClass, "R-HUMAN");
  assert.equal(sqliteAudit.action, "SYNC_CONFLICT_RESOLVED");

  // 2. PostgreSQL execution (if DATABASE_URL is available)
  if (shouldRun) {
    const pool = new Pool({ connectionString: databaseUrl });
    t.after(async () => pool.end());
    await setupPostgresDb(pool);

    const pgUow = new PostgresConflictResolutionUnitOfWork(pool);
    const pgReq = createSampleRequest(createSampleConflict("conf-parity-1"));
    const pgRes = await resolveConflictTransactionally(pgReq, "fp-parity-1", pgUow);

    const pgStore = new PostgresConflictStore(pool);
    const pgRecord = await pgStore.get("conf-parity-1");
    const pgAuditRes = await pool.query("SELECT * FROM audit_records WHERE resource_id = $1", ["conf-parity-1"]);
    const pgAudit = pgAuditRes.rows[0];

    assert.equal(pgRes.replayed, sqliteRes.replayed);
    assert.equal(pgRes.decision.allowed, sqliteRes.decision.allowed);
    assert.equal(pgRes.decision.conflict.state, sqliteRes.decision.conflict.state);
    assert.deepEqual(pgRecord.conflict.originalEffectIds, sqliteRecord.conflict.originalEffectIds);
    assert.deepEqual(pgRecord.conflict.resultingEffectIds, sqliteRecord.conflict.resultingEffectIds);
    assert.equal(pgAudit.action, sqliteAudit.action);
    assert.equal(pgAudit.actor_id, sqliteAudit.actor_id);
  }

  sqliteDb.close();
});

// --- PostgreSQL Direct Integration Tests ---

maybe("P0-10 PostgreSQL: PostgresConflictStore persists, retrieves, and updates conflict", async (t) => {
  const pool = new Pool({ connectionString: databaseUrl });
  t.after(async () => pool.end());
  await setupPostgresDb(pool);

  const store = new PostgresConflictStore(pool);
  const conflict = createSampleConflict("conf-pg-store-1");

  await store.put({ conflict, requestFingerprint: "fp-pg-init" });

  const fetched = await store.get("conf-pg-store-1");
  assert.ok(fetched);
  assert.equal(fetched.conflict.id, "conf-pg-store-1");
  assert.equal(fetched.conflict.state, "TRIAGED");
  assert.equal(fetched.requestFingerprint, "fp-pg-init");
  assert.deepEqual(fetched.conflict.originalEffectIds, ["effect-orig-1", "effect-orig-2"]);

  await assert.rejects(
    () => store.put({ conflict }),
    /CONFLICT_ALREADY_EXISTS/
  );

  const resolved = {
    ...conflict,
    state: "RESOLVED",
    resolutionClass: "R-HUMAN",
    resultingEffectIds: ["res-effect-pg-1"],
    version: conflict.version + 1
  };

  await store.markResolved("conf-pg-store-1", {
    conflict: resolved,
    requestFingerprint: "fp-pg-final",
    resolvedAt: "2026-10-12T10:15:00.000Z"
  });

  const updated = await store.get("conf-pg-store-1");
  assert.ok(updated);
  assert.equal(updated.conflict.state, "RESOLVED");
  assert.deepEqual(updated.conflict.resultingEffectIds, ["res-effect-pg-1"]);
});

maybe("P0-10 PostgreSQL: PostgresConflictResolutionUnitOfWork commits atomically and rolls back on failure", async (t) => {
  const pool = new Pool({ connectionString: databaseUrl });
  t.after(async () => pool.end());
  await setupPostgresDb(pool);

  const uow = new PostgresConflictResolutionUnitOfWork(pool);
  const req = createSampleRequest(createSampleConflict("conf-pg-atomic-1"));

  // 1. Commit path
  const res = await resolveConflictTransactionally(req, "fp-pg-tx-1", uow);
  assert.equal(res.decision.allowed, true);
  assert.equal(res.decision.conflict.state, "RESOLVED");

  const confCheck = await pool.query("SELECT count(*)::int as n FROM sync_conflicts WHERE id = $1", ["conf-pg-atomic-1"]);
  assert.equal(confCheck.rows[0].n, 1);
  const auditCheck = await pool.query("SELECT count(*)::int as n FROM audit_records WHERE resource_id = $1", ["conf-pg-atomic-1"]);
  assert.equal(auditCheck.rows[0].n, 1);
  const idemCheck = await pool.query("SELECT count(*)::int as n FROM idempotency_records WHERE key = $1", ["conflict-conf-pg-atomic-1"]);
  assert.equal(idemCheck.rows[0].n, 1);

  // 2. Rollback path
  await assert.rejects(
    () => uow.execute(req, async persistence => {
      await persistence.insertConflict({
        conflict: createSampleConflict("conf-pg-fail"),
        requestFingerprint: "fp-fail"
      });
      throw new Error("INTENTIONAL_POSTGRES_ROLLBACK");
    }),
    /INTENTIONAL_POSTGRES_ROLLBACK/
  );

  const rolledConf = await pool.query("SELECT count(*)::int as n FROM sync_conflicts WHERE id = $1", ["conf-pg-fail"]);
  assert.equal(rolledConf.rows[0].n, 0);

  // 3. Replay detection
  const replayRes = await resolveConflictTransactionally(req, "fp-pg-tx-1", uow);
  assert.equal(replayRes.replayed, true);
  assert.equal(replayRes.decision.reason, "CONFLICT_RESOLUTION_REPLAY");
});
