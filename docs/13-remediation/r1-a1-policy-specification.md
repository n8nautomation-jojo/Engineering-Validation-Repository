# R1-A1.4 — Offline Stock Safety Policy Specification

**Status:** ACTIVE R1 WORK PACKAGE  
**Owner:** CTO / Architecture  
**Co-Owner:** Domain & Inventory Architecture  
**Cross-Track Contributors:** Sync, POS, Security, Product, QA  
**Depends On:** R1-A1 Problem Definition; R1-A1.2 Policy Model Evaluation; R1-A1.3 State Machine; Domain Model v1.1; Phase 2.2; ADR-011  
**Decision:** Policy specification — PROPOSED, NOT LOCKED

## 1. Purpose

This document converts the R1-A1 problem definition and state machine into an operational policy for MVP-1.

Recommended direction:

> Controlled Offline Safety Allocation with reservation-like accounting semantics, while preserving one authoritative inventory ledger.

The policy chooses the smallest mechanism intended to satisfy the safety invariants. It does not introduce a second stock ledger or a global dynamic reservation engine.

## 2. Policy Principles

1. Authoritative inventory remains the source of stock truth.
2. Offline allocation is a bounded execution permission, not stock.
3. A POS may consume only capacity explicitly assigned to its scope.
4. A disconnected POS cannot create, extend or transfer its own capacity.
5. Every accepted offline sale consumes allocation atomically with the business transaction.
6. FEFO, expiry and negative-stock rules remain binding offline.
7. Exhaustion blocks offline selling; there is no silent optimistic fallback.
8. Reconciliation is idempotent, durable and auditable.
9. Cross-device borrowing is disabled by default.
10. Numeric limits are policy decisions, not implementation guesses.

## 3. MVP-1 Allocation Unit

### 3.1 Decision

For MVP-1, the safety allocation is product-level quantity capacity, scoped to a POS device within a branch/warehouse context.

It answers:

> How many units of Product X may this POS consume through offline sales during the allocation validity window?

### 3.2 Product-level rather than batch-level

Batch remains authoritative for FEFO, expiry, actual stock and traceability.

Therefore:
- Allocation = product quantity capacity.
- Inventory selection = actual batch selection using local FEFO.
- Batch validation = performed at sale acceptance.
- Cloud revalidation = performed during synchronization.

A future reservation-capable model may introduce batch-aware allocation where evidence justifies it.

### 3.3 Constraint

Product-level allocation must never allow a sale against an unavailable or expired batch. Allocation is consumed only after the selected batch passes normal inventory safety checks.

## 4. Allocation Scope

MVP-1 scope:

Tenant → Organization → Branch → Warehouse → POS Device

The safety allocation is device-scoped, with branch and warehouse providing ownership boundaries.

A POS cannot consume another POS's allocation.

A branch-wide shared pool is deferred because it requires stronger concurrency and rebalancing semantics.

## 5. Allocation Ownership

Minimum ownership context:
- organization_id;
- branch_id;
- warehouse_id;
- device_id;
- product_id;
- allocation_id.

A device must not use an allocation belonging to another branch, warehouse or device.

## 6. Allocation Creation

Allocation creation is authoritative.

It may occur:
- before connectivity is lost;
- while connected through an authorized administrative workflow;
- as part of an approved replenishment operation.

It may not occur solely because a POS is disconnected.

Creation requires:
- authorized actor/system;
- valid device and organizational scope;
- valid product;
- positive capacity;
- validity window;
- provenance/audit metadata.

The initial allocation must be durably recorded before the device is permitted to consume it.

## 7. Capacity Accounting

Logical accounting:

remaining_capacity = allocated_capacity - consumed_capacity + released_capacity

Each consumption and release is immutable in history.

The physical implementation may use a current balance plus an append-only allocation ledger, provided it preserves deterministic reconstruction, idempotency, auditability and concurrency safety.

## 8. Consumption Rule

Allocation is consumed at successful local sale completion, not when an item is merely added to the cart.

Required local order:
1. Authenticate/authorize local operation.
2. Validate device offline eligibility.
3. Validate allocation state.
4. Validate product and batch availability.
5. Apply FEFO.
6. Validate expiry.
7. Validate available local stock projection.
8. Validate remaining allocation capacity.
9. Create Sale and SaleLines.
10. Record Payment(s).
11. Create InventoryTransaction/StockMovements.
12. Consume allocation.
13. Write Outbox and required audit records.
14. Commit atomically.

