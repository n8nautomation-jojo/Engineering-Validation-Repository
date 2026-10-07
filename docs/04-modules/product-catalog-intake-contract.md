# Product Catalog & Medicine Intake — Implementation Contract

**Status:** PROPOSED IMPLEMENTATION CONTRACT — RECONCILIATION READY  
**Derived from:** Domain Model v1.1, D-039, Product/Medicine Intake UX Standard, Module Implementation Contracts  
**Rule:** This contract does not create new domain business rules or silently promote new API capabilities.

## 1. Responsibility
Product Catalog owns the organization-level reusable product master: Product, MedicineProfile, Category, Manufacturer, Unit/UoM.

It provides fast authoritative product creation and catalog retrieval for pharmacy operations.

### Non-goals
- creating stock;
- creating batches;
- receiving inventory;
- changing immutable inventory truth;
- silently assigning regulatory status from external data;
- silently creating products from AI suggestions.

## 2. Product creation modes
### Quick Add
A compact product-creation command for ordinary users.

First-pass identity/configuration:
- organization_id from trusted context;
- name;
- product type/category;
- unit;
- SKU/barcode when available;
- sale price/purchase price only where the existing pricing/purchasing boundary requires them.

Advanced medicine metadata is completed separately unless required by policy.

### Full Profile
Extends an existing Product with MedicineProfile and other catalog metadata.

### Inline Goods Receipt
When receiving goods for an unknown product:
1. resolve/search barcode or identity;
2. create Product through Product Catalog;
3. continue the existing Goods Receipt workflow;
4. create Batch and inventory effect only through the Goods Receipt boundary.

Product creation never implies stock.

## 3. Barcode-first resolution
Resolution order:
1. exact barcode;
2. exact SKU;
3. normalized name/generic-name search;
4. explicit duplicate candidates.

If an exact existing product is found, the UI should avoid duplicate creation and continue to the next required workflow step.

Barcode/SKU uniqueness is organization-scoped according to the final persistence contract.

## 4. Duplicate detection
Duplicate detection is advisory unless a hard uniqueness constraint applies.

The system distinguishes:
- exact identifier collision → reject;
- strong duplicate candidate → require explicit user choice;
- weak candidate → warn without blocking.

A duplicate warning must never merge two products automatically.

## 5. Organization master and branches
Product identity is organization-level.

Branches consume product projections/configuration and must not recreate the same organization product merely because they are separate branches.

Branch-specific settings such as pricing/availability remain owned by their relevant modules.

## 6. Bulk import
Bulk import is a staged workflow:
UPLOAD → MAP → VALIDATE → PREVIEW → COMMIT → RESULT

Rules:
- import never creates stock;
- validation occurs before authoritative commit;
- duplicate detection is explicit;
- commit is idempotent;
- failed rows do not silently become successful rows;
- re-running the same import is safe under the approved idempotency contract;
- provenance is retained for imported/external fields.

Large imports must use bounded batches and observable progress rather than one unbounded transaction.

## 7. External lookup and AI assistance
External medicine/catalog providers are adapters only.

External data:
- is non-authoritative until explicitly verified;
- retains provenance;
- cannot silently establish regulatory truth, batch, expiry, price or stock.

AI may suggest values but cannot silently commit authoritative product state.

## 8. Authorization
Product operations require trusted authorization context and organization scope.

No new stable capability is promoted by this document. Product-management capabilities must be reconciled into the API/authorization vocabulary before stable implementation promotion.

## 9. Offline
Product master mutation is not automatically offline-eligible.

Read projections may be available offline. Product creation/import should remain online unless a later approved policy explicitly defines safe offline creation, synchronization, collision handling and authorization semantics.

## 10. Events
Expected product-domain events:
- ProductCreated
- ProductUpdated
- ProductArchived

Event payloads follow the locked event envelope and Outbox rules.

ProductCreated does not represent BatchCreated, GoodsReceived, StockMovement or Sale effects.

## 11. Audit
Authoritative product mutations capture actor, scope, resource, timestamp, correlation/provenance and relevant before/after changes according to the audit policy.

Bulk import records import identity, initiator, source/provenance, result summary and row-level failures.

## 12. Acceptance criteria
- Quick Add completes common product registration without a multi-page wizard.
- Barcode scan resolves an existing product before offering creation.
- Exact identifier collisions are blocked.
- Duplicate candidates are explicit and never auto-merged.
- New product can be created inline from Goods Receipt without losing receiving context.
- Bulk import supports mapping, validation, preview, commit, error reporting and idempotent re-run.
- Import cannot create stock.
- Organization product identity is reusable across branches.
- External/AI suggestions remain non-authoritative until verified.
- All committed mutations are authorized and audited.
