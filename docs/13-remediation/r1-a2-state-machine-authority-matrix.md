# R1-A2.2 — Conflict Resolution State Machine & Resolution Authority Matrix

**Status:** ACTIVE R1 WORK PACKAGE  
**Owner:** CTO / Architecture  
**Co-Owner:** Sync & Consistency Architecture  
**Cross-Track Contributors:** Authorization, Inventory, Sales/POS, Accounting, Security, QA  
**Depends On:** R1-A2.1 Conflict Taxonomy; R1-A1.4 Policy Specification; R1-A1.5 Test Matrix; Domain Model v1.1; Phase 2.2; ADR-011; ADR-012  
**Decision:** PROPOSED — NOT LOCKED

## 1. Purpose

Define the executable lifecycle of a business conflict and the authority boundary for resolving it.

The design must answer four questions:

1. What state is the conflict in?
2. What transitions are allowed?
3. Who or what is allowed to perform each transition?
4. Which transitions may produce compensating business effects?

This document does not define final API DTOs or wire contracts. Those remain downstream of R1 and Phase 3.5.

## 2. Core Rule

> A conflict is a durable business object representing an unresolved discrepancy. It is not an error message, a retry record, or a mutable copy of the original transaction.

The original operation remains immutable and traceable.

Resolution creates one or more new business effects when required.

## 3. Conflict Lifecycle

Minimum lifecycle:

**DETECTED → CLASSIFIED → TRIAGED → RESOLVING → RESOLVED**

Alternative containment/escalation paths:

**DETECTED → CLASSIFIED → CONTAINED**

**TRIAGED → ESCALATED → RESOLVING**

**RESOLVING → FAILED → TRIAGED**

Terminal state:

**RESOLVED**

A resolved conflict cannot be reopened by editing the old record. A new conflict or corrective workflow must be created if a later issue appears.

## 4. State Definitions

### 4.1 DETECTED

A conflict has been durably identified but has not yet passed classification.

Requirements:
- preserve operation/event identity;
- preserve aggregate/device/correlation identifiers;
- preserve detection timestamp;
- prevent loss during worker restart.

No business compensation occurs in this state.

### 4.2 CLASSIFIED

Conflict type, severity and initial resolution class are assigned.

Required fields:
- conflict_type;
- severity;
- proposed resolution_class;
- aggregate;
- device;
- organization/branch scope;
- detection source.

Classification may be performed by deterministic system logic.

### 4.3 TRIAGED

The conflict has been evaluated for:
- automatic resolution;
- compensation;
- human resolution;
- containment;
- escalation.

Triage must establish whether the proposed action is safe under current policy.

### 4.4 RESOLVING

A resolution operation is executing.

The resolution must be idempotent.

A worker/process crash must leave sufficient durable information to retry safely.

### 4.5 RESOLVED

A durable terminal outcome exists.

Required:
- resolution class;
- resolution actor/system;
- resolution reason;
- resolved_at;
- resulting business transaction/effect identifiers;
- audit record;
- evidence where required.

### 4.6 CONTAINED

The system cannot safely continue the affected operation/device.

Examples:
- local integrity failure;
- missing mandatory provenance;
- detected tampering;
- unresolved safety-critical inventory state.

Containment is not resolution.

A recovery or authorized administrative workflow must later move the case toward resolution.

### 4.7 ESCALATED

The current resolver cannot safely resolve the conflict.

Escalation must identify:
- why authority was insufficient;
- required authority;
- affected business scope;
- severity;
- aging metadata.

### 4.8 FAILED

A resolution attempt failed technically or because a required invariant prevented execution.

A FAILED conflict is not automatically RESOLVED.

It returns to TRIAGED after retry classification, unless containment is required.

## 5. Transition Rules

| From | To | Trigger | Allowed Actor |
|---|---|---|---|
| DETECTED | CLASSIFIED | classification succeeds | Conflict Worker |
| DETECTED | CONTAINED | integrity cannot be trusted | Security/Recovery Policy |
| CLASSIFIED | TRIAGED | resolution strategy evaluated | Conflict Worker / Authorized Resolver |
| CLASSIFIED | CONTAINED | safety boundary requires containment | Authorized Security/Operations |
| TRIAGED | RESOLVING | approved resolution starts | Authorized Resolver / Worker |
| TRIAGED | ESCALATED | insufficient authority/ambiguity | Authorized Resolver |
| TRIAGED | CONTAINED | unsafe to continue | Authorized Resolver / Security |
| RESOLVING | RESOLVED | all effects durably committed | Resolver / Worker |
| RESOLVING | FAILED | resolution cannot complete | Resolver / Worker |
| FAILED | TRIAGED | failure classified as retryable/reviewable | Worker / Authorized Resolver |
| ESCALATED | RESOLVING | higher authority accepts responsibility | Authorized Resolver |
| CONTAINED | TRIAGED | integrity/recovery restored | Authorized Recovery Actor |
| RESOLVED | — | terminal | No mutation |

## 6. Resolution Classes and Authority

### R-AUTO-IDEMPOTENT

