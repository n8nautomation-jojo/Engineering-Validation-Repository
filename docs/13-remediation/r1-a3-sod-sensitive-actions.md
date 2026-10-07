# R1-A3.4 — SoD & Sensitive Actions Policy

**Status:** PROPOSED POLICY ARTIFACT — NOT LOCKED  
**Track:** R1-A3 Authorization  
**Depends On:** R1-A3.1, R1-A3.2, R1-A3.3, R1-A1, R1-A2  
**Purpose:** Define separation-of-duties (SoD) and sensitive-action controls without hard-coding unsafe role assumptions or creating offline privilege escalation paths.

---

## 1. Policy Objective

Sensitive operations must be controlled by the combination of:

**Capability × Policy × Assignment × Scope × Resource State × Offline Eligibility × SoD**

SoD is not treated as a claim that a conflict is technically impossible. The control model is:

1. **Prevention** — block prohibited combinations before execution.
2. **Detection** — detect prohibited or suspicious combinations that prevention cannot fully eliminate.
3. **Response** — contain, investigate, compensate, reverse, or escalate according to severity.

No sensitive action may bypass the normal authorization decision order merely because the actor has a broad role.

---

## 2. Sensitive Action Classes

The following actions are sensitive for MVP/R1 purposes:

| Action | Default Sensitivity | Default Offline |
|---|---|---|
| Create stock adjustment | High | Restricted |
| Approve stock adjustment | Critical | Online-only |
| Dispatch stock transfer | High | Restricted / policy-controlled |
| Receive stock transfer | High | Restricted / policy-controlled |
| Record payment | High | Eligible subject to payment policy |
| Add payment evidence | High | Restricted |
| Manually confirm payment | Critical | Online-only by default |
| Request external payment verification | Critical | Online-only |
| Close cash session | Critical | Online-only by default |
| Reconcile cash session | Critical | Online-only |
| Sales return | High | Restricted |
| Sales reversal | Critical | Online-only by default |
| Conflict compensation | Critical | Online-only |
| Conflict resolution | Critical | Online-only |
| Role/permission assignment | Critical | Online-only |
| Device revocation | Critical | Online-only |
| Allocation creation/replenishment | Critical | Online-only |
| Allocation release | High/Critical | Online-only by default |
| Audit-log access | Sensitive | Online-only by default |
| Emergency administrative action | Critical | Online-only unless a separately approved emergency policy exists |

This table is a policy baseline, not a final lock. R1-H verification must validate the final offline classification.

---

## 3. Requester / Approver / Reviewer / Resolver Separation

Where a workflow has an approval or resolution boundary, the system should distinguish:

- **Requester:** initiates the business action.
- **Approver:** authorizes an action requiring approval.
- **Reviewer:** evaluates evidence or a disputed state.
- **Resolver:** applies an approved conflict or compensating resolution.

### Default SoD rules

1. A requester must not approve their own sensitive request when the workflow requires independent approval.
2. A resolver must not silently alter the original business operation.
3. A reviewer must not be treated as proof of settlement unless the payment policy explicitly defines the review outcome.
4. A user who created a conflict must not automatically receive authority to resolve that conflict.
5. A user who requested a compensating action must not approve the same compensating action where independent approval is required.
6. Role breadth does not automatically defeat SoD.
7. System workers may perform deterministic technical transitions, but they do not become business approvers merely by executing automation.

---

## 4. Sensitive Workflow Controls

### 4.1 Stock Adjustment

**Create**
- Requires `inventory.adjust.create`.
- Must be within effective branch/warehouse scope.
- Requires reason and audit provenance.
- If approval is required, creation does not itself approve or post the adjustment.

**Approve**
- Requires `inventory.adjust.approve`.
- Must evaluate policy, scope, resource state, and SoD.
- Default: creator and approver should be different subjects for adjustments requiring approval.

**Execution**
- Must create the authoritative inventory effect through the inventory domain.
- No direct quantity mutation by the authorization layer.

### 4.2 Payments

**Record Payment**
- Requires `payments.record`.
- Offline eligibility follows payment method and verification mode.
- Recording a transfer is not equivalent to API verification.

**Evidence**
- Requires `payments.evidence.add`.
- Evidence is immutable/auditable after acceptance; later review is a separate business decision.
- Evidence upload does not automatically mark settlement verified.

