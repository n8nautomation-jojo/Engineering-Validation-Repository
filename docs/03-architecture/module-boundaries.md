# Module Boundaries

**Status: LOCKED BASELINE — Phase 2.1**

## 1. Boundary principle

Each module owns its domain behavior, persistence model, invariants and application use cases. Other modules consume its public contracts rather than its internal implementation.

## 2. Platform modules

### Identity

Owns:

- User identity
- Authentication credentials
- Sessions/tokens
- Device identity

Does not own authorization policy.

### Authorization

Owns:

- Roles
- Permissions
- Role assignments
- Scope evaluation
- Permission cache contracts

### Tenant

Owns:

- Tenant SaaS boundary
- Subscription/billing configuration
- Tenant-level settings

### Organization

Owns:

- Legal/business organization
- Organization configuration
- Currency/tax/accounting configuration references

### Branch

Owns:

- Branch identity
- Branch operational configuration
- Branch-local visibility and configuration

### Audit

Owns:

- Immutable audit records
- Audit query/read models
- Audit retention policy

## 3. Business modules

### Catalog

Owns:

- Product
- MedicineProfile
- Category
- Manufacturer
- Unit/UoM
- SKU/barcode metadata

### Pricing

Owns:

- PriceList
- PriceListItem
- Customer pricing tiers
- Branch pricing overrides
- Pricing effective dates

### Inventory

Owns:

- Warehouse
- Batch
- InventoryTransaction
- StockMovement
- StockAdjustment
- StockTransfer
- Stock availability projections
- FEFO rules

Inventory is the only module allowed to create inventory movements.

### Purchasing

Owns:

- Supplier
- PurchaseOrder
- GoodsReceipt
- Supplier invoice foundations

A PurchaseOrder never changes stock. GoodsReceipt emits the business event that causes Inventory to create stock movements.

### Sales

Owns:

- Sale
- SaleLine
- SalesReturn
- Payment business records

Sales requests stock validation/reservation and reacts to inventory outcomes. Sales does not directly create StockMovement.

### Customers

Owns:

- Customer
- PatientProfile
- Customer lifecycle
- Customer identity/contact information

### Prescriptions

Owns:

- Prescription
- PrescriptionItem
- Dispensing

It validates dispensing lifecycle and quantity constraints. It does not own inventory.

### Cash

Owns:

- POSDevice
- CashRegister
- CashSession
- Cash movement/session controls

A Sale requiring cash cannot be completed unless the required CashSession is open.

### Accounting

Owns:

- ChartOfAccounts
- FiscalPeriod
- JournalEntry
- JournalEntryLine
- Accounting posting
- Reversal entries
- Financial statements

Accounting is cloud-authoritative and does not depend synchronously on Sale completion.

### Reporting

Owns:

- Report definitions
- Reporting projections
- Read-only analytics

Reporting never becomes a source of transactional truth.

## 4. Infrastructure modules

### Sync

Owns synchronization protocol, device sync state, Outbox/Inbox processing and conflict records. It must not redefine business invariants.

### Notifications

Owns notification delivery and templates.

### Files

Owns document/blob storage adapters.

### Background Jobs

Owns scheduling and worker orchestration, not business rules.

### Observability

Owns telemetry, metrics, tracing and operational diagnostics.

## 5. Allowed communication

Modules communicate only through:

- Commands
- Queries/read models
- Domain/integration events

Forbidden:

- Direct cross-module table writes
- Direct access to another aggregate's private state
- Cross-module SQL joins as business logic
- Shared mutable domain services without explicit ownership

## 6. Read model rule

A module may maintain projections of data owned by another module for performance/offline use. The projection is disposable and must never become the authoritative owner of the source data.
