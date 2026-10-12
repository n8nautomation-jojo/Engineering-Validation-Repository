import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { DatabaseSync } from "node:sqlite";
import {
  AuthorizationRuntime,
  SqliteAuthorizationSnapshotStore,
  PostgresAuthorizationSnapshotStore,
  createAuthorizationSnapshot,
  revokeAuthorizationSnapshot,
  computeSnapshotSignature,
  verifySnapshotSignature
} from "../dist/src/authorization/index.js";

function createInMemoryDb() {
  const db = new DatabaseSync(":memory:");
  const m1 = fs.readFileSync(path.resolve("docs/05-data/migrations/sqlite/001_p0_4_foundation.sql"), "utf8");
  db.exec(m1);
  return db;
}

const BASE_CONTEXT = {
  tenantId: "t-001",
  organizationId: "org-001",
  branchId: "branch-001",
  warehouseId: "wh-001",
  deviceId: "dev-001",
  userId: "usr-001"
};

const BASE_ASSIGNMENT = {
  userId: "usr-001",
  capabilities: [
    "sales.create",
    "payments.record",
    "inventory.read",
    "inventory.adjust.create",
    "inventory.adjust.approve",
    "sync.conflict.resolve",
    "cash.sessions.reconcile"
  ],
  scope: {
    tenantId: "t-001",
    organizationId: "org-001",
    branchIds: ["branch-001"],
    warehouseIds: ["wh-001"],
    deviceIds: ["dev-001"]
  },
  policyVersion: "v1.0"
};

test("AUTH-01: Actor with valid capability and scope receives ALLOW", async () => {
  const runtime = new AuthorizationRuntime();
  const decision = await runtime.authorize(
    {
      capability: "sales.create",
      context: BASE_CONTEXT,
      offline: false,
      now: "2026-10-12T10:00:00Z"
    },
    [BASE_ASSIGNMENT]
  );

  assert.equal(decision.allowed, true);
  assert.equal(decision.reason, "AUTHORIZED");
  assert.equal(decision.capability, "sales.create");
  assert.equal(decision.offlineClass, "OFFLINE_ELIGIBLE");
});

test("AUTH-02: Actor without requested capability is DENIED", async () => {
  const runtime = new AuthorizationRuntime();
  const decision = await runtime.authorize(
    {
      capability: "purchasing.po.create",
      context: BASE_CONTEXT,
      offline: false,
      now: "2026-10-12T10:00:00Z"
    },
    [BASE_ASSIGNMENT]
  );

  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, "CAPABILITY_OR_SCOPE_DENIED");
});

test("AUTH-03: Scope widening attempt by client input is rejected", async () => {
  const runtime = new AuthorizationRuntime();
  // Client attempts to execute in branch-999 which is not in assignment scope
  const decision = await runtime.authorize(
    {
      capability: "sales.create",
      context: { ...BASE_CONTEXT, branchId: "branch-999" },
      offline: false,
      now: "2026-10-12T10:00:00Z"
    },
    [BASE_ASSIGNMENT]
  );

  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, "CAPABILITY_OR_SCOPE_DENIED");
});

test("AUTH-04: Cross-branch access denied by default (resource in another branch)", async () => {
  const runtime = new AuthorizationRuntime();
  const decision = await runtime.authorize(
    {
      capability: "sales.create",
      context: BASE_CONTEXT,
      resource: {
        tenantId: "t-001",
        organizationId: "org-001",
        branchId: "branch-002" // different branch
      },
      offline: false,
      now: "2026-10-12T10:00:00Z"
    },
    [BASE_ASSIGNMENT]
  );

  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, "CAPABILITY_OR_SCOPE_DENIED");
});

test("AUTH-05: Cross-device access denied (context device outside assignment)", async () => {
  const runtime = new AuthorizationRuntime();
  const decision = await runtime.authorize(
    {
      capability: "sales.create",
      context: { ...BASE_CONTEXT, deviceId: "dev-002" },
      offline: false,
      now: "2026-10-12T10:00:00Z"
    },
    [BASE_ASSIGNMENT]
  );

  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, "CAPABILITY_OR_SCOPE_DENIED");
});

