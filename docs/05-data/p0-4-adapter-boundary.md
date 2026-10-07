# P0-4 — SQL Adapter Boundary

**Status:** IMPLEMENTED FOUNDATION — EXECUTION EVIDENCE PENDING

The repository now contains a driver-neutral SQL transaction boundary for the canonical `ConflictResolutionUnitOfWork` contract. PostgreSQL and SQLite differ only in parameter placeholders and JSON representation.

Implemented:
- transaction begin/commit/rollback;
- conflict durable read/insert/update;
- resolution fingerprint lookup;
- append-only audit insertion;
- PostgreSQL and SQLite dialect definitions;
- no new business rules, capabilities, offline classes, aggregates, or provider behavior.

Required before promotion:
1. real PostgreSQL integration execution;
2. real SQLite execution against the POS database engine;
3. commit/rollback and restart readback;
4. concurrent stale-version behavior;
5. idempotent replay without duplicate audit/effect;
6. scope/tenant isolation;
7. crash/power-loss recovery;
8. observed CI execution.

This is not production PASS until those gates are observed.
