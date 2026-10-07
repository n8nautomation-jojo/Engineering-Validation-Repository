# Product Intake API Reconciliation

**Status:** PROPOSED — RECONCILIATION REQUIRED  
**Source:** D-039 + Product Catalog & Medicine Intake Implementation Contract  
**Constraint:** Phase 3.4 is LOCKED/PROMOTED. This document does not modify it silently.

## 1. Purpose
Define the API/application surface required to implement the accepted rapid Product/Medicine Intake UX while preserving locked API governance.

## 2. Proposed application operations
### Product search
GET /api/v1/products
- barcode
- SKU
- name
- generic name
- category
- status
- cursor

Purpose: fast catalog resolution for POS, Goods Receipt and administration.

### Quick Add
POST /api/v1/products
- name
- product type/category
- unit
- barcode/SKU when available
- optional initial pricing fields only where pricing contract permits

Idempotency required.

### Product profile
GET /api/v1/products/{productId}

### Product update
PATCH /api/v1/products/{productId}

Expected-version concurrency required.

### Product archive
POST /api/v1/products/{productId}/archive

Lifecycle rules apply.

### Bulk import
POST /api/v1/products/imports
Creates an import staging job.

GET /api/v1/products/imports/{importId}
Returns validation/progress/result metadata.

POST /api/v1/products/imports/{importId}/commit
Commits a validated import idempotently.

No import operation creates inventory.

## 3. Capability reconciliation
Proposed capability family:
- product.read
- product.create
- product.update
- product.archive
- product.import

These names are NOT part of the locked Phase 3.4 vocabulary until the authorization/API reconciliation gate promotes them.

## 4. Offline class
Default proposal:
- product.read: OFFLINE_ELIGIBLE from local projection;
- product.create/update/archive: ONLINE_ONLY;
- product.import: ONLINE_ONLY.

Any change requires explicit security/offline reconciliation.

## 5. Inline Goods Receipt
Inline creation invokes the same Product Catalog application command as Quick Add.

The Goods Receipt workflow then continues using the returned product identity.

No separate hidden product-creation path may bypass authorization/audit.

## 6. Performance requirements
The implementation target is:
- barcode/exact-identifier lookup suitable for interactive scanner use;
- compact Quick Add response suitable for immediate continuation;
- import processing with bounded batches and progress reporting.

Performance thresholds are implementation/measurement targets and do not alter the domain contract.

## 7. Errors
The product API reuses the locked common error envelope.

Expected domain classes include:
- validation error;
- identifier collision;
- duplicate candidate requiring explicit choice;
- concurrency conflict;
- authorization/scope failure;
- import validation failure;
- import idempotency conflict.

No new global error taxonomy is introduced here.

## 8. Security and privacy
Product search and mutation derive organization scope from trusted authorization context.

External provider credentials are server-side only.

Imported/external provenance is retained.

## 9. Promotion gate
Before stable API promotion:
1. reconcile capabilities with R1-A3;
2. reconcile routes/DTOs with Phase 3.5 OpenAPI;
3. reconcile persistence with Product Catalog data contract;
4. add contract fixtures;
5. add authorization, duplicate, idempotency and import tests;
6. verify no product operation creates stock;
7. record the formal decision in the Decision Log.
