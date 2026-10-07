# Module Implementation Contracts — Working Baseline

**Status:** PROPOSED IMPLEMENTATION SPECIFICATION — NOT LOCKED  
**Purpose:** Define the minimum contract every module must satisfy before implementation.  
**Rule:** This document operationalizes existing architecture; it does not redefine aggregate ownership.

## 1. Standard module contract

Every module specification must identify:

1. Responsibility and non-goals.
2. Owned aggregate roots/entities/value objects.
3. Commands.
4. Queries/read models.
5. Domain services.
6. Published domain events.
7. Consumed events.
8. Transaction boundaries.
9. Persistence requirements.
10. Authorization capabilities and scope.
11. Offline eligibility.
12. Audit requirements.
13. Failure/recovery behavior.
14. API endpoints or application handlers.
15. Test acceptance criteria.
16. Dependencies and forbidden dependencies.

## 2. Module map

### Identity & Access
Owns:
- User
- Role
- RoleAssignment
- authentication/session concepts

Must enforce:
- capability/policy/scope/assignment rules;
- offline authorization projection;
- revocation and device trust boundaries;
- audit for privileged actions.

### Organization & Tenant
Owns:
- Tenant
- Organization
- Branch
- Warehouse
- Settings/configuration boundaries

Must enforce:
- tenant isolation;
- organization/branch scope;
- configuration ownership;
- no cross-tenant access.

### Product Catalog
Owns:
- Product
- MedicineProfile
- Category
- Manufacturer
- Unit/UoM

Must support:
- lifecycle/archival;
- barcode/SKU;
- medicine-specific attributes;
- read projections for POS.

### Pricing
Owns:
- PriceList
- PriceListItem

Must support:
- branch/customer-tier applicability;
- effective dates;
- currency;
- authorization for price changes;
- deterministic POS read model.

### Inventory
Owns:
- Batch
- InventoryTransaction
- StockAdjustment
- StockTransfer
- StockMovement as an immutable entity inside its owning aggregate

Must enforce:
- FEFO;
- expiry;
- no negative stock by default;
- immutable movement truth;
- branch/warehouse isolation;
- compensating reversal;
- Goods Receipt as stock-in source.

Consumes:
- SaleCompleted;
- GoodsReceived;
- approved stock operations.

### Purchasing
Owns:
- Supplier
- PurchaseOrder
- GoodsReceipt

Must enforce:
- PO does not increase stock;
- Goods Receipt creates inventory effect;
- batch-wise receipt;
- supplier invoice linkage;
- approval policy where configured.

### Sales
Owns:
- Sale
- SaleLine
- SalesReturn

Must enforce:
- valid product/batch availability;
- cash-session requirement;
- price/discount rules;
- no hard deletion;
- return distinct from refund;
- inventory effects coordinated through Inventory.

### Payments
Owns:
- Payment
- payment verification state/evidence concepts

Must enforce ADR-012:
- method separated from verification mode;
- evidence is not proof of settlement;
- manual confirmation distinct from API verification;
- provider adapters isolated from core domain;
- split payments;
- idempotent verification requests.

### Cash
Owns:
- CashRegister
- CashSession

Must enforce:
- one active session per configured register policy;
- authorized opening/movement/closing;
- reconciliation;
- auditable difference handling.

### Prescription
Owns:
- Prescription
- PrescriptionItem
- Dispensing

Must enforce:
- prescription lifecycle;
- patient/customer relationship;
- quantity tracking;
- optimistic concurrency against double dispensing.

### Tax
Owns:
- Tax
- TaxRule

Must provide:
- configurable tax resolution;
- jurisdiction/configuration abstraction;
- deterministic calculation inputs/outputs;
- auditability of tax decisions.

### Accounting
Owns:
- ChartOfAccounts
- FiscalPeriod
- JournalEntry

Consumes business events asynchronously.

Must enforce:
- no direct ownership by Sales/Purchasing;
- immutable journal posting;
- reversal rather than destructive edit;
- locked-period handling;
- retry/DLQ behavior.

Accounting remains MVP-2 unless implementation scope is explicitly advanced.

### Sync
Owns:
- Outbox processing
- Inbox/idempotency processing
- sync cursor
- conflict lifecycle

Must enforce:
- event idempotency;
- device/aggregate ordering;
- explicit conflicts;
- no silent overwrite;
- cloud authoritative validation.

### Audit
Owns:
- append-only audit records

Must capture as configured:
- who;
- what;
- when;
- where;
- before/after;
- why;
- provenance/correlation.

Audit is not a substitute for domain state.

### Reporting
Owns read models and reporting queries only.

Must not:
- mutate domain state;
- become a second source of truth;
- bypass authorization/scope.

## 3. Dependency direction

Preferred dependency flow:

Presentation/API → Application handlers → Domain modules → Persistence abstractions

Cross-module interaction should prefer:
- application contracts;
- domain events;
- read models/projections;
- explicit domain services where justified.

Modules must not:
- query another module's private tables directly;
- mutate another module's aggregate;
- serialize aggregates directly as API contracts.

## 4. Transaction rule

A transaction must be defined around a business invariant, not around an arbitrary technical request.

Examples:
- Offline sale atomicity includes Sale + Payment + InventoryTransaction + StockMovements + approved Allocation consumption + Outbox/Audit.
- Goods Receipt commits receipt state and its local inventory effect according to the approved transaction boundary.
- Accounting posting is asynchronous and independently durable.

## 5. Offline rule

Each command must explicitly declare one of:
- OFFLINE_ELIGIBLE
- OFFLINE_RESTRICTED
- ONLINE_ONLY
- NEVER_OFFLINE

No command inherits offline eligibility merely because its module is used by POS.

## 6. Read/write separation

Write paths protect aggregate invariants.

Read paths may use:
- projections;
- local SQLite read models;
- reporting models;
- cached catalog/pricing/inventory views.

Read models never become authoritative business truth.

## 7. Implementation gate

A module is not ready for coding until its module-specific contract exists and all P0 questions have an authoritative answer or an explicit documented dependency.
