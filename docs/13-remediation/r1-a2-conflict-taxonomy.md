# R1-A2.1 — Conflict Resolution Problem Definition & Taxonomy

**Status:** ACTIVE R1 WORK PACKAGE  
**Owner:** CTO / Architecture  
**Co-Owner:** Sync & Consistency Architecture  
**Cross-Track Contributors:** Inventory, Sales/POS, Accounting, Security, QA, Product  
**Depends On:** R1-A1.4 Policy Specification; R1-A1.5 Test Matrix; Domain Model v1.1; Phase 2.2; ADR-011  
**Decision:** PROPOSED — NOT LOCKED

## 1. Purpose

Define a deterministic conflict taxonomy and resolution boundary for offline-first operations before finalizing the synchronization contract and Phase 3.5 OpenAPI.

A conflict exists when a locally accepted or locally prepared operation cannot be applied to authoritative state, or when two valid operations produce an outcome that requires an explicit business decision.

The objective is not to maximize automatic resolution. The objective is:

> preserve business truth, avoid duplicate effects, preserve traceability, and route unresolved cases to a durable resolution workflow.

## 2. Non-Negotiable Principles

1. No silent overwrite of authoritative business state.
2. No silent deletion or mutation of an accepted local transaction.
3. No duplicate business effect from retry, replay or reordered delivery.
4. Conflict state is durable and auditable.
5. Resolution is idempotent.
6. Automatic resolution is allowed only for deterministic, policy-proven cases.
7. Human resolution is mandatory where business intent or financial/inventory truth is ambiguous.
8. The cloud remains authoritative for organization-wide consistency.
9. A conflict is not the same as a transport failure.
10. A conflict is not itself evidence of fraud or user error.
11. Conflict handling must preserve the original operation and its provenance.
12. Resolution must use compensating business operations rather than historical mutation.

## 3. Conflict Boundary

### 3.1 Transport failure

Examples:
- timeout;
- DNS/network interruption;
- temporary server unavailable;
- worker crash.

**Classification:** NOT A BUSINESS CONFLICT.

Action: retry with idempotency and durable pending state.

### 3.2 Duplicate delivery

The same operation/event is received more than once.

**Classification:** IDEMPOTENCY CASE, NOT A BUSINESS CONFLICT.

Action: return/apply the existing durable result.

### 3.3 Ordering delay

A valid operation arrives before a causally prior operation.

**Classification:** ORDERING CASE.

Action: use device sequence / aggregate sequence / dependency information. Do not infer business conflict merely from arrival order.

### 3.4 Business conflict

An operation is valid locally but cannot be accepted against current authoritative business state.

Examples:
- authoritative stock is insufficient;
- batch became unavailable/expired;
- allocation was already consumed or invalidated;
- device is revoked;
- stale version prevents a permitted mutation;
- return/reversal is no longer compatible with current state;
- a payment verification decision conflicts with an existing terminal decision.

**Classification:** BUSINESS CONFLICT.

Action: create durable conflict record and apply the approved resolution policy.

## 4. Conflict Taxonomy

### C-INV-01 — Authoritative Stock Shortfall

Local sale was accepted against local projection, but cloud authoritative validation shows insufficient stock.

Required outcome:
- original local sale remains immutable;
- authoritative inventory is not forced negative;
- conflict is durable;
- resolution may require compensation, cancellation/reversal, or approved business handling;
- accounting/payment consequences must use approved compensating operations.

No automatic “accept anyway” behavior.

### C-INV-02 — Batch Became Ineligible

The locally selected batch is no longer eligible because it was:
- expired;
- depleted;
- quarantined/blocked by an approved rule;
- otherwise invalid under authoritative policy.

Resolution must not silently substitute a different batch after the sale has already been accepted locally unless the business contract explicitly permits such deterministic transformation.

### C-ALLOC-01 — Allocation Exhausted or Invalidated

Cloud state shows the device allocation was exhausted, expired, suspended or otherwise invalid before the local operation could be reconciled.

The system must distinguish:
- local capacity consumption;
- authoritative allocation state;
- inventory availability.

Resolution is governed jointly by A1 and this track.

### C-ALLOC-02 — Allocation Replenishment Collision

A replenishment or release is replayed, duplicated, superseded or applied against an incompatible allocation version.

Deterministic duplicate delivery should be idempotently absorbed. Genuine incompatible updates become conflict state.

### C-SCOPE-01 — Device/Branch/Warehouse Scope Conflict

Operation references a device, branch, warehouse, organization or allocation outside its authorized scope.

Expected outcome:
- reject;
- security/audit signal;
- no business effect.

This is primarily an authorization/integrity failure, not a business negotiation.

### C-CONC-01 — Optimistic Concurrency Conflict

Mutation carries a stale aggregate/version.

Expected outcome depends on operation:
- deterministic retry/reload where safe;
- otherwise durable conflict;
- never overwrite a newer authoritative version blindly.

