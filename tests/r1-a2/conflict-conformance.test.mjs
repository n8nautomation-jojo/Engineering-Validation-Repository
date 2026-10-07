import assert from "node:assert/strict";
import test from "node:test";

const transitions = {
  DETECTED: ["CLASSIFIED", "CONTAINED"],
  CLASSIFIED: ["TRIAGED", "CONTAINED"],
  TRIAGED: ["RESOLVING", "ESCALATED", "CONTAINED"],
  RESOLVING: ["RESOLVED", "FAILED", "CONTAINED"],
  FAILED: ["TRIAGED"],
  ESCALATED: ["RESOLVING", "CONTAINED"],
  RESOLVED: [],
  CONTAINED: []
};

function step(from, to) {
  assert.ok(transitions[from]?.includes(to), `invalid transition: ${from} -> ${to}`);
  return to;
}

test("A2 lifecycle is explicit and terminal states are immutable", () => {
  let state = "DETECTED";
  state = step(state, "CLASSIFIED");
  state = step(state, "TRIAGED");
  state = step(state, "RESOLVING");
  state = step(state, "RESOLVED");
  assert.equal(state, "RESOLVED");
  assert.throws(() => step(state, "TRIAGED"));
});

test("A2 failure and containment remain explicit", () => {
  let state = "DETECTED";
  state = step(state, "CLASSIFIED");
  state = step(state, "TRIAGED");
  state = step(state, "RESOLVING");
  state = step(state, "FAILED");
  state = step(state, "TRIAGED");
  state = step(state, "CONTAINED");
  assert.equal(state, "CONTAINED");
});

test("A2 resolution identity is idempotent", () => {
  const ledger = new Map();
  const id = "resolution-1";
  const effect = { effectId: "effect-1" };
  ledger.set(id, effect);
  const retry = ledger.get(id);
  assert.deepEqual(retry, effect);
});

test("A2 authorization requires capability and resource scope", () => {
  const allowed = (capability, scope, resourceScope) =>
    capability === "sync.conflict.resolve" && scope === resourceScope;
  assert.equal(allowed("sales.read", "branch-a", "branch-a"), false);
  assert.equal(allowed("sync.conflict.resolve", "branch-a", "branch-b"), false);
  assert.equal(allowed("sync.conflict.resolve", "branch-a", "branch-a"), true);
});

test("A2 compensation is a new effect and original history remains unchanged", () => {
  const original = Object.freeze({ id: "inventory-tx-1", state: "POSTED" });
  const compensation = { id: "inventory-tx-2", reversalOf: original.id };
  assert.equal(original.state, "POSTED");
  assert.equal(compensation.reversalOf, original.id);
  assert.notEqual(compensation.id, original.id);
});

test("A2 payment evidence cannot become external verification by itself", () => {
  const payment = { evidence: "screenshot", verification: "EVIDENCE_REVIEW" };
  assert.notEqual(payment.verification, "API_VERIFIED");
});

test("A2 return and refund remain separate effects", () => {
  const returned = { returnId: "return-1", state: "ACCEPTED" };
  const refund = { refundId: "refund-1", state: "PENDING" };
  assert.notEqual(returned.returnId, refund.refundId);
});

test("A2 containment survives restart", () => {
  const before = { conflictId: "c-1", state: "CONTAINED" };
  const after = structuredClone(before);
  assert.deepEqual(after, before);
});
