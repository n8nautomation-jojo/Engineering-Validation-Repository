# Conflict Resolution

**Status:** Baseline — Phase 2.2

## Principle
A sync conflict is a correctness condition, not a merge convenience.

The platform never silently overwrites authoritative financial or inventory state.

## Conflict Classes
- Duplicate/idempotent submission.
- Stale aggregate version.
- Inventory availability conflict.
- Batch/expiry conflict.
- Authorization/scope conflict.
- Master-data version conflict.
- Schema/version incompatibility.

## Inventory Conflict
POS A and POS B may operate offline against the same branch stock. Both can have locally valid views.

When synchronized, Cloud validates each submitted inventory effect against authoritative stock.

If the combined effect violates an invariant, the later operation is not silently accepted as negative stock. The system records a conflict and requires explicit resolution.

## Resolution
Resolution uses domain operations, never historical row editing.

Typical actions:
- reverse affected sale;
- create approved stock adjustment;
- correct master data;
- retry after policy update;
- escalate to manager/auditor.

## Audit
Every conflict and resolution records who, what, when, where, before/after state references, reason, originating device, correlation and causation identifiers.

## User Experience
Cashiers continue to see a simple POS. Operational conflicts are exposed only to authorized Branch Manager/Admin users.

## Reservation Evolution
If POS concurrency or operational scale makes quota-based safety insufficient, the Offline Stock Safety Policy can evolve into explicit Reservation capability while preserving historical transactions and aggregate ownership.
