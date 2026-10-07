# Phase 3.4 — Endpoint Contracts and Authorization Matrix

**Status:** PROMOTED — D-032  
**Depends on:** Phase 3.1, Phase 3.2, Phase 3.3, Domain Model v1.1, ADR-011, ADR-012

## 1. Purpose

Phase 3.4 converts the API catalog into endpoint-level contracts suitable for implementation planning and OpenAPI generation.

It defines:
- route and operationId;
- command/query intent;
- required permissions;
- request/response DTOs;
- success status;
- standard failure classes;
- idempotency;
- concurrency;
- offline eligibility;
- transaction boundary;
- asynchronous behavior.

It does not authorize implementation until this baseline is approved.

## 2. Authorization Vocabulary

Permissions are stable capabilities, not UI roles:

- sales.create
- sales.reverse
- sales.return
- sales.read
- payments.record
- payments.evidence.add
- payments.verify.manual
- payments.verify.external
- payments.read
- cash.sessions.open
- cash.sessions.move
- cash.sessions.close
- cash.sessions.reconcile
- inventory.read
- inventory.adjust.create
- inventory.adjust.approve
- inventory.transfer.create
- inventory.transfer.dispatch
- inventory.transfer.receive
- purchasing.po.create
- purchasing.po.read
- purchasing.receipt.create
- sync.push
- sync.pull
- sync.conflict.resolve
- audit.read

Role-to-permission mapping remains policy/configuration data, but the default MVP matrix is defined below.

## 3. Default MVP Authorization Matrix

| Capability | Owner | Tenant Admin | Branch Manager | Pharmacist | Cashier | Inventory Officer | Purchasing Officer | Accountant | Auditor |
|---|---|---|---|---|---|---|---|---|---|
| sales.create | ✓ | ✓ | ✓ | ✓ | ✓ | — | — | — | — |
| sales.reverse | ✓ | ✓ | ✓ | ✓* | — | — | — | — | — |
| sales.return | ✓ | ✓ | ✓ | ✓ | ✓* | — | — | — | — |
| payments.record | ✓ | ✓ | ✓ | ✓ | ✓ | — | — | — | — |
| payments.evidence.add | ✓ | ✓ | ✓ | ✓ | ✓ | — | — | — | — |
| payments.verify.manual | ✓ | ✓ | ✓ | ✓* | — | — | — | — | — |
| payments.verify.external | ✓ | ✓ | ✓ | ✓* | — | — | — | — | — |
| cash.sessions.open | ✓ | ✓ | ✓ | ✓ | ✓ | — | — | — | — |
| cash.sessions.move | ✓ | ✓ | ✓ | ✓ | ✓ | — | — | — | — |
| cash.sessions.close | ✓ | ✓ | ✓ | ✓ | ✓ | — | — | — | — |
| cash.sessions.reconcile | ✓ | ✓ | ✓ | — | — | — | — | ✓ | ✓ |
| inventory.read | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| inventory.adjust.create | ✓ | ✓ | ✓ | — | — | ✓ | — | — | — |
| inventory.adjust.approve | ✓ | ✓ | ✓ | — | — | ✓* | — | — | — |
| inventory.transfer.create | ✓ | ✓ | ✓ | — | — | ✓ | — | — | — |
| inventory.transfer.dispatch | ✓ | ✓ | ✓ | — | — | ✓ | — | — | — |
| inventory.transfer.receive | ✓ | ✓ | ✓ | — | — | ✓ | — | — | — |
| purchasing.po.create | ✓ | ✓ | ✓ | — | — | — | ✓ | — | — |
| purchasing.receipt.create | ✓ | ✓ | ✓ | ✓* | — | ✓ | ✓* | — | — |
| sync.push | system | system | system | system | system | system | system | system | system |
| sync.pull | system | system | system | system | system | system | system | system | system |
| sync.conflict.resolve | ✓ | ✓ | ✓ | — | — | ✓* | — | ✓* | ✓* |
| audit.read | ✓ | ✓ | ✓ | — | — | — | — | ✓ | ✓ |

\* Subject to configured branch policy and separation-of-duties rules.

Platform Owner permissions are platform-scoped. Tenant Admin is tenant/organization-scoped. Branch-scoped roles cannot escape their assigned branch/warehouse scope.

## 4. Sales

### POST /api/v1/sales
**operationId:** completeSale  
**Permission:** sales.create  
**Idempotency:** Required  
**Offline:** Yes in MVP-1 when policy permits  
**Success:** 201 for newly created durable sale; local POS may use 201 with sync_status=PENDING  
**Concurrency:** expected_version only when completing an existing draft; otherwise idempotency/client_operation_id protects command replay.

