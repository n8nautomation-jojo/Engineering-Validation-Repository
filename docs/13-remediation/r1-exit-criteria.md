# R1 — Exit Criteria

**Status:** ALL P0 CRITERIA VERIFIED — READY FOR FORMAL R1 CLOSURE  
**Authoritative Reconciliation:** `docs/13-remediation/r1-final-reconciliation.md`  
**Execution Verification:** 228/228 tests passing dynamically on Windows/SQLite/PostgreSQL foundation.

R1 may be closed only when every P0 control is either **PASS** or an explicitly governed **CONDITIONAL PASS / LEGAL GATE**, with no unaccepted P0 FAIL or NOT TESTED item.

## 1. P0 Architecture

- [x] Offline Stock Safety Policy is specified, reconciled with authorization/security/conflict rules, and its API/Sync impact is known (A1 PASS, 35/35 tests).
- [x] Conflict Resolution workflow is explicit, auditable, authorized and reconciled with inventory/payment/return behavior (A2 PASS, durable UoW SQLite/PG).
- [x] Offline eligibility vocabulary is adopted consistently across API, POS and sync commands (A1/A3).
- [x] Refund semantics are distinct from merchandise return and reconciled with payment/accounting behavior (A2 / Sales).
- [x] Authorization capability/policy/scope/offline eligibility/SoD model is finalized and verified (A3 PASS, 18/18 tests).
- [x] Phase 2 ↔ Phase 3 contract references are consistent.
- [x] No locked baseline has been silently reopened.

## 2. P0 Security

- [x] Local POS data protection design is approved by executable evidence (B PASS, SEC-P01..P16).
- [x] Required A0–A4 attacker boundaries are tested or explicitly accepted with documented residual risk.
- [x] Evidence upload/storage/access/integrity lifecycle is defined and testable.
- [x] Device credentials, key material and secret handling are verified.
- [x] Revocation and re-provisioning behavior is verified.
- [x] Security-sensitive operations have complete audit requirements and verification evidence.
- [x] No P0 security technology assumption remains merely NOT TESTED.

## 3. P0 Compliance

- [x] Sudan regulatory assessment is completed for requirements relevant to the applicable MVP scope (NMPB 2009 & Narcotic 2022).
- [x] Regulatory requirements are mapped to configurable product/domain behavior (COMP-01..COMP-04).
- [x] Legal uncertainty is explicitly tracked rather than encoded as a guessed rule.
- [x] External legal/activation gates are clearly separated from engineering decisions.

## 4. P0 Integration

- [x] Provider-agnostic adapter boundaries are reconciled with API/payment/domain models (INT-01..INT-08).
- [x] External retries are idempotent.
- [x] Ambiguous provider outcomes have reconciliation behavior.
- [x] Evidence submission cannot manufacture provider verification.
- [x] Provider credentials remain outside POS clients.
- [x] Hisabati, Bankak/mobile-money and Tax/E-Invoice activation requirements are explicitly gated by real external contracts.

## 5. P0 Governance

- [x] Decision Log status matches source-document status.
- [x] No proposed document is treated as implementation authorization.
- [x] Any locked-baseline change requires an explicit ADR/revision.
- [x] Phase 3.4 has been reviewed against all R1 outputs and its promotion decision recorded (D-032).
- [x] R1 track naming/status and exit criteria remain synchronized.

## 6. Evidence & Measurement

- [x] Every R1 P0 control has a measurable acceptance condition.
- [x] Evidence classes and provenance are defined.
- [x] Required P0 security/offline/authorization/integration tests have executable evidence (228/228 tests PASS).
- [x] Readiness scorecard contains no unaccepted P0 FAIL or NOT TESTED item.
- [x] Conditional passes have owner, residual risk, containment and acceptance authority.

## 7. Phase 3.5 Gate

Phase 3.5 can begin only when:

1. all P0 items above are complete or explicitly dispositioned (COMPLETE);
2. R1 is formally promoted to CLOSED;
3. Phase 3.4 is promoted or explicitly re-baselined (PROMOTED D-032);
4. OpenAPI paths, DTOs, authorization, offline behavior, validation and error behavior have no unresolved contradiction;
5. contract fixtures can be derived without inventing business rules;
6. implementation authorization is explicitly recorded.

## 8. Anti-Loop Rule

R1 closure work must not become architecture redesign.

Before any proposed architecture change, ask:

> What unresolved R1 exit criterion or verified defect requires this change?

If none, the change is rejected as scope drift.

## 9. Current Disposition

**R1 = READY FOR FORMAL CLOSURE.**

All P0 remediation tracks have satisfied their executable dynamic test requirements. No unresolved P0 blocking defect remains.
The next gate is **Formal R1 Promotion to CLOSED → Phase 3.5 Contract Fixtures & Client SDKs**.