### C-SALE-01 — Sale Lifecycle Conflict

Local operation attempts to complete, reverse or otherwise mutate a sale whose authoritative lifecycle has advanced incompatibly.

Examples:
- already reversed;
- already returned in a conflicting way;
- terminal state reached by another operation.

Expected: idempotent replay where equivalent; explicit conflict where intent differs.

### C-RETURN-01 — Return/Refund Conflict

Merchandise return and monetary refund are distinct effects.

Examples:
- inventory return accepted but refund cannot be completed;
- refund already processed;
- returned quantity exceeds eligible quantity;
- offline return conflicts with authoritative sale state.

Resolution must preserve each effect separately and avoid inventing a refund merely because stock was returned.

### C-PAY-01 — Payment State Conflict

Examples:
- local manual confirmation conflicts with an existing terminal provider verification;
- duplicate payment reference;
- payment already refunded/reversed;
- evidence attached to a terminal payment in a way prohibited by policy.

Provider/API verification remains idempotent and provider-agnostic.

### C-AUTH-01 — Authorization State Conflict

The local authorization snapshot permitted an operation, but the user/device was revoked before synchronization.

This must not be treated as proof that the original local operation was fraudulent. The business effect remains subject to authoritative validation and audit.

### C-AUD-01 — Audit/Provenance Integrity Conflict

Required provenance is missing, inconsistent or cannot be reconstructed.

Safety-sensitive operations should be contained rather than silently accepted.

### C-DATA-01 — Local Integrity/Recovery Conflict

Local durable state cannot be trusted after corruption, failed recovery or detected tampering.

Expected:
- suspend offline operation;
- preserve recoverable evidence;
- require approved recovery path;
- never reconstruct business truth from UI state.

## 5. Conflict Severity

### P0 — Safety/Financial Integrity

Examples:
- authoritative negative-stock risk;
- duplicate financial effect;
- irreconcilable inventory movement;
- broken allocation accounting;
- missing transaction provenance.

Requires containment and explicit resolution.

### P1 — Operational Business Conflict

Examples:
- return lifecycle conflict;
- stale non-critical mutation;
- non-terminal workflow disagreement.

Requires durable resolution but may not block the entire device.

### P2 — Recoverable Technical/Ordering Issue

Examples:
- dependency ordering;
- temporary projection lag.

Should normally resolve automatically without human intervention.

Severity is assigned to the conflict instance, not merely to the conflict type.

## 6. Resolution Classes

Every conflict must enter exactly one resolution class:

### R-AUTO-IDEMPOTENT
The operation is a duplicate of an already accepted operation.

Action: return the existing result.

### R-AUTO-DETERMINISTIC
Policy guarantees one correct outcome without business judgment.

Examples:
- duplicate replenishment;
- duplicate pull application;
- known-safe sequence dependency.

### R-COMPENSATE
The local effect is retained in history but requires a compensating business operation.

Examples:
- accepted local sale cannot be honored against authoritative stock;
- payment must be reversed after a business reversal.

### R-HUMAN
Business intent or truth cannot be determined safely by deterministic rules.

Examples:
- ambiguous return/refund state;
- conflicting manual payment decisions;
- disputed inventory responsibility.

### R-CONTAIN
The system cannot establish sufficient integrity to continue.

Examples:
- local state corruption;
- tamper/integrity failure;
- missing mandatory provenance.

Containment is not resolution; a recovery workflow is required.

## 7. Resolution State Machine

Minimum conflict lifecycle:

**DETECTED → CLASSIFIED → RESOLVABLE → RESOLVING → RESOLVED**

Alternative terminal outcomes:

**DETECTED → CLASSIFIED → CONTAINED**

or

**DETECTED → CLASSIFIED → ESCALATED → RESOLVED**

A conflict must never disappear merely because a worker retries.

Required terminal metadata:
- resolution class;
- resolver actor/system;
- resolution timestamp;
- resolution reason;
- resulting business transaction(s);
- correlation identifiers;
- evidence where applicable.

## 8. Automatic Resolution Guardrails

Automatic resolution is prohibited when it would require guessing:

- customer intent;
- pharmacist intent;
- refund intent;
- which inventory movement is “more correct”;
- whether a payment notification is genuine;
- whether an accounting effect should be suppressed;
- whether a local transaction should simply be discarded.

Automatic resolution is allowed only when the system can prove equivalence or deterministic policy outcome.

## 9. Human Resolution

Human resolution must:

1. display the original operation;
2. display authoritative state relevant to the conflict;
3. display local state/provenance;
4. show proposed consequences;
5. require an authorized capability;
6. require a reason;
7. create an immutable audit record;
8. produce compensating business operations where required;
9. be idempotent against repeated resolution requests.

The resolver must not edit the original historical event.

## 10. Inventory Conflict Safety

For inventory conflicts:

> The authoritative inventory ledger wins as the organization-wide stock truth.