If any required validation fails, no allocation is consumed.

## 9. Multiple Sale Lines

Each product line consumes its own product allocation.

A multi-product sale may therefore consume several allocation balances within one atomic local transaction.

If any line cannot satisfy allocation or inventory constraints, no partial accepted sale is created unless a separately approved partial-sale policy exists.

## 10. FEFO Interaction

Allocation does not select batches.

The local inventory projection selects the eligible batch using FEFO.

Example:
- Product allocation remaining: 10.
- FEFO selects Batch A.
- Batch A has 2 units.
- Customer buys 3 units.

The sale cannot consume 3 merely because allocation has 10. Batch and inventory constraints remain binding.

If Batch A has 2 and Batch B has 5 and both are eligible, FEFO may consume 2 from A and 1 from B, subject to the normal inventory model.

Allocation consumption equals accepted product quantity, while inventory movements preserve exact batch-level traceability.

## 11. Expiry Interaction

Two independent clocks exist:
1. Product batch expiry.
2. Offline allocation validity.

Either can block a sale.

If an allocation remains active but the eligible batch is expired:
- the expired batch is blocked;
- allocation remains unchanged for that rejected attempt;
- another eligible batch is evaluated;
- if none exists, the line is rejected.

If the allocation expires while product stock remains:
- offline selling is blocked;
- stock is not deleted or changed;
- a new allocation may be issued authoritatively.

## 12. Allocation Validity

Every allocation has:
- issued_at;
- valid_from;
- expires_at;
- status;
- issuing actor/system;
- device scope;
- policy/version reference.

The POS may not extend expires_at.

### Numeric policy values

These remain PROPOSED CONFIGURATION:
- warning threshold;
- stale-state threshold;
- maximum offline duration;
- allocation validity duration.

They must be established through operational testing and measurement rather than guessed.

## 13. Exhaustion Policy

When remaining capacity reaches zero:

State → EXHAUSTED

The POS:
- blocks further offline consumption of that product;
- clearly explains that offline capacity is exhausted;
- permits synchronization/reconnection;
- does not silently switch to unrestricted local stock selling.

Exhaustion is a safety boundary, not evidence that authoritative stock is zero.

## 14. Replenishment Policy

Default MVP-1 flow:

Authorized Cloud Decision → Durable Allocation Update → Sync Delivery → Idempotent Local Apply → ACTIVE

Replenishment must:
- reference the allocation or superseding allocation;
- identify issuing actor/system;
- record quantity;
- record reason;
- record timestamp;
- be idempotent;
- be auditable.

Duplicate delivery must not increase capacity twice.

## 15. Allocation Release

Capacity may be released only for explicit policy-approved events.

### 15.1 Sale reversal

A reversal may restore corresponding allocation capacity only after the compensating business effect is accepted locally and according to the final reversal policy.

The release is not deletion of the original consumption.

### 15.2 Sales return

A sales return does not automatically restore allocation.

Recommended MVP-1 default:

> Return restores inventory according to return policy; allocation restoration requires an explicit policy rule and is not automatic.

This avoids an unintended capacity-generation loop.

### 15.3 Cart cancellation

A product added to a cart has consumed no allocation. Cancellation before sale completion requires no allocation release.

### 15.4 Administrative release

Requires explicit capability, reason and audit.

## 16. Cross-Device Borrowing

MVP-1: Not allowed.

POS-A cannot consume POS-B capacity or transfer its unused capacity while disconnected.

Future sharing/rebalancing must be authoritative and introduce explicit state, audit and concurrency rules.

## 17. Device Failure

If a device fails before synchronization:
1. Recover the local database.
2. Reconstruct durable allocation consumption.
3. Preserve pending Outbox operations.
4. Resume synchronization idempotently.
5. If local state integrity cannot be established, enter SUSPENDED.
6. Keep offline selling blocked until recovery validation succeeds.

UI state is never the recovery source.

## 18. Long Outage

Long outages do not extend allocation indefinitely.

The policy must progress through explicit warning, staleness, expiry and suspension conditions.

Exact thresholds remain configurable until validated.

Critical invariant:

> No disconnected device may convert stale capacity into unlimited capacity.

## 19. Reconnection