Examples:
- duplicate push;
- duplicate pull;
- duplicate replenishment;
- duplicate resolution request.

Authority:
- Sync/Conflict Worker.

Human approval:
- Not required.

Guard:
- The system must prove operation identity equivalence.

### R-AUTO-DETERMINISTIC

Examples:
- safe ordering dependency;
- deterministic projection update;
- known policy-defined state transition.

Authority:
- Conflict Worker.

Human approval:
- Not required.

Guard:
- Policy must define one unambiguous outcome.

### R-COMPENSATE

Examples:
- accepted local sale cannot be honored against authoritative stock;
- financial/business effect requires reversal;
- inventory correction is required.

Authority:
- Business workflow service may prepare/execute only where policy explicitly permits.
- Human approval may be mandatory depending on conflict severity and operation.

Human approval:
- P0 cases default to approval unless an explicit deterministic compensation rule has been approved.

Guard:
- Never mutate original history.
- Compensation must be a valid domain operation.

### R-HUMAN

Examples:
- ambiguous return/refund;
- conflicting manual payment decisions;
- disputed inventory responsibility;
- ambiguous business intent.

Authority:
- Authorized business resolver.

Human approval:
- Required.

Guard:
- Resolver capability and scope must be checked at action time.

### R-CONTAIN

Examples:
- local data integrity failure;
- tamper detection;
- missing mandatory provenance;
- unresolved safety-critical discrepancy.

Authority:
- Security/Operations/Recovery authority according to containment policy.

Human approval:
- Required for release from containment unless policy explicitly defines safe automatic recovery.

## 7. Resolution Authority Matrix

Roles are mapped to **capabilities**, not directly hard-coded into conflict logic.

| Capability | Platform Owner | Tenant Admin | Branch Manager | Pharmacist | Cashier | Inventory Officer | Purchasing Officer | Accountant | Auditor |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| conflict.read | ✓ | ✓ | ✓ | scoped | scoped | scoped | scoped | scoped | ✓ |
| conflict.triage | ✓ | ✓ | ✓ | scoped | — | scoped | scoped | scoped | — |
| conflict.auto.resolve | system | system | — | — | — | system | system | system | — |
| inventory.conflict.resolve | ✓ | ✓ | ✓ | limited | — | ✓ | — | — | — |
| sales.conflict.resolve | ✓ | ✓ | ✓ | ✓ | — | — | — | — | — |
| return.conflict.resolve | ✓ | ✓ | ✓ | ✓ | — | — | — | — | — |
| payment.conflict.resolve | ✓ | ✓ | ✓ | limited | — | — | — | ✓ | — |
| accounting.conflict.resolve | ✓ | ✓ | — | — | — | — | — | ✓ | — |
| conflict.compensate | ✓ | ✓ | scoped | scoped | — | scoped | — | scoped | — |
| conflict.escalate | ✓ | ✓ | ✓ | ✓ | — | ✓ | ✓ | ✓ | — |
| conflict.contain | ✓ | ✓ | ✓ | — | — | — | — | — | — |
| conflict.release.containment | ✓ | ✓ | controlled | — | — | — | — | — | — |
| conflict.audit.read | ✓ | ✓ | ✓ | — | — | — | — | ✓ | ✓ |

**Important:** “scoped” means the actor may operate only inside the organization/branch/warehouse scope granted by the authorization policy.

This matrix is a working baseline, not a final RBAC lock. R1-B/A3 must reconcile it with capability, policy, scope and SoD rules.

## 8. Separation of Duties

The system must use prevention + detection + response rather than claiming that every SoD conflict is technically impossible.

Default controls:

1. A user should not approve their own high-risk compensation where policy requires independent approval.
2. A resolver's scope must be validated at action time.
3. High-risk resolution actions must record actor and reason.
4. The system should detect self-approval attempts.
5. Violations generate audit/security events.
6. Administrative emergency actions require elevated audit treatment.
7. Final SoD rules are determined by operation risk and R1-B/A3, not by role names alone.

## 9. P0 Resolution Gate

P0 conflicts include:

- authoritative negative-stock risk;
- duplicate financial effect;
- broken allocation accounting;
- irreconcilable inventory movement;
- missing mandatory provenance;
- local integrity/tamper failure affecting business truth.

Default handling:

**Detect → Classify P0 → Contain/Prevent unsafe continuation → Authorized resolution → Audit**

No P0 conflict may be silently auto-dismissed.

## 10. Inventory Resolution Rules

### 10.1 Authoritative Stock Shortfall

Default:

1. Preserve local sale.
2. Preserve local inventory trace.
3. Do not create negative cloud stock.
4. Create durable conflict.
5. Determine whether deterministic compensation is approved.
6. If not, escalate for authorized business resolution.
7. Any correction uses valid InventoryTransaction/Sale reversal/return/adjustment semantics.

### 10.2 Batch Ineligibility

Do not silently change the historical batch after local acceptance.

A new batch may be used only when the business operation itself is still open and the domain contract explicitly allows deterministic substitution.

After local sale commit, correction must use a compensating domain operation.

### 10.3 Allocation Conflict

The resolver must never manufacture capacity.

