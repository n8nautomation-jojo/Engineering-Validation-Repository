# Platform Administration PostgreSQL Validation

**Status:** IMPLEMENTED — EXECUTION EVIDENCE PENDING

The repository now contains:
- PostgreSQL migration for Tenant, Organization, Branch, Subscription, Platform User, idempotency and append-only audit records.
- SQL persistence adapter boundary for atomic provisioning.
- PostgreSQL CI service definition.
- Migration/adapter validation tests.

## Required transactional test matrix

The production integration suite must prove:
1. successful atomic provisioning;
2. rollback when any graph insert fails;
3. idempotent replay returns the original result;
4. same idempotency key with different request fingerprint is rejected;
5. concurrent same-key provisioning creates one graph;
6. tenant code uniqueness;
7. branch code uniqueness within organization;
8. username uniqueness;
9. subscription temporal constraint;
10. audit update/delete rejection;
11. no partial graph after rollback;
12. committed readback of all graph records.

The adapter receives a transaction-owned query interface. Transaction begin/commit/rollback must be supplied by the infrastructure transaction manager; the adapter must not silently create an independent transaction.

CI execution is not claimed PASS until a workflow run is observed.
