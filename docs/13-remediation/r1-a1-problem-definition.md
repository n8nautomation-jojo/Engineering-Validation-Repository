# R1-A1 — Offline Stock Safety Policy
## Problem Definition & Invariants

**Status:** ACTIVE WORK PACKAGE
**Track:** R1-A1
**Owner:** CTO / Architecture
**Co-Owner:** Domain & Inventory Architecture
**Cross-Track Contributors:** Sync, POS, Security, Product, QA
**Depends On:** R1 baseline; Domain Model v1.1; Phase 2.2 Sync Architecture; ADR-011
**Does Not:** Select Quota vs Reservation vs Hybrid; define final API endpoints; implement the sync engine

## 1. Purpose
R1-A1 defines the problem that the Offline Stock Safety Policy must solve before MVP-1 activates multi-device offline selling.

The policy exists to prevent unsafe local acceptance of sales while preserving the authoritative inventory ledger and making every divergence explicit, durable and auditable.

This document deliberately defines invariants and problem boundaries before solution selection.

## 2. Core Principle
**Offline Safety Allocation is not Inventory Truth.**

The authoritative inventory truth remains the immutable inventory transaction/movement model and, for organization-wide consistency, the cloud-authoritative state.

An offline safety mechanism may allocate, reserve, cap or otherwise constrain what a POS is allowed to sell while disconnected. It must never silently rewrite authoritative stock.

Therefore: Offline Sellable Capacity ≠ Authoritative Stock.

The safety mechanism is a control boundary around offline execution, not a second inventory ledger.

## 3. Problem Statement
When one or more POS devices operate without cloud connectivity, the system cannot continuously observe organization-wide stock consumption.

Without a safety policy, two or more devices can independently accept sales against the same apparent stock and later produce an oversell or an inconsistent state.

R1-A1 must answer:
1. What quantity is a disconnected device permitted to sell?
2. Who/what allocates that capacity?
3. How is capacity consumed atomically with the local sale?
4. How is unused capacity released?
5. What happens when capacity is exhausted?
6. How are multiple POS devices coordinated?
7. What happens after a prolonged outage?
8. How is cloud reconciliation performed?
9. Which discrepancies are conflicts?
10. Which conflicts can be automatically resolved?
11. Which conflicts require human action?
12. How is recovery performed after device failure or database recovery?
13. How are safety decisions observed and audited?
14. What must the POS user see?
15. What must remain an internal implementation detail?

## 4. Scope
### In Scope
- Offline stock safety policy.
- Allocation semantics.
- Device/branch/warehouse scope.
- Consumption and release.
- Exhaustion.
- Replenishment.
- Offline eligibility implications.
- Cloud reconciliation.
- Conflict creation and handoff to R1-A2.
- Audit and observability requirements.
- Multi-POS behavior.
- Failure and recovery scenarios.
- Testable safety invariants.
- API/Sync impact identification after policy definition.

### Out of Scope
- Final choice of quota, reservation, capacity, or hybrid.
- Final REST endpoint design.
- Final OpenAPI schema.
- Physical implementation of the sync engine.
- Encryption technology selection.
- Regulatory rules not yet validated.
- Accounting implementation.
- Final conflict-resolution workflow owned by R1-A2.

## 5. Authoritative Sources of Truth
1. **Inventory Ledger / Inventory Transactions** — business truth for stock movements.
2. **Cloud-authoritative inventory state** — organization-wide consistency after synchronization/revalidation.
3. **Offline Safety Allocation State** — execution constraint for disconnected devices.
4. **Local Read Models** — operational projections used by POS.
5. **UI displayed quantity** — presentation only; never authoritative.

No lower layer may silently overwrite a higher layer.

## 6. Non-Negotiable Invariants
### INV-A1-001 — No Silent Inventory Divergence
The system must never silently accept or hide a known divergence between local offline effects and authoritative inventory state. A detected divergence must produce a durable, auditable state.

### INV-A1-002 — No Negative Authoritative Stock
The authoritative inventory state must never be silently committed to an invalid negative quantity. Any attempted result that would violate this invariant must be rejected, quarantined, or routed through an explicitly approved reconciliation process.