test("AUTH-06: Online-only capability is DENIED offline with OFFLINE_NOT_PERMITTED", async () => {
  const runtime = new AuthorizationRuntime();
  const decision = await runtime.authorize(
    {
      capability: "sync.conflict.resolve",
      context: BASE_CONTEXT,
      offline: true,
      now: "2026-10-12T10:00:00Z"
    },
    [BASE_ASSIGNMENT]
  );

  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, "OFFLINE_NOT_PERMITTED");
  assert.equal(decision.offlineClass, "ONLINE_ONLY");
});

test("AUTH-07: Valid offline snapshot enables offline authorized evaluation", async () => {
  const db = createInMemoryDb();
  const store = new SqliteAuthorizationSnapshotStore(db);
  const runtime = new AuthorizationRuntime(store);

  const snapshot = await runtime.issueSnapshot({
    snapshotId: "snap-01",
    userId: "usr-001",
    deviceId: "dev-001",
    tenantId: "t-001",
    organizationId: "org-001",
    assignments: [BASE_ASSIGNMENT],
    issuedAt: "2026-10-12T08:00:00.000Z",
    durationMs: 8 * 60 * 60 * 1000 // 8 hours
  });

  const decision = await runtime.authorize(
    {
      capability: "sales.create",
      context: BASE_CONTEXT,
      offline: true,
      now: "2026-10-12T10:00:00.000Z",
      snapshot
    },
    [BASE_ASSIGNMENT]
  );

  assert.equal(decision.allowed, true);
  assert.equal(decision.reason, "AUTHORIZED");
  assert.equal(decision.snapshotVersion, 1);
});

test("AUTH-08: Tampered snapshot signature fails integrity check and is DENIED", async () => {
  const runtime = new AuthorizationRuntime();

  const original = createAuthorizationSnapshot({
    snapshotId: "snap-tamper",
    version: 1,
    issuedAt: "2026-10-12T08:00:00.000Z",
    expiresAt: "2026-10-12T20:00:00.000Z",
    deviceId: "dev-001",
    userId: "usr-001",
    assignments: [BASE_ASSIGNMENT]
  });

  assert.equal(verifySnapshotSignature(original), true);

  // An attacker tampers with the assignments to inject unauthorized permissions
  const tampered = {
    ...original,
    assignments: [
      {
        ...BASE_ASSIGNMENT,
        capabilities: [...BASE_ASSIGNMENT.capabilities, "roles.manage"]
      }
    ]
  };

  assert.equal(verifySnapshotSignature(tampered), false);

  const decision = await runtime.authorize(
    {
      capability: "sales.create",
      context: BASE_CONTEXT,
      offline: true,
      now: "2026-10-12T10:00:00.000Z",
      snapshot: tampered
    },
    [BASE_ASSIGNMENT]
  );

  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, "SNAPSHOT_INTEGRITY_COMPROMISED");
});

test("AUTH-09: Expired snapshot past expiresAt is DENIED", async () => {
  const runtime = new AuthorizationRuntime();

  const expiredSnapshot = createAuthorizationSnapshot({
    snapshotId: "snap-exp",
    version: 1,
    issuedAt: "2026-10-12T00:00:00.000Z",
    expiresAt: "2026-10-12T06:00:00.000Z",
    deviceId: "dev-001",
    userId: "usr-001",
    assignments: [BASE_ASSIGNMENT]
  });

  const decision = await runtime.authorize(
    {
      capability: "sales.create",
      context: BASE_CONTEXT,
      offline: true,
      now: "2026-10-12T08:00:00.000Z", // 2 hours past expiry
      snapshot: expiredSnapshot
    },
    [BASE_ASSIGNMENT]
  );

  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, "OFFLINE_AUTHORITY_INVALID");
});

