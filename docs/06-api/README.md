# 06-api — API & Contract Specifications

**Status:** Contract design in progress. Locked baselines are binding references. R1 remediation is an active gate before Phase 3.5; Phase 3.4 remains proposed until reconciliation and final review.

## Documents

- [Phase 3.1 — API & Contract Architecture Baseline](phase-3-1-api-contract-baseline.md)
- [Phase 3.2 — Domain Commands & Queries Catalog](phase-3-2-command-query-catalog.md)
- [Phase 3.2 — Domain Commands & Queries Baseline](phase-3-2-baseline.md)
- [Payment API Contracts](payment-contracts.md)
- [Sales and Inventory Contracts](sales-inventory-contracts.md)
- [Phase 3.3 — DTOs, Validation and Error Model](phase-3-3-dto-validation-error-model.md)
- [HTTP Status & Error Matrix](http-status-error-matrix.md)
- [OpenAPI Conventions](openapi-conventions.md)
- [Phase 3.4 — Endpoint Contracts and Authorization Matrix](phase-3-4-endpoint-contracts.md)
- [Phase 3.4 — OpenAPI Contract Skeleton](openapi-contract-skeleton.md)
- [Sales and Cash Session Contracts](sales-cash-contracts.md)
- [Inventory API Contracts](inventory-contracts.md)

## Contract-first rule

Implementations must follow approved contracts. Documents marked **Proposed** are design baselines, not implementation authorization. Locked baselines are binding references; proposed endpoint/specification work must remain consistent with them. API contracts must remain consistent with Domain Model, ADRs, offline/sync rules, security scope, payment verification architecture and audit requirements.

## R1 Gate\n\nPhase 3.5 is blocked by `docs/13-remediation/r1-exit-criteria.md`. Phase 3.4 must be reconciled with R1 before promotion.\n\n## Phase 3 progression

- Phase 3.1 — API & Contract Architecture
- Phase 3.2 — Domain Commands & Queries
- Phase 3.3 — Request/Response DTOs, validation, error/status matrix and OpenAPI conventions
- Phase 3.4 — Endpoint-level schemas, authorization matrix and OpenAPI contract skeleton
- Phase 3.5 — Final machine-readable OpenAPI + contract fixtures and implementation gate
