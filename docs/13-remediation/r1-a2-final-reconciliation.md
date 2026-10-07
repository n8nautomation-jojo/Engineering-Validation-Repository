# R1-A2 Final Reconciliation — Conflict Authority & Resolution

**Status:** READY FOR LOCK — EXECUTION GATE REMAINS  
**Track:** R1-A2 Conflict Resolution  
**Depends On:** R1-A1, R1-A3, R1-B, Domain Model v1.1, Phase 2.2, ADR-011, ADR-012, Phase 3.4

## 1. CTO Decision

R1-A2 conflict architecture is accepted without redesign.

The final model is:

**Detect → Classify → Triage → Resolve / Compensate / Contain → Audit**

The original transaction/event is immutable. Resolution creates new valid business effects.

A2 is **READY FOR LOCK**, but cannot be promoted to LOCKED until its executable authorization/conflict tests pass and R1-B security gates are satisfied where they are dependencies.

## 2. Binding Principles

1. Cloud authoritative state wins organization-wide consistency.
2. Cloud authority never means deleting a locally accepted transaction.
3. No silent overwrite, deletion or duplicate business effect.
4. Transport failure is retryable technical state, not a business conflict.
5. Duplicate delivery is idempotency, not a new business conflict.
6. Ordering delay is not automatically a conflict.
7. Ambiguous business intent requires human resolution.
8. P0 safety/financial conflicts cannot be silently auto-dismissed.
9. Compensation uses valid domain operations only.
10. Original history is never mutated.
11. Every resolution is durable, auditable and idempotent.
12. Accounting corrections occur through Accounting domain rules, never direct journal mutation.

## 3. Conflict Authority Reconciliation with A3

A2 does not define an independent permission vocabulary.

The authoritative authorization model is:

**Capability × Effective Scope × Conflict Type × Severity × SoD × Current Policy**

Effective scope is:

**Assignment Scope ∩ Request Context ∩ Resource Scope ∩ Policy Scope**

The following A2 working capabilities are interpreted as policy-level capabilities and must map to the stable A3/Phase 3.4 vocabulary before implementation:

| A2 Working Capability | Binding Phase 3.4 Capability |
|---|---|
| conflict.read | conflict.read |
| conflict.triage | conflict.triage |
| inventory.conflict.resolve | sync.conflict.resolve + conflict-type policy |
| sales.conflict.resolve | sync.conflict.resolve + conflict-type policy |
| return.conflict.resolve | sync.conflict.resolve + conflict-type policy |
| payment.conflict.resolve | sync.conflict.resolve + conflict-type policy |
| accounting.conflict.resolve | sync.conflict.resolve + Accounting SoD/policy |
| conflict.compensate | sync.conflict.resolve + explicit compensation policy |
| conflict.escalate | conflict.escalate |
| conflict.contain | conflict.contain |
| conflict.release.containment | conflict.release.containment |

These are not separate roles or bypass permissions. The binding decision is capability + policy + scope + SoD at action time.

## 4. Resolution Class Authority

### R-AUTO-IDEMPOTENT
System worker only.

Allowed only when operation identity/equivalence is proven.

### R-AUTO-DETERMINISTIC
System worker only.

Allowed only where policy guarantees one outcome.

### R-COMPENSATE
Requires an authorized business workflow and current authoritative state.

Default:
- P0 compensation requires independent approval unless an explicitly approved deterministic compensation rule exists.
- Compensation cannot mutate original history.
- Inventory compensation must use InventoryTransaction semantics.
- Sale correction must use Sale reversal/return semantics.
- Payment correction must use Payment lifecycle rules.
- Accounting correction must use reversal/adjustment semantics.

### R-HUMAN
Authorized resolver with explicit conflict-resolution capability and scope.

Business intent must be recorded through reason/provenance.

### R-CONTAIN
Security/Operations/Recovery authority according to policy.

Release from containment is separately authorized and audited.

## 5. P0 Conflict Gate

P0 includes:
- authoritative negative-stock risk;
- duplicate financial effect;
- broken allocation accounting;
- irreconcilable inventory movement;
- missing mandatory provenance;
- local integrity/tamper failure affecting business truth.

Required flow:

**Detect → Classify P0 → Prevent/Contain Unsafe Continuation → Authorized Resolution → Audit**

P0 conflicts are never silently accepted merely because the originating local transaction was valid at the time.

