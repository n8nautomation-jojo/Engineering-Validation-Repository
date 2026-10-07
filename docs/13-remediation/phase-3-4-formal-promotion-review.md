# Phase 3.4 — Formal Promotion Review

**Status:** PROMOTED — D-032  
**Review Type:** Contract Governance Gate  
**Reviewer:** CTO / Architecture  
**Date:** 2026-10-07

## 1. Decision

Phase 3.4 is **PROMOTED** after correction and re-review.

The endpoint architecture is fundamentally sound and reconciles with the locked Phase 3.1–3.3 baselines, ADR-011, ADR-012, A2 and A3.

The previously identified contract-completeness and authorization-vocabulary defects were corrected and re-verified. No architecture redesign was required.

## 2. Verified Strengths

Accepted:
- REST /api/v1 contract shape.
- DTO/domain separation.
- Idempotency and optimistic concurrency.
- Standard error model.
- Offline/local command versus HTTP transport distinction.
- Sale + Payment + InventoryTransaction + StockMovement + Outbox atomic boundary.
- Immutable financial/inventory history.
- Provider-agnostic payment architecture.
- Evidence is not verification.
- External payment verification is ONLINE_ONLY.
- Cloud-authoritative conflict resolution.
- A3 effective-scope model.
- A2 conflict lifecycle and compensation boundary.
- ADR-011 inventory safety boundary.
- ADR-012 payment verification boundary.

## 3. Findings Closed During Re-review

### P3.4-01 — Closed

The GET cash-session contracts now use the explicit stable capability `cash.sessions.read`. Its role mapping is reconciled with the promoted Phase 3.4 authorization vocabulary.

### P3.4-02 — Closed

The Phase 3.4 endpoint catalog now covers the required query families, including expiring stock, pending Outbox status, conflict status and payment methods/policies.

### P3.4-03 — Closed

Cash reconciliation is now explicitly `ONLINE_ONLY`, matching the final A3 authorization baseline and its financial/SoD sensitivity.

Reason:
- reconciliation is a higher-sensitivity control;
- it can resolve/confirm variance;
- it has financial and SoD implications;
- there is no demonstrated requirement for offline reconciliation;
- keeping it online reduces ambiguity without affecting ordinary offline POS operation.

Any future offline reconciliation requires a separate evidence-backed policy change.

## 4. Non-Blocking Observations

### N-01 — Payment/sales illustrative contract drift

Some older proposed payment/sales documents use illustrative terminology such as "tenders" while Phase 3.4 uses "payments".

Before OpenAPI generation, one canonical request field name must be selected and all examples reconciled.

This is not an architecture defect.

### N-02 — Supporting API documents

Payment-contracts, sales-cash-contracts and HTTP error matrix remain Proposed.

They must not be interpreted as competing sources of truth.

Phase 3.3 remains the locked transport/error baseline; Phase 3.4 is the endpoint-level source once promoted.

### N-03 — Evidence upload contract

Phase 3.4 references evidence capture, while binary upload/storage details remain bounded by security/evidence lifecycle work.

No provider or storage implementation should be invented during Phase 3.5.

## 5. Promotion Criteria — Result

All promotion criteria passed:
1. P3.4-01 closed.
2. P3.4-02 closed.
3. P3.4-03 closed.
4. Endpoint DTO boundaries are reconciled with Phase 3.3 conventions.
5. Error/status/idempotency semantics passed consistency review.
6. A2/A3 capability and authority mapping has no unresolved contradiction.
7. Payment evidence/verification semantics remain aligned with ADR-012.
8. OpenAPI generation can proceed without inventing business rules.

## 6. Explicit Non-Changes

This review does not reopen:
- Domain Model v1.1
- Architecture Phase 1
- Phase 2.1
- Phase 2.2
- Phase 2.3
- Phase 2.4
- Phase 3.1
- Phase 3.2
- Phase 3.3
- ADR-011
- ADR-012

No new stock ledger, branch-local server, active multi-tenancy, provider-specific payment core, or unrestricted offline selling is introduced.

## 7. Gate State

**Phase 3.4:** LOCKED / PROMOTED — D-032  
**Phase 3.5:** READY TO START  
**R1 Closure:** BLOCKED

All three defects were corrected and re-verified. No architecture redesign was required.

## 8. CTO Anti-Loop Decision

The correction → reconciliation → re-review → promotion loop is complete.

The correct next action is:

**Phase 3.5 — Machine-Readable OpenAPI + Contract Fixtures**

This phase must translate the promoted 3.4 contract mechanically and must not introduce new business rules, permissions, offline classes, or provider-specific behavior.
