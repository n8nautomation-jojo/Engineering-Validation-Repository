# Product Catalog & Medicine Intake — Data Blueprint

**Status:** PROPOSED IMPLEMENTATION BLUEPRINT — NOT LOCKED  
**Purpose:** Make D-039 executable without inventing new business semantics.

## 1. Authoritative ownership
Product identity is owned by Product Catalog at Organization scope.

Inventory owns Batch and stock effects.

Purchasing owns Goods Receipt.

Pricing owns PriceList and PriceListItem.

No product table is an inventory ledger.

## 2. Core records
The physical design must represent, at minimum:
- product identity and organization scope;
- SKU/barcode identifiers;
- product status/lifecycle;
- version/concurrency;
- MedicineProfile metadata where applicable;
- category/manufacturer/unit references;
- provenance for imported/external values.

Exact SQL types remain subject to normal data review.

## 3. Identifier constraints
Required correctness:
- product ID is globally stable;
- organization scope is mandatory;
- barcode/SKU uniqueness is enforced according to the final approved identifier policy;
- archived products remain historically referenceable;
- duplicate candidates do not cause automatic merges.

## 4. Bulk import staging
Use separate staging records from authoritative Product rows.

Minimum concepts:
- import_id;
- organization_id;
- initiated_by;
- source/provenance;
- mapping/version metadata;
- row number;
- normalized input;
- validation status;
- duplicate status;
- error details;
- commit status;
- idempotency key/fingerprint;
- created/updated timestamps.

A staged row cannot affect stock.

## 5. Import lifecycle
UPLOADED → MAPPED → VALIDATED → READY → COMMITTING → COMPLETED

Failure paths:
VALIDATION_FAILED, COMMIT_FAILED, CANCELLED.

The lifecycle is an implementation contract and must be reconciled with the final domain/application state model before being treated as an aggregate state machine.

## 6. Index/access requirements
Optimize for:
- exact barcode;
- exact SKU;
- organization + normalized name;
- organization + generic name where present;
- status filtering;
- import_id + row number;
- import_id + validation status.

Interactive barcode resolution must not require a full catalog scan.

## 7. Branch projections
Branches may maintain read projections/configuration references to the organization Product Master.

A branch projection is not an independent Product authority.

## 8. Audit/provenance
Product mutations are auditable.

Imported/external fields retain provenance sufficient to distinguish:
- user-entered;
- bulk-imported;
- external-provider supplied;
- AI-suggested then user-confirmed.

The provenance model must not expose unnecessary customer data.

## 9. Stock boundary
The following are separate persistence domains:
Product → Batch → GoodsReceipt → InventoryTransaction → StockMovement.

Creating/updating Product never inserts StockMovement.

## 10. Migration/readiness gate
Before coding persistent Product Catalog:
- finalize physical schema;
- finalize identifier uniqueness constraints;
- define Product/MedicineProfile foreign-key policy;
- define import staging retention;
- define projection rebuild strategy;
- produce migration;
- produce fixtures and integration tests.

No new inventory or accounting semantics may be introduced during this data work.