**Manual Confirmation**
- Requires `payments.verify.manual`.
- Online-only by default.
- Must record confirmer, reason/outcome, payment state before/after, and evidence references where applicable.
- If a workflow requires independent review, the same subject must not both submit and independently approve the decision.

**External Verification**
- Requires `payments.verify.external`.
- Online-only.
- Provider adapter executes verification; core payment domain remains provider-agnostic.
- Hisabati remains an adapter/integration, not a permission bypass.

### 4.3 Cash Session

**Open**
- Requires `cash.sessions.open`.
- Must respect active-session and device/register constraints.

**Move**
- Requires `cash.sessions.move`.
- Each movement must be attributable and auditable.

**Close**
- Requires `cash.sessions.close`.
- Default online-only for MVP.
- The system must not silently accept an unexplained cash difference.

**Reconcile**
- Requires `cash.sessions.reconcile`.
- Must be distinct from ordinary cashier operation.
- Where independent reconciliation is required, the reconciler must be a separate authorized subject.

### 4.4 Sales Return / Reversal

- Merchandise return and payment refund remain separate concepts.
- `sales.return` does not automatically grant refund authority.
- `sales.reverse` is a compensating business operation, not deletion.
- Critical reversals are online-only by default.
- Refund approval must follow payment/refund policy and SoD rather than being inferred from return authority.

### 4.5 Conflict Resolution

- `conflict.read`, `conflict.triage`, resolution capabilities, compensation, containment, and escalation are separate capabilities.
- A conflict creator/requester must not automatically resolve the same conflict when independent resolution is required.
- P0 conflicts require explicit authorized handling; no silent auto-dismissal.
- Deterministic technical idempotency handling may remain automated when it cannot change business truth.

### 4.6 Role / Permission Administration

- Role and permission changes are critical.
- Online-only.
- The actor cannot expand their own effective capability through the same operation.
- High-risk changes require explicit audit of before/after assignments and scope.
- A broad administrative role is not a justification for bypassing audit or scope controls.

### 4.7 Device Revocation and Containment

- Device revocation is critical and online-only.
- Revocation must be enforced by the runtime and survive restart/reinstall/re-authentication attempts.
- Containment release requires explicit authority and audit.
- A user should not release a containment they initiated when independent approval is required.

### 4.8 Offline Allocation Administration

- Allocation creation, replenishment approval, and administrative release are online-only.
- Offline POS can consume only an already-authorized allocation within its device scope.
- Authorization cannot create capacity; allocation cannot grant authorization.
- Allocation state cannot be changed by manipulating the client request.

---

## 5. SoD Decision Procedure

For every sensitive command:

1. Authenticate subject/device context.
2. Resolve capability.
3. Resolve effective policy.
4. Resolve assignment.
5. Resolve requested scope against resource scope.
6. Evaluate resource/business state.
7. Evaluate offline eligibility.
8. Evaluate SoD constraints.
9. Evaluate idempotency/concurrency requirements.
10. Execute only if all required gates pass.
11. Persist audit/provenance as part of the appropriate transaction boundary.
12. Publish required Outbox/domain events only after durable business commit.

SoD must never be implemented as a UI-only check.

---

## 6. Prevention, Detection, Response

### Prevention

The authorization layer should reject:
- self-approval where prohibited;
- self-resolution where prohibited;
- self-release of containment where prohibited;
- unauthorized role/capability expansion;
- offline execution of online-only sensitive actions;
- scope escalation;
- operations outside the subject's effective assignment.

### Detection

The platform should detect:
- repeated denied sensitive actions;
- repeated attempts to bypass scope;
- unusual emergency-action usage;
- repeated conflict resolution by the same subject;
- approval patterns inconsistent with configured SoD;
- device/user state inconsistencies;
- suspicious repeated evidence/verification attempts.

Detection does not itself imply fraud. It produces auditable signals for operations/security review.

### Response

Depending on policy and severity:
- deny;
- record security/audit event;
- suspend sensitive capability;
- contain device;
- escalate to authorized resolver;
- create compensating transaction;
- reverse/void through domain workflow;
- preserve evidence and provenance.

No response action may rewrite historical truth.

---

## 7. Emergency Actions

No unrestricted emergency bypass is approved by this document.

If an emergency mode is later required, it must have a separate approved policy defining at minimum:

