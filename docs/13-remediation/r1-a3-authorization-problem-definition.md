# R1-A3.1 — Authorization Problem Definition & Policy Model

**Status:** PROPOSED WORK PACKAGE — NOT LOCKED  
**Track:** R1-A3 — Authorization Policy  
**Owner:** CTO / Security & Architecture  
**Co-Owners:** Identity & Access, Domain Architecture, POS/Offline, Compliance & Audit  
**Dependencies:** R1-A1 Offline Stock Safety; R1-A2 Conflict Resolution; Phase 2.3 Authentication/Authorization Runtime; Phase 3.1–3.4 API Contract Baselines

## 1. Purpose

This work package defines the authorization policy model required before Phase 3.5. It does not implement authorization and does not lock final policy values.

The goal is to distinguish four concerns that must not be collapsed into one mechanism:

1. **Capability** — what an actor may attempt.
2. **Policy** — under what business/security conditions the capability is allowed.
3. **Scope** — where and against which resources the capability applies.
4. **Role/assignment** — how capabilities are normally granted to an actor.

Authorization must remain server-enforced online and locally enforceable offline only from an explicitly approved, time-bounded authorization snapshot.

## 2. Problem Statement

The current platform baselines define roles, permissions, offline authorization, payment verification, inventory safety, and conflict resolution, but do not yet provide one reconciled policy model for:

- capability definitions;
- role assignment;
- tenant/organization/branch/warehouse/device scope;
- offline eligibility;
- revocation;
- sensitive actions;
- separation of duties;
- emergency actions;
- conflict-resolution authority;
- audit and detection.

Without this model, apparently valid endpoints could still produce unsafe business outcomes—for example, an authorized cashier acting outside branch scope, a revoked user continuing offline, or the same person initiating and approving a sensitive adjustment.

## 3. Non-Negotiable Principles

1. **Deny by default.**
2. **Authorization is capability + policy + scope, not role name alone.**
3. **Domain invariants cannot be bypassed by permission.**
4. **Server-side authorization is authoritative online.**
5. **Offline authorization is a constrained snapshot, never an independent authority.**
6. **No raw password storage for offline authorization.**
7. **No silent privilege escalation.**
8. **Revocation must have a defined propagation and containment path.**
9. **Sensitive actions require explicit capability and policy checks.**
10. **SoD is enforced through Prevention + Detection + Response.**
11. **Every sensitive authorization decision must be auditable.**
12. **Conflict resolution cannot be broader than the resolver's approved business scope.**
13. **Authorization cannot manufacture inventory, payment settlement, accounting truth, or other domain truth.**
14. **UI visibility is not authorization.**
15. **A stale authorization snapshot must never become an unlimited offline grant.**

## 4. Authorization Model

### 4.1 Capability

A capability is a stable machine-readable action permission.

Examples:

- `sales.create`
- `sales.reverse`
- `sales.return`
- `sales.read`
- `payments.record`
- `payments.evidence.add`
- `payments.verify.manual`
- `payments.verify.external`
- `payments.read`
- `cash.sessions.open`
- `cash.sessions.move`
- `cash.sessions.close`
- `cash.sessions.reconcile`
- `inventory.read`
- `inventory.adjust.create`
- `inventory.adjust.approve`
- `inventory.transfer.create`
- `inventory.transfer.dispatch`
- `inventory.transfer.receive`
- `purchasing.po.create`
- `purchasing.po.read`
- `purchasing.receipt.create`
- `sync.push`
- `sync.pull`
- `sync.conflict.resolve`
- `audit.read`

Capabilities must remain stable enough to be referenced by API contracts, audit events, policy tests, and offline authorization snapshots.

### 4.2 Policy

Policy answers whether a capability is allowed in the current business/security context.

Policy inputs may include:

- actor identity and status;
- capability;
- assigned role(s);
- scope;
- resource ownership;
- branch/device context;
- transaction state;
- amount/quantity thresholds;
- payment verification state;
- conflict severity/type;
- SoD relationship;
- offline eligibility;
- device registration and status;
- authorization snapshot freshness;
- emergency mode, if formally supported.

A role must never be treated as the complete policy.

### 4.3 Scope

Scope is an explicit boundary:

**Tenant → Organization → Branch → Warehouse → POS Device**

A capability may be granted at one level and inherited downward only according to explicit policy.

Examples:

- `sales.create`: Branch + registered POS Device.
- `inventory.adjust.approve`: Branch/Warehouse, subject to SoD.
- `audit.read`: Organization or permitted Branch scope.
- `sync.conflict.resolve`: Organization or designated Branch scope, depending conflict type.
- Platform administration: outside tenant business scope.

Cross-branch action is denied unless the capability and policy explicitly permit it.

### 4.4 Role and Assignment

Roles are bundles of capabilities. They are not business authorization by themselves.

A `RoleAssignment` must carry at minimum:

