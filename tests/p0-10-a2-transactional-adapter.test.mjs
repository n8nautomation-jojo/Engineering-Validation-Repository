import test from "node:test";
import assert from "node:assert/strict";
import { InMemoryConflictResolutionUnitOfWork } from "../dist/src/persistence/a2-test-adapter.js";

const request = {
  authorization: {
    userId: "u-1",
    tenantId: "t-1",
    organizationId: "o-1",
    branchId: "b-1",
    deviceId: "d-1",
    capability: "sync.conflict.resolve",
    mode: "ONLINE",
    occurredAt: "2026-10-07T00:00:00.000Z",
    correlationId: "corr-1",
  },
  assignments: [],
  conflict: {
    id: "conf-1",
    operationId: "op-1",
    type: "DUPLICATE_OPERATION",
    severity: "P1",
    state: "TRIAGED",
    originalEffectIds: ["effect-1"],
    resultingEffectIds: [],
    createdAt: "2026-10-07T00:00:00.000Z",
    version: 2,
  },
  resolutionClass: "R-AUTO-IDEMPOTENT",
  resultingEffectIds: ["effect-2"],
};

const conflictRecord = {
  conflict: request.conflict,
  requestFingerprint: "fp-1",
};

const auditRecord = {
  id: "audit-1",
  occurredAt: "2026-10-07T00:00:00.000Z",
  actorId: "u-1",
  action: "SYNC_CONFLICT_RESOLVED",
  resourceType: "SyncConflict",
  resourceId: "conf-1",
  tenantId: "t-1",
  organizationId: "o-1",
  branchId: "b-1",
  deviceId: "d-1",
  correlationId: "corr-1",
};

test("A2 UoW commits conflict and audit atomically on success", async () => {
  const uow = new InMemoryConflictResolutionUnitOfWork();

  await uow.execute(request, async persistence => {
    await persistence.insertConflict(conflictRecord);
    await persistence.appendAudit(auditRecord);
    return "ok";
  });

  assert.equal(uow.committed, 1);
  assert.equal(uow.rolledBack, 0);
  assert.deepEqual(uow.getConflict("conf-1"), conflictRecord);
  assert.equal(uow.audits.length, 1);
  assert.equal(uow.audits[0]?.resourceId, "conf-1");
});

test("A2 UoW rolls back staged conflict and audit on operation failure", async () => {
  const uow = new InMemoryConflictResolutionUnitOfWork();

  await assert.rejects(
    uow.execute(request, async persistence => {
      await persistence.insertConflict(conflictRecord);
      await persistence.appendAudit(auditRecord);
      throw new Error("SIMULATED_COMMIT_FAILURE");
    }),
    /SIMULATED_COMMIT_FAILURE/,
  );

  assert.equal(uow.committed, 0);
  assert.equal(uow.rolledBack, 1);
  assert.equal(uow.getConflict("conf-1"), null);
  assert.equal(uow.audits.length, 0);
});

test("A2 UoW preserves durable fingerprint semantics for replay detection", async () => {
  const uow = new InMemoryConflictResolutionUnitOfWork();

  await uow.execute(request, async persistence => {
    await persistence.insertConflict(conflictRecord);
  });

  await uow.execute(request, async persistence => {
    assert.equal(await persistence.findResolutionFingerprint("conf-1"), "fp-1");
    return "replay";
  });

  assert.equal(uow.committed, 2);
  assert.equal(uow.getConflict("conf-1")?.requestFingerprint, "fp-1");
});

test("A2 UoW rejects duplicate conflict insertion without mutating committed state", async () => {
  const uow = new InMemoryConflictResolutionUnitOfWork();

  await uow.execute(request, async persistence => {
    await persistence.insertConflict(conflictRecord);
  });

  await assert.rejects(
    uow.execute(request, async persistence => {
      await persistence.insertConflict(conflictRecord);
    }),
    /CONFLICT_ALREADY_EXISTS/,
  );

  assert.equal(uow.committed, 1);
  assert.equal(uow.rolledBack, 1);
  assert.deepEqual(uow.getConflict("conf-1"), conflictRecord);
});
