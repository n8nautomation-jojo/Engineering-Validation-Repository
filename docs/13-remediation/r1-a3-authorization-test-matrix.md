# R1-A3.5 — Authorization & SoD Test Matrix

**Status:** ACTIVE R1 WORK PACKAGE / PROPOSED TEST MATRIX — NOT LOCKED  
**Track:** R1-A3 Authorization  
**Depends On:** R1-A3.1, R1-A3.2, R1-A3.3, R1-A3.4, R1-A1, R1-A2  
**Purpose:** Provide executable acceptance tests for capability, policy, assignment, scope, resource state, offline eligibility, revocation, and separation-of-duties controls.

---

## 1. Test Objective

The authorization system is acceptable only when the effective decision is deterministic, auditable, scope-safe, and resistant to offline privilege escalation.

The core decision model under test is:

**Capability × Policy × Assignment × Scope × Resource State × Offline Eligibility × SoD**

Tests must prove both:
- valid operations are accepted;
- invalid or unsafe operations are rejected without mutating business truth.

A passing authorization test must include the resulting business/audit state, not merely an HTTP response.

---

## 2. Acceptance Gates

A3.5 must demonstrate:

1. No capability is granted solely because a role name appears in a request.
2. Scope cannot be expanded through request parameters.
3. Offline snapshots cannot grant capabilities not present in the issued snapshot.
4. Online-only sensitive actions cannot complete from stale/offline authority.
5. Revocation blocks future unauthorized work within the defined revocation model.
6. Historical accepted transactions remain traceable after later revocation.
7. Self-approval/self-resolution restrictions work where configured.
8. A user cannot expand their own authority.
9. Device revocation/containment cannot be bypassed by restart or reinstall.
10. A1 allocation administration cannot be performed through ordinary sale authority.
11. A2 conflict resolution requires the appropriate authority.
12. Payment verification permissions remain distinct from payment recording/evidence.
13. Cash close/reconciliation controls are distinct and testable.
14. Every denial of a sensitive action produces the required audit/security telemetry.
15. Idempotent replay cannot create duplicate authorization effects or business effects.
16. No unresolved P0 authorization ambiguity remains before A3 promotion.

---

## 3. Test Result Model

Each test records:

- Test ID
- Actor / role
- Capability
- Policy decision
- Assignment scope
- Request scope
- Resource scope/state
- Online/offline context
- Snapshot/revocation state
- SoD relationship
- Expected authorization result
- Expected business mutation
- Expected audit/security event
- Expected sync/conflict effect
- Severity
- Automation status
- Evidence reference
- Pass/Fail

HTTP success alone is never a passing criterion for a business authorization test.

---

## 4. Core Authorization Tests

| ID | Scenario | Expected Result | Severity |
|---|---|---|---|
| AUTH-01 | Actor has required capability and matching scope | Allow | P0 |
| AUTH-02 | Actor lacks capability | Deny, no mutation | P0 |
| AUTH-03 | Capability exists but policy denies action | Deny, no mutation | P0 |
| AUTH-04 | Assignment scope excludes resource | Deny, no mutation | P0 |
| AUTH-05 | Request attempts wider scope than assignment | Deny, no mutation | P0 |
| AUTH-06 | Resource belongs to another branch | Deny | P0 |
| AUTH-07 | Resource belongs to another warehouse outside scope | Deny | P0 |
| AUTH-08 | Capability is valid but resource state forbids action | Deny | P0 |
| AUTH-09 | Capability + scope valid but offline class forbids operation | Deny | P0 |
| AUTH-10 | Missing/invalid authorization snapshot offline | Deny restricted action | P0 |
| AUTH-11 | Snapshot lacks requested capability | Deny | P0 |
| AUTH-12 | Snapshot scope is narrower than request | Deny | P0 |
| AUTH-13 | Expired authorization validity | Deny according to final policy | P0 |
| AUTH-14 | Snapshot version is superseded while connected | Evaluate current authority; stale authority cannot override current state | P0 |
| AUTH-15 | Replayed authorized request with same idempotency key | Same business result, no duplicate effect | P0 |
| AUTH-16 | Reused idempotency key with different authorization context/payload | Reject conflict | P0 |

