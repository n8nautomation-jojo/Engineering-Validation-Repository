# R1-A3.2 — Capability Catalog & Role Matrix

**Status:** PROPOSED POLICY ARTIFACT — NOT LOCKED  
**Track:** R1-A3 — Authorization Policy  
**Depends on:** R1-A3.1, R1-A2.2, R1-A1.4, Phase 3.4 endpoint contract baseline

## 1. Purpose

This document establishes the proposed MVP authorization vocabulary and default role matrix.

It is a policy artifact, not an implementation. A capability being listed here does not bypass domain invariants, scope, offline eligibility, transaction state, SoD, or audit requirements.

## 2. Authorization Evaluation Order

For every protected command:

1. Authenticate actor/device context.
2. Resolve actor status and active role assignments.
3. Resolve requested capability.
4. Resolve resource and business scope.
5. Evaluate policy conditions.
6. Evaluate SoD and conflict-of-interest rules.
7. Evaluate offline eligibility when disconnected.
8. Evaluate domain invariants.
9. Allow or deny.
10. Audit sensitive decisions.

A role match alone is never sufficient.

## 3. Capability Catalog

### Sales

| Capability | Meaning | Default scope | Offline |
|---|---|---|---|
| sales.create | Create/complete a sale | Branch + POS Device | Eligible |
| sales.read | Read sales | Assigned Branch/Org | Eligible |
| sales.reverse | Reverse a completed sale | Branch | Restricted |
| sales.return | Create sales return | Branch | Restricted |

### Payments

| Capability | Meaning | Default scope | Offline |
|---|---|---|---|
| payments.record | Record a payment against a sale | Branch + POS | Eligible |
| payments.read | Read payment details | Assigned scope | Eligible |
| payments.evidence.add | Add payment evidence | Branch + POS | Restricted |
| payments.verify.manual | Make manual payment verification decision | Branch/Org policy scope | Restricted |
| payments.verify.external | Request/use external provider verification | Org | Online-only |

**Rule:** recording, evidence capture, manual confirmation, and external verification are separate authorities.

### Cash

| Capability | Meaning | Default scope | Offline |
|---|---|---|---|
| cash.sessions.open | Open cash session | Branch + Register | Eligible |
| cash.sessions.move | Record cash movement | Branch + Register | Eligible |
| cash.sessions.close | Close cash session | Branch + Register | Restricted |
| cash.sessions.reconcile | Reconcile session | Branch | Restricted |

Exact offline rules for close/reconcile remain subject to R1-A3.3.

### Inventory

| Capability | Meaning | Default scope | Offline |
|---|---|---|---|
| inventory.read | Read inventory/batch projections | Branch/Warehouse | Eligible |
| inventory.adjust.create | Create adjustment | Branch/Warehouse | Restricted |
| inventory.adjust.approve | Approve adjustment | Branch/Warehouse | Restricted |
| inventory.transfer.create | Create transfer | Organization/Branch | Restricted |
| inventory.transfer.dispatch | Dispatch transfer | Source Branch/Warehouse | Restricted |
| inventory.transfer.receive | Receive transfer | Destination Branch/Warehouse | Restricted |

Allocation administration is intentionally separate from ordinary inventory permissions and must remain aligned with R1-A1.

### Purchasing

| Capability | Meaning | Default scope | Offline |
|---|---|---|---|
| purchasing.po.create | Create purchase order | Org/Branch | Restricted |
| purchasing.po.read | Read purchase order | Assigned scope | Eligible |
| purchasing.receipt.create | Create/receive goods receipt | Branch/Warehouse | Restricted |

### Synchronization and Conflicts

| Capability | Meaning | Default scope | Offline |
|---|---|---|---|
| sync.push | Submit local sync operations | Device | Eligible |
| sync.pull | Retrieve authorized sync changes | Device | Eligible |
| sync.conflict.resolve | Resolve conflicts | Explicit conflict scope | Online-only by default |
| conflict.read | Read conflict | Explicit conflict scope | Restricted |
| conflict.triage | Triage conflict | Explicit conflict scope | Online-only |
| conflict.escalate | Escalate conflict | Explicit conflict scope | Online-only |
| conflict.compensate | Execute approved compensating workflow | Business scope | Online-only |
| conflict.contain | Contain device/resource | Security/Operations scope | Online-only |

Type-specific capabilities from R1-A2 may supersede generic conflict authority.

### Audit and Administration

| Capability | Meaning | Default scope | Offline |
|---|---|---|---|
| audit.read | Read audit records | Org/Branch | Restricted |
| users.manage | Manage users | Org | Online-only |
| roles.manage | Manage roles/assignments | Org | Online-only |
| devices.manage | Register/suspend/revoke POS devices | Org | Online-only |
| authorization.manage | Manage authorization policy | Org | Online-only |

Administrative capabilities must never be inferred from a business role.

## 4. Proposed Default Role Matrix

Legend:
- **C** = capability granted by default.
- **R** = read capability only.
- **—** = not granted.
- **P** = policy-dependent/requires explicit assignment; not granted by default.

