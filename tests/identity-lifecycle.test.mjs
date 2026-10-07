import test from "node:test";
import assert from "node:assert/strict";
import {
  transitionLifecycle,
  canAuthenticateNormally,
  canEnterPasswordChangeFlow,
  assertNormalAccess,
  assertPasswordChangeFlow
} from "../dist/src/authorization/identity-lifecycle.js";

test("provisioned identity can enter mandatory password-change state", () => {
  assert.equal(
    transitionLifecycle("PROVISIONED", "PASSWORD_CHANGE_REQUIRED"),
    "PASSWORD_CHANGE_REQUIRED"
  );
});

test("password-change-required identity can become active", () => {
  assert.equal(
    transitionLifecycle("PASSWORD_CHANGE_REQUIRED", "ACTIVE"),
    "ACTIVE"
  );
});

test("lifecycle cannot skip mandatory password change", () => {
  assert.throws(
    () => transitionLifecycle("PROVISIONED", "ACTIVE"),
    /INVALID_IDENTITY_LIFECYCLE_TRANSITION/
  );
});

test("active identity alone is eligible for normal access", () => {
  assert.equal(canAuthenticateNormally({ lifecycle: "ACTIVE", security: null }), true);
  assert.equal(canAuthenticateNormally({ lifecycle: "PASSWORD_CHANGE_REQUIRED", security: null }), false);
});

test("password-change flow is allowed only in the required state", () => {
  assert.equal(canEnterPasswordChangeFlow({ lifecycle: "PASSWORD_CHANGE_REQUIRED", security: null }), true);
  assert.equal(canEnterPasswordChangeFlow({ lifecycle: "ACTIVE", security: null }), false);
});

test("security states block both normal and password-change access", () => {
  for (const security of ["DISABLED", "LOCKED", "REVOKED"]) {
    assert.equal(canAuthenticateNormally({ lifecycle: "ACTIVE", security }), false);
    assert.equal(canEnterPasswordChangeFlow({ lifecycle: "PASSWORD_CHANGE_REQUIRED", security }), false);
  }
});

test("normal access assertion fails before activation", () => {
  assert.throws(
    () => assertNormalAccess({ lifecycle: "PASSWORD_CHANGE_REQUIRED", security: null }),
    /NORMAL_ACCESS_NOT_PERMITTED/
  );
});

test("password-change assertion fails for active identities", () => {
  assert.throws(
    () => assertPasswordChangeFlow({ lifecycle: "ACTIVE", security: null }),
    /PASSWORD_CHANGE_FLOW_NOT_PERMITTED/
  );
});