---

## 5. Role / Capability Separation

| ID | Scenario | Expected Result | Severity |
|---|---|---|---|
| ROLE-01 | Cashier creates sale | Allow within scope | P0 |
| ROLE-02 | Cashier attempts role assignment | Deny | P0 |
| ROLE-03 | Cashier attempts payment manual confirmation | Deny unless explicitly granted and policy allows | P0 |
| ROLE-04 | Pharmacist performs pharmacist-authorized workflow | Allow within scope | P1 |
| ROLE-05 | Auditor attempts financial mutation | Deny | P0 |
| ROLE-06 | Accountant attempts inventory adjustment without capability | Deny | P0 |
| ROLE-07 | Inventory Officer attempts role management | Deny | P0 |
| ROLE-08 | Tenant Admin attempts operation outside tenant/org scope | Deny | P0 |
| ROLE-09 | Platform-level actor accesses tenant resource without valid tenant context | Deny or require explicit platform capability | P0 |
| ROLE-10 | User attempts to assign themselves a stronger role | Deny | P0 |

The role matrix is a policy source, not a replacement for capability and scope evaluation.

---

## 6. Scope Tests

| ID | Scenario | Expected Result | Severity |
|---|---|---|---|
| SCOPE-01 | Organization-scoped user accesses permitted branch | Allow | P0 |
| SCOPE-02 | Branch-scoped user accesses another branch | Deny | P0 |
| SCOPE-03 | Warehouse-scoped user accesses permitted warehouse | Allow | P0 |
| SCOPE-04 | Warehouse-scoped user accesses another warehouse | Deny | P0 |
| SCOPE-05 | Device-scoped offline user uses another device | Deny | P0 |
| SCOPE-06 | Request changes branch_id to bypass scope | Deny | P0 |
| SCOPE-07 | Request changes warehouse_id to bypass scope | Deny | P0 |
| SCOPE-08 | Resource is reassigned after snapshot issuance | Current policy/state determines result; stale scope cannot silently expand | P0 |
| SCOPE-09 | Cross-branch stock transfer | Allow only through explicit transfer capability/workflow | P0 |
| SCOPE-10 | Offline request attempts cross-device allocation consumption | Deny | P0 |

---

## 7. Offline Eligibility Tests

| ID | Scenario | Expected Result | Severity |
|---|---|---|---|
| OFFAUTH-01 | Sales creation with valid offline eligibility | Allow if all business gates pass | P0 |
| OFFAUTH-02 | Sales creation without valid offline eligibility | Deny | P0 |
| OFFAUTH-03 | Cash movement under eligible/restricted policy | Follow final offline policy | P1 |
| OFFAUTH-04 | Payment evidence upload while offline | Follow restricted policy; no false verification | P0 |
| OFFAUTH-05 | Manual payment confirmation while offline | Deny by default | P0 |
| OFFAUTH-06 | External payment verification while offline | Deny | P0 |
| OFFAUTH-07 | Role assignment while offline | Deny | P0 |
| OFFAUTH-08 | Device revocation while offline | Deny as administrative mutation | P0 |
| OFFAUTH-09 | Allocation replenishment approval while offline | Deny | P0 |
| OFFAUTH-10 | Conflict resolution while offline | Deny by default | P0 |
| OFFAUTH-11 | Audit access while offline | Follow final policy; no sensitive leakage | P1 |
| OFFAUTH-12 | Stale snapshot attempts online-only operation | Deny | P0 |

---

## 8. Revocation and Containment

| ID | Scenario | Expected Result | Severity |
|---|---|---|---|
| REV-01 | User capability revoked while connected | Next sensitive operation denied | P0 |
| REV-02 | User role removed while connected | Current authority recalculated; future unauthorized operation denied | P0 |
| REV-03 | Device revoked while connected | Device blocked | P0 |
| REV-04 | Device contained during conflict/security incident | Sensitive operations blocked according to containment policy | P0 |
| REV-05 | Revocation arrives during sync | Apply idempotently; no privilege resurrection | P0 |
| REV-06 | Revoked user restarts application | Revocation remains effective | P0 |
| REV-07 | Revoked device reinstalls client | Cannot regain authority merely by reinstall | P0 |
| REV-08 | Offline accepted transaction later syncs after user revocation | Preserve historical trace; do not retroactively mutate transaction solely due to revocation | P0 |
| REV-09 | Offline snapshot remains usable beyond final validity window | Deny according to policy | P0 |
| REV-10 | Duplicate revocation event | No duplicate side effect; final state unchanged | P1 |

