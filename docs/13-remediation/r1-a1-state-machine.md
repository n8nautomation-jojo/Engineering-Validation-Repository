# R1-A1.3 — Offline Safety Allocation State Machine & Lifecycle

**Status:** ACTIVE R1 WORK PACKAGE  
**Owner:** CTO / Architecture  
**Co-Owner:** Domain & Inventory Architecture  
**Cross-Track Contributors:** Sync, POS, Security, Product, QA  
**Depends On:** R1-A1 Problem Definition; R1-A1.2 Policy Model Evaluation; Domain Model v1.1; Phase 2.2; ADR-011  
**Decision:** Working state-machine model — NOT LOCKED

## 1. Purpose
This document defines the minimum lifecycle and state semantics required to evaluate the recommended Controlled Offline Safety Allocation with reservation-like accounting semantics.

It does not lock the final allocation algorithm, database schema, REST endpoints, synchronization payloads, dynamic rebalancing, encryption technology, or R1-A2 human conflict-resolution policy.

## 2. Core Boundary
Three distinct layers remain mandatory:
1. **Authoritative Inventory:** InventoryTransaction and StockMovement remain business truth; cloud state is authoritative for organization-wide consistency after synchronization.
2. **Offline Safety Allocation:** bounded permission/capacity for disconnected POS operation. It constrains consumption and never creates stock or replaces the inventory ledger.
3. **Local Operational Projection:** product, batch and stock read models used by POS; never authoritative.

> Allocation state answers “how much offline capacity this device may consume”; inventory state answers “what stock actually exists.”

## 3. Proposed Lifecycle
The minimum lifecycle is:

UNALLOCATED → ACTIVE → EXHAUSTED

with controlled transitions:
- ACTIVE → SUSPENDED
- SUSPENDED → ACTIVE
- ACTIVE → EXPIRED
- EXPIRED → NEW ALLOCATION / REPLENISHED
- ACTIVE / EXHAUSTED / SUSPENDED / EXPIRED → RECONCILING → RECONCILED

A conflict is a durable reconciliation outcome; it does not replace allocation state.

## 4. State Definitions
### UNALLOCATED
No offline capacity is assigned. Offline selling is not permitted. Exit requires authorized allocation creation.

### ACTIVE
Valid non-expired capacity remains. Offline sales are allowed only when device eligibility, scope, local stock, FEFO, expiry and capacity checks all pass.

### EXHAUSTED
Effective offline capacity is zero. Offline selling is blocked by default. Reconnection and authorized replenishment remain available. Exhaustion is not itself an inventory shortage.

### SUSPENDED
Offline consumption is prohibited because of administrative suspension, device revocation, stale state, integrity concern, critical reconciliation condition, or another approved policy reason. Reactivation requires explicit recovery conditions.

### EXPIRED
The allocation validity window has ended. Offline selling is blocked. Expiration cannot be silently extended by the POS.

### RECONCILING
A synchronization/reconciliation operation is evaluating local effects against authoritative state. This is a durable process state, not inventory truth. It must be idempotent, retryable and correlated to the relevant device, allocation, transaction and sync operation.

### RECONCILED
The reconciliation operation has reached a durable outcome with no unresolved safety-critical discrepancy for that item. It does not make allocation state authoritative inventory.

## 5. Capacity Semantics
Logical quantities:
- allocated_capacity
- consumed_capacity
- released_capacity
- remaining_capacity

Conceptually: remaining_capacity = allocated_capacity - consumed_capacity + released_capacity.

This is a logical invariant, not a commitment to a physical schema.

Product/batch granularity remains open. Whatever granularity is selected, FEFO, batch availability and expiry rules remain binding.

## 6. Atomic Offline Sale
For an accepted offline sale, the conceptual local transaction is:

Validate → Consume Allocation → Create Sale/Payment → Create InventoryTransaction/StockMovements → Write Outbox/Audit → Commit

All required effects commit atomically according to the locked local transaction boundary. If any required safety check fails before commit, there is no accepted sale, allocation consumption or partial inventory effect.

## 7. Release
Capacity may be released only for an explicit, traceable cause such as sale reversal, eligible return, pre-completion cancellation, administrative release, allocation expiry, device recovery/reassignment, or approved rebalancing.