### INV-A1-003 — Atomic Local Acceptance
For an accepted offline sale, the sale, applicable payment records, inventory transaction/stock movements, offline safety consumption, audit metadata, and required outbox record must commit atomically according to the locked local transaction boundary.

There must be no accepted sale with only a partially committed safety allocation effect.

### INV-A1-004 — Idempotent Reconciliation
Retrying synchronization or reconciliation must not create duplicate business effects.

### INV-A1-005 — Safety Allocation Cannot Create Stock
Allocation can constrain or reserve permission to sell; it cannot increase authoritative inventory.

### INV-A1-006 — Every Consumption Has a Trace
Every safety allocation consumption must be traceable to a local business operation or an explicitly recorded administrative/system action.

### INV-A1-007 — Every Release Has a Reason
Released capacity must identify why it was released, the actor/system component, timestamp, related operation, and resulting state.

### INV-A1-008 — Exhaustion Is Explicit
When offline safety capacity reaches its effective limit, the system must enter an explicit exhausted/blocked/degraded state defined by the final policy. It must not silently continue selling beyond the safety boundary.

### INV-A1-009 — Cloud Revalidation
Transactions accepted offline remain subject to cloud-side authoritative validation when synchronized. Local acceptance is not equivalent to cloud settlement or organization-wide acceptance.

### INV-A1-010 — No Silent Conflict Resolution
A conflict may be auto-resolved only by an explicit, deterministic rule approved by the final policy. Otherwise it enters the defined human resolution workflow.

### INV-A1-011 — Branch Isolation
Offline safety state must respect branch/warehouse ownership boundaries. A POS in Branch A cannot consume offline safety capacity belonging to Branch B.

### INV-A1-012 — Device Scope Is Explicit
The policy must explicitly define whether allocation is device-scoped, branch-scoped, warehouse-scoped, or a controlled combination. Implicit scope is prohibited.

### INV-A1-013 — No Dependency on Continuous Connectivity
A valid offline transaction must not require a synchronous cloud round-trip merely to complete local acceptance.

### INV-A1-014 — FEFO Remains Binding
Offline stock safety does not bypass FEFO. The local POS may only select batches available in its trusted local projection and permitted by the final offline policy.

### INV-A1-015 — Expired Stock Remains Unsellable
Offline mode does not weaken BR-001 or BR-012. An expired batch cannot become sellable because the POS is disconnected.

### INV-A1-016 — Negative Stock Policy Remains Binding
The offline safety mechanism does not implicitly enable negative stock. Any future exception requires an explicit approved domain policy, permission and audit trail.

### INV-A1-017 — Reconciliation Is Durable
A synchronization/reconciliation result must be persisted as a durable state, not represented only by a transient API response or log message.

### INV-A1-018 — Recovery Is Deterministic
After process restart, device reboot, worker crash, or interrupted synchronization, the system must be able to reconstruct the safety state without guessing from UI state.

### INV-A1-019 — Auditability
Safety allocation creation, consumption, release, exhaustion, suspension, reconciliation, conflict creation, resolution and administrative override must be auditable according to the approved audit policy.

### INV-A1-020 — User Transparency Without Internal Leakage
The POS must communicate actionable operational states such as availability, exhaustion, pending synchronization, or required action without exposing unnecessary synchronization internals.

## 7. Safety Model Questions
The final policy must explicitly decide:

### 7.1 Allocation Unit
Possible candidates:
- Quantity.
- Monetary value.
- Product/batch-specific capacity.
- Reservation.
- Hybrid.

No option is selected by this document.

### 7.2 Allocation Scope
Candidates:
- POS device.
- Branch.
- Warehouse.
- Product.
- Batch.
- Policy-defined hierarchy.

### 7.3 Consumption
The final design must define whether consumption occurs at sale creation, sale completion, per line, per batch, or through a dedicated reservation state. It must remain atomic with accepted local business effects.

### 7.4 Release
The policy must define release after sale reversal, sales return, void before completion, device recovery, allocation expiry, and administrative adjustment.