- user_id;
- role_id;
- scope;
- assignment status;
- effective_from;
- optional effective_until;
- issuer/assigner;
- audit metadata.

Multiple assignments may exist, but effective authorization must be resolved deterministically.

## 5. Offline Authorization Model

Offline authorization exists only for controlled POS operation.

A device may operate offline only when all required conditions are satisfied:

1. Device is registered and not suspended/revoked.
2. User was previously authenticated online.
3. User has a valid local authorization grant/snapshot.
4. Required capability is included in the snapshot.
5. User assignment is still within its validity window.
6. Device/branch scope matches.
7. The action is classified as offline-eligible.
8. Required domain safety rules pass locally.
9. Snapshot freshness/offline-duration policy has not expired.
10. No local security containment state blocks the action.

The local snapshot must not become a new source of truth for cloud authorization.

### 5.1 Offline-Eligible vs Online-Only

The authorization catalog must explicitly classify capabilities as:

- **OFFLINE_ELIGIBLE** — may execute locally subject to snapshot and domain rules.
- **OFFLINE_RESTRICTED** — may execute locally only under additional conditions.
- **ONLINE_ONLY** — requires authoritative server interaction.
- **NEVER_OFFLINE** — prohibited while disconnected.

Examples requiring explicit policy review:

- Sale creation: potentially offline-eligible.
- Cash movement: potentially offline-eligible under controlled rules.
- Cash reconciliation/close: policy-dependent and may require online authority.
- Manual payment verification: should require explicit policy; offline confirmation must not imply external settlement.
- External/API payment verification: online-only.
- Allocation creation/replenishment: online-authoritative.
- Conflict resolution: generally online-controlled unless a deterministic local resolution is explicitly defined.
- Role/permission changes: online-only.
- User/device revocation: authoritative online action with local containment behavior.
- Audit export/admin changes: policy-controlled, generally online.

No endpoint may infer offline eligibility merely because its command is technically executable in SQLite.

## 6. Revocation and Staleness

Authorization revocation is authoritative in the cloud.

When connectivity exists:

1. revocation is accepted authoritatively;
2. affected devices receive the revocation;
3. local authorization state is invalidated;
4. future sensitive operations are denied.

During disconnection, a device cannot know a revocation that has not reached it. Therefore the architecture must reduce this risk through:

- bounded authorization validity;
- device registration state;
- controlled offline duration;
- sensitive-action restrictions;
- synchronization on reconnect;
- security containment when integrity or authorization state is uncertain.

Exact durations are intentionally **not selected in this work package** and must be established through R1 measurement/security decisions.

## 7. Separation of Duties — Prevention, Detection, Response

The platform must not claim that SoD is mathematically impossible. It must implement layered control.

### Prevention

Prevent combinations that are clearly unsafe where the business rule is known.

Examples:

- creator ≠ approver for stock adjustment;
- requester ≠ final resolver for a sensitive conflict where policy requires independence;
- user cannot approve their own exceptional inventory adjustment;
- payment verification authority is distinct where required by policy.

### Detection

When prevention is technically impossible or an exceptional workflow is authorized:

- record actor identities;
- record prior state and resulting state;
- record reason;
- record exception/override;
- generate a reviewable audit signal.

### Response

Detected violations or suspicious combinations must have:

- containment path;
- escalation path;
- authorized reviewer;
- durable audit trail;
- defined resolution.

Final SoD combinations remain subject to R1-A3 policy review and compliance requirements.

## 8. Sensitive Capability Classes

### Inventory

- `inventory.adjust.create`
- `inventory.adjust.approve`
- `inventory.transfer.dispatch`
- `inventory.transfer.receive`
- allocation administration capabilities to be finalized under R1-A1.

An adjustment creator should not approve the same adjustment when policy requires SoD.

### Sales

- `sales.create`
- `sales.reverse`
- `sales.return`

Reversal/return authority may require stronger policy than ordinary sale creation.

### Payments

- `payments.record`
- `payments.evidence.add`
- `payments.verify.manual`
- `payments.verify.external`

Evidence capture does not equal verification. Manual confirmation does not equal API verification. External verification requires a provider adapter/online result.

### Cash

- `cash.sessions.open`
- `cash.sessions.move`
- `cash.sessions.close`
- `cash.sessions.reconcile`

Closing/reconciliation must be subject to cash-session state and any required independent review.

### Conflicts

- `sync.conflict.resolve`
- type-specific resolution capabilities from R1-A2.

A generic conflict capability must not automatically authorize every conflict type.

### Administration

Role assignment, device registration, permission changes, and revocation are privileged administrative operations and require separate capabilities from ordinary business operations.

## 9. Conflict Resolution Authority

R1-A2 defines capability-based authority. R1-A3 reconciles that model with user assignments.

Minimum rule:

> Possessing a conflict-resolution capability is necessary but not sufficient; the resolver must also have the correct resource scope, conflict-type authority, and SoD eligibility.