Every release records reason, actor/system component, timestamp, affected allocation, related operation where applicable, released amount and resulting state.

A release never rewrites historical inventory movements.

## 8. Replenishment
MVP-1 replenishment is conservative:
1. Authoritative/cloud side determines that replenishment is allowed.
2. The allocation update is durably recorded.
3. Synchronization delivers it to the device.
4. The device applies it idempotently.
5. New capacity becomes usable only after durable local application.

A disconnected POS cannot mint additional capacity for itself.

## 9. Exhaustion
When remaining capacity reaches zero:
- state becomes EXHAUSTED;
- new offline consumption is rejected;
- the POS receives an actionable reason;
- synchronization/replenishment remains available;
- there is no silent fallback to optimistic selling.

An operation exceeding remaining capacity is rejected before commit unless a separately approved exception policy exists.

## 10. Suspension
Suspension may be triggered by device revocation, unverifiable allocation integrity, stale-state threshold, critical conflict, administrative action, or another approved containment rule.

Suspension is durable and auditable. The POS cannot self-reactivate based only on elapsed time or UI state.

## 11. Reconnection
### POS reconnects first
1. Outbox operations are pushed idempotently.
2. Cloud validates authoritative inventory and business invariants.
3. Accepted operations receive durable acknowledgement.
4. Conflicting operations enter the conflict workflow.
5. Allocation state is reconciled.
6. Other devices may remain offline under their own valid allocations.

### Another POS remains offline
Default MVP-1 posture: device-scoped consumption; no implicit cross-device borrowing.

### Device fails before synchronization
Recovery uses durable local state. Unsynchronized Outbox operations remain discoverable, allocation consumption stays linked to business transactions, and replay is idempotent. If local state cannot be trusted, offline selling is suspended until recovery/validation.

## 12. Reversal and Return
Sale reversal remains a compensating business operation; it is never deletion. Any restoration of safety capacity is governed by explicit policy.

Sales Return remains a separate process. Returned stock follows inventory return and batch traceability rules. A return does not automatically grant unrestricted offline capacity.

## 13. FEFO and Expiry
Offline safety never overrides FEFO, batch lifecycle or the expired-batch prohibition.

Before consuming allocation for a sale line, the POS must establish local batch eligibility. If the preferred FEFO batch expires while offline, it becomes immediately unsellable; the POS evaluates the next eligible batch. If none exists, the line is rejected and no allocation is consumed for the rejected line.

## 14. Multi-POS Same-Batch Safety
Multiple POS devices may hold local projections of the same SKU/batch, but each may consume only its own bounded allocation.

Cloud remains responsible for final authoritative validation. Allocation reduces the probability and magnitude of offline oversell; authoritative validation decides synchronized acceptance; conflict handling manages cases that cannot be accepted automatically.

Allocation capacity is never proof that authoritative stock exists.

## 15. Staleness and Offline Duration
The final policy must define allocation validity, maximum offline duration, stale-state threshold, warning threshold and suspension threshold. Numeric values remain open.

Fixed rule: stale allocation must never silently become unlimited allocation.

## 16. Authorization
Create, replenish, release, suspend, reactivate, exhaustion override, stale-state override and manual reconciliation require explicit authorization policy.

For MVP-1, exhaustion override is disabled by default. Any future exception requires explicit capability, valid offline authorization where permitted, reason, audit and reconciliation visibility. Exact SoD behavior is coordinated with R1-B.

## 17. Traceability
Safety mutations should carry stable identifiers including allocation_id, device_id, branch_id, warehouse_id where applicable, product_id/batch_id where applicable, business transaction id, local sequence, sync operation/event id, actor/system identity, correlation id and timestamps.