Request:
- cash_register_id
- cash_session_id
- customer_id optional
- prescription_id optional
- lines[]
- payments[]
- note optional
- client_operation_id optional/provenance

Response:
- sale_id
- invoice_number
- status
- totals
- payment_summary
- inventory_effect
- sync_status
- correlation_id

Key failures:
- 403 FORBIDDEN / DISCOUNT_NOT_AUTHORIZED
- 422 VALIDATION_ERROR / EXPIRED_BATCH / CASH_SESSION_REQUIRED / PAYMENT_POLICY_VIOLATION
- 409 INSUFFICIENT_STOCK / IDEMPOTENCY_CONFLICT / CONFLICT

Transaction boundary:
- local offline: Sale + Payment + InventoryTransaction + StockMovement + Outbox atomically;
- cloud online: owning transaction validates authoritative inventory before commit.

### GET /api/v1/sales/{saleId}
**operationId:** getSale  
**Permission:** sales.read  
**Offline:** Yes from local projection  
**Success:** 200  
**Not found:** 404

Response is a read model including historical line snapshots, payments, returns and relevant references.

### GET /api/v1/sales
**operationId:** listSales  
**Permission:** sales.read  
**Pagination:** cursor  
**Success:** 200

Filters must be scope-safe and cursor-compatible.

### POST /api/v1/sales/{saleId}/reversals
**operationId:** reverseSale  
**Permission:** sales.reverse  
**Idempotency:** Required  
**Offline:** Restricted — subject to the approved offline reversal policy and local data/security prerequisites; MVP-1 may permit only if all referenced local data and reversal rules are available  
**Success:** 201  
**Failures:** 409 state/concurrency; 422 domain/period/payment rules.

Reversal creates compensating effects; it never deletes the original sale.

### POST /api/v1/sales/{saleId}/returns
**operationId:** createSalesReturn  
**Permission:** sales.return  
**Idempotency:** Required  
**Success:** 201  
**Failures:** 422 RETURN_QUANTITY_EXCEEDED / domain rule; 409 concurrency.

Return response includes return_id, returned quantities, inventory effect and refund status.

## 5. Payments

### POST /api/v1/sales/{saleId}/payments
**operationId:** recordPayment  
**Permission:** payments.record  
**Idempotency:** Required  
**Offline:** Yes subject to payment policy  
**Success:** 201  
**Failures:** 422 PAYMENT_POLICY_VIOLATION; 409 sale state/idempotency.

Method codes remain configurable: CASH, BANK_TRANSFER, MOBILE_MONEY, CARD, CHEQUE, OTHER.

Verification is a separate axis. A Bankak/bank transfer may be recorded without API verification where policy permits.

### GET /api/v1/payments/{paymentId}
**operationId:** getPayment  
**Permission:** payments.read  
**Success:** 200

Response separates:
- payment status;
- verification mode/status;
- evidence status/references;
- provider reference where safe;
- timestamps and audit-safe actor references.

### POST /api/v1/payments/{paymentId}/evidence
**operationId:** capturePaymentEvidence  
**Permission:** payments.evidence.add  
**Idempotency:** Required  
**Offline:** Restricted — only where the approved local evidence-capture policy permits  
**Success:** 201  
**Failures:** 422 validation; 409 payment state; 503 upload/storage temporary failure.

Evidence is not settlement proof.

### POST /api/v1/payments/{paymentId}/verification-decisions
**operationId:** recordManualPaymentVerificationDecision  
**Permission:** payments.verify.manual  
**Idempotency:** Required  
**Offline:** Restricted — only where local policy explicitly permits manual confirmation  
**Success:** 201  
**Failures:** 403 permission; 409 review/state conflict; 422 invalid decision.

A confirmation records actor, reason, time and evidence references. It never changes history by editing an earlier decision.

### POST /api/v1/payments/{paymentId}/verification-requests
**operationId:** requestPaymentVerification  
**Permission:** payments.verify.external  
**Idempotency:** Required  
**Offline:** No — external verification is ONLINE_ONLY; disconnected clients must use only explicitly permitted local capabilities and cannot execute external verification offline.  
**Success:** 202 when pending, 200/201 if provider result is synchronously final  
**Failures:** 409 duplicate/request state; 503 provider unavailable.

Provider credentials are server-side only. Hisabati is an adapter, not a core payment type.

### GET /api/v1/payments/{paymentId}/verification-attempts
**operationId:** listPaymentVerificationAttempts  
**Permission:** payments.read  
**Success:** 200  
**Pagination:** cursor where volume requires it.

## 6. Cash

### POST /api/v1/cash-sessions
**operationId:** openCashSession  
**Permission:** cash.sessions.open  
**Idempotency:** Required  
**Offline:** Restricted — only under the approved local device/register trust and session policy  
**Success:** 201  
**Failures:** 409 CASH_SESSION_ALREADY_OPEN; 422 validation.