- exact capabilities permitted;
- triggering conditions;
- maximum scope and duration;
- whether dual authorization is required;
- mandatory reason;
- immutable audit record;
- post-event review;
- automatic expiry;
- containment/revocation behavior;
- whether the action is permitted offline.

Until that policy is approved, critical online-only actions remain blocked offline.

---

## 8. Offline SoD Rules

Offline authorization is a bounded projection of cloud-approved authority.

Therefore:

- No offline operation may expand role, capability, or scope.
- Online-only sensitive actions cannot be completed from a stale snapshot.
- Restricted operations require the configured local safeguards and valid snapshot.
- SoD decisions that depend on authoritative current state should fail closed when that state cannot be safely evaluated.
- Accepted historical offline transactions remain valid after later revocation unless a separate domain compensation/reversal workflow determines otherwise.
- Reconnection applies revocation and containment idempotently.

The final list of restricted operations and validity windows remains subject to R1-B/R1-H evidence.

---

## 9. A1 / A2 Integration

### A1 — Offline Safety Allocation

SoD controls:
- creating/replenishing allocation is privileged and online-only;
- consuming an existing allocation is part of the authorized sale transaction;
- allocation consumption cannot grant additional authority;
- allocation release is separately authorized;
- allocation override is not an implicit cashier capability.

### A2 — Conflict Resolution

SoD controls:
- conflict classification/triage and final resolution are separate capabilities;
- compensation is distinct from merely viewing or triaging;
- P0 conflicts require explicit authorized handling;
- resolution requests are idempotent and bound to conflict + resolver scope;
- the actor/capability/scope snapshot is preserved for audit.

---

## 10. Accounting Boundary

SoD in authorization must not turn Accounting into a side effect of authorization.

Accounting remains an independent domain:
- business events trigger accounting handlers;
- journal entries are created/reversed by Accounting;
- locked periods require the established posting-exception/audit workflow;
- authorization can permit or deny a business action, but it does not directly mutate journal entries.

---

## 11. Audit Requirements

Every sensitive decision must preserve, as applicable:

- Who
- What capability
- What policy
- What scope
- Resource/business state
- Offline/online context
- SoD decision
- Before/after state
- Reason
- Device
- Authorization snapshot/version
- Correlation ID
- Business transaction ID
- Conflict ID where applicable
- Approval/reviewer/resolver identity
- Timestamp

Denied sensitive actions should produce security/audit telemetry according to the final retention policy.

---

## 12. Non-Goals

This policy does not:
- finalize every role's permanent permissions;
- choose cryptographic/local-storage mechanisms;
- define exact offline validity durations;
- define Sudan-specific legal requirements;
- define the external Hisabati API;
- create an unrestricted emergency bypass;
- replace the A2 conflict state machine;
- replace domain lifecycle rules.

---

## 13. Acceptance Gates Before Lock

R1-A3.4 can only be promoted toward LOCKED after:

1. Every MVP sensitive command has an explicit SoD treatment.
2. Requester/approver/reviewer/resolver boundaries are unambiguous where required.
3. No role can expand its own capability through ordinary authorization APIs.
4. Offline online-only restrictions are executable, not descriptive.
5. A1 allocation administration boundaries are aligned.
6. A2 conflict-resolution authority is aligned.
7. Payment verification/evidence permissions remain consistent with ADR-012.
8. Cash close/reconciliation boundaries are testable.
9. Emergency policy is either explicitly approved or explicitly absent.
10. R1-H provides evidence for validity/revocation behavior.
11. R1-B confirms security assumptions affecting local authorization integrity.
12. A3.5 automated authorization/SoD tests pass with no unresolved P0 ambiguity.

---

## 14. Open Decisions

The following remain intentionally **PROPOSED**:

- final restricted-operation list;
- final NEVER_OFFLINE list;
- exact offline validity/staleness windows;
- exact SoD combinations requiring independent approval;
- emergency mode requirements;
- containment thresholds;
- denial telemetry retention;
- multi-branch inheritance edge cases;
- security mechanism protecting local authorization snapshots;
- final capability-policy matrix after R1-B/R1-H reconciliation.

**Decision status:** PROPOSED POLICY ARTIFACT — NOT LOCKED.

**Next artifact:** R1-A3.5 Authorization & SoD Test Matrix.

Phase 3.5 remains blocked until R1 exit criteria are satisfied and Phase 3.4 is formally reconciled/promoted.