Possible outcomes:
- accept already valid consumption;
- apply idempotent reconciliation;
- compensate/release according to approved A1 policy;
- suspend device/allocation;
- escalate.

## 11. Return vs Refund Authority

Return and refund remain separate.

A resolver may:
- resolve inventory return state;
- resolve refund state;
- or coordinate both through a business workflow.

Resolving one must not imply the other automatically.

Examples:

**Return accepted + refund pending**
→ resolve inventory; preserve monetary pending state.

**Refund already issued + duplicate return**
→ idempotently reject duplicate effect.

**Return quantity exceeds eligible quantity**
→ human resolution unless deterministic policy exists.

## 12. Payment Conflict Authority

Payment resolution must follow ADR-012:

- evidence ≠ settlement proof;
- OCR ≠ settlement proof;
- manual confirmation is a business decision;
- API verification requires actual provider verification;
- provider adapters remain outside the core payment model.

High-risk payment conflicts should require independent authorization when policy identifies a financial SoD concern.

No resolver may change a payment to API_VERIFIED without provider evidence.

## 13. Accounting Boundary

Accounting remains an independent domain.

Conflict resolution may emit business events consumed by Accounting.

It must not:
- directly edit JournalEntry history;
- delete posted entries;
- bypass fiscal-period rules.

If a posted effect must change:
- create a reversal/adjustment through Accounting's own domain rules.

## 14. Device Containment

A device may be contained when:
- local integrity is untrusted;
- allocation integrity cannot be reconstructed;
- repeated safety-critical conflicts exceed an approved operational threshold;
- device revocation is authoritative;
- required synchronization state cannot be trusted.

Containment must:
- stop unsafe offline transactions;
- preserve pending durable data;
- remain auditable;
- provide a recovery path.

The exact numeric thresholds for repeated conflicts remain open.

## 15. Idempotent Resolution Contract

Every resolution action must have an idempotency identity.

Conceptually:

**resolution_request_id + conflict_id + resolver_scope**

Repeated identical requests must return the durable prior outcome.

A materially different resolution attempt must not overwrite the prior one. It becomes:
- a rejected duplicate;
- a new authorized corrective action;
- or a new conflict, depending on domain rules.

## 16. Audit Requirements

Every resolution attempt records:

- conflict_id;
- conflict_type;
- previous_state;
- requested_transition;
- actor_id/system;
- role/capability;
- tenant/organization/branch/warehouse scope;
- reason;
- timestamp;
- correlation_id;
- idempotency key;
- resulting business transaction IDs;
- before/after conflict state;
- evidence references where applicable;
- outcome;
- failure reason if rejected.

Audit records remain append-only.

## 17. UI/UX Boundary

Operational UI should present:

- what happened;
- what is affected;
- current status;
- whether action is required;
- who can act;
- expected business consequence.

Do not expose internal implementation details by default.

Examples of user-facing wording:

- “This sale needs inventory reconciliation.”
- “Payment verification is pending.”
- “This return requires manager review.”
- “Offline selling is temporarily suspended on this device.”

## 18. Metrics and Governance

Measure:

- conflicts by type/severity;
- time to classification;
- time to resolution;
- automatic resolution rate;
- deterministic-resolution error rate;
- false automatic resolutions;
- human-resolution rate;
- escalation rate;
- containment rate;
- repeated conflicts;
- aged unresolved conflicts;
- compensating transaction count.

No arbitrary percentage is an exit criterion.

A high automatic-resolution rate is useful only if correctness remains demonstrably high.

## 19. Required Tests

Before R1-A2 lock review:

### State tests
- every legal transition;
- every rejected transition;
- restart during each non-terminal state;
- terminal immutability.

### Authority tests
- allowed capability;
- missing capability;
- wrong scope;
- revoked user;
- self-approval attempt;
- escalation to higher authority.

### Idempotency tests
- duplicate resolution request;
- worker retry;
- network timeout after commit;
- concurrent resolution attempts.

### Business tests
- inventory shortfall;
- batch conflict;
- allocation conflict;
- return/refund separation;
- payment verification conflict;
- accounting correction boundary.

### Security tests
- forged conflict ID;
- cross-tenant conflict access;
- cross-branch access;
- tampered resolution request;
- unauthorized containment release.

## 20. Open Decisions Before Lock

1. Final capability-to-policy mapping from R1-A3.
2. Exact SoD thresholds and independent approval requirements.
3. Final compensation policies for each P0 conflict type.
4. Whether Branch Manager can resolve specific financial conflicts.
5. Exact containment triggers and recovery SLA.
6. Final conflict retention period.
7. Final notification/escalation rules.
8. Exact sync conflict payload.
9. Final return/refund conflict policy.
10. Integration with the final API/OpenAPI contract.

## 21. Decision Status

**Recommendation:** Adopt this state machine and authority model as the working R1-A2 baseline.

**Status:** PROPOSED — NOT LOCKED.

This document does not reopen Domain Model v1.1, Phase 2.2, ADR-011 or ADR-012.

Phase 3.5 remains BLOCKED until R1 exit criteria are satisfied.
