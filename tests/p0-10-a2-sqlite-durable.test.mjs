import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { DatabaseSync } from "node:sqlite";
import { SqliteConflictStore } from "../dist/src/infrastructure/conflict-store.js";
import { SqliteConflictResolutionUnitOfWork } from "../dist/src/infrastructure/sql/conflict-resolution-unit-of-work.js";
import { resolveConflictTransactionally } from "../dist/src/application/sync/transactional-resolution.js";
import { detectConflict, classifyConflict, triageConflict } from "../dist/src/domain/sync/conflict.js";

const foundationSql = fs.readFileSync(new URL("../docs/05-data/migrations/sqlite/001_p0_4_foundation.sql", import.meta.url), "utf8");

function setupDb(db) {
  db.exec(foundationSql);
}

function createSampleConflict(id = "conf-durable-1") {
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
      reason: "Stock discrepancy resolved by manual stocktake"
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
    resultingEffectIds: ["comp-movement-1"]
  };
}

// --- SqliteConflictStore Direct Operations ---

test("P0-10 SQLite: SqliteConflictStore persists, retrieves, and marks conflict resolved", async () => {
  const db = new DatabaseSync(":memory:");
  setupDb(db);

  const store = new SqliteConflictStore(db);
  const conflict = createSampleConflict("conf-store-1");

  // 1. Initial put
  await store.put({ conflict, requestFingerprint: "fp-init" });

  // 2. Retrieve
  const fetched = await store.get("conf-store-1");
  assert.ok(fetched);
  assert.equal(fetched.conflict.id, "conf-store-1");
  assert.equal(fetched.conflict.state, "TRIAGED");
  assert.equal(fetched.conflict.severity, "P0");
  assert.equal(fetched.requestFingerprint, "fp-init");
  assert.deepEqual(fetched.conflict.originalEffectIds, ["effect-orig-1", "effect-orig-2"]);

  // 3. Prevent duplicate insert
  await assert.rejects(
    () => store.put({ conflict }),
    /CONFLICT_ALREADY_EXISTS/
  );

  // 4. Mark resolved
  const resolvedConflict = {
    ...conflict,
    state: "RESOLVED",
    resolutionClass: "R-HUMAN",
    resultingEffectIds: ["effect-res-1"],
    version: conflict.version + 1
  };
  await store.markResolved("conf-store-1", {
    conflict: resolvedConflict,
    requestFingerprint: "fp-res-final",
    resolvedAt: "2026-10-12T10:10:00.000Z"
  });

  const updated = await store.get("conf-store-1");
  assert.ok(updated);
  assert.equal(updated.conflict.state, "RESOLVED");
  assert.equal(updated.conflict.resolutionClass, "R-HUMAN");
  assert.deepEqual(updated.conflict.resultingEffectIds, ["effect-res-1"]);
  assert.equal(updated.resolvedAt, "2026-10-12T10:10:00.000Z");

  // 5. Updating missing conflict throws
  await assert.rejects(
    () => store.markResolved("conf-nonexistent", { conflict }),
    /CONFLICT_NOT_FOUND/
  );

  db.close();
});

// --- SqliteConflictResolutionUnitOfWork Durability ---

test("P0-10 SQLite: Transactional resolution commits conflict, audit, and idempotency atomically", async () => {
  const db = new DatabaseSync(":memory:");
  setupDb(db);

  const uow = new SqliteConflictResolutionUnitOfWork(db);
  const req = createSampleRequest();

  const result = await resolveConflictTransactionally(req, "fp-tx-1", uow);

  assert.equal(result.replayed, false);
  assert.equal(result.decision.allowed, true);
  assert.equal(result.decision.conflict.state, "RESOLVED");

  // Verify durable table rows
  const conflictRow = db.prepare("SELECT * FROM sync_conflicts WHERE id = ?").get("conf-durable-1");
  assert.ok(conflictRow);
  assert.equal(conflictRow.state, "RESOLVED");
  assert.equal(conflictRow.resolution_class, "R-HUMAN");
  assert.equal(conflictRow.request_fingerprint, "fp-tx-1");

  const auditRows = db.prepare("SELECT * FROM audit_records WHERE resource_id = ?").all("conf-durable-1");
  assert.equal(auditRows.length, 1);
  assert.equal(auditRows[0].action, "SYNC_CONFLICT_RESOLVED");
  assert.equal(auditRows[0].actor_id, "usr-admin-1");

  const idempotencyRow = db.prepare("SELECT * FROM idempotency_records WHERE key = ?").get("conflict-conf-durable-1");
  assert.ok(idempotencyRow);
  assert.equal(idempotencyRow.command_name, "sync.conflict.resolve");
  assert.equal(idempotencyRow.request_hash, "fp-tx-1");

  db.close();
});