test("AUTH-10: Revoked snapshot is DENIED", async () => {
  const runtime = new AuthorizationRuntime();

  const snapshot = createAuthorizationSnapshot({
    snapshotId: "snap-rev",
    version: 1,
    issuedAt: "2026-10-12T08:00:00.000Z",
    expiresAt: "2026-10-12T20:00:00.000Z",
    deviceId: "dev-001",
    userId: "usr-001",
    assignments: [BASE_ASSIGNMENT]
  });

  const revoked = revokeAuthorizationSnapshot(snapshot);
  assert.equal(revoked.revoked, true);

  const decision = await runtime.authorize(
    {
      capability: "sales.create",
      context: BASE_CONTEXT,
      offline: true,
      now: "2026-10-12T10:00:00.000Z",
      snapshot: revoked
    },
    [BASE_ASSIGNMENT]
  );

  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, "OFFLINE_AUTHORITY_INVALID");
});

test("AUTH-11: Snapshot device mismatch is DENIED", async () => {
  const runtime = new AuthorizationRuntime();

  const snapshotDev2 = createAuthorizationSnapshot({
    snapshotId: "snap-dev2",
    version: 1,
    issuedAt: "2026-10-12T08:00:00.000Z",
    expiresAt: "2026-10-12T20:00:00.000Z",
    deviceId: "dev-002", // bound to dev-002
    userId: "usr-001",
    assignments: [BASE_ASSIGNMENT]
  });

  // Attempt to use dev-002 snapshot on dev-001
  const decision = await runtime.authorize(
    {
      capability: "sales.create",
      context: { ...BASE_CONTEXT, deviceId: "dev-001" },
      offline: true,
      now: "2026-10-12T10:00:00.000Z",
      snapshot: snapshotDev2
    },
    [BASE_ASSIGNMENT]
  );

  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, "OFFLINE_AUTHORITY_INVALID");
});

test("AUTH-12: Snapshot user mismatch is DENIED", async () => {
  const runtime = new AuthorizationRuntime();

  const snapshotUser2 = createAuthorizationSnapshot({
    snapshotId: "snap-u2",
    version: 1,
    issuedAt: "2026-10-12T08:00:00.000Z",
    expiresAt: "2026-10-12T20:00:00.000Z",
    deviceId: "dev-001",
    userId: "usr-002", // bound to usr-002
    assignments: [BASE_ASSIGNMENT]
  });

  // Attempt to use usr-002 snapshot by usr-001
  const decision = await runtime.authorize(
    {
      capability: "sales.create",
      context: { ...BASE_CONTEXT, userId: "usr-001" },
      offline: true,
      now: "2026-10-12T10:00:00.000Z",
      snapshot: snapshotUser2
    },
    [BASE_ASSIGNMENT]
  );

  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, "OFFLINE_AUTHORITY_INVALID");
});

test("AUTH-13: SoD self-approval rejected for stock adjustment approval", async () => {
  const runtime = new AuthorizationRuntime();

  // User u1 created the stock adjustment, and u1 attempts to approve it
  const decision = await runtime.authorize(
    {
      capability: "inventory.adjust.approve",
      context: BASE_CONTEXT,
      offline: false,
      now: "2026-10-12T10:00:00Z",
      sod: {
        independentApprovalRequired: true,
        creatorUserId: "usr-001" // same as context.userId
      }
    },
    [BASE_ASSIGNMENT]
  );

  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, "SOD_SELF_APPROVAL_DENIED");
});

test("AUTH-14: SoD self-approval rejected for sync conflict resolution", async () => {
  const runtime = new AuthorizationRuntime();

  // Conflict was raised by usr-001
  const decision = await runtime.authorize(
    {
      capability: "sync.conflict.resolve",
      context: BASE_CONTEXT,
      offline: false,
      now: "2026-10-12T10:00:00Z",
      sod: {
        independentApprovalRequired: true,
        creatorUserId: "usr-001"
      }
    },
    [BASE_ASSIGNMENT]
  );

  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, "SOD_SELF_APPROVAL_DENIED");
});

