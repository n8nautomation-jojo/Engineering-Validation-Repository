# P0-4 Persistence Foundation Contract

**Status:** IMPLEMENTATION FOUNDATION — PHYSICAL ADAPTER NOT SELECTED  
**Authority:** Phase 2.1 data architecture + data implementation blueprint  
**Purpose:** Define the minimum persistence contracts required by the first vertical slice without prematurely selecting an ORM/driver.

## Required capabilities

1. Transaction boundaries.
2. Versioned aggregate persistence.
3. Idempotency records.
4. Append-only audit persistence.
5. Trusted request scope propagation.

## Production adapters

The contracts must eventually be implemented for:
- PostgreSQL cloud persistence;
- SQLite local POS persistence.

The production adapter must preserve the same application semantics; it must not move business rules into infrastructure.

## Current implementation

A test-only in-memory adapter exists to validate contract semantics:
- transaction lifecycle;
- stale-version rejection;
- idempotency-key storage;
- audit append behavior.

This adapter is **not** production persistence and is not evidence of PostgreSQL/SQLite correctness.

## Explicitly deferred

No decision is made here about:
- ORM;
- PostgreSQL driver;
- SQLite driver;
- SQLCipher;
- filesystem/key-management technology;
- connection pooling implementation.

Those remain implementation/security decisions governed by existing baselines and R1-B evidence.

## Exit evidence

P0-4 cannot be promoted until real persistence tests demonstrate:
- migration success;
- transaction atomicity;
- stale-write rejection;
- idempotency durability;
- audit durability;
- restart/crash recovery;
- tenant/scope isolation;
- PostgreSQL behavior where cloud persistence is required;
- SQLite behavior where local POS persistence is required.
