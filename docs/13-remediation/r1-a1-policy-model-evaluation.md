# R1-A1.2 — Offline Stock Safety Policy Model Evaluation

**Status:** ACTIVE R1 WORK PACKAGE  
**Owner:** CTO / Architecture  
**Co-Owner:** Domain & Inventory Architecture  
**Depends On:** R1-A1 Problem Definition & Invariants  
**Decision:** Evaluation only — no implementation mechanism is locked by this document

## 1. Evaluation Objective

Evaluate viable Offline Stock Safety models against the approved R1-A1 invariants before selecting the mechanism for MVP-1.

The evaluation must optimize for:
- inventory safety;
- deterministic behavior offline;
- multi-POS safety;
- recoverability;
- auditability;
- operational simplicity;
- compatibility with the existing Modular Monolith + SQLite POS + PostgreSQL cloud architecture.

No model is accepted merely because it is conceptually elegant. It must survive the required failure and concurrency scenarios.

## 2. Models Evaluated

### Model A — Static Quota

A branch/device receives a finite offline selling allowance. Consumption decreases the allowance. Replenishment restores capacity under defined rules.

**Strengths**
- Simple mental model.
- Strong offline boundary.
- Easy to make local operations deterministic.
- Low coordination requirement while disconnected.

**Weaknesses**
- Can strand stock on one device while another device exhausts its allowance.
- Requires careful allocation sizing.
- Static allocation becomes inefficient when demand is uneven.
- Batch-level FEFO interaction can be difficult if quota is too coarse.

**Primary risk:** utilization inefficiency and stale allocation.

### Model B — Reservation

Stock is explicitly reserved for a device/branch before offline operation. Offline sales consume the reservation.

**Strengths**
- Closely represents a real stock claim.
- Strong protection against concurrent oversell if reservation allocation is authoritative.
- Clear relationship between allocation and inventory.

**Weaknesses**
- Requires reservation lifecycle and reconciliation.
- Can strand stock during long outages or failed devices.
- Reservation itself adds domain complexity.
- Reservation semantics may become confused with inventory truth if boundaries are not explicit.

**Primary risk:** stranded inventory and lifecycle complexity.

### Model C — Hybrid Safety Allocation

Use controlled allocation/reservation semantics with policy-defined limits and dynamic replenishment/release.

The safety mechanism may reserve or allocate capacity, while remaining explicitly separate from the authoritative inventory ledger.

**Strengths**
- Can balance safety and utilization.
- Supports device/branch policies.
- Can evolve from a simple MVP allocation model toward stronger reservation semantics.
- Better fit for heterogeneous branches and future multi-POS operation.

**Weaknesses**
- Highest conceptual complexity.
- More state transitions.
- More reconciliation cases.
- Greater implementation and testing burden.

**Primary risk:** accidental creation of a second inventory system.

### Model D — Pure Optimistic Offline Selling

Allow POS to sell based on local stock projection and resolve conflicts after synchronization.

**Strengths**
- Maximum local availability.
- Minimal allocation overhead.

**Weaknesses**
- Cannot guarantee safe multi-POS offline behavior.
- Oversell can become a normal outcome.
- Conflicts become business operations rather than exceptional safety events.

**Decision:** Rejected for MVP-1.

It violates the intent of the Offline Stock Safety policy and cannot satisfy the required safety invariants without effectively becoming another allocation model.

## 3. Invariant Evaluation

| Criterion | Static Quota | Reservation | Hybrid | Optimistic |
|---|---|---|---|---|
| No silent divergence | Strong | Strong | Strong | Weak |
| No negative authoritative stock | Strong | Strong | Strong | Weak |
| Atomic local acceptance | Strong | Strong | Strong | Strong |
| Idempotent reconciliation | Strong | Strong | Strong | Strong |
| Allocation cannot create stock | Strong | Strong | Strong | Strong |
| Explicit exhaustion | Strong | Strong | Strong | Weak |
| Cloud revalidation | Required | Required | Required | Required |
| No silent conflict resolution | Strong | Strong | Strong | Strong |
| Branch isolation | Strong | Strong | Strong | Strong |
| Explicit device scope | Strong | Strong | Strong | Variable |
| Offline operation | Strong | Strong | Strong | Strong |
| FEFO compatibility | Medium | Strong | Strong | Medium |
| Expiry safety | Strong | Strong | Strong | Medium |
| Deterministic recovery | Strong | Medium | Strong | Medium |
| Auditability | Strong | Strong | Strong | Medium |
| Multi-POS safety | Strong if centrally allocated | Strong | Strongest potential | Weak |
| Stock utilization | Medium | Medium | Strong | Strong |
| Operational simplicity | Strong | Medium | Medium/Low | Strong |
| Future extensibility | Medium | Strong | Strongest | Weak |

