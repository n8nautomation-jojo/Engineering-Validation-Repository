# P0-4 — Runtime Integration Harness Plan

**Status:** READY FOR EXECUTION — NOT PROMOTED

## Objective

Move P0-4 from schema/adapter implementation to observed runtime evidence without introducing new business rules.

## Required environments

- PostgreSQL: real PostgreSQL service/container.
- SQLite: real SQLite engine used by the POS persistence boundary.

## Mandatory evidence

1. Apply the P0-4 migrations successfully.
2. Execute commit and rollback with durable readback.
3. Verify idempotency uniqueness and same-fingerprint replay.
4. Verify different fingerprint rejection.
5. Verify append-only audit behavior.
6. Verify optimistic/concurrent stale-write rejection.
7. Verify tenant/organization/branch scope isolation.
8. Restart and confirm durable state.
9. Exercise crash/power-loss recovery where the runtime environment permits.
10. Capture CI execution evidence.

## Current limitation

The repository environment has not yet produced an observed GitHub Actions run for the existing P0 commits. Therefore this plan does not claim PASS.

## Promotion rule

P0-4 remains OPEN until runtime evidence is observed and recorded.