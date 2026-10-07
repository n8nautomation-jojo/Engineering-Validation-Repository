import test from "node:test";
import assert from "node:assert/strict";
import {
  assertPlatformContext,
  assertTenantContext
} from "../dist/src/authorization/authority-context.js";

const ids = {
  userId: "0199b8d0-0000-7000-8000-000000000001",
  tenantId: "0199b8d0-0000-7000-8000-000000000002",
  organizationId: "0199b8d0-0000-7000-8000-000000000003"
};

test("platform context is tenant-independent", () => {
  assert.doesNotThrow(() => assertPlatformContext({
    plane: "PLATFORM_OWNER",
    userId: ids.userId
  }));
});

test("platform context cannot carry tenant scope", () => {
  assert.throws(() => assertPlatformContext({
    plane: "PLATFORM_OWNER",
    userId: ids.userId,
    tenantId: ids.tenantId
  }), /PLATFORM_CONTEXT_MUST_NOT_CARRY_TENANT_SCOPE/);
});

test("tenant context requires tenant and organization scope", () => {
  assert.doesNotThrow(() => assertTenantContext({
    plane: "TENANT_USER",
    userId: ids.userId,
    tenantId: ids.tenantId,
    organizationId: ids.organizationId
  }));
});

test("tenant authority cannot be asserted as platform authority", () => {
  assert.throws(() => assertPlatformContext({
    plane: "TENANT_USER",
    userId: ids.userId,
    tenantId: ids.tenantId,
    organizationId: ids.organizationId
  }), /PLATFORM_AUTHORITY_REQUIRED/);
});

test("platform authority cannot be asserted as tenant authority", () => {
  assert.throws(() => assertTenantContext({
    plane: "PLATFORM_OWNER",
    userId: ids.userId
  }), /TENANT_AUTHORITY_REQUIRED/);
});
