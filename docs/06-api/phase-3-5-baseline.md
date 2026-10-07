# Phase 3.5 — Machine-Readable OpenAPI + Contract Fixtures

**Status:** ACTIVE IMPLEMENTATION ARTIFACT — DERIVED FROM LOCKED/PROMOTED PHASE 3.4  
**Source of truth:** `docs/06-api/phase-3-4-endpoint-contracts.md`  
**Governance:** D-032  
**Rule:** This phase translates the promoted endpoint contract mechanically. It MUST NOT introduce new business rules, permissions, offline classes, domain aggregates, provider-specific core behavior, or legal assumptions.

## 1. Deliverables

1. `docs/06-api/openapi.yaml` — machine-readable OpenAPI 3.1 contract.
2. `docs/06-api/fixtures/phase-3-5-contract-fixtures.json` — non-normative contract examples for the required scenarios.
3. This document — generation/reconciliation rules and gate status.

## 2. Translation Rules

- Phase 3.4 route, operationId, permission and offline class are authoritative.
- Phase 3.3 error/status/idempotency/concurrency conventions remain binding.
- DTO names are represented as OpenAPI schemas without changing domain ownership.
- Where 3.4 does not define a field shape, the schema remains intentionally open rather than inventing business semantics.
- Examples are illustrative and MUST NOT be interpreted as policy values, legal values, provider credentials, real identifiers, or authoritative pricing/tax data.
- Payment evidence is represented as metadata/reference only; binary storage technology is deliberately unspecified.
- Provider integrations remain adapter boundaries.
- Sync transport remains distinct from local offline capability.
- No endpoint may gain a permission or offline class merely because it is convenient to model.

## 3. Contract Fixture Policy

Fixtures cover:
- cash sale;
- Bankak transfer recorded without API verification;
- transfer with screenshot evidence;
- manual verification decision;
- Hisabati/external verification pending;
- split cash + transfer;
- offline completed sale with pending sync;
- insufficient stock;
- stale version;
- idempotency replay.

Fixtures are contract examples, not test results. They become executable contract tests only when a test runner and implementation exist.

## 4. Validation Gate

Phase 3.5 artifact validation must verify:
- OpenAPI parses as valid OpenAPI 3.1;
- every Phase 3.4 endpoint is represented exactly once;
- operationIds are unique;
- declared permissions match 3.4;
- offline metadata matches 3.4;
- required headers are represented where applicable;
- standard response/error shapes remain aligned with Phase 3.3;
- required fixture scenarios exist;
- no fixture contains secrets or real payment credentials;
- no undocumented business rule is introduced.

## 5. Current Gate

**Phase 3.5:** ACTIVE — ARTIFACTS CREATED  
**Phase 3.4:** LOCKED / PROMOTED — D-032  
**R1 Closure:** BLOCKED independently by security/executable/legal/evidence gates.

## 6. Promotion Rule

Phase 3.5 is not considered promoted merely because the YAML exists. It requires parser/contract validation and reconciliation against Phase 3.4. Implementation coding remains governed by the master Implementation Readiness Gate.