Opening is transactionally protected against concurrent sessions for the same register.

### POST /api/v1/cash-sessions/{sessionId}/movements
**operationId:** recordCashMovement  
**Permission:** cash.sessions.move  
**Idempotency:** Required  
**Offline:** Yes  
**Success:** 201  
**Failures:** 409 session state; 422 validation.

Movements are append-only.

### POST /api/v1/cash-sessions/{sessionId}/close
**operationId:** closeCashSession  
**Permission:** cash.sessions.close  
**Idempotency:** Required  
**Offline:** Yes  
**Success:** 200  
**Failures:** 409 session state; 422 variance policy.

Expected cash excludes non-cash tenders.

### POST /api/v1/cash-sessions/{sessionId}/reconciliation
**operationId:** reconcileCashSession  
**Permission:** cash.sessions.reconcile  
**Idempotency:** Required  
**Offline:** No — ONLINE_ONLY under the A3 authorization baseline  
**Success:** 201  
**Failures:** 409 already reconciled/period state; 422 discrepancy policy.

### GET /api/v1/cash-sessions/{sessionId}
**operationId:** getCashSession  
**Permission:** cash.sessions.open  
**Success:** 200

### GET /api/v1/cash-registers/{registerId}/active-session
**operationId:** getActiveCashSession  
**Permission:** cash.sessions.read  
**Success:** 200; 404 when no authorized active session exists.

## 7. Inventory

### GET /api/v1/inventory/stock
**operationId:** getInventoryStock  
**Permission:** inventory.read  
**Success:** 200  
**Pagination:** cursor

Response distinguishes:
- on_hand_quantity;
- reserved_quantity when implemented;
- sellable_quantity;
- branch/warehouse/batch;
- expiry information.

### GET /api/v1/inventory/batches/availability
**operationId:** getBatchAvailability  
**Permission:** inventory.read  
**Success:** 200

Returns FEFO candidates advisory only. Command revalidates.

### POST /api/v1/inventory/adjustments
**operationId:** createStockAdjustment  
**Permission:** inventory.adjust.create  
**Idempotency:** Required  
**Offline:** Yes if policy permits  
**Success:** 201 for draft/pending approval or committed adjustment according to approval threshold  
**Failures:** 409 INSUFFICIENT_STOCK / CONCURRENCY_CONFLICT; 422 validation/domain.

### POST /api/v1/inventory/adjustments/{adjustmentId}/approval
**operationId:** approveStockAdjustment  
**Permission:** inventory.adjust.approve  
**Idempotency:** Required  
**Offline:** No — ONLINE_ONLY under the final A3 authorization baseline  
**Success:** 200/201  
**Failures:** 409 state/concurrency; 422 policy.

Approval must honor separation-of-duties where configured.

### POST /api/v1/stock-transfers
**operationId:** createStockTransfer  
**Permission:** inventory.transfer.create  
**Idempotency:** Required  
**Offline:** Restricted — only where the approved source/destination transfer policy permits  
**Success:** 201

Draft creation does not change stock.

### POST /api/v1/stock-transfers/{transferId}/dispatch
**operationId:** dispatchStockTransfer  
**Permission:** inventory.transfer.dispatch  
**Idempotency:** Required  
**Offline:** Restricted — only where the approved source-side offline transfer policy permits  
**Success:** 200/201  
**Failures:** 409 state/stock/concurrency; 422 domain.

Dispatch creates source-side stock effect and in-transit representation.

### POST /api/v1/stock-transfers/{transferId}/receipt
**operationId:** receiveStockTransfer  
**Permission:** inventory.transfer.receive  
**Idempotency:** Required  
**Offline:** Restricted — only where the approved destination-side offline transfer policy permits  
**Success:** 200/201  
**Failures:** 409 state/concurrency; 422 quantity/condition policy.

Receipt creates destination-side stock effect. Source, transit and destination must never double-count the same units.

### POST /api/v1/goods-receipts
**operationId:** createGoodsReceipt  
**Permission:** purchasing.receipt.create  
**Idempotency:** Required  
**Offline:** Restricted — only where the approved local receiving policy permits  
**Success:** 201  
**Failures:** 409 PO/state/concurrency; 422 batch/expiry/quantity validation.

A Goods Receipt, not a Purchase Order, causes received inventory.

## 8. Purchasing

### POST /api/v1/purchase-orders
**operationId:** createPurchaseOrder  
**Permission:** purchasing.po.create  
**Idempotency:** Required  
**Success:** 201

PO does not increase inventory.

### GET /api/v1/purchase-orders/{purchaseOrderId}
**operationId:** getPurchaseOrder  
**Permission:** purchasing.po.read  
**Success:** 200

