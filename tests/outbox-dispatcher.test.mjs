import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { SqliteOutboxStore } from "../dist/src/infrastructure/sqlite/sqlite-outbox-store.js";
import { OutboxDispatcher } from "../dist/src/application/sync/outbox-dispatcher.js";

function createMockContext() {
  return {
    tenantId: "tenant-01",
    organizationId: "org-01",
    branchId: "branch-01",
    deviceId: "pos-dev-01",
    userId: "user-01",
    correlationId: "corr-test-01"
  };
}

function createSampleEvent(id, offsetSeconds = 0, eventType = "sale.completed") {
  const time = new Date(Date.now() + offsetSeconds * 1000).toISOString();
  return {
    eventId: id,
    eventType,
    aggregateId: `sale-${id}`,
    aggregateVersion: 1,
    occurredAt: time,
    tenantId: "tenant-01",
    organizationId: "org-01",
    branchId: "branch-01",
    deviceId: "pos-dev-01",
    correlationId: `corr-${id}`,
    payload: { invoiceNumber: `INV-${id}`, totalAmount: 5000 }
  };
}

test("OutboxDispatcher: dispatches events in strict chronological order and marks dispatched", async () => {
  const db = new DatabaseSync(":memory:");
  const store = new SqliteOutboxStore(db);
  const context = createMockContext();

  // Insert 3 events out of insertion order
  await store.append(createSampleEvent("evt-02", 20), context);
  await store.append(createSampleEvent("evt-01", 10), context);
  await store.append(createSampleEvent("evt-03", 30), context);

  const deliveredEvents = [];
  const mockTransport = {
    async deliver(event) {
      deliveredEvents.push(event.eventId);
      return { success: true, status: 200, retryable: false };
    }
  };

  const recordedAudits = [];
  const mockAuditStore = {
    async append(record) {
      recordedAudits.push(record);
    }
  };

  const dispatcher = new OutboxDispatcher(store, mockTransport, mockAuditStore);
  const summary = await dispatcher.dispatchPending(10);

  assert.equal(summary.processed, 3);
  assert.equal(summary.succeeded, 3);
  assert.equal(summary.failed, 0);
  assert.equal(summary.stoppedDueToRetryableError, false);

  // Assert chronological FIFO order (evt-01 was at +10s, evt-02 at +20s, evt-03 at +30s)
  assert.deepEqual(deliveredEvents, ["evt-01", "evt-02", "evt-03"]);

  // Verify store state: pending should now be empty
  const remainingPending = await store.getPending(10);
  assert.equal(remainingPending.length, 0);

  // Verify audit records generated
  assert.equal(recordedAudits.length, 3);
  assert.equal(recordedAudits[0].action, "OUTBOX_EVENT_DISPATCHED");
  assert.equal(recordedAudits[0].resourceId, "evt-01");
});

test("OutboxDispatcher: halts on retryable network error to protect FIFO order", async () => {
  const db = new DatabaseSync(":memory:");
  const store = new SqliteOutboxStore(db);
  const context = createMockContext();

  await store.append(createSampleEvent("evt-01", 1), context);
  await store.append(createSampleEvent("evt-02", 2), context);
  await store.append(createSampleEvent("evt-03", 3), context);

  let callCount = 0;
  const mockTransport = {
    async deliver(event) {
      callCount++;
      if (event.eventId === "evt-02") {
        // Network timeout / offline
        return { success: false, status: 503, error: "NETWORK_TIMEOUT", retryable: true };
      }
      return { success: true, status: 200, retryable: false };
    }
  };

  const dispatcher = new OutboxDispatcher(store, mockTransport);
  const summary = await dispatcher.dispatchPending(10);

  assert.equal(summary.succeeded, 1); // evt-01 succeeded
  assert.equal(summary.failed, 1);    // evt-02 failed
  assert.equal(summary.stoppedDueToRetryableError, true);
  assert.equal(callCount, 2); // evt-03 was NEVER attempted to protect causal ordering!

  // In store: evt-01 is dispatched, evt-02 & evt-03 remain pending
  const pending = await store.getPending(10);
  assert.equal(pending.length, 2);
  assert.equal(pending[0].eventId, "evt-02");
  assert.equal(pending[1].eventId, "evt-03");
});

test("OutboxDispatcher: marks non-retryable poison events as failed and proceeds", async () => {
  const db = new DatabaseSync(":memory:");
  const store = new SqliteOutboxStore(db);
  const context = createMockContext();

  await store.append(createSampleEvent("evt-01", 1), context);
  await store.append(createSampleEvent("evt-bad", 2), context);
  await store.append(createSampleEvent("evt-03", 3), context);

  const delivered = [];
  const mockTransport = {
    async deliver(event) {
      delivered.push(event.eventId);
      if (event.eventId === "evt-bad") {
        return { success: false, status: 400, error: "INVALID_EVENT_SCHEMA", retryable: false };
      }
      return { success: true, status: 200, retryable: false };
    }
  };

  const dispatcher = new OutboxDispatcher(store, mockTransport);
  const summary = await dispatcher.dispatchPending(10);

  assert.equal(summary.succeeded, 2);
  assert.equal(summary.failed, 1);
  assert.equal(summary.stoppedDueToRetryableError, false);
  assert.deepEqual(delivered, ["evt-01", "evt-bad", "evt-03"]);

  // evt-bad was marked FAILED, so pending is 0
  const pending = await store.getPending(10);
  assert.equal(pending.length, 0);

  // Check all events status in store
  const all = await store.getAll();
  const badRow = all.find(e => e.eventId === "evt-bad");
  assert.equal(badRow.status, "FAILED");
});