test("AUTH-15: Independent approval accepted when approver is a distinct user", async () => {
  const runtime = new AuthorizationRuntime();

  // Created by usr-creator, approved by usr-001
  const decision = await runtime.authorize(
    {
      capability: "inventory.adjust.approve",
      context: BASE_CONTEXT, // userId is usr-001
      offline: false,
      now: "2026-10-12T10:00:00Z",
      sod: {
        independentApprovalRequired: true,
        creatorUserId: "usr-creator-distinct"
      }
    },
    [BASE_ASSIGNMENT]
  );

  assert.equal(decision.allowed, true);
  assert.equal(decision.reason, "AUTHORIZED");
});

test("AUTH-16: Sensitive authorization decisions automatically persist structured audit records", async () => {
  const db = createInMemoryDb();

  const auditSink = {
    async appendAudit(record) {
      db.prepare(`
        INSERT INTO audit_records (
          id, occurred_at, actor_id, action, resource_type, resource_id,
          tenant_id, organization_id, branch_id, device_id, correlation_id, reason, after_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        record.id,
        record.occurredAt,
        record.actorId,
        record.action,
        record.resourceType,
        record.resourceId,
        record.tenantId,
        record.organizationId,
        record.branchId ?? null,
        record.deviceId ?? null,
        record.correlationId,
        record.reason ?? null,
        record.after ? JSON.stringify(record.after) : null
      );
    }
  };

  const runtime = new AuthorizationRuntime(undefined, auditSink);

  // 1. Allowed sensitive action
  await runtime.authorize(
    {
      capability: "sales.create",
      context: BASE_CONTEXT,
      offline: false,
      now: "2026-10-12T10:00:00Z"
    },
    [BASE_ASSIGNMENT]
  );

  // 2. Denied sensitive action (SoD denial)
  await runtime.authorize(
    {
      capability: "inventory.adjust.approve",
      context: BASE_CONTEXT,
      offline: false,
      now: "2026-10-12T10:05:00Z",
      sod: {
        independentApprovalRequired: true,
        creatorUserId: "usr-001"
      }
    },
    [BASE_ASSIGNMENT]
  );

  const audits = db.prepare("SELECT * FROM audit_records ORDER BY occurred_at ASC").all();
  assert.equal(audits.length, 2);

  assert.equal(audits[0].action, "authorization.allowed");
  assert.equal(audits[0].actor_id, "usr-001");
  assert.equal(audits[0].resource_id, "sales.create");

  assert.equal(audits[1].action, "authorization.denied");
  assert.equal(audits[1].actor_id, "usr-001");
  assert.equal(audits[1].resource_id, "inventory.adjust.approve");
  assert.equal(audits[1].reason, "SOD_SELF_APPROVAL_DENIED");
});

test("AUTH-17: Durable SQLite persistence survives process restart across disk connections", async () => {
  const dbPath = path.join(os.tmpdir(), `pharmatech-auth-crash-${Date.now()}-${Math.random().toString(36).slice(2)}.sqlite`);

  try {
    // 1. First process: create DB, save snapshot, revoke it
    let db1 = new DatabaseSync(dbPath);
    const m1 = fs.readFileSync(path.resolve("docs/05-data/migrations/sqlite/001_p0_4_foundation.sql"), "utf8");
    db1.exec(m1);

    const store1 = new SqliteAuthorizationSnapshotStore(db1);
    const runtime1 = new AuthorizationRuntime(store1);

    const userDiskAssignment = {
      ...BASE_ASSIGNMENT,
      userId: "usr-disk-01",
      scope: {
        ...BASE_ASSIGNMENT.scope,
        deviceIds: ["dev-disk-01"]
      }
    };

    const snap = await runtime1.issueSnapshot({
      snapshotId: "snap-disk-01",
      userId: "usr-disk-01",
      deviceId: "dev-disk-01",
      tenantId: "t-001",
      organizationId: "org-001",
      assignments: [userDiskAssignment],
      issuedAt: "2026-10-12T08:00:00.000Z",
      durationMs: 12 * 60 * 60 * 1000
    });

    assert.ok(snap.signature);

    // Verify snapshot was stored
    const stored = await store1.getSnapshot("snap-disk-01");
    assert.equal(stored?.snapshotId, "snap-disk-01");
    assert.equal(stored?.revoked, false);

    // Revoke snapshot
    await runtime1.revokeSnapshot("snap-disk-01", "Device quarantined", "2026-10-12T09:00:00.000Z");

    // Close connection simulating process restart / crash
    db1.close();

    // 2. Second process: open new connection to same disk file
    const db2 = new DatabaseSync(dbPath);
    const store2 = new SqliteAuthorizationSnapshotStore(db2);
    const runtime2 = new AuthorizationRuntime(store2);

    const recovered = await store2.getSnapshot("snap-disk-01");
    assert.ok(recovered);
    assert.equal(recovered.snapshotId, "snap-disk-01");
    assert.equal(recovered.userId, "usr-disk-01");
    assert.equal(recovered.deviceId, "dev-disk-01");
    assert.equal(recovered.revoked, true); // Revocation state survived restart!
    assert.equal(recovered.signature, snap.signature);

    // Authorize offline with recovered snapshot must fail because it is revoked
    const decision = await runtime2.authorize(
      {
        capability: "sales.create",
        context: { ...BASE_CONTEXT, userId: "usr-disk-01", deviceId: "dev-disk-01" },
        offline: true,
        now: "2026-10-12T10:00:00.000Z",
        snapshot: recovered
      },
      [userDiskAssignment]
    );

    assert.equal(decision.allowed, false);
    assert.equal(decision.reason, "OFFLINE_AUTHORITY_INVALID");

    db2.close();
  } finally {
    try { fs.unlinkSync(dbPath); } catch {}
  }
});

test("AUTH-18: PostgreSQL snapshot store schema parity and contract verification", async () => {
  const mockQueries = [];
  const mockRows = [];

  const mockPgClient = {
    async query(sql, params) {
      mockQueries.push({ sql, params });
      if (sql.includes("SELECT * FROM authorization_snapshots")) {
        return {
          rows: [
            {
              snapshot_id: "snap-pg-01",
              user_id: "usr-pg-01",
              device_id: "dev-pg-01",
              tenant_id: "t-001",
              organization_id: "org-001",
              version: 1,
              issued_at: new Date("2026-10-12T08:00:00Z"),
              expires_at: new Date("2026-10-12T20:00:00Z"),
              signature: "sig-pg-123",
              revoked: false,
              assignments_json: JSON.stringify([BASE_ASSIGNMENT])
            }
          ],
          rowCount: 1
        };
      }
      return { rows: [], rowCount: 1 };
    }
  };

  const pgStore = new PostgresAuthorizationSnapshotStore(mockPgClient);
  await pgStore.ensureSchema();

  assert.ok(mockQueries.some(q => q.sql.includes("CREATE TABLE IF NOT EXISTS authorization_snapshots")));

  // Save snapshot
  const snap = createAuthorizationSnapshot({
    snapshotId: "snap-pg-01",
    version: 1,
    issuedAt: "2026-10-12T08:00:00.000Z",
    expiresAt: "2026-10-12T20:00:00.000Z",
    deviceId: "dev-pg-01",
    userId: "usr-pg-01",
    tenantId: "t-001",
    organizationId: "org-001",
    assignments: [BASE_ASSIGNMENT]
  });

  await pgStore.saveSnapshot(snap);
  assert.ok(mockQueries.some(q => q.sql.includes("INSERT INTO authorization_snapshots")));

  // Retrieve snapshot
  const retrieved = await pgStore.getSnapshot("snap-pg-01");
  assert.ok(retrieved);
  assert.equal(retrieved.snapshotId, "snap-pg-01");
  assert.equal(retrieved.userId, "usr-pg-01");
  assert.equal(retrieved.deviceId, "dev-pg-01");
  assert.equal(retrieved.signature, "sig-pg-123");

  // Revoke snapshot
  await pgStore.revokeSnapshot("snap-pg-01", "2026-10-12T09:00:00.000Z");
  assert.ok(mockQueries.some(q => q.sql.includes("UPDATE authorization_snapshots SET revoked = TRUE")));
});