## 4. Critical Scenario Evaluation

### Scenario S1 — One POS, short outage

All three controlled models work.

**Result:** No differentiator.

### Scenario S2 — Two POS, same branch, five days offline

Static quota works if allocation is conservative, but can strand capacity.

Reservation works if reservations are centrally allocated before outage.

Hybrid can adapt allocation/replenishment policy but requires more state.

**Preferred:** Hybrid, subject to complexity controls.

### Scenario S3 — One POS sells heavily, another barely sells

Static quota can strand capacity on the low-volume device.

Reservation has the same basic problem unless release/rebalancing exists.

Hybrid can support policy-controlled allocation and replenishment.

**Preferred:** Hybrid.

### Scenario S4 — Device fails before synchronization

Static quota requires recovery of consumed/unconsumed allocation.

Reservation requires reservation recovery/reconciliation.

Hybrid requires the same but can distinguish allocation state from authoritative inventory state.

**Requirement:** deterministic recovery independent of UI state.

### Scenario S5 — Long outage

No model eliminates reconciliation.

The longer the outage, the more conservative the safety policy must become.

**Requirement:** final policy must define allocation expiry, suspension, replenishment and exhaustion.

### Scenario S6 — Same SKU/batch sold concurrently by multiple POS

This is the decisive safety case.

Independent optimistic selling is rejected.

Controlled allocation must be established before the devices are allowed to consume the offline capacity.

**Preferred:** reservation-like semantics at the safety boundary, without making the safety state the authoritative inventory ledger.

## 5. Key Architectural Observation

The evaluation reveals that the real design question is not simply:

> Quota or Reservation?

The deeper question is:

> **How do we allocate a bounded offline selling capacity to devices while preserving one authoritative inventory ledger?**

Therefore, the recommended direction is:

**Controlled Offline Safety Allocation with reservation-like accounting semantics, but without introducing a second authoritative stock ledger.**

This is intentionally more precise than declaring a generic "Hybrid" product feature.

## 6. Preliminary Recommendation

### Recommended direction: Hybrid Safety Allocation

For MVP-1, the architecture should favor:

1. A bounded offline safety capacity.
2. Explicit allocation state.
3. Device/branch scope defined by policy.
4. Atomic consumption with local Sale + InventoryTransaction + Outbox.
5. Explicit release/replenishment.
6. Cloud authoritative revalidation.
7. Durable conflict state when authoritative validation fails.
8. No silent fallback to unrestricted optimistic selling.

### Important constraint

The first implementation should **not** attempt a sophisticated global dynamic reservation engine.

Start with the smallest policy that satisfies the invariants.

Potential evolution:

`Controlled Allocation → Reservation-capable Allocation → Dynamic Rebalancing`

This is an architectural evolution path, not a commitment to implement all stages in MVP-1.

## 7. MVP-1 Safety Posture

Until the final policy is approved:

- Offline selling remains governed by the existing MVP-1 gate.
- No implementation may assume unrestricted offline selling.
- No API endpoint should be finalized around a quota model yet.
- No database schema should be treated as final solely because it models a quota.
- The final state machine must be approved before implementation.

## 8. Decision Gates Before Model Lock

Before locking the model, R1-A1 must answer:

1. What exactly is allocated?
2. Is allocation product-level, batch-level, or both?
3. Is allocation created centrally before outage or can it be generated locally?
4. How is allocation divided among multiple POS?
5. Can a POS consume another POS's unused allocation?
6. What happens when allocation is exhausted?
7. Can a pharmacist override exhaustion?
8. If yes, under what authorization and audit rules?
9. How does allocation expire?
10. How is a failed device recovered?
11. What happens when one POS reconnects while others remain offline?
12. How are stock transfers treated during offline operation?
13. How are returns and reversals reflected in allocation?
14. How does FEFO interact with allocation at batch level?
15. What happens when a batch expires while the device is offline?
16. What is the maximum permitted offline duration?
17. What happens after allocation state becomes stale?
18. Which conflicts can be auto-resolved?
19. Which conflicts require R1-A2?
20. What exact data crosses the Sync boundary?

## 9. Decision Status

**Recommendation:** Hybrid Safety Allocation with bounded, reservation-like semantics.

**Status:** PROPOSED DIRECTION — NOT LOCKED.

No locked baseline is changed by this document.

The next artifact is:

**R1-A1.3 — Offline Safety Allocation State Machine & Lifecycle**

That state machine must test whether the proposed direction can remain simple enough for MVP-1 while satisfying the invariants.
