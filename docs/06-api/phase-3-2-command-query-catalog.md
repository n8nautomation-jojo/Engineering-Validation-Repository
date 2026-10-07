# Phase 3.2 — Domain Commands & Queries Catalog

**Status:** LOCKED — D-021  
**Depends on:** Phase 3.1 API Contract Baseline, ADR-011, ADR-012  
**Scope:** Contract inventory and command/query boundaries. This document does not authorize implementation until reviewed and promoted to an approved baseline.

## 1. Contract Rules

1. Commands express business intent; they are not generic database CRUD.
2. Queries read authorized projections/read models and must not mutate business state.
3. The server derives tenant, organization, branch, actor and device scope from authenticated context. Client-supplied scope is only a requested target and must be independently authorized.
4. Every retryable mutation accepts an Idempotency-Key. Reusing a key with a different canonical request returns IDEMPOTENCY_CONFLICT.
5. State-changing responses are returned only after the owning transaction commits.
6. Domain entities and database rows are never serialized directly.
7. API routes are versioned under /api/v1.
8. Online cloud API contracts and POS-local command contracts share business semantics, but need not share transport implementations.
9. A local POS command may commit without cloud connectivity when offline policy permits it.
10. Async follow-up work is reported as a separate status; it must not be misrepresented as synchronous completion.

## 2. Core Command Catalog

| Area | Command | Proposed route | Idempotency | Notes |
|---|---|---|---|---|
| Cash | Open cash session | POST /api/v1/cash-sessions | Required | Enforce register policy transactionally |
| Cash | Record cash movement | POST /api/v1/cash-sessions/{sessionId}/movements | Required | Direction, reason and actor; no direct balance edits |
| Cash | Close cash session | POST /api/v1/cash-sessions/{sessionId}/close | Required | Counted amount and variance explanation per policy |
| Sales | Complete sale | POST /api/v1/sales | Required | Local sale is atomic with payment/inventory coordination |
| Sales | Reverse sale | POST /api/v1/sales/{saleId}/reversals | Required | New operation; never delete posted sale |
| Sales | Create sales return | POST /api/v1/sales/{saleId}/returns | Required | Original sale and returned lines required |
| Payments | Record payment | POST /api/v1/sales/{saleId}/payments | Required | Payment record is separate from verification |
| Payments | Capture evidence | POST /api/v1/payments/{paymentId}/evidence | Required | Metadata/reference; binary upload specified separately |
| Payments | Request verification | POST /api/v1/payments/{paymentId}/verification-requests | Required | Provider-neutral; may complete asynchronously |
| Payments | Manual verification decision | POST /api/v1/payments/{paymentId}/verification-decisions | Required | Dedicated permission, reason and audit |
| Inventory | Adjust stock | POST /api/v1/inventory/adjustments | Required | Reason, batch and approval policy |
| Inventory | Create stock transfer | POST /api/v1/stock-transfers | Required | Stock changes only at defined lifecycle transitions |
| Inventory | Receive stock transfer | POST /api/v1/stock-transfers/{transferId}/receipt | Required | Receiving branch confirms quantities |
| Purchasing | Create purchase order | POST /api/v1/purchase-orders | Required | Does not increase stock |
| Purchasing | Receive goods | POST /api/v1/goods-receipts | Required | Batch-wise receipt |
| Sync | Push operations | POST /api/v1/sync/push | Per operation | Device sequence and operation identity required |
| Sync | Pull changes | GET /api/v1/sync/pull | Cursor-based | Cursor advances only after durable application |
| Sync | Acknowledge application | POST /api/v1/sync/acknowledgements | Required | Acknowledge only after durable client-side application |

These routes are a contract inventory, not a final OpenAPI specification. Endpoint-level contracts are governed by Phase 3.4 after its promotion gate.

## 3. Core Query Catalog

| Area | Query | Proposed route | Notes |
|---|---|---|---|
| Sales | List/search sales | GET /api/v1/sales | Cursor pagination and branch scope |
| Sales | Sale detail | GET /api/v1/sales/{saleId} | Historical price/tax/payment snapshots |
| Payments | Payment status | GET /api/v1/payments/{paymentId} | Separates recorded, pending, verified and failed |
| Payments | Verification attempts | GET /api/v1/payments/{paymentId}/verification-attempts | Authorized operational history |
| Cash | Active session | GET /api/v1/cash-registers/{registerId}/active-session | No direct balance mutation |
| Cash | Session summary | GET /api/v1/cash-sessions/{sessionId} | Expected cash, counted cash, variance and status |
| Inventory | Stock query | GET /api/v1/inventory/stock | Read model; batch/warehouse filters |
| Inventory | Batch availability | GET /api/v1/inventory/batches/availability | FEFO and expiry-aware; command revalidates |
| Purchasing | Purchase order detail | GET /api/v1/purchase-orders/{purchaseOrderId} | Receipt status is distinct from order status |
| Sync | Device sync status | GET /api/v1/sync/devices/{deviceId}/status | Authorized diagnostics |
| Reference | Payment methods/policies | GET /api/v1/payment-methods | Organization/branch configuration |

## 4. Sale Command Boundary

A sale command expresses the requested sale and tenders. The owning application service coordinates Sales, Cash and Inventory behavior. For local POS, Sale, SaleLines, included Payment records, InventoryTransaction, StockMovements, local audit metadata and required Outbox records commit in one SQLite transaction.

A post-commit event handler alone must not make an already accepted sale inventory-safe.

## 5. Payment Command Boundary

Recording a payment is not the same as verifying it. A payment may be cash, a bank transfer manually confirmed by authorized staff, accompanied by optional screenshot evidence, verified by an external integration, pending, rejected or flagged for review.

Evidence capture never automatically proves funds arrived. A provider timeout is pending/unknown, not verified and not necessarily a failed payment.

## 6. Error Contract Expectations

Stable error codes may include VALIDATION_ERROR, AUTHENTICATION_REQUIRED, FORBIDDEN, NOT_FOUND, CONFLICT, IDEMPOTENCY_CONFLICT, DOMAIN_RULE_VIOLATION, INSUFFICIENT_STOCK, EXPIRED_BATCH, CASH_SESSION_REQUIRED, PAYMENT_VERIFICATION_PENDING, PAYMENT_VERIFICATION_FAILED, SYNC_CONFLICT and TEMPORARY_UNAVAILABLE.

Error details must not disclose secrets, internal SQL, provider credentials or cross-tenant records.

## 7. Explicitly Not Yet Final

- Exact JSON schemas and required/optional fields.
- Whether sale and initial tenders are one payload or separate commands for particular workflows.
- Evidence upload/storage lifecycle.
- Exact status enums and transition guards.
- Authorization matrix for manual confirmation, discounts, reversals and stock adjustments.
- OpenAPI generation/tooling.
- Offline stock quota payloads.

## 8. Review Gate

Review against MVP scope, ADR-011 sale/inventory atomic coordination, ADR-012 flexible payment verification, audit immutability, branch/tenant authorization, and sync operation grouping/idempotency before implementation.