### GET /api/v1/inventory/stock/expiring
**operationId:** getExpiringStock
**Permission:** inventory.read
**Success:** 200
**Pagination:** cursor
**Offline:** Yes from local projection where available

Returns expiry-aware stock projections. It does not mutate stock.

### GET /api/v1/inventory/stock-movements
**operationId:** listStockMovements  
**Permission:** inventory.read  
**Success:** 200  
**Pagination:** cursor

Read-only immutable movement history.

### GET /api/v1/payment-methods
**operationId:** listPaymentMethods
**Permission:** payments.read
**Success:** 200
**Offline:** Yes from local organization/branch configuration projection

Returns configured payment methods and policy metadata. Provider credentials are never exposed.

## 9. Sync

### POST /api/v1/sync/push
**operationId:** pushSyncOperations  
**Permission:** sync.push (system/device capability)  
**Idempotency:** Per operation identity/device sequence  
**Offline:** Local capability exists while offline, but this HTTP transport endpoint is online-only; offline local acceptance uses the local transaction/outbox path.  
**Success:** 200/207 according to finalized batch contract

Push must return per-operation outcome without silently dropping failed operations. Cloud validation is authoritative.

### GET /api/v1/sync/pull
**operationId:** pullSyncChanges  
**Permission:** sync.pull  
**Offline:** Local capability exists while offline, but this HTTP transport endpoint is online-only; disconnected operation uses the local synchronization projection/state.  
**Success:** 200  
**Cursor:** required/returned as opaque durable cursor.

Cursor advances only after durable application semantics are satisfied.

### POST /api/v1/sync/acknowledgements
**operationId:** acknowledgeSyncApplication  
**Permission:** sync.pull/device capability  
**Idempotency:** Required  
**Success:** 204/200

Acknowledgement means durable client-side application, not merely receipt.

### GET /api/v1/sync/devices/{deviceId}/pending-outbox
**operationId:** getPendingOutboxStatus
**Permission:** sync.push
**Success:** 200
**Offline:** Yes from local Outbox state

Returns local pending-operation counts/status. It does not mutate the Outbox.

### GET /api/v1/sync/devices/{deviceId}/status
**operationId:** getDeviceSyncStatus  
**Permission:** administrative operational access  
**Success:** 200

### GET /api/v1/sync/conflicts/{conflictId}
**operationId:** getSyncConflict
**Permission:** sync.conflict.resolve
**Success:** 200
**Offline:** No — authoritative conflict state is cloud-controlled

Returns conflict classification, severity, lifecycle state and permitted resolution metadata without mutating the conflict.

### POST /api/v1/sync/conflicts/{conflictId}/resolution
**operationId:** resolveSyncConflict  
**Permission:** sync.conflict.resolve  
**Idempotency:** Required  
**Offline:** No; resolution requires authoritative cloud state  
**Success:** 200/201  
**Failures:** 409 conflict/state; 422 invalid resolution.

## 10. Cross-Cutting Rules

### Scope
Every command/query evaluates tenant → organization → branch → warehouse → device scope as applicable. Client JSON cannot elevate scope.

### Idempotency
Financial, inventory, cash and sync mutations require idempotency. Same key/same request replays the original result; same key/different request returns IDEMPOTENCY_CONFLICT.

### Concurrency
Use expected_version for aggregate concurrency. Stale version returns CONCURRENCY_CONFLICT.

### Audit
Financial, inventory, payment verification, authorization-sensitive and conflict-resolution commands produce immutable audit metadata.

### Offline
An endpoint marked offline-capable must define a local transaction boundary and synchronization behavior. Offline success is local durability, never a claim of cloud success.

### Security
Provider credentials, tokens, storage credentials and secrets never enter public DTOs.

### OpenAPI readiness
This document is the endpoint-level source for the final OpenAPI document. Phase 3.5 will generate/reconcile the machine-readable specification and contract test fixtures after approval of this baseline.


## 11. R1-A3 Reconciliation Note

Phase 3.4 adopts the final A3 offline-eligibility vocabulary. The HTTP transport property is not itself the offline business capability: local offline commands may exist while their cloud transport endpoints remain online-only.

Authoritative reconciliation rules:
- `payments.verify.external` = ONLINE_ONLY; no offline execution.
- `inventory.adjust.approve` = ONLINE_ONLY.
- `cash.sessions.open` = OFFLINE_RESTRICTED.
- `inventory.transfer.dispatch` and `inventory.transfer.receive` = OFFLINE_RESTRICTED where policy permits.
- `sync.push` and `sync.pull` may be local system capabilities while their network transport remains online-only.
- Any future endpoint whose documented offline class differs from A3 is a reconciliation defect, not a new authorization vocabulary.
