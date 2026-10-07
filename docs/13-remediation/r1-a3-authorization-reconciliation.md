# R1-A3 — Authorization Final Reconciliation

**Status:** READY FOR LOCK — SECURITY/EXECUTION GATE REMAINS  
**Track:** R1-A3 — Authorization Policy  
**Owner:** CEO / CTO  
**Authority:** This document supersedes the prior A3 working reconciliation for the purpose of R1 closure review. It does not itself override locked architecture baselines.

## 1. Final CTO Decision

The authorization architecture is **accepted without redesign**.

The final model is:

**Capability × Policy × Assignment × Scope × Resource State × Offline Eligibility × SoD**

Authorization is deny-by-default. Online authorization is cloud-authoritative. Offline authorization is a bounded, integrity-protected projection of previously approved authority and is never an independent permission authority.

A3 is **READY FOR LOCK**, but final promotion to LOCKED is gated by:
- R1-B local security verification for snapshot integrity/device trust/revocation boundaries;
- R1-H executable authorization tests;
- Phase 3.4 endpoint/capability reconciliation.

No new authorization architecture is required.

## 2. Final Decisions A3-R01..R12

| ID | Final Decision | Disposition |
|---|---|---|
| A3-R01 | Offline authorization snapshot has an explicit validity boundary. Proposed engineering default: maximum 24h freshness for ordinary offline authority, with operation-specific shorter limits permitted. No indefinite offline validity. Exact value is an executable verification parameter, not a legal rule. | ACCEPTED — VERIFY |
| A3-R02 | Every MVP mutation must declare one controlled offline class: OFFLINE_ELIGIBLE, OFFLINE_RESTRICTED, ONLINE_ONLY, or NEVER_OFFLINE. Final endpoint mapping is reconciled below. | ACCEPTED |
| A3-R03 | Effective scope = Assignment Scope ∩ Request Context ∩ Resource Scope ∩ Policy Scope. Scope never expands from client input. Cross-branch/organization access is deny-by-default and requires explicit capability/policy. | ACCEPTED |
| A3-R04 | SoD is Prevention + Detection + Response. No self-approval for operations requiring independent approval. Creator/requester and approver/reviewer must be distinct principals where policy marks an operation as independently approved. | ACCEPTED |
| A3-R05 | Local authorization snapshot must be integrity/authenticity protected and device-bound where required. Concrete cryptographic/storage technology remains an R1-B decision. | ACCEPTED — SECURITY GATE |
| A3-R06 | Connected revocation is immediate. Offline revocation cannot be claimed instantaneous; containment is bounded by snapshot validity, device trust, operation class and allocation/transaction policy. Proposed default is no more than the approved snapshot validity window, subject to B4 verification. | ACCEPTED — VERIFY |
| A3-R07 | Conflict authority is capability + scope + conflict type + severity + SoD. Generic 'resolve anything' authority is prohibited. P0 conflicts require authorized resolution/containment and audit. Compensation requires the specific compensation capability. | ACCEPTED |
| A3-R08 | Payment recording, evidence capture, manual verification and external verification remain separate capabilities. Manual verification requires explicit capability, reason, evidence/provenance where applicable, and SoD policy; external verification is online/provider-mediated. | ACCEPTED |
| A3-R09 | Cash open/move/close are operational capabilities; cash reconciliation is a higher-sensitivity capability. Close with unexplained variance follows configured branch policy and cannot silently erase variance. | ACCEPTED |
| A3-R10 | No generic emergency bypass exists. Any future emergency mode requires a separate approved policy, explicit capability, expiry, audit and post-event review. | ACCEPTED |
| A3-R11 | Authorization decisions affecting sensitive operations must be auditable with actor, device, scope, capability, decision, policy/snapshot version, resource, timestamp and reason where required. Engineering evidence follows project retention policy and applicable law. | ACCEPTED |
| A3-R12 | Phase 3.4 must use the stable A3 capability names and offline classes defined here. Any mismatch is a reconciliation defect, not a reason to invent a second permission vocabulary. | ACCEPTED — FINAL REVIEW |

## 3. Final Offline Eligibility Matrix — MVP