## 6. Inventory Conflict Rules

### Stock shortfall
- Preserve local sale history.
- Do not force authoritative inventory negative.
- Create durable conflict.
- Determine whether approved deterministic compensation exists.
- Otherwise require authorized resolution.
- Never silently rewrite the sold batch.

### Batch ineligibility
If the sale is already committed, a different batch cannot silently replace the historical batch.

### Allocation conflict
Allocation is not stock and cannot create stock.

A conflict may:
- idempotently reconcile valid consumption;
- compensate/release according to A1 policy;
- suspend affected device/allocation;
- escalate.

No resolver may manufacture capacity.

## 7. Return / Refund Rule

Inventory return and monetary refund are separate effects.

Therefore:
- return accepted + refund pending remains two explicit states;
- duplicate refund is idempotently rejected;
- excess return requires explicit policy/human resolution unless deterministic;
- resolving inventory does not automatically resolve payment.

## 8. Payment Rule

ADR-012 remains binding:

**Recorded Payment ≠ Evidence ≠ Manual Verification ≠ External Verification ≠ Settlement Proof**

No conflict resolver may set provider/API verification merely from:
- screenshot;
- OCR;
- user assertion;
- local payment record.

Provider verification requires actual provider-mediated verification.

## 9. Authorization Conflict

If a local authorization snapshot allowed an operation but was later revoked:

- the original accepted operation remains traceable;
- revocation is audited;
- authoritative business validation still applies;
- the conflict is not automatically labeled fraud;
- future offline authority is blocked according to A3/B security controls.

## 10. Containment

Containment is required when business truth cannot safely be trusted, including:
- local integrity/tamper failure;
- unrecoverable provenance gap;
- unsafe inventory state;
- security-critical corruption.

Containment is not resolution.

The affected device/operation remains blocked until an authorized recovery path establishes sufficient trust.

## 11. Idempotency and Retry

| Condition | Behavior |
|---|---|
| Transport failure | Retry |
| Duplicate operation | Return/apply existing result |
| Deterministic rejection | Stop unchanged retry |
| Business conflict | Persist conflict |
| Containment | Stop unsafe processing |
| Resolution retry | Idempotent resolution request |

A business conflict must never become an infinite worker retry loop.

## 12. Accounting Boundary

Accounting remains independent.

Conflict resolution emits business effects/events consumed by Accounting.

It cannot:
- edit JournalEntry history;
- delete posted entries;
- bypass fiscal-period controls.

Any correction is an Accounting-domain reversal/adjustment.

## 13. State Machine Acceptance

The accepted lifecycle is:

**DETECTED → CLASSIFIED → TRIAGED → RESOLVING → RESOLVED**

Alternative:

**DETECTED → CLASSIFIED → CONTAINED**

or:

**TRIAGED → ESCALATED → RESOLVING**

and failed resolution:

**RESOLVING → FAILED → TRIAGED**

A resolved conflict is immutable. A later problem creates a new corrective conflict/workflow.

## 14. Required Audit

Every resolution records, as applicable:
- conflict_id;
- original operation/event identity;
- aggregate/resource;
- device;
- organization/branch/warehouse scope;
- conflict type;
- severity;
- resolution class;
- actor/system;
- capability;
- policy version;
- reason;
- timestamp;
- resulting business effect IDs;
- evidence/provenance;
- correlation ID.

## 15. Executable Gate

A2 remains READY FOR LOCK until tests prove:

1. duplicate delivery idempotency;
2. ordering does not create false conflicts;
3. stock shortfall durability;
4. batch ineligibility handling;
5. allocation exhaustion/replenishment collision;
6. scope violation rejection;
7. stale version behavior;
8. sale reversal idempotency;
9. return/refund separation;
10. payment verification safety;
11. authorization revocation handling;
12. local integrity containment;
13. authorized human resolution;
14. resolution idempotency;
15. restart durability.

No test result may be inferred from documentation.

## 16. Promotion Decision

**R1-A2 = READY FOR LOCK — NOT YET LOCKED.**

Promotion to LOCKED requires:
- executable A2 tests accepted;
- A3 authorization tests accepted;
- R1-B security evidence accepted where required;
- Phase 3.4 vocabulary consistency maintained.

## 17. Anti-Loop Rule

No redesign is permitted unless a verified test, contradiction or R1 exit criterion demonstrates that this model is insufficient.