When the device reconnects:
1. Push pending operations.
2. Cloud validates transaction idempotency.
3. Cloud validates authoritative inventory/business invariants.
4. Accepted effects receive durable acknowledgement.
5. Conflicts are created where required.
6. Allocation consumption/release state is reconciled.
7. New authoritative capacity may be delivered.
8. Device applies updates idempotently.

A successful HTTP response without durable business acknowledgement is not sufficient evidence of reconciliation.

## 20. Authoritative Validation Failure

If a synchronized sale cannot be accepted against authoritative inventory:
- it must not silently rewrite the cloud ledger;
- outcome becomes a durable reconciliation/conflict state;
- original local transaction remains traceable;
- R1-A2 determines automatic versus human resolution;
- inventory and financial consequences use approved compensating business operations.

This policy does not invent conflict-resolution rules.

## 21. Offline Authorization

Offline eligibility is separate from allocation capacity.

A POS must have:
- registered device identity;
- valid local offline authorization state;
- authorized user context according to the approved offline authorization snapshot;
- non-suspended device;
- valid allocation.

A valid allocation alone does not grant permission to sell.

## 22. Security Boundary

The policy assumes local data may be exposed to tampering and must be protected by the security architecture.

This document intentionally does not select SQLCipher, filesystem encryption, key storage technology, TPM/secure enclave strategy, or another encryption mechanism.

Those decisions belong to R1-B after threat-model analysis.

## 23. Audit Requirements

Auditable events:
- allocation created;
- allocation replenished;
- allocation consumed;
- allocation released;
- allocation exhausted;
- allocation expired;
- allocation suspended;
- allocation reactivated;
- allocation reconciliation started/completed;
- conflict created;
- administrative override attempted/approved/denied.

Minimum provenance:

who / what / when / where / why / allocation_id / device_id / business_transaction_id / correlation_id

## 24. Observability Requirements

Metrics:
- active allocations;
- exhausted allocations;
- suspended allocations;
- expired allocations;
- consumption rate;
- release rate;
- replenishment rate;
- stale allocations;
- reconciliation lag;
- allocation-related conflicts;
- blocked offline sales due to exhaustion;
- blocked sales due to inventory/FEFO/expiry independently of allocation.

Allocation blocks must not be confused with stock shortages.

## 25. MVP-1 Non-Goals

The first implementation does not include:
- dynamic global rebalancing;
- automatic cross-device borrowing;
- unrestricted optimistic offline selling;
- batch-specific reservation engine;
- branch-wide shared offline pool;
- automatic exhaustion override;
- heuristic automatic conflict resolution;
- speculative provider-specific inventory behavior.

## 26. Policy Invariants

1. Allocation cannot create authoritative stock.
2. Allocation cannot bypass FEFO.
3. Allocation cannot bypass expiry rules.
4. Allocation cannot enable negative stock.
5. Offline consumption is device-scoped.
6. Offline consumption is atomic with the accepted local sale.
7. Replenishment is authoritative.
8. Replenishment is idempotent.
9. Cross-device borrowing is disabled by default.
10. Stale allocation cannot become unlimited.
11. Every capacity mutation has provenance.
12. Every accepted offline transaction is recoverable after restart/power loss.
13. Reconciliation cannot create duplicate business effects.
14. Known authoritative conflicts are durable.
15. Local UI state is never the recovery source.

## 27. Decision Gates Before Lock

R1-A1 must still resolve:
1. Numeric validity/staleness thresholds.
2. Final reversal-capacity restoration rule.
3. Whether any return types restore capacity.
4. Exact replenishment authority and approval path.
5. Final offline authorization interaction with R1-B.
6. Exact conflict categories with R1-A2.
7. Exact sync representation.
8. Local data protection controls with R1-B.
9. Executable test matrix proving the invariants.
10. Operational measurement proving chosen thresholds are viable.

## 28. Decision Status

**Recommendation:** Use this policy as the working MVP-1 specification for R1-A1.

**Status:** PROPOSED POLICY — NOT LOCKED.

This document does not revise Domain Model v1.1, Phase 2.2, ADR-011 or other locked baselines.

Next required artifacts:
1. R1-A1 conflict taxonomy with R1-A2.
2. R1-A1 sync contract.
3. R1-A1 test matrix.
4. R1-B security decisions affecting offline authorization and local data protection.

Phase 3.5 remains blocked until the R1 exit criteria are satisfied.
