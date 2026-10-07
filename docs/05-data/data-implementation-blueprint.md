# Data Architecture Implementation Blueprint

**Status:** PROPOSED IMPLEMENTATION SPECIFICATION — NOT LOCKED  
**Purpose:** Turn the approved data architecture into an implementation-enabling blueprint without prematurely fixing every physical column.

## 1. Data stores

### PostgreSQL — cloud authoritative store

Responsibilities:
- authoritative organization/branch data;
- authoritative inventory truth;
- authoritative business transactions;
- synchronization state;
- audit;
- accounting;
- reporting projections.

### SQLite — local POS operational store

Responsibilities:
- approved offline operational state;
- local transaction execution;
- local projections needed by POS;
- Outbox;
- local authorization projection;
- offline safety allocation state;
- local audit/provenance required for recovery.

SQLite is not an independent cloud authority.

## 2. Persistence ownership

| Domain | Authoritative owner |
|---|---|
| Tenant | Platform |
| Organization | Organization module |
| Branch | Organization module |
| Warehouse | Inventory/Organization boundary |
| Product | Product Catalog |
| Batch | Inventory |
| InventoryTransaction | Inventory |
| StockMovement | Inventory |
| StockAdjustment | Inventory |
| StockTransfer | Inventory |
| Supplier | Purchasing |
| PurchaseOrder | Purchasing |
| GoodsReceipt | Purchasing |
| Customer | Customer/Sales boundary |
| Sale | Sales |
| SalesReturn | Sales |
| Payment | Payments |
| CashRegister | Cash |
| CashSession | Cash |
| Prescription | Prescription |
| PriceList | Pricing |
| Tax | Tax |
| User/Role/Assignment | Identity |
| JournalEntry | Accounting |
| AuditRecord | Audit |
| Outbox/Inbox | Sync |

## 3. Common persistence requirements

Business records should use stable identifiers suitable for synchronization.

Required concepts:
- tenant/organization scope;
- branch/warehouse scope where applicable;
- created_at / updated_at;
- lifecycle/state;
- optimistic concurrency/version;
- provenance/device metadata where applicable;
- audit linkage where required;
- idempotency keys for command processing where applicable.

UUID v7 remains the preferred identifier strategy from the existing architecture baseline.

## 4. Inventory persistence

The inventory schema must preserve:
- product;
- batch;
- warehouse;
- expiry;
- quantity/movement;
- source transaction;
- reversal relationship;
- immutable movement history.

Do not introduce a second authoritative stock ledger merely to support offline allocation.

Offline allocation is safety capacity, not authoritative stock truth.

## 5. Synchronization persistence

Outbox must support:
- event_id;
- aggregate identity;
- aggregate sequence/version;
- device identity where applicable;
- event type/version;
- occurred_at;
- payload;
- delivery state;
- retry metadata;
- last error;
- correlation/provenance.

Inbox must support idempotency by:
- event_id;
- consumer identity;
- durable applied/ignored result.

Sync cursor must be sequence-based rather than timestamp-only.

## 6. Audit persistence

Audit records must be append-only and support:
- actor;
- capability/context;
- tenant/organization/branch/device scope;
- action;
- resource;
- timestamp;
- before/after or changed-field delta;
- reason;
- correlation/causation;
- provenance.

Financial and security-sensitive records require stronger immutability controls than ordinary master-data lifecycle records.

## 7. Tenant isolation

Tenant isolation must be enforced server-side.

The implementation must not depend solely on:
- client-supplied tenant IDs;
- UI filtering;
- repository naming;
- developer discipline.

Every tenant-scoped query/write path must derive trusted scope from authenticated context.

## 8. SQLite-specific requirements

The local schema must distinguish:
- authoritative local operational state;
- cached read projections;
- pending outbound work;
- synchronization metadata;
- security state;
- recoverable local transactions.

Local data must support:
- atomic business transactions;
- crash recovery;
- idempotent sync application;
- corruption detection/re-provisioning;
- controlled device replacement.

Exact encryption/key-storage technology remains dependent on R1-B.

## 9. Schema and migration rule

Before implementation of a persistent module, its data contract must define:
- tables/entities;
- columns and types;
- primary keys;
- foreign keys;
- unique constraints;
- check constraints;
- indexes;
- lifecycle rules;
- migration strategy;
- seed/reference data;
- projection refresh/rebuild behavior.

Physical schema details must follow approved domain/module/API decisions; they must not invent new business semantics.

## 10. Reporting/read models

Reporting may use denormalized projections.

Projection rebuild must be possible from authoritative source data/events where required.

Reports must never write back to operational truth.

## 11. Data readiness gate

A module's persistence design is implementation-ready when:
- ownership is unambiguous;
- authoritative store is identified;
- invariants are represented by constraints or application/domain checks;
- migration path exists;
- indexes support known access patterns;
- tenant/scope isolation is explicit;
- offline implications are explicit;
- recovery behavior is defined;
- test fixtures can be generated.

## 12. Deferred physical decisions

Do not finalize here:
- exact SQL types for every field;
- exact encryption implementation;
- final partitioning strategy;
- final reporting warehouse;
- final retention periods where compliance evidence is still pending.

Those decisions require the relevant implementation/data review and R1 evidence.
