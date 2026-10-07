# Phase 3.1 — API & Contract Architecture Baseline

**Status:** LOCKED
**Lock Rule:** This baseline is the binding contract reference for subsequent API phases. Material changes require an explicit revision/decision.
**Scope:** External API contracts, commands/queries, DTO rules, errors, idempotency and versioning.

## Contract-First Principle
API contracts are stable boundaries between clients and the Modular Monolith. Domain entities are not exposed directly as API DTOs.

Contracts support web clients, Tauri POS, future mobile clients and integrations.

## API Style
MVP uses REST over HTTPS.
- /api/v1/
- JSON request/response bodies
- UTC timestamps
- UUID v7 identifiers
- explicit pagination and sorting
- correlation_id on requests
- idempotency keys for replayable mutations

## Command vs Query
Commands change state. Queries read projections/read models and do not mutate domain state.

Examples:
- POST /sales
- POST /sales/{id}/returns
- POST /cash-sessions
- POST /inventory/adjustments
- POST /stock-transfers
- GET /sales
- GET /inventory/stock
- GET /reports/sales

## Mutation Contract
Mutations accept the command payload plus trusted authenticated actor context. Device/client metadata is included where required. expected_version is used for optimistic concurrency where applicable.

Responses contain the resource identifier, resulting status, domain-relevant result and correlation_id.

## Error Model
Stable error envelope:
- code
- message
- details
- correlation_id
- retryable

Machine-readable codes remain stable; human messages are localizable.

Suggested categories:
VALIDATION_ERROR, AUTHENTICATION_REQUIRED, FORBIDDEN, NOT_FOUND, CONFLICT, IDEMPOTENCY_CONFLICT, DOMAIN_RULE_VIOLATION, SYNC_CONFLICT, PAYMENT_VERIFICATION_PENDING, PAYMENT_VERIFICATION_FAILED, RATE_LIMITED, TEMPORARY_UNAVAILABLE, INTERNAL_ERROR.

## Pagination
High-volume operational lists use cursor pagination:
items, next_cursor, has_more.

Offset pagination may be used for small administrative/reference datasets.

## Idempotency
Mutations that may be retried over unreliable networks require an idempotency key.

A repeated key must not create a second business effect.

API idempotency is distinct from domain event idempotency: API keys protect command replay; Inbox protects event replay.

## Optimistic Concurrency
Versioned aggregates use expected_version where concurrent updates are possible. A stale write returns CONFLICT.

## Payment Contract
Payment is represented independently from its provider.

Minimum conceptual fields:
- payment_id
- sale_id
- method
- amount
- currency
- status
- verification_mode
- provider_id
- provider_reference
- evidence_reference
- verified_at
- captured_at

Provider credentials never appear in payment payloads.

## Integration Boundary
External payment/revenue verification systems use integration adapters. The core exposes provider-neutral verification operations; provider-specific fields stay inside integration metadata/modules.

## Sync Contract
Sync APIs are separate from ordinary CRUD APIs.

Push accepts durable client operations/events with device identity, sequence and idempotency metadata.

Pull uses a durable device-scoped cursor.

A cursor advances only after durable application.

## Versioning
Breaking API changes require a new API major version. Compatible additive changes may remain in the same version.

Domain event schema versions are explicit and independent from HTTP API versions.

## Security
Authentication and authorization execute before command handling.

Tenant, organization, branch and device scope are derived from trusted server-side identity/authorization context, not arbitrary client fields.

## Contract Rules
- No direct entity serialization.
- No database schema leakage.
- No provider-specific assumptions in core contracts.
- No silent coercion of invalid business states.
- No HTTP success response before the relevant synchronous transaction commits.