However, “cloud wins” does **not** mean “delete the local sale.”

The local transaction remains traceable. Any business consequence is represented through:
- accepted authoritative effect;
- compensating inventory transaction;
- sale reversal/adjustment;
- return/refund operation;
- or explicit unresolved state,

according to the approved business policy.

## 11. Allocation Conflict Safety

A conflict involving offline safety allocation must preserve the A1 distinction:

- allocation capacity is not stock;
- allocation cannot create stock;
- allocation consumption is tied to a local business transaction;
- authoritative allocation state cannot be silently overwritten;
- duplicate consumption/replenishment must be idempotent.

An allocation conflict must reference:
- allocation_id;
- device_id;
- product_id;
- local transaction id;
- sync operation id;
- local capacity before/after;
- authoritative capacity/state;
- resolution outcome.

## 12. Payment Conflict Safety

Payment conflicts must preserve ADR-012 principles:

- Payment Method is independent of Verification Mode.
- Evidence is not proof by itself.
- OCR/extracted data is not proof by itself.
- Manual confirmation is an authorized business decision.
- API verification is only recorded when actually verified.
- Hisabati remains an adapter/integration dependency, not a core payment type.

A conflict must never fabricate provider confirmation.

## 13. Sync Semantics

Conflict records must be durable on the authoritative side.

Recommended conceptual identifiers:
- conflict_id;
- operation_id;
- event_id where applicable;
- aggregate_id;
- device_id;
- allocation_id where applicable;
- correlation_id;
- detected_at;
- conflict_type;
- severity;
- state;
- resolution_class.

The exact wire DTO is deferred to the sync contract.

## 14. Retry Semantics

Retries must distinguish:

**Retryable technical failure**
→ retry.

**Duplicate**
→ return existing result.

**Deterministic business rejection**
→ do not retry unchanged indefinitely.

**Conflict**
→ persist and route through resolution.

**Containment**
→ stop unsafe offline processing until recovery.

A worker must never turn a business conflict into an infinite technical retry loop.

## 15. Conflict Visibility

Operational users should see:
- actionable status;
- business consequence;
- whether action is required;
- whether synchronization is pending.

They should not be exposed to internal implementation details such as raw event sequencing unless an authorized diagnostic view requires them.

Auditors/admins need deeper provenance.

## 16. Accounting Boundary

Accounting consumes synchronized business events and remains asynchronous.

A conflict must not create an accounting entry merely because an event was attempted.

If an already-posted accounting effect requires correction:
- create an approved reversal/adjustment;
- never mutate historical journal entries.

Accounting conflict handling remains consistent with Domain Model v1.1.

## 17. Required Metrics

Track at minimum:
- conflicts detected by type;
- conflicts by severity;
- auto-idempotent resolutions;
- deterministic auto-resolutions;
- human resolutions;
- compensating operations;
- contained devices;
- conflict age;
- unresolved count;
- repeated conflict count;
- false/incorrect automatic resolutions;
- resolution retries;
- resolution failures.

No arbitrary “>60% auto-resolution” exit target is imposed.

The objective is safe deterministic automation with measured false-resolution and aging rates.

## 18. Required Test Families

R1-A2 must prove:

1. duplicate delivery is idempotent;
2. out-of-order delivery does not create false conflicts;
3. authoritative stock shortfall becomes durable conflict;
4. expired/depleted batch conflict is explicit;
5. allocation exhaustion conflict is explicit;
6. duplicate replenishment is absorbed;
7. cross-device scope violation is rejected;
8. stale-version mutation is handled deterministically;
9. sale reversal replay is idempotent;
10. return/refund conflict does not conflate inventory and money;
11. payment verification conflict cannot fabricate settlement;
12. authorization revocation is auditable;
13. local corruption causes containment;
14. human resolution is authorized, auditable and idempotent;
15. conflict survives worker/device restart.

## 19. Open Decisions

The following are intentionally not locked:

1. Exact conflict DTO/wire format.
2. Exact conflict API endpoints.
3. Which inventory shortfalls can be automatically compensated.
4. Final sale/reversal/refund business policy.
5. Exact authorization/SoD rules for each resolution class.
6. Conflict retention period.
7. Whether conflicts are organization-wide or branch-routed by default.
8. Notification/escalation timing.
9. Final allocation conflict policy after R1-A1 numeric thresholds are validated.
10. Exact local conflict storage schema.

## 20. Gate to R1-A2.2

Before finalizing the conflict state machine and API implications, reconcile this taxonomy against:

- R1-A1 policy and test matrix;
- Phase 2.2 Sync Architecture;
- ADR-011 inventory safety;
- ADR-012 payment verification;
- Authorization model;
- Accounting event boundary.

## 21. Decision Status

**Status:** PROPOSED — NOT LOCKED.

This document does not reopen locked baselines.

Phase 3.5 remains BLOCKED until R1 exit criteria are satisfied.
