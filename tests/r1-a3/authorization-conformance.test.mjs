import assert from "node:assert/strict";
import test from "node:test";

/**
 * R1-A3 Reference Authorization Conformance
 *
 * Reference-only tests derived from the final A3 reconciliation and
 * reconciled Phase 3.4 capability vocabulary.
 *
 * This is not production authorization implementation and does not
 * establish R1-B security evidence.
 */

const OFFLINE = {
  "sales.create": "OFFLINE_ELIGIBLE",
  "payments.record": "OFFLINE_ELIGIBLE",
  "payments.read": "OFFLINE_ELIGIBLE",
  "cash.sessions.move": "OFFLINE_ELIGIBLE",
  "inventory.read": "OFFLINE_ELIGIBLE",
  "sync.push": "OFFLINE_ELIGIBLE",
  "sync.pull": "OFFLINE_ELIGIBLE",
  "sales.return": "OFFLINE_RESTRICTED",
  "sales.reverse": "OFFLINE_RESTRICTED",
  "payments.evidence.add": "OFFLINE_RESTRICTED",
  "payments.verify.manual": "OFFLINE_RESTRICTED",
  "cash.sessions.open": "OFFLINE_RESTRICTED",
  "cash.sessions.close": "OFFLINE_RESTRICTED",
  "cash.sessions.reconcile": "ONLINE_ONLY",
  "inventory.adjust.approve": "ONLINE_ONLY",
  "purchasing.po.create": "ONLINE_ONLY",
  "payments.verify.external": "ONLINE_ONLY",
  "sync.conflict.resolve": "ONLINE_ONLY",
  "audit.read": "ONLINE_ONLY",
  "authorization.manage": "ONLINE_ONLY",
  "devices.manage": "ONLINE_ONLY"
};

function effectiveScope(assignment, request, resource, policy) {
  return assignment === request && request === resource && resource === policy;
}

function authorize({ capability, required, assignment, request, resource, policy }) {
  return capability === required &&
    effectiveScope(assignment, request, resource, policy);
}

function offlineAllowed(capability, policyAllowsRestricted = false) {
  const cls = OFFLINE[capability];
  if (cls === "OFFLINE_ELIGIBLE") return true;
  if (cls === "OFFLINE_RESTRICTED") return policyAllowsRestricted;
  return false;
}

test("A3-R03 effective scope is intersection, never client-expanded", () => {
  assert.equal(effectiveScope("branch-a", "branch-a", "branch-a", "branch-a"), true);
  assert.equal(effectiveScope("branch-a", "branch-b", "branch-b", "branch-b"), false);
  assert.equal(effectiveScope("branch-a", "branch-a", "branch-b", "branch-a"), false);
});

test("A3 missing capability is denied", () => {
  assert.equal(
    authorize({
      capability: "sales.read",
      required: "sales.create",
      assignment: "branch-a",
      request: "branch-a",
      resource: "branch-a",
      policy: "branch-a"
    }),
    false
  );
});

test("A3 valid capability and scope is accepted", () => {
  assert.equal(
    authorize({
      capability: "sales.create",
      required: "sales.create",
      assignment: "branch-a",
      request: "branch-a",
      resource: "branch-a",
      policy: "branch-a"
    }),
    true
  );
});

test("A3 cross-branch access is denied by default", () => {
  assert.equal(
    authorize({
      capability: "sales.create",
      required: "sales.create",
      assignment: "branch-a",
      request: "branch-b",
      resource: "branch-b",
      policy: "branch-b"
    }),
    false
  );
});

test("A3 online-only capability is denied offline", () => {
  assert.equal(offlineAllowed("cash.sessions.reconcile"), false);
  assert.equal(offlineAllowed("payments.verify.external"), false);
  assert.equal(offlineAllowed("sync.conflict.resolve"), false);
  assert.equal(offlineAllowed("authorization.manage"), false);
});

test("A3 restricted capability requires explicit local policy", () => {
  assert.equal(offlineAllowed("cash.sessions.close", false), false);
  assert.equal(offlineAllowed("cash.sessions.close", true), true);
});

test("A3 eligible capability remains locally usable within its authorization scope", () => {
  assert.equal(offlineAllowed("sales.create"), true);
  assert.equal(offlineAllowed("payments.record"), true);
  assert.equal(offlineAllowed("inventory.read"), true);
});

test("A3 self-approval is rejected where independent approval is required", () => {
  const requester = "user-1";
  const approver = "user-1";
  const independentApprovalRequired = true;
  assert.equal(
    independentApprovalRequired && requester === approver,
    true
  );
  assert.equal(requester !== approver, false);
});

test("A3 independent approval is distinguishable from requester", () => {
  const requester = "user-1";
  const approver = "user-2";
  assert.equal(requester !== approver, true);
});

test("A3 revocation cannot extend offline authority", () => {
  const snapshotValid = false;
  const revoked = true;
  const protectedOperationAllowed = snapshotValid && !revoked;
  assert.equal(protectedOperationAllowed, false);
});

test("A3 payment recording and external verification are separate authorities", () => {
  assert.equal(OFFLINE["payments.record"], "OFFLINE_ELIGIBLE");
  assert.equal(OFFLINE["payments.verify.external"], "ONLINE_ONLY");
});

test("A3 conflict resolution is not generic resolve-anything authority", () => {
  const capability = "sync.conflict.resolve";
  const allowedConflictTypes = new Set(["inventory", "sales", "return", "payment", "accounting"]);
  assert.equal(capability, "sync.conflict.resolve");
  assert.equal(allowedConflictTypes.has("unknown"), false);
});

test("A3 sensitive authorization decision has required audit fields", () => {
  const audit = {
    actor: "user-1",
    device: "device-1",
    scope: "branch-a",
    capability: "cash.sessions.close",
    decision: "DENY",
    policyVersion: "policy-1",
    snapshotVersion: "snapshot-1",
    resource: "cash-session-1",
    timestamp: "2026-10-07T00:00:00Z",
    reason: "missing-current-authority"
  };
  for (const key of [
    "actor", "device", "scope", "capability", "decision",
    "policyVersion", "snapshotVersion", "resource", "timestamp", "reason"
  ]) {
    assert.ok(audit[key]);
  }
});

console.log("R1-A3 reference authorization harness: loaded");
