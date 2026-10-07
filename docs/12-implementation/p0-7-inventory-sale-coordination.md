# P0-7 — Inventory + Atomic Sale Coordination

**Status:** IMPLEMENTED FOUNDATION — EXECUTION EVIDENCE PENDING

## Scope
This step establishes the domain foundation for the locked Sale/Inventory boundary.

- Sale remains the owner of SaleLines and Payments.
- Inventory owns InventoryTransaction and immutable StockMovement.
- Sale does not directly mutate stock.
- Sale acceptance requires a trusted request scope and an OPEN CashSession bound to the same branch/device.
- InventoryTransaction is POSTED → REVERSED; reversal creates a new compensating transaction.
- StockMovement is immutable and reverses direction rather than mutating history.

## Deferred production boundary
The production application service must execute the complete local/cloud transaction atomically according to the locked Phase 3.4 and ADR-011 rules:

Sale + Payment + InventoryTransaction + StockMovement + Outbox + required audit metadata.

The current foundation does not claim PostgreSQL/SQLite durability, FEFO enforcement, allocation enforcement, crash recovery, or production atomicity.

## Exit evidence
Required before P0-7 is considered complete:
1. executable sale/inventory conformance tests;
2. real SQLite transaction adapter;
3. authoritative cloud PostgreSQL transaction path;
4. FEFO + expiry + stock availability validation;
5. A1 allocation consumption in the same local transaction;
6. Outbox and audit durability;
7. power-loss/restart evidence;
8. duplicate/idempotency evidence;
9. observed CI execution.