## 18. Transition Matrix
| From | Event | Guard | To |
|---|---|---|---|
| UNALLOCATED | Allocate | Authorized + valid scope | ACTIVE |
| ACTIVE | Consume | Capacity + stock + FEFO + expiry checks | ACTIVE |
| ACTIVE | Consume | Capacity insufficient | EXHAUSTED |
| ACTIVE | Release | Valid reason + trace | ACTIVE / EXHAUSTED |
| ACTIVE | Suspend | Authorized or critical safety condition | SUSPENDED |
| ACTIVE | Expire | Validity window ended | EXPIRED |
| EXHAUSTED | Replenish | Authoritative authorization | ACTIVE |
| EXHAUSTED | Suspend | Critical safety condition | SUSPENDED |
| SUSPENDED | Reactivate | Recovery checks pass | ACTIVE / EXHAUSTED / EXPIRED |
| EXPIRED | New Allocation | Authoritative authorization | ACTIVE |
| Any applicable state | Begin Reconciliation | Sync accepted | RECONCILING |
| RECONCILING | Success | No unresolved safety issue | RECONCILED |
| RECONCILING | Conflict | Conflict criteria met | RECONCILED + CONFLICT |
| RECONCILING | Retry | Retryable failure | RECONCILING |
| RECONCILING | Safety Failure | Critical integrity condition | SUSPENDED |

## 19. Explicitly Rejected Transitions
1. UNALLOCATED → ACTIVE from a disconnected POS acting alone.
2. EXHAUSTED → ACTIVE by local self-replenishment.
3. EXPIRED → ACTIVE by local clock/UI manipulation.
4. SUSPENDED → ACTIVE without required recovery conditions.
5. Any state → unrestricted offline selling.
6. Allocation consumption without linked business operation/system action.
7. Allocation release without recorded reason.
8. Consumption bypassing FEFO or expiry validation.
9. Cross-device consumption without explicit authoritative policy.
10. Reconciliation success based only on a transient HTTP response.

## 20. MVP-1 Complexity Guardrails
- Start with one bounded allocation scope.
- Prefer device-scoped consumption.
- Avoid dynamic global rebalancing in the first implementation.
- Do not introduce a second stock ledger.
- Keep allocation mutations traceable.
- Make replenishment authoritative.
- Keep conflict resolution outside this state machine.
- Do not introduce automatic exception paths merely to improve sales availability.

Evolution path:
Controlled Allocation → Reservation-capable Allocation → Dynamic Rebalancing

Only the first stage is in MVP-1 unless a later approved decision expands scope.

## 21. Required Tests Before Lock
### T1 — Single POS
Allocation creation, exact consumption, exhaustion blocking, and policy-governed reversal.

### T2 — Two POS
Bounded allocations, no cross-device consumption, concurrent same-SKU/batch selling, deterministic sync and idempotency.

### T3 — Power Loss
Committed sale survives process/device loss; allocation consumption and Outbox recover; replay creates no duplicate effect.

### T4 — Expiry
Batch expiry while offline blocks that batch; rejected line consumes no allocation; next FEFO-eligible batch is evaluated.

### T5 — Replenishment
Exhausted allocation cannot self-replenish; authoritative delivery is idempotent; capacity becomes usable only after durable application.

### T6 — Suspension
Critical condition suspends allocation; restart preserves suspension; reactivation requires approved recovery.

### T7 — Reconciliation
Duplicate push, out-of-order push, transient failure, conflict, retry and durable final state.

## 22. Open Questions
1. Exact allocation unit: quantity, product, batch or hierarchy.
2. Whether one allocation covers multiple products/batches.
3. Numeric limits for offline duration and staleness.
4. Whether controlled branch-level sharing is needed for MVP-1.
5. Exact replenishment trigger and approval workflow.
6. Whether reversal/return restores capacity fully, partially or not at all.
7. Conflict taxonomy and automatic-resolution rules with R1-A2.
8. Authorization/SoD behavior with R1-B.
9. API/Sync representation after policy lock.
10. Local data protection/tamper model with R1-B.

## 23. Decision Status
**Recommendation:** Use this state-machine shape as the working model for continued R1-A1 analysis.

**Status:** PROPOSED WORKING MODEL — NOT LOCKED.

This document does not revise Domain Model v1.1, Phase 2.2, ADR-011 or any other locked baseline.

Next artifacts:
1. r1-a1-policy-specification.md
2. r1-a1-conflict-taxonomy.md with R1-A2
3. r1-a1-sync-contract.md
4. r1-a1-test-matrix.md

Phase 3.5 remains blocked until the R1 exit gate is satisfied.