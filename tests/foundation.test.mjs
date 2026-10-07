import test from "node:test";
import assert from "node:assert/strict";
import { assertDomainEventEnvelope } from "../dist/src/domain/events.js";
import { assertTrustedScope } from "../dist/src/application/context.js";
import { loadRuntimeConfig } from "../dist/src/infrastructure/config.js";
import { nextAggregateVersion } from "../dist/src/kernel/types.js";

test("runtime foundation exposes trusted scope validation", () => {
  assert.doesNotThrow(() => assertTrustedScope({
    tenantId: "tenant-1",
    organizationId: "org-1",
    branchId: "branch-1",
    userId: "user-1",
    correlationId: "corr-1"
  }));
});

test("runtime foundation rejects incomplete trusted scope", () => {
  assert.throws(
    () => assertTrustedScope({
      tenantId: "",
      organizationId: "org-1",
      userId: "user-1",
      correlationId: "corr-1"
    }),
    /INVALID_TRUSTED_REQUEST_CONTEXT/
  );
});

test("domain event envelope requires correlation and aggregate metadata", () => {
  const event = {
    eventId: "event-1",
    eventType: "Test.Event",
    eventVersion: 1,
    aggregateId: "aggregate-1",
    aggregateVersion: 0,
    occurredAt: new Date().toISOString(),
    correlationId: "corr-1",
    payload: {}
  };
  assert.doesNotThrow(() => assertDomainEventEnvelope(event));
});

test("aggregate version advances monotonically", () => {
  assert.equal(nextAggregateVersion(0), 1);
});

test("runtime config is deterministic for explicit environment", () => {
  const config = loadRuntimeConfig({ NODE_ENV: "test", DATABASE_URL: "postgres://test" });
  assert.equal(config.environment, "test");
  assert.equal(config.database.postgresUrl, "postgres://test");
});