| Capability Group | Platform Owner | Tenant Admin | Branch Manager | Pharmacist | Cashier | Inventory Officer | Purchasing Officer | Accountant | Auditor |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Sales create/read | C | C | C | C | C | —/R | —/R | R | R |
| Sales reverse | C | P | C | P | — | — | — | P | R |
| Sales return | C | P | C | C | P | — | — | P | R |
| Payments record/read | C | C | C | C | C | —/R | —/R | C | R |
| Payment evidence add | C | C | C | C | C | — | — | P | R |
| Manual payment verify | P | P | P | P | — | — | — | C/P | R |
| External payment verify | P | C | P | — | — | — | — | C | R |
| Cash open/move | C | C | C | C | C | — | — | P | R |
| Cash close | C | P | C | P | P | — | — | P | R |
| Cash reconcile | C | P | C | — | — | — | — | C | R |
| Inventory read | C | C | C | C | R | C | R | R | R |
| Adjustment create | C | P | C | P | — | C | — | P | R |
| Adjustment approve | C | P | C | P | — | — | — | P | R |
| Transfer create | C | P | C | — | — | C | P | — | R |
| Transfer dispatch/receive | C | P | C | — | — | C | P | — | R |
| PO create/read | C | C | C | — | — | R | C | R | R |
| Goods receipt | C | P | C | P | — | C | C | R | R |
| Conflict read/triage | C | C | C | P | — | P | P | P | R |
| Conflict resolve | C | P | P | P | — | P | P | P | R |
| Conflict compensate | C | P | P | — | — | P | P | P | R |
| Conflict contain | C | C | P | — | — | — | — | — | R |
| Audit read | C | C | C | P | — | P | P | C | C |
| User/role/device administration | C | C | P | — | — | — | — | — | R |

### Matrix Interpretation

This is a **default grant matrix**, not an unconditional authorization result.

- Tenant Admin does not automatically receive every branch-scoped operational action.
- Branch Manager has strong branch authority but remains subject to SoD and business policy.
- Accountant receives financial/payment capabilities according to final accounting policy, but does not gain inventory authority merely from accounting access.
- Auditor is read/audit-oriented and should not receive ordinary mutation capabilities.
- Platform Owner is a platform-level authority; tenant business scope still applies when operating inside tenant data.
- `P` means the capability requires explicit assignment and policy approval.

## 5. Role Assignment Rules

1. Roles are assigned to users through explicit RoleAssignment records.
2. Each assignment has scope.
3. Assignment status and effective dates are mandatory.
4. A user cannot grant themselves a role.
5. Administrative role changes are online-only.
6. Permission changes do not retroactively mutate historical audit decisions.
7. Combining roles does not bypass SoD.
8. More than one role may increase capabilities, but policy may still deny the action.
9. A deactivated user has no effective business capabilities.
10. Device scope cannot exceed the user's effective branch/organization scope.

## 6. SoD Rules Referenced by the Matrix

The following are proposed baseline controls:

- Stock adjustment creator ≠ approver.
- Transfer creator/dispatcher/receiver separation where the configured control requires it.
- Payment recorder ≠ manual verifier where the payment policy requires independent verification.
- Conflict resolver cannot resolve a conflict they are explicitly prohibited from resolving due to the originating action.
- User/role administrator cannot approve their own privileged assignment.
- Auditor cannot mutate the records they audit.

Where technical prevention is not possible, Detection + Response applies.

## 7. Scope Rules

Default hierarchy:

**Tenant → Organization → Branch → Warehouse → POS Device**

Rules:

- A branch-scoped capability cannot operate another branch's resources.
- A warehouse-scoped capability cannot operate another warehouse unless explicit organization policy permits it.
- POS operations are device-bound where R1-A1 requires device authority.
- Organization-level read does not imply organization-level mutation.
- Cross-branch transfers require both source and destination authorization.
- Conflict scope is derived from the underlying business resource.

## 8. Offline Rules

The matrix intentionally does not define exact timeout values.

Offline authorization requires:

- registered device;
- active user;
- valid authorization snapshot;
- matching scope;
- capability marked offline-eligible;
- valid snapshot freshness;
- no containment;
- all domain invariants satisfied.

Offline operation never permits:

- role changes;
- permission changes;
- allocation creation/replenishment;
- external API verification;
- unrestricted conflict resolution;
- bypass of inventory safety;
- bypass of payment verification semantics.

## 9. Authorization vs Domain Rules

Authorization answers:

> “May this actor attempt this operation?”

Domain policy answers:

> “Is this operation valid?”

Both must pass.

Example:

A user with `sales.create` still cannot sell:
- expired stock;
- unavailable stock;
- stock outside the device/branch scope;
- stock violating FEFO;
- stock beyond offline safety allocation;
- while the cash session requirement is not satisfied.

## 10. Audit

At minimum, audit:

- privileged grants/denials;
- role assignment changes;
- sensitive action authorization;
- SoD rejection;
- emergency/override attempts;
- offline authorization decisions for sensitive actions;
- device suspension/revocation;
- conflict resolution authorization.

Audit remains append-only and follows the existing Audit baseline.

## 11. Lock Preconditions

R1-A3.2 must remain PROPOSED until:

1. all MVP capabilities are reconciled with Phase 3.4;
2. no duplicate/ambiguous capability names remain;
3. final role matrix is reviewed;
4. scope inheritance is finalized in R1-A3.3;
5. offline eligibility is finalized in R1-A3.3;
6. SoD matrix is finalized in R1-A3.4;
7. authorization tests pass;
8. no unresolved P0 authorization ambiguity remains.

## 12. Next Work

- R1-A3.3 — Scope, Offline Eligibility & Revocation Policy.
- R1-A3.4 — SoD & Sensitive Action Policy.
- R1-A3.5 — Authorization Test Matrix.
- Final reconciliation against Phase 3.4 before promotion.

**Decision status:** PROPOSED — NOT LOCKED.
