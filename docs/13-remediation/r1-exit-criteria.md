# R1 — Exit Criteria

**Status:** ACTIVE REMEDIATION GATE  
**Current Reconciliation:** NOT READY FOR CLOSURE  
**Authoritative Reconciliation:** `docs/13-remediation/r1-final-reconciliation.md`

R1 may be closed only when every P0 control is either **PASS** or an explicitly governed **CONDITIONAL PASS / LEGAL GATE**, with no unaccepted P0 FAIL or NOT TESTED item.

## 1. P0 Architecture

- [ ] Offline Stock Safety Policy is specified, reconciled with authorization/security/conflict rules, and its API/Sync impact is known.
- [ ] Conflict Resolution workflow is explicit, auditable, authorized and reconciled with inventory/payment/return behavior.
- [ ] Offline eligibility vocabulary is adopted consistently across API, POS and sync commands.
- [ ] Refund semantics are distinct from merchandise return and reconciled with payment/accounting behavior.
- [ ] Authorization capability/policy/scope/offline eligibility/SoD model is finalized and verified.
- [ ] Phase 2 ↔ Phase 3 contract references are consistent.
- [ ] No locked baseline has been silently reopened.

## 2. P0 Security

- [ ] Local POS data protection design is approved by executable evidence.
- [ ] Required A0–A4 attacker boundaries are tested or explicitly accepted with documented residual risk.
- [ ] Evidence upload/storage/access/integrity lifecycle is defined and testable.
- [ ] Device credentials, key material and secret handling are verified.
- [ ] Revocation and re-provisioning behavior is verified.
- [ ] Security-sensitive operations have complete audit requirements and verification evidence.
- [ ] No P0 security technology assumption remains merely NOT TESTED.

## 3. P0 Compliance

- [ ] Sudan regulatory assessment is completed for requirements relevant to the applicable MVP scope.
- [ ] Regulatory requirements are mapped to configurable product/domain behavior.
- [ ] Legal uncertainty is explicitly tracked rather than encoded as a guessed rule.
- [ ] External legal/activation gates are clearly separated from engineering decisions.

## 4. P0 Integration

- [ ] Provider-agnostic adapter boundaries are reconciled with API/payment/domain models.
- [ ] External retries are idempotent.
- [ ] Ambiguous provider outcomes have reconciliation behavior.
- [ ] Evidence submission cannot manufacture provider verification.
- [ ] Provider credentials remain outside POS clients.
- [ ] Hisabati, Bankak/mobile-money and Tax/E-Invoice activation requirements are explicitly gated by real external contracts.

## 5. P0 Governance

- [x] Decision Log status matches source-document status.
- [x] No proposed document is treated as implementation authorization.
- [x] Any locked-baseline change requires an explicit ADR/revision.
- [ ] Phase 3.4 has been reviewed against all R1 outputs and its promotion decision recorded.
- [ ] R1 track naming/status and exit criteria remain synchronized.

## 6. Evidence & Measurement

- [x] Every R1 P0 control has a measurable acceptance condition.
- [x] Evidence classes and provenance are defined.
- [ ] Required P0 security/offline/authorization/integration tests have executable evidence.
- [ ] Readiness scorecard contains no unaccepted P0 FAIL or NOT TESTED item.
- [ ] Conditional passes have owner, residual risk, containment and acceptance authority.

## 7. Phase 3.5 Gate

Phase 3.5 can begin only when:

1. all P0 items above are complete or explicitly dispositioned;
2. R1 is formally promoted to CLOSED;
3. Phase 3.4 is promoted or explicitly re-baselined;
4. OpenAPI paths, DTOs, authorization, offline behavior, validation and error behavior have no unresolved contradiction;
5. contract fixtures can be derived without inventing business rules;
6. implementation authorization is explicitly recorded.

## 8. Anti-Loop Rule

R1 closure work must not become architecture redesign.

Before any proposed architecture change, ask:

> What unresolved R1 exit criterion or verified defect requires this change?

If none, the change is rejected as scope drift.

## 9. Current Disposition

R1 is currently **NOT READY FOR CLOSURE**.

The authoritative reason and remaining work are recorded in:
`docs/13-remediation/r1-final-reconciliation.md`.

The next gate is **R1 Closure Work Package → Phase 3.4 Final Review**.