For P0 conflicts:

- no silent auto-dismissal;
- deterministic system resolution only where the policy explicitly allows it;
- human resolution requires authorized scope;
- compensation requires the appropriate business capability;
- containment requires security/operations authority.

The original local operation and provenance remain immutable.

## 10. Allocation Authority Boundary

R1-A1 remains authoritative for the allocation model.

Authorization must only decide **who may request or administer an allocation operation**. It must not redefine allocation semantics.

Therefore:

- disconnected POS cannot create or extend its own allocation;
- replenishment is authoritative;
- consumption occurs only through the approved sale transaction boundary;
- administrative release requires explicit capability + reason + audit;
- cross-device borrowing remains denied by default;
- allocation authorization cannot bypass inventory, FEFO, expiry, or negative-stock rules.

## 11. Payment Verification Authority

The authorization model must preserve ADR-012:

- recording a payment is distinct from verifying it;
- adding evidence is distinct from approving evidence;
- manual confirmation is distinct from API verification;
- external verification is provider-mediated;
- Hisabati remains an adapter/integration, not a permission type.

Suggested capability separation:

`payments.record` → record payment  
`payments.evidence.add` → add evidence  
`payments.verify.manual` → make manual verification decision  
`payments.verify.external` → request/use authorized external verification

A user authorized to record a payment is not automatically authorized to verify it.

## 12. Emergency and Exceptional Actions

Emergency capability must not become a generic bypass.

If emergency operations are introduced, they require:

- explicit capability;
- narrow scope;
- reason;
- actor identity;
- timestamp;
- affected resource;
- enhanced audit;
- expiration or one-time use where appropriate;
- post-event review.

No emergency action may bypass immutable financial records, authoritative inventory safety, audit requirements, or core security invariants.

## 13. Audit Requirements

Every sensitive authorization decision must be reconstructable.

Minimum audit context:

- who;
- capability;
- policy result;
- scope;
- resource;
- branch/device;
- online/offline state;
- authorization snapshot identifier/version where applicable;
- decision timestamp;
- reason/exception;
- related business transaction;
- correlation/idempotency identifier;
- previous and resulting state where a mutation occurred.

Denied sensitive actions should be auditable according to the final audit-level policy.

## 14. Relationship to Existing Baselines

This package does not reopen:

- Domain Model v1.1;
- Architecture Phase 1 / 2.1;
- Phase 2.2;
- Phase 2.3;
- Phase 2.4;
- Phase 3.1;
- Phase 3.3.

It reconciles their authorization concepts and identifies exact policy decisions still required.

R1-A2 remains the source for conflict lifecycle semantics unless a verified R1 gate requires a targeted revision.

R1-A1 remains the source for offline allocation semantics unless a verified R1 gate requires a targeted revision.

## 15. Required Policy Decisions Before Lock

The following must be resolved before R1-A3 can be proposed for lock:

1. Final capability catalog and naming.
2. Role-to-capability default matrix.
3. Scope inheritance rules.
4. Resource-level authorization rules.
5. Offline eligibility classification for every MVP command.
6. Offline authorization snapshot validity and stale behavior.
7. Revocation propagation and containment policy.
8. Final SoD prevention matrix.
9. Detection/response workflow for SoD exceptions.
10. Conflict-resolution authority matrix by conflict type/severity.
11. Emergency-action policy, if supported.
12. Payment verification authority matrix.
13. Cash close/reconciliation authority.
14. Inventory adjustment creator/approver rules.
15. Allocation administration authority.
16. Audit level and retention requirements as they affect authorization evidence.
17. Test matrix covering allow/deny/scope/offline/revocation/SoD cases.

## 16. Acceptance Gate

R1-A3 is ready for lock review only when:

- every MVP capability has an owner and stable definition;
- every MVP command has explicit authorization policy;
- every offline-capable command has explicit offline eligibility;
- scope rules are deterministic;
- revocation/staleness behavior is defined;
- SoD has Prevention + Detection + Response;
- conflict authority matches R1-A2;
- payment authority matches ADR-012;
- allocation authority matches R1-A1;
- sensitive actions have audit evidence;
- executable authorization tests cover positive and negative paths;
- no unresolved P0 authorization ambiguity remains.

## 17. Next Artifacts

1. **R1-A3.2 — Capability Catalog & Role Matrix**
2. **R1-A3.3 — Scope, Offline Eligibility & Revocation Policy**
3. **R1-A3.4 — SoD & Sensitive Action Policy**
4. **R1-A3.5 — Authorization Test Matrix**
5. Reconcile all results into R1-A3 lock candidate.

**Decision status:** PROPOSED WORKING MODEL — NOT LOCKED.

**Governance:** This work package is subject to `docs/13-remediation/r1-change-control.md`. It must not expand into unrelated architecture redesign unless an explicit R1 exit criterion or verified defect requires it.
