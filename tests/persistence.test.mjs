import test from "node:test";
import assert from "node:assert/strict";
import { InMemoryTransactionManager, InMemoryVersionedRepository, InMemoryIdempotencyStore, InMemoryAuditStore } from "../dist/src/persistence/test-adapter.js";

const context = {
  tenantId: "tenant-1",
  organizationId: "org-1",
  branchId: "branch-1",
  userId: "user-1",
  correlationId: "corr-1"
};

test("transaction manager creates independently trackable transactions", async () => {
  const manager = new InMemoryTransactionManager();
  const tx = await manager.begin(context);
  await tx.commit();
  assert.equal(manager.transactions.length, 1);
  assert.equal(manager.transactions[0].committed, true);
});

test("versioned repository rejects stale writes", async () => {
  const repo = new InMemoryVersionedRepository();
  await repo.insert({ id: "sale-1", version: 1 });
  await assert.rejects(() => repo.update({ id: "sale-1", version: 3 }, 0), /STALE_VERSION/);
  await repo.update({ id: "sale-1", version: 2 }, 1);
  assert.deepEqual(await repo.get("sale-1"), { id: "sale-1", version: 2 });
});

test("idempotency store distinguishes command names", async () => {
  const store = new InMemoryIdempotencyStore();
  const record = {
    key: "key-1",
    commandName: "sales.create",
    requestHash: "hash",
    responseStatus: 201,
    responseBody: { id: "sale-1" },
    createdAt: new Date().toISOString()
  };
  await store.put(record);
  assert.deepEqual(await store.find("key-1", "sales.create"), record);
  assert.equal(await store.find("key-1", "payments.record"), null);
});

test("audit store is append-only at the adapter contract level", async () => {
  const store = new InMemoryAuditStore();
  await store.append({
    id: "audit-1",
    occurredAt: new Date().toISOString(),
    actorId: "user-1",
    action: "sale.create",
    resourceType: "Sale",
    resourceId: "sale-1",
    tenantId: "tenant-1",
    organizationId: "org-1",
    branchId: "branch-1",
    correlationId: "corr-1"
  });
  assert.equal(store.records.length, 1);
});