test("P0-10 SQLite: Rollback on exception leaves zero rows in conflict, audit, and idempotency", async () => {
  const db = new DatabaseSync(":memory:");
  setupDb(db);

  const uow = new SqliteConflictResolutionUnitOfWork(db);
  const req = createSampleRequest();

  await assert.rejects(
    () => uow.execute(req, async persistence => {
      await persistence.insertConflict({
        conflict: req.conflict,
        requestFingerprint: "fp-fail"
      });
      await persistence.appendAudit({
        id: "aud-fail",
        occurredAt: "2026-10-12T10:00:00.000Z",
        actorId: "usr-admin-1",
        action: "SYNC_CONFLICT_RESOLVED",
        resourceType: "SyncConflict",
        resourceId: req.conflict.id,
        tenantId: "t-001",
        organizationId: "org-001",
        correlationId: "c-1"
      });
      // Simulate crash or failure before commit
      throw new Error("INTENTIONAL_CRASH_BEFORE_COMMIT");
    }),
    /INTENTIONAL_CRASH_BEFORE_COMMIT/
  );

  // Assert complete rollback: zero rows created
  const conflictsCount = db.prepare("SELECT count(*) as n FROM sync_conflicts").get().n;
  const auditsCount = db.prepare("SELECT count(*) as n FROM audit_records").get().n;
  const idempotencyCount = db.prepare("SELECT count(*) as n FROM idempotency_records").get().n;

  assert.equal(Number(conflictsCount), 0);
  assert.equal(Number(auditsCount), 0);
  assert.equal(Number(idempotencyCount), 0);

  db.close();
});

test("P0-10 SQLite: Idempotent replay returns cached decision and rejects different fingerprint", async () => {
  const db = new DatabaseSync(":memory:");
  setupDb(db);

  const uow = new SqliteConflictResolutionUnitOfWork(db);
  const req = createSampleRequest();

  // 1. Initial resolution
  const first = await resolveConflictTransactionally(req, "fp-replay-test", uow);
  assert.equal(first.replayed, false);
  assert.equal(first.decision.allowed, true);

  // 2. Exact same fingerprint replay -> returns replayed=true without modifying audit count
  const replay = await resolveConflictTransactionally(req, "fp-replay-test", uow);
  assert.equal(replay.replayed, true);
  assert.equal(replay.decision.allowed, true);
  assert.equal(replay.decision.reason, "CONFLICT_RESOLUTION_REPLAY");

  const auditCount = db.prepare("SELECT count(*) as n FROM audit_records WHERE resource_id = ?").get(req.conflict.id).n;
  assert.equal(Number(auditCount), 1);

  // 3. Different fingerprint attempting to re-resolve an already resolved conflict is denied
  const conflictingReplay = await resolveConflictTransactionally(req, "fp-different-tamper", uow);
  assert.equal(conflictingReplay.replayed, false);
  assert.equal(conflictingReplay.decision.allowed, false);
  assert.equal(conflictingReplay.decision.reason, "CONFLICT_ALREADY_RESOLVED");

  db.close();
});

test("P0-10 SQLite: Durable restart and crash recovery maintains committed state across disk connections", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "pharmatech-conflict-test-"));
  const dbPath = path.join(tempDir, "conflicts-durable.db");

  try {
    // Phase 1: Open DB, initialize, execute resolution, abruptly close connection
    let db1 = new DatabaseSync(dbPath);
    setupDb(db1);

    const uow1 = new SqliteConflictResolutionUnitOfWork(db1);
    const req = createSampleRequest();

    const res1 = await resolveConflictTransactionally(req, "fp-restart-safe", uow1);
    assert.equal(res1.decision.allowed, true);
    assert.equal(res1.decision.conflict.state, "RESOLVED");

    // Close db abruptly to simulate crash / process restart
    db1.close();

    // Phase 2: Reopen new connection from disk, verify state survived 100% intact
    let db2 = new DatabaseSync(dbPath);
    const store2 = new SqliteConflictStore(db2);

    const recovered = await store2.get("conf-durable-1");
    assert.ok(recovered);
    assert.equal(recovered.conflict.state, "RESOLVED");
    assert.equal(recovered.conflict.resolutionClass, "R-HUMAN");
    assert.deepEqual(recovered.conflict.resultingEffectIds, ["comp-movement-1"]);
    assert.equal(recovered.requestFingerprint, "fp-restart-safe");

    // Replay idempotency on fresh instance after reboot
    const uow2 = new SqliteConflictResolutionUnitOfWork(db2);
    const rebootReplay = await resolveConflictTransactionally(req, "fp-restart-safe", uow2);
    assert.equal(rebootReplay.replayed, true);
    assert.equal(rebootReplay.decision.reason, "CONFLICT_RESOLUTION_REPLAY");

    db2.close();
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
