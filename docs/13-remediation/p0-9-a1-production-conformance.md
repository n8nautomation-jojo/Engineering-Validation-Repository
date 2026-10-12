# P0-9 — R1-A1 Production Conformance

**Status:** DURABLE RUNTIME FOUNDATION IMPLEMENTED — EXECUTABLE TESTS PASSING

## Implemented & Verified
- Controlled Offline Safety Allocation domain object with strict ISO-8601 temporal window (`issuedAt`, `validFrom`, `expiresAt`).
- Product + POS device + branch/warehouse scoping with zero cross-device borrowing.
- Capacity accounting: `allocated - consumed + released`.
- `releaseOfflineAllocation` lifecycle: releases consumed capacity on return/reversal compensation while preserving original transaction immutability.
- Fail-closed consumption for unavailable, suspended, or exhausted allocations.
- Offline sale safety checks for trusted scope, product scope, FEFO, and batch expiry.
- Real SQLite transaction execution: atomic Sale + Payment + InventoryTransaction + allocation deduction + Outbox + Audit.
- Real atomic rollback across all tables upon failure injection or constraint violation.
- Multi-POS isolation: device-scoped allocations prevent cross-device borrowing and independent exhaustion.
- Authoritative replenishment invariants (RP-01 to RP-05): authorized replenishment transitions EXHAUSTED to ACTIVE, duplicate delivery is idempotent, cashier self-replenishment is denied, and replenishing expired allocations is blocked.
- Durable restart and crash recovery: allocations, consumed capacity, remaining capacity, and state survive process restart from disk.
- Executable runtime tests in `tests/p0-9-a1-runtime.test.mjs` (35/35 PASS).

## Boundary status
The offline stock safety policy, capacity ledger, domain rules, and SQLite persistence layer are verified by dynamic test execution.

Still required for full system-level lock:
- active cloud sync delivery transport for replenishment commands;
- observed CI execution on multi-platform runner;
- end-to-end A1/A2/A3/B integration suite.

**A1 status: DURABLE RUNTIME PASS — READY FOR INTEGRATION LOCK.**

