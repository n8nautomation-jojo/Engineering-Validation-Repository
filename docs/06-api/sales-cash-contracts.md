# Sales and Cash Session API Contracts

**Status:** Proposed contract  
**Depends on:** ADR-011, Phase 2.3 baseline, Phase 3.1 and Phase 3.2 catalog.

## 1. Sale Completion

A sale is a business operation, not a generic row insertion. The command validates actor/device/branch scope, open cash session, price eligibility, quantities and units, FEFO and stock-safety policy, discounts, tax/currency rules, payment policy, idempotency and concurrency.

The local POS acceptance boundary is one SQLite transaction containing Sale, SaleLines, included Payment records, InventoryTransaction, StockMovements, local audit metadata and required Outbox records. All commit together or none do.

Receipt printing is downstream. Printer failure must not reverse or duplicate a committed sale; provide safe reprint by sale/receipt identifier.

## 2. Proposed Sale Command

POST /api/v1/sales

Illustrative request:

    {
      "client_operation_id": "uuid-v7",
      "cash_register_id": "uuid-v7",
      "cash_session_id": "uuid-v7",
      "customer_id": null,
      "prescription_id": null,
      "lines": [
        {
          "product_id": "uuid-v7",
          "quantity": "2",
          "unit_code": "PACK",
          "requested_batch_id": null,
          "discount": { "kind": "AMOUNT", "value": "0.00" }
        }
      ],
      "tenders": [
        { "method_code": "CASH", "amount": { "value": "2500.00", "currency": "SDG" } }
      ],
      "note": null
    }

Illustrative response:

    {
      "sale_id": "uuid-v7",
      "receipt_number": "branch-device-local-sequence",
      "status": "COMPLETED",
      "payment_summary": {
        "paid": { "value": "2500.00", "currency": "SDG" },
        "due": { "value": "0.00", "currency": "SDG" }
      },
      "inventory_effect": "COMMITTED_LOCALLY",
      "sync_status": "PENDING",
      "correlation_id": "uuid-v7"
    }

These examples are conceptual. Partial payment, credit sale and pending bank transfer acceptance rules require explicit product policy before OpenAPI publication.

## 3. Historical Snapshots

Sale lines retain applied product description, SKU/barcode where needed, unit, quantity, unit price, discount, tax, currency and calculation policy/version at sale time. Later catalog, price or tax changes must not rewrite historical invoices.

Client-supplied totals are not authoritative. The server or trusted local domain engine recalculates and validates totals from authorized price/tax snapshots.

## 4. Batch Allocation

The client may request a specific batch only where policy permits. Otherwise FEFO allocates eligible batches. Expired batches are never sellable. A client-supplied batch ID cannot bypass eligibility. Return actual allocated batches for receipt/audit.

## 5. Cash Session Lifecycle

Proposed lifecycle: CLOSED → OPEN → CLOSING → CLOSED.

A session records register/branch, opening actor/time and float, cash movements, sales/refunds, expected cash by tender policy, counted cash, variance/reason, closing actor/time and audit/correlation metadata.

Expected physical cash must not sum every payment method: card, bank transfer and mobile money are reconciled separately from cash.

## 6. Open Session

POST /api/v1/cash-sessions

    {
      "cash_register_id": "uuid-v7",
      "opening_float": { "value": "5000.00", "currency": "SDG" }
    }

Enforce register/branch scope and concurrent-session policy transactionally, not only in UI code.

## 7. Cash Movement

POST /api/v1/cash-sessions/{sessionId}/movements

    {
      "direction": "OUT",
      "amount": { "value": "500.00", "currency": "SDG" },
      "reason_code": "PETTY_CASH",
      "note": "Optional"
    }

Movements are append-only and record actor/time. Directly editing expected balance is prohibited.

## 8. Close Session

POST /api/v1/cash-sessions/{sessionId}/close

    {
      "counted_cash": { "value": "7000.00", "currency": "SDG" },
      "variance_reason": "Required by policy when variance is non-zero"
    }

Compute expected balance from immutable session-attributed events. A variance beyond configured tolerance requires a reason and may require manager approval. Product policy must decide whether controlled closure with a recorded discrepancy is permitted.

## 9. Reversal and Returns

- Sale reversal is a new operation referencing the original sale and requires permission/reason.
- Sales return references original sale lines and tracks returned quantities.
- Returned goods are not sellable until batch/expiry/condition policy approves.
- Refund method/status are distinct from return authorization.
- Never erase sale, payment or cash movement to force balances to match.

## 10. Required Contract Tests

- sale without open session is rejected;
- duplicate idempotency key does not duplicate sale, payment or stock effect;
- power loss before commit leaves no partial sale;
- printer failure after commit allows safe reprint without re-selling;
- expired batch is rejected even offline;
- sale does not exceed locally sellable quantity;
- bank transfer evidence and verification remain separate;
- expected cash excludes non-cash tenders;
- reversal/return preserves original sale history;
- tenant/branch/device scope cannot be overridden by request JSON.