| Command / Capability | Offline Class | Final Rule |
|---|---|---|
| sales.create | OFFLINE_ELIGIBLE | Requires valid user/device authorization, active cash session, inventory/FEFO/expiry rules and A1 allocation where applicable |
| payments.record | OFFLINE_ELIGIBLE | Recording only; provider verification cannot be fabricated offline |
| payments.read | OFFLINE_ELIGIBLE | Local authorized projection |
| cash.sessions.read | OFFLINE_ELIGIBLE | Local authorized session projection |
| cash.sessions.move | OFFLINE_ELIGIBLE | Within active session and policy |
| inventory.read | OFFLINE_ELIGIBLE | Local read model |
| sync.push | OFFLINE_ELIGIBLE | Local command exists; network transport itself occurs when connected |
| sync.pull | OFFLINE_ELIGIBLE | Local synchronization application capability; transport requires connectivity |
| sales.return | OFFLINE_RESTRICTED | Requires original local evidence and configured return/refund policy |
| sales.reverse | OFFLINE_RESTRICTED | Only where complete local reversal semantics are available; otherwise online |
| payments.evidence.add | OFFLINE_RESTRICTED | Evidence may be durably queued; it never becomes provider verification |
| payments.verify.manual | OFFLINE_RESTRICTED | Only if branch policy explicitly enables it and SoD/evidence requirements can be enforced locally |
| cash.sessions.open | OFFLINE_RESTRICTED | Requires local device/register trust and no conflicting active session |
| cash.sessions.close | OFFLINE_RESTRICTED | Requires variance policy and durable local audit |
| cash.sessions.reconcile | ONLINE_ONLY | Higher-sensitivity financial reconciliation; current authority and SoD required |
| inventory.adjust.create | OFFLINE_RESTRICTED | Only where configured policy permits; approval remains separately controlled |
| inventory.adjust.approve | ONLINE_ONLY | Independent approval should use current authority |
| inventory.transfer.create | OFFLINE_RESTRICTED | Only where source/destination policy and local state permit |
| inventory.transfer.dispatch | OFFLINE_RESTRICTED | Requires complete local stock state and policy |
| inventory.transfer.receive | OFFLINE_RESTRICTED | Requires destination policy and traceable transfer state |
| purchasing.po.create | ONLINE_ONLY | Administrative procurement command |
| purchasing.receipt.create | OFFLINE_RESTRICTED | Only when receiving policy explicitly permits |
| payments.verify.external | ONLINE_ONLY | Provider-mediated verification |
| sync.conflict.resolve | ONLINE_ONLY | Requires authoritative cloud state |
| conflict.read | ONLINE_ONLY | Administrative/operational conflict access |
| conflict.triage | ONLINE_ONLY | Authoritative classification |
| conflict.escalate | ONLINE_ONLY | Authoritative workflow |
| conflict.compensate | ONLINE_ONLY | Financial/inventory compensation requires authoritative state |
| roles.manage / users.manage | ONLINE_ONLY | Never granted by stale offline snapshot |
| devices.manage / device revocation | ONLINE_ONLY | Cloud authority |
| authorization.manage | ONLINE_ONLY | Cloud authority |
| audit.read | ONLINE_ONLY | Sensitive centralized evidence access |
| allocation replenishment/approval | ONLINE_ONLY | A1 authoritative decision |

## 4. Final Scope Rules

1. Tenant, Organization, Branch, Warehouse and POS Device are explicit scope levels.
2. Assignment scope never expands from request parameters.
3. Warehouse scope does not automatically grant sales/cash authority.
4. POS Device scope is mandatory for device-bound offline operations.
5. Cross-branch operations are denied unless explicitly modeled and authorized.
6. Cross-organization operations are denied by default.
7. Platform-level access to tenant data requires explicit audited policy.
8. Resource state is checked after scope resolution.
9. A valid capability outside resource scope is still denied.
10. Local projections never become authoritative scope.

## 5. Final SoD Baseline

Independent approval is required by default for:
- stock adjustment approval;
- sensitive stock-transfer dispatch/receive where configured;
- manual payment verification where configured as a sensitive control;
- cash reconciliation;
- conflict compensation/resolution;
- role/permission administration;
- device revocation;
- allocation replenishment/release approval.

Self-approval is denied where independent approval is required.

Technical workers may perform deterministic system transitions but are not business approvers.

Combining multiple roles on one user never bypasses an explicit SoD rule.

## 6. Final Revocation Boundary

### Connected
Current cloud authorization is authoritative and changes take effect immediately after successful authoritative evaluation.

### Offline
The system cannot observe a future cloud revocation. Therefore:
- no claim of instantaneous offline revocation;
- offline authority is bounded;
- device trust and containment are independently evaluated;
- protected operations fail closed when required local security state is unavailable;
- no extension of authority while disconnected.

### Reconnection
Revocations and scope changes are applied idempotently. Previously accepted transactions remain traceable and are not destructively rewritten.

## 7. Final Audit Requirements

Every sensitive authorization decision records, as applicable:
- actor/user;
- device;
- tenant/organization/branch/warehouse scope;
- capability;
- policy version;
- authorization snapshot/version;
- resource;
- decision;
- reason;
- timestamp;
- correlation/operation identifier;
- resulting containment or SoD outcome.

Audit records are append-only and must not be used as an alternative permission authority.

## 8. Security Gate

The following remain **verification gates**, not architecture questions:

- snapshot confidentiality/integrity;
- device binding;
- protection from ordinary local tampering;
- behavior under key unavailability;
- revocation after reconnect;
- offline validity boundary;
- OS reinstall/re-provisioning;
- local-admin and fully-compromised-endpoint boundaries.

R1-B.4 must produce evidence before these controls are declared PASS.

## 9. Test Gate

A3 test coverage must demonstrate:
- valid capability accepted;
- missing capability rejected;
- wrong scope rejected;
- resource-state denial;
- offline restricted denial when policy disallows;
- online-only denial offline;
- device revocation containment;
- scope reduction;
- self-approval rejection;
- SoD violation rejection;
- conflict-type authority;
- payment recording vs verification separation;
- audit completeness;
- restart/recovery behavior.

## 10. Promotion Decision

**A3 = READY FOR LOCK, NOT YET LOCKED.**

The remaining gate is evidence, not architecture.

Once R1-B security evidence and A3 automated/dynamic tests pass, and Phase 3.4 reconciliation confirms capability vocabulary consistency, A3 may be promoted to LOCKED by an explicit Decision Log entry.

## 11. Anti-Loop Rule

No authorization redesign is permitted unless a verified defect or unresolved R1 exit criterion demonstrates that this baseline is insufficient.

