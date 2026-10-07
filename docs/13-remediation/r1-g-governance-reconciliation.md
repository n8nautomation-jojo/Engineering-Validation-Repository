# R1-G — Documentation Governance Reconciliation

**Status:** ACTIVE GOVERNANCE ARTIFACT — RECONCILED / PROPOSED FOR R1 CLOSURE  
**Track:** R1-G Documentation Governance

## 1. Purpose

This document reconciles the repository's source-of-truth statuses without reopening locked architecture or silently promoting draft material.

The governing rule is:

**Decision Log + source baseline + dependency state must agree before a decision is treated as binding.**

A supporting document may remain Proposed when a separate baseline explicitly governs the same subject. A Proposed supporting document never authorizes implementation by itself.

## 2. Reconciliation Results

| Area | Source | Current Status | Decision | Disposition |
|---|---|---|---|---|
| Documentation governance | documentation-guide.md | LOCKED | Binding governance rules | Consistent |
| Phase 3.1 | phase-3-1-api-contract-baseline.md | LOCKED | D-020 | Consistent |
| Phase 3.2 binding baseline | phase-3-2-baseline.md | LOCKED | D-021 | Reconciled |
| Phase 3.2 supporting catalog | phase-3-2-command-query-catalog.md | PROPOSED FOR REVIEW | Supporting/descriptive | Not implementation authority |
| Phase 3.3 | phase-3-3-dto-validation-error-model.md | LOCKED | D-022 | Consistent |
| Phase 3.4 | phase-3-4-endpoint-contracts.md | PROPOSED | D-023 | Remains blocked from implementation |
| Phase 3.5 | final machine-readable OpenAPI | Not started | R1 gate | Blocked |
| R1 | r1-baseline.md | ACTIVE | D-024 | In progress |
| R1-C | compliance readiness | PROPOSED / READY FOR RECONCILIATION | D-025 | Awaiting final R1 reconciliation |
| R1-D | integration readiness | PROPOSED | R1 work package | Not provider activation |
| R1-H | measurement/verification | PROPOSED | R1 work package | Evidence framework only |

## 3. D-021 Reconciliation

A real governance discrepancy existed:

- Decision Log previously recorded D-021 as PROPOSED.
- docs/06-api/phase-3-2-baseline.md declared Phase 3.2 LOCKED.

The discrepancy is resolved by making D-021 explicitly **LOCKED**.

This does not promote the supporting command-query catalog. The authoritative Phase 3.2 baseline remains the binding reference.

## 4. Supporting Document Rule

The repository contains detailed supporting documents that may carry Proposed status while a higher-level baseline is locked.

Examples:

- phase-3-2-command-query-catalog.md supports Phase 3.2 but does not supersede phase-3-2-baseline.md.
- phase-3-4-endpoint-contracts.md remains Proposed because R1 reconciliation is required.
- openapi-contract-skeleton.md remains a contract-design artifact, not final machine-readable API authorization.

This distinction prevents both false contradictions and accidental implementation authorization.

## 5. R1 Status Interpretation

The following are binding or active:

- Locked Domain Model v1.1.
- Locked Architecture Phase 2.1–2.4.
- Locked API Phase 3.1.
- Locked API Phase 3.2.
- Locked API Phase 3.3.
- R1 governance and exit criteria.
- D-024 R1 remediation gate.

The following remain deliberately non-binding until their gates are passed:

- R1 policy proposals not yet promoted.
- Phase 3.4 endpoint contracts.
- Phase 3.5 OpenAPI.
- Provider-specific integrations.
- Implementation specifications that have not passed the implementation-readiness gate.

## 6. No Silent Promotion Rule

No document may become implementation authority merely because:

- it contains detailed endpoints;
- it contains DTO examples;
- it is newer;
- it has a successful commit;
- another document references it;
- an implementation team begins using it.

Promotion requires an explicit status change and corresponding Decision Log entry where the governance guide requires one.

## 7. Conflict Handling

If two documents conflict:

1. Identify whether one is a binding baseline and the other is supporting/proposed.
2. If the baseline is clear, the baseline wins and the supporting document is corrected later.
3. If two binding baselines conflict, stop implementation and create an explicit revision/ADR.
4. Never resolve a binding contradiction by silently editing one document.
5. Record the decision, impact, migration/compatibility implications, and affected documents.

## 8. R1-G Acceptance Criteria

- [x] Decision Log and Phase 3.2 baseline are reconciled.
- [x] Phase 3.3 status is consistent.
- [x] Phase 3.4 remains Proposed.
- [x] Phase 3.5 remains blocked.
- [x] Supporting Proposed documents are explicitly distinguished from binding baselines.
- [x] No locked architecture was reopened.
- [x] Implementation authorization remains gated.

## 9. Remaining Governance Work

R1-G is not the same as final R1 closure.

Before R1 closure, the governance state must be checked again against:

- R1-A1/A2/A3 final dispositions;
- R1-B security prototype evidence;
- R1-C compliance reconciliation;
- R1-D integration readiness;
- R1-H evidence scorecard;
- Phase 3.4 reconciliation;
- implementation-readiness gate.

## 10. Governance Decision

**R1-G disposition: RECONCILED for the currently identified documentation-status discrepancy.**

The Phase 3.2 discrepancy is closed as a governance defect.

This document does not promote Phase 3.4 or Phase 3.5 and does not authorize implementation.

**Next gate:** R1 Final Reconciliation.
