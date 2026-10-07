# Phase 3.4 — OpenAPI Contract Skeleton

**Status:** Proposed Baseline  
**Purpose:** Machine-readable contract skeleton derived from Phase 3.4 endpoint definitions. This is intentionally not yet the generated final specification.

## API Metadata

- OpenAPI: 3.1.x
- Base path: /api/v1
- Transport: HTTPS
- Media type: application/json
- Authentication: bearer/session scheme defined by Security Architecture
- IDs: UUID v7
- Time: RFC 3339 UTC
- Money/quantity: strings
- Pagination: cursor by default

## Tags

- Sales
- Payments
- Cash
- Inventory
- Purchasing
- Sync

## Required Components

### Security Schemes
- Bearer/session authentication.
- Device context for registered POS where required.

### Parameters
- Idempotency-Key
- X-Correlation-ID
- X-Device-ID
- If-Match
- saleId
- paymentId
- sessionId
- registerId
- adjustmentId
- transferId
- purchaseOrderId
- deviceId
- conflictId

### Shared Schemas

- Money
  - value: decimal string
  - currency: uppercase configured code
- Quantity
  - value: decimal string or documented scalar representation
  - unit_code
- ApiError
  - code
  - message
  - details
  - retryable
- ApiErrorResponse
  - error
  - meta.correlation_id
- ResponseMeta
  - correlation_id
  - server_time
  - idempotent_replay
- PageMeta
  - correlation_id
  - next_cursor
  - has_more
- PaymentVerification
- PaymentEvidence
- PaymentResponse
- SaleLineRequest
- PaymentInput
- CompleteSaleRequest
- CompleteSaleResponse
- CashSessionResponse
- CashMovementRequest
- StockAdjustmentRequest
- StockTransferResponse
- GoodsReceiptRequest
- SyncOperation
- SyncPushResponse
- SyncPullResponse

## Paths to Generate

### Sales
- POST /sales
- GET /sales
- GET /sales/{saleId}
- POST /sales/{saleId}/reversals
- POST /sales/{saleId}/returns

### Payments
- POST /sales/{saleId}/payments
- GET /payments/{paymentId}
- POST /payments/{paymentId}/evidence
- POST /payments/{paymentId}/verification-decisions
- POST /payments/{paymentId}/verification-requests
- GET /payments/{paymentId}/verification-attempts

### Cash
- POST /cash-sessions
- GET /cash-sessions/{sessionId}
- POST /cash-sessions/{sessionId}/movements
- POST /cash-sessions/{sessionId}/close
- POST /cash-sessions/{sessionId}/reconciliation
- GET /cash-registers/{registerId}/active-session

### Inventory
- GET /inventory/stock
- GET /inventory/batches/availability
- GET /inventory/stock-movements
- POST /inventory/adjustments
- POST /inventory/adjustments/{adjustmentId}/approval
- POST /stock-transfers
- POST /stock-transfers/{transferId}/dispatch
- POST /stock-transfers/{transferId}/receipt
- POST /goods-receipts

### Purchasing
- POST /purchase-orders
- GET /purchase-orders/{purchaseOrderId}

### Sync
- POST /sync/push
- GET /sync/pull
- POST /sync/acknowledgements
- GET /sync/devices/{deviceId}/status
- POST /sync/conflicts/{conflictId}/resolution

## Standard Responses

Successful:
- 200
- 201
- 202
- 204

Errors:
- 400 REQUEST_MALFORMED
- 401 AUTHENTICATION_REQUIRED / TOKEN_EXPIRED
- 403 FORBIDDEN / OFFLINE_OPERATION_FORBIDDEN / DEVICE_NOT_REGISTERED / DEVICE_REVOKED
- 404 NOT_FOUND
- 409 CONFLICT / CONCURRENCY_CONFLICT / IDEMPOTENCY_CONFLICT / INSUFFICIENT_STOCK / SYNC_CONFLICT
- 422 VALIDATION_ERROR / DOMAIN_RULE_VIOLATION / EXPIRED_BATCH / PAYMENT_POLICY_VIOLATION
- 429 RATE_LIMITED
- 500 INTERNAL_ERROR
- 503 TEMPORARY_UNAVAILABLE / PAYMENT_PROVIDER_UNAVAILABLE

## Contract Examples Required

The final generated OpenAPI must contain examples for:
- cash sale;
- Bankak transfer recorded manually without API verification;
- transfer with screenshot evidence;
- manual verification decision;
- Hisabati/external verification pending;
- split cash + transfer;
- offline completed sale with pending sync;
- insufficient stock;
- stale version;
- idempotency replay.

## Generation Rule

The machine-readable specification must be generated from the approved endpoint/DTO source of truth rather than independently hand-maintained. Any divergence requires a documentation decision and reconciliation before implementation.