---

## 9. SoD — Self-Approval and Separation

| ID | Scenario | Expected Result | Severity |
|---|---|---|---|
| SOD-01 | User creates stock adjustment requiring approval | Create allowed if capability exists | P0 |
| SOD-02 | Same user attempts to approve own adjustment where independent approval required | Deny | P0 |
| SOD-03 | Different authorized approver approves adjustment | Allow | P0 |
| SOD-04 | User requests and resolves same critical conflict where separation required | Deny | P0 |
| SOD-05 | Independent authorized resolver resolves conflict | Allow | P0 |
| SOD-06 | User submits payment evidence and attempts independent verification | Deny where separation is required | P0 |
| SOD-07 | Different authorized reviewer verifies payment | Allow | P0 |
| SOD-08 | User requests containment release and attempts to release own containment | Deny where independent release is required | P0 |
| SOD-09 | User creates role assignment that grants themselves higher authority | Deny | P0 |
| SOD-10 | User changes another user's role within authorized scope | Allow only if policy permits | P1 |
| SOD-11 | Same subject closes and independently reconciles cash session where separation is required | Deny | P0 |
| SOD-12 | Independent reconciler completes reconciliation | Allow | P0 |

---

## 10. Sensitive Action Tests

### Stock

| ID | Scenario | Expected Result | Severity |
|---|---|---|---|
| SENS-STK-01 | Create adjustment with reason and scope | Allow if authorized | P0 |
| SENS-STK-02 | Approve adjustment without approval capability | Deny | P0 |
| SENS-STK-03 | Approve own adjustment under SoD-required policy | Deny | P0 |
| SENS-STK-04 | Dispatch transfer outside branch scope | Deny | P0 |
| SENS-STK-05 | Receive transfer without receive capability | Deny | P0 |

### Payments

| ID | Scenario | Expected Result | Severity |
|---|---|---|---|
| SENS-PAY-01 | Record cash payment | Allow if authorized | P0 |
| SENS-PAY-02 | Record Bankak transfer without API verification | Allow if payment policy permits; status not falsely verified | P0 |
| SENS-PAY-03 | Add screenshot evidence | Allow only with evidence capability | P0 |
| SENS-PAY-04 | Screenshot upload causes automatic settlement verification | Reject/forbid automatic truth escalation | P0 |
| SENS-PAY-05 | Manual verification without capability | Deny | P0 |
| SENS-PAY-06 | External verification without capability | Deny | P0 |
| SENS-PAY-07 | Hisabati adapter result applied by unauthorized client | Deny; provider credentials never exposed to client | P0 |

### Cash

| ID | Scenario | Expected Result | Severity |
|---|---|---|---|
| SENS-CASH-01 | Open session without capability | Deny | P0 |
| SENS-CASH-02 | Close session without close capability | Deny | P0 |
| SENS-CASH-03 | Close session with unexplained difference | Deny/escalate according to cash policy | P0 |
| SENS-CASH-04 | Reconcile without reconciliation capability | Deny | P0 |
| SENS-CASH-05 | Self-close/self-reconcile where separation is required | Deny | P0 |

### Sales

| ID | Scenario | Expected Result | Severity |
|---|---|---|---|
| SENS-SALE-01 | Authorized sale within branch/device scope | Allow | P0 |
| SENS-SALE-02 | Sales reversal by unauthorized actor | Deny | P0 |
| SENS-SALE-03 | Sales return without return capability | Deny | P0 |
| SENS-SALE-04 | Return capability used to obtain unauthorized refund authority | Deny | P0 |
| SENS-SALE-05 | Critical reversal attempted offline | Deny by default | P0 |

---

## 11. A1 Allocation Authorization Tests