### 7.5 Replenishment
The final design must define who can replenish, when replenishment is allowed, required connectivity, approval requirements, audit requirements, and stale allocation handling.

## 8. Multi-POS Safety Problem
For N offline POS devices in the same branch, the effective offline capacity must be controlled by the approved policy across devices.

The final policy must prevent the design from treating each POS local view as independently authoritative.

Mandatory scenario:
- Multiple POS devices in one branch.
- Connectivity lost at approximately the same time.
- Local stock projections available.
- Concurrent sales against the same SKU/batch.
- Several days offline.
- Devices reconnect at different times.
- One device may fail before synchronization.

The final policy must define the expected outcome for every stage.

## 9. Failure Classes to Design Against
1. Cloud outage.
2. Network interruption during sale.
3. Network interruption during sync.
4. POS process crash.
5. Device power loss.
6. Device storage corruption.
7. Sync worker crash.
8. Duplicate push.
9. Out-of-order push.
10. Stale local allocation state.
11. Allocation exhaustion.
12. Device revocation while offline.
13. Long-duration outage.
14. Multiple POS concurrent offline selling.
15. Reconnection while another device remains offline.

## 10. Required State Concepts
The final policy should define explicit states for at least:
- Allocation availability.
- Consumption.
- Exhaustion.
- Suspension.
- Reconciliation.
- Conflict.

Exact state names and transitions remain subject to the dedicated state-machine artifact.

## 11. Security and Audit Boundary
R1-A1 must integrate with R1-B/Security without selecting encryption technology.

The design must identify:
- who may configure safety policy;
- who may allocate/replenish capacity;
- who may override exhaustion;
- whether override is allowed at all;
- which operations require online authorization;
- what authorization snapshot is required offline;
- what must be audited;
- what must be protected from local tampering.

## 12. Required Test Families
### Single POS
- 1 day offline.
- 7 days offline.
- Allocation exhaustion.
- Restart after sale.
- Interrupted sync.

### Multi POS
- 2 POS × 5 days offline.
- 2 POS concurrent sale.
- 5 POS × 14 days offline.
- Different reconnection order.
- One device fails before synchronization.

### Integrity
- Duplicate event.
- Out-of-order event.
- Replayed sync request.
- Partial network failure.
- Worker crash.
- Power loss.

### Domain Safety
- FEFO.
- Expired batch.
- Insufficient batch quantity.
- Negative stock prevention.
- Sale reversal.
- Sales return.

### Recovery
- Device restored from backup.
- Cloud reconciliation retry.
- Allocation state recovery.
- Conflict state recovery.

## 13. Preliminary Acceptance Gates
These are invariants/quality gates, not final performance SLOs:
1. Silent inventory divergence = 0.
2. Duplicate business effects from retry = 0.
3. Known conflicts are durable and auditable.
4. Every approved safety rule has executable test coverage.
5. No expired batch becomes sellable offline.
6. Offline mode does not bypass FEFO.
7. Offline mode does not silently enable negative stock.
8. Recovery does not depend on UI memory.
9. Every safety-state mutation has traceable provenance.
10. Final policy explicitly covers all mandatory failure classes.

Performance targets, alert latency and recovery-time objectives will be established after policy design and baseline testing.

## 14. Required Next Artifacts
R1-A1 must proceed in this order:
1. `r1-a1-policy-specification.md`
2. `r1-a1-state-machine.md`
3. `r1-a1-conflict-taxonomy.md` — coordinated with A2
4. `r1-a1-sync-contract.md`
5. `r1-a1-ux-requirements.md`
6. `r1-a1-observability-requirements.md`
7. `r1-a1-test-matrix.md`
8. ADR only if a locked baseline must be revised or a material architectural decision requires one.

The final choice of allocation model must occur only after the invariants and scenarios above are evaluated.

## 15. Decision Status
This document is an **ACTIVE R1 working baseline**, not a locked domain baseline.

It does not select the implementation mechanism.

Any contradiction with a locked baseline must be resolved through explicit ADR/revision and Decision Log entry.

**Next work package:** R1-A1.2 — Policy Model Evaluation (Quota vs Reservation vs Hybrid vs other viable models).