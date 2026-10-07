# OpenAPI Conventions

**Status:** Proposed Baseline  
**Depends on:** Phase 3.1, Phase 3.2 and Phase 3.3.

## 1. Specification Boundary

OpenAPI documents the external HTTP contract only. It does not document internal aggregates, database tables, event-bus messages or SQLite schemas.

Base path: /api/v1

HTTP API versioning and domain event versioning remain independent.

## 2. Operation Naming

Every operation has a stable operationId based on business intent:
- completeSale
- recordPayment
- capturePaymentEvidence
- requestPaymentVerification
- openCashSession
- createStockAdjustment
- getInventoryStock
- pushSyncOperations

Do not derive operationId from controller/class names.

## 3. Schema Naming

Use explicit DTO names:
- CompleteSaleRequest / CompleteSaleResponse
- PaymentResponse / PaymentVerification
- PaymentEvidenceRequest
- StockAdjustmentRequest
- ApiErrorResponse
- PaginationMeta

Do not expose ORM/entity/table names.

## 4. Common Headers

Document reusable components:
- Authorization
- Idempotency-Key
- X-Correlation-ID
- X-Device-ID
- If-Match where conditional versioning is supported.

Idempotency-Key is required for replayable mutations.

## 5. Security

Use reusable security schemes. Authorization requirements are operation-level contract metadata, never arbitrary client scope fields.

Provider API keys, database credentials and other secrets are never accepted from POS clients.

## 6. JSON Schema Rules

- UUID v7 identifiers use a documented UUID format.
- UTC timestamps use RFC 3339 date-time.
- Money and quantity use strings.
- Currency codes are uppercase configured codes.
- Stable codes use uppercase snake case.
- Required and nullable fields are explicit.
- Tolerant clients should survive additive enum values.
- Examples must reflect actual domain semantics.

## 7. Error Responses

Reusable components cover at least 400, 401, 403, 404, 409, 422, 429, 500 and 503.

ApiErrorResponse:
{
  "error": {
    "code": "STABLE_MACHINE_CODE",
    "message": "Localized-safe human message",
    "details": {},
    "retryable": false
  },
  "meta": {
    "correlation_id": "uuid-v7"
  }
}

## 8. Pagination

Cursor pagination is the default for operational collections. Parameters:
- cursor — opaque;
- limit — bounded by server policy;
- deterministic filters/sort.

Responses expose next_cursor and has_more.

## 9. Idempotency

Each replayable mutation documents:
- Idempotency-Key required;
- canonical request fingerprint;
- replay semantics;
- IDEMPOTENCY_CONFLICT;
- retention expectations;
- external provider idempotency where applicable.

A replay returning the original result is not a new resource creation.

## 10. Concurrency

Operations document either expected_version or If-Match/ETag. Do not use both as independent sources of truth unless explicitly defined as equivalent.

Stale writes return 409 CONCURRENCY_CONFLICT.

## 11. Async Operations

A command accepted but not completed synchronously returns 202 and a stable status reference where applicable.

Payment verification is the primary current example. Provider timeout is neither success nor definitive failure.

## 12. File/Evidence Uploads

Payment evidence uses a bounded upload flow, not large base64 JSON:
- authenticated upload;
- content-type allowlist;
- size limit;
- malware/security scanning;
- checksum;
- retention;
- retrieval authorization;
- audit trail.

Payment DTOs contain evidence references, never storage credentials.

## 13. Offline/Sync APIs

Sync endpoints are a separate contract family and document:
- registered device identity;
- device sequence;
- operation identity;
- idempotency;
- push/pull semantics;
- durable cursor;
- conflict responses;
- resynchronization.

They are not generic CRUD endpoints.

## 14. Compatibility

Additive response fields are preferred for compatible evolution. Breaking changes require a new major API version.

Deprecated operations document deprecation date, replacement and planned removal where known.

## 15. Required Contract Examples

Before implementation authorization, examples must cover:
1. cash sale;
2. Bankak/bank transfer without provider verification;
3. transfer with screenshot evidence;
4. manual confirmation;
5. external/Hisabati verification request and pending result;
6. split cash + transfer;
7. offline sale with pending sync;
8. insufficient stock conflict;
9. stale version conflict;
10. idempotency replay.

These examples describe the contract and do not claim that an external provider API is already live.