| ID | Scenario | Expected Result | Severity |
|---|---|---|---|
| A1AUTH-01 | Authorized user consumes own device allocation through valid sale | Allow | P0 |
| A1AUTH-02 | Cashier attempts allocation replenishment | Deny | P0 |
| A1AUTH-03 | Unauthorized user attempts administrative release | Deny | P0 |
| A1AUTH-04 | Device attempts to consume another device's allocation | Deny | P0 |
| A1AUTH-05 | Allocation authority used to bypass FEFO/expiry | Deny | P0 |
| A1AUTH-06 | Allocation capacity used as permission to create stock | Deny | P0 |
| A1AUTH-07 | Allocation override attempted without explicit capability | Deny | P0 |
| A1AUTH-08 | Replenishment approval replayed | Idempotent, no duplicate capacity | P0 |

---

## 12. A2 Conflict Authorization Tests

| ID | Scenario | Expected Result | Severity |
|---|---|---|---|
| A2AUTH-01 | User can read conflict but lacks resolution capability | Read allowed, resolution denied | P0 |
| A2AUTH-02 | User can triage but lacks compensation capability | Triage allowed, compensation denied | P0 |
| A2AUTH-03 | Unauthorized user attempts P0 conflict resolution | Deny | P0 |
| A2AUTH-04 | Conflict creator attempts prohibited self-resolution | Deny | P0 |
| A2AUTH-05 | Authorized resolver resolves within scope | Allow | P0 |
| A2AUTH-06 | Resolution replay with same request ID | Same result, no duplicate effect | P0 |
| A2AUTH-07 | Resolver attempts mutation outside conflict scope | Deny | P0 |
| A2AUTH-08 | Contained device attempts sensitive conflict action | Deny | P0 |

---

## 13. Audit and Telemetry Tests

| ID | Scenario | Expected Result | Severity |
|---|---|---|---|
| AUDAUTH-01 | Sensitive action allowed | Required authorization decision/audit context recorded | P0 |
| AUDAUTH-02 | Sensitive action denied | Security/audit telemetry recorded | P0 |
| AUDAUTH-03 | Scope violation | Denial reason and scope context recorded | P0 |
| AUDAUTH-04 | SoD violation | SoD decision and involved identities recorded | P0 |
| AUDAUTH-05 | Offline denial | Offline class/snapshot context recorded without sensitive leakage | P1 |
| AUDAUTH-06 | Revocation applied | Revocation source/version/time recorded | P0 |
| AUDAUTH-07 | Emergency action (if later approved) | Mandatory reason and post-review evidence recorded | P0 |
| AUDAUTH-08 | Authorization replay | Idempotency decision recorded without duplicate business effect | P1 |

---

## 14. Security / Tamper Resistance Tests

These tests depend partly on R1-B security decisions.

| ID | Scenario | Expected Result | Severity |
|---|---|---|---|
| SEC-AUTH-01 | Local authorization snapshot is modified | Integrity failure; sensitive operation denied/contained | P0 |
| SEC-AUTH-02 | Device identity binding is modified | Operation denied | P0 |
| SEC-AUTH-03 | Snapshot copied to another device | Device binding rejects use | P0 |
| SEC-AUTH-04 | Client changes capability value locally | Server/reconciliation authority rejects forged authority | P0 |
| SEC-AUTH-05 | Client changes scope locally | Scope integrity check rejects operation | P0 |
| SEC-AUTH-06 | Local clock manipulated to extend validity | Cannot safely extend authority solely through client clock | P0 |
| SEC-AUTH-07 | Revocation state deleted locally | Device/user remains unable to bypass authoritative revocation after applicable policy propagation | P0 |

These tests cannot be finalized until R1-B selects the local protection and trust model.

---

## 15. Property-Based / Invariant Tests

The implementation should include property-based tests for:

1. **No scope expansion**
   - Effective scope must never exceed the intersection of assignment, request, resource, and policy scopes.

2. **No capability creation**
   - No client request may create a capability not present in authoritative or valid offline authority.

3. **No offline privilege escalation**
   - An offline operation can never increase the actor's authority.

