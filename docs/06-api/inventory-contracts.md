# Inventory API Contracts

**Status:** Proposed contract  
**Depends on:** Domain Model v1.1, ADR-011 and Phase 2.2 sync baseline.

## 1. Inventory Is a Ledger-Owned Domain

Inventory API expresses business operations. Clients cannot directly set authoritative quantity-on-hand fields. Stock truth is derived from immutable stock movements/transactions. Read models may expose balances for performance, but they are not editable truth.

## 2. Query Contracts

### Stock query
GET /api/v1/inventory/stock

Potential filters: authorized branch/warehouse, product, batch, expiry window, low-stock threshold, cursor and page size.

The response distinguishes total on-hand, reserved/allocated quantity where implemented, and currently sellable quantity. These values must not be conflated.

### Batch availability
GET /api/v1/inventory/batches/availability

Returns eligible candidates for product/location under current policy. This is advisory; commands revalidate inside their owning transaction.

## 3. Stock Adjustment

POST /api/v1/inventory/adjustments

Illustrative request:

    {
      "warehouse_id": "uuid-v7",
      "product_id": "uuid-v7",
      "batch_id": "uuid-v7",
      "direction": "DECREASE",
      "quantity": "3",
      "unit_code": "PACK",
      "reason_code": "DAMAGE",
      "note": "Optional",
      "expected_version": 4
    }

Rules:
- reason and actor are mandatory;
- batch/product/warehouse relationship must be valid;
- unit conversion is explicit and validated;
- approval may be required by quantity/value/reason policy;
- a decrease cannot violate stock safety policy;
- accepted adjustment creates a new InventoryTransaction/StockMovement;
- correction is a compensating adjustment, not deletion/editing of posted history.

## 4. Stock Transfers

Proposed operations:
- POST /api/v1/stock-transfers — create draft transfer;
- POST /api/v1/stock-transfers/{id}/dispatch — dispatch authorized quantities;
- POST /api/v1/stock-transfers/{id}/receipt — record receiving quantities;
- POST /api/v1/stock-transfers/{id}/cancel — cancel only where lifecycle/policy permits.

A purchase order or draft transfer does not increase destination stock. Inventory changes at explicit dispatch/receipt transitions under the finalized transfer model. In-transit stock must be represented so source, transit and destination do not claim the same units twice.

Cross-branch inventory movement is only through Stock Transfer.

## 5. Goods Receipt Boundary

POST /api/v1/goods-receipts records actual received goods, batch, expiry, unit, quantity and discrepancies. A purchase order alone never increases stock. Goods Receipt owns the receiving workflow; Inventory creates the appropriate InventoryTransaction through a coordinated operation.

Preserve traceability from supplier document and purchase order to receipt, batch and resulting movements.

## 6. FEFO and Expiry

- expired batches cannot be sold, including offline;
- eligible batches are selected by FEFO;
- an exception, if allowed, requires dedicated permission, reason and audit;
- UI FEFO selection is advisory; the local/cloud domain operation revalidates;
- expiry date interpretation must be consistent across cloud and POS.

## 7. Offline and Sync

A locally accepted sale's inventory effect commits atomically with that sale. Cloud revalidates the uploaded operation against authoritative inventory and configured offline stock-safety policy.

If cloud validation finds conflict, preserve local history/provenance, create a durable conflict record, do not silently overwrite, resolve through explicit domain operation (reversal, approved adjustment or manager review), and ensure retries cannot duplicate stock effects.

Offline stock quota is a safety allocation, not authoritative stock truth. The exact allocation algorithm remains a separate design decision.

## 8. Required Contract Tests

- no endpoint directly overwrites stock quantity;
- expired batch is never sellable;
- stock adjustment always has reason and actor;
- purchase order alone does not change stock;
- transfer cannot duplicate units across source, transit and destination;
- repeated command does not duplicate InventoryTransaction;
- stale expected_version returns stable conflict;
- local sale and inventory effect commit atomically;
- cloud sync conflict is durable and auditable.