4. **Revocation monotonicity**
   - Once a capability/device is revoked, replaying older authority cannot restore it under the defined revocation model.

5. **Idempotent authorization effects**
   - Replaying the same authorized sensitive command does not duplicate business effects.

6. **SoD stability**
   - Reordering independent authorization checks must not turn a prohibited SoD combination into an allowed one.

7. **Containment monotonicity**
   - A contained device cannot become less restricted through ordinary client operations.

8. **A1 separation**
   - Allocation state cannot grant authorization and authorization cannot grant allocation capacity.

9. **A2 separation**
   - Conflict read/triage authority cannot implicitly grant resolution/compensation authority.

10. **Payment truthfulness**
   - Evidence or manual review cannot be represented as API/provider verification unless the corresponding verified state was actually produced by the authorized verification workflow.

---

## 16. Failure / Restart Tests

| ID | Scenario | Expected Result | Severity |
|---|---|---|---|
| FAILAUTH-01 | Power loss after local authorization but before business commit | No partial business authorization effect | P0 |
| FAILAUTH-02 | Power loss after business commit | Accepted transaction remains durable and traceable | P0 |
| FAILAUTH-03 | Worker crash during revocation propagation | Restart resumes idempotently | P0 |
| FAILAUTH-04 | Worker crash during conflict resolution | No duplicate resolution effect | P0 |
| FAILAUTH-05 | Duplicate revocation/restriction event | Final state unchanged and durable | P1 |
| FAILAUTH-06 | Local DB recovery after authorization snapshot corruption | Sensitive operations contained until trust restored | P0 |

---

## 17. Evidence Requirements

A test cannot be marked PASS solely because the endpoint returned 2xx/4xx.

Evidence should include, as applicable:

- request and correlation ID;
- actor/device identity;
- capability/policy decision;
- assignment and scope;
- resource state;
- offline/online state;
- snapshot/version;
- SoD participants;
- business transaction ID;
- audit/security event;
- resulting domain state;
- sync/conflict state;
- idempotency result.

Sensitive test evidence must avoid storing secrets or raw credentials.

---

## 18. Automation Priority

### P0 — Must be automated before A3 promotion

- AUTH-01..16
- SCOPE-01..10
- REV-01..10
- SOD-01..12
- critical OFFAUTH cases
- critical sensitive payment/cash/sales cases
- A1AUTH-01..08
- A2AUTH-01..08
- critical audit cases
- SEC-AUTH-01..07 after R1-B security model
- critical failure/restart cases

### P1 — Automate before production readiness

- lower-risk telemetry cases;
- operational analytics;
- non-critical offline classification cases;
- extended property suites.

---

## 19. Exit Evidence for A3

A3 can be recommended for promotion only when:

1. The capability catalog and role matrix are reconciled with all MVP commands.
2. Scope rules pass cross-branch/warehouse/device tests.
3. Offline eligibility is explicit for every MVP command.
4. Revocation tests demonstrate no privilege resurrection.
5. SoD tests cover requester/approver/reviewer/resolver boundaries.
6. A1 and A2 authorization boundaries pass.
7. Payment verification semantics remain aligned with ADR-012.
8. Security-dependent tamper tests are completed after R1-B.
9. No unresolved P0 authorization failure remains.
10. All exceptions are documented with owner, reason, mitigation, and target gate.
11. Evidence is reproducible in CI/test environments.
12. No arbitrary auto-resolution percentage is used as an exit gate.

---

## 20. Open Items

The following are intentionally not locked by this matrix:

- final SoD combinations requiring independent approval;
- exact offline validity/staleness windows;
- final restricted/NEVER_OFFLINE command list;
- emergency mode policy;
- containment thresholds;
- local authorization snapshot integrity mechanism;
- revocation propagation guarantees;
- denial telemetry retention;
- final legal/compliance-sensitive authorization rules.

**Decision status:** PROPOSED TEST MATRIX — NOT LOCKED.

**Next step after A3.5:** Consolidate R1-A3 results, identify unresolved P0/P1 items, then proceed to **R1-B Security**. Do not promote A3 or open Phase 3.5 until the R1 governance gate is satisfied.
