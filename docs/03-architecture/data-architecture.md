# Data Architecture

**Status: APPROVED BASELINE — Phase 2.1**

## 1. PostgreSQL

PostgreSQL is the central cloud database.

MVP uses a shared-schema model with explicit tenant_id on tenant-scoped tables.

Tenant isolation is enforced in layers:

1. API tenant context
2. Application authorization
3. Repository filtering
4. Database constraints/policies where appropriate

Every tenant-scoped table must have an explicit ownership strategy.

## 2. SQLite

SQLite is the local POS operational database.

It contains only the data required for:

- Offline transactional execution
- Local POS state
- Local read models
- Sync infrastructure
- Cached identity/authorization state

SQLite is not a mini replica of PostgreSQL and schemas do not need to match.

## 3. Local transactional tables

The MVP-1 local store is expected to include:

- Sale
- SaleLine
- Payment
- CashSession
- Local inventory/reservation state
- Outbox
- Inbox
- SyncCursor
- Cached authorization/session data
- Required product/price/batch projections

## 4. Cloud transactional ownership

PostgreSQL is authoritative for:

- Master data
- Organization configuration
- Central identity/authorization state
- Financial accounting
- Central audit
- Sync state
- Consolidated reporting
- Accepted synchronized transactions

## 5. Stock data model

Inventory truth is an immutable transaction/movement ledger.

Current stock quantities are projections derived from movements and approved reservations/availability rules.

A mutable quantity cache may exist for performance but cannot be treated as the legal/business source of truth.

## 6. Historical snapshots

Transactional documents must preserve historical facts needed for audit and reporting.

Examples:

- Product name at sale time
- SKU/barcode used
- Unit
- Unit price
- Tax treatment
- Discount
- Currency
- Exchange context where applicable

Master data changes must not rewrite historical transaction meaning.

## 7. Identifiers and timestamps

- UUID v7 preferred for globally unique sortable identifiers.
- UTC timestamps for persisted event and transaction times.
- Local display time is derived from branch/user timezone configuration.

## 8. Concurrency

Optimistic concurrency is required for aggregates where concurrent writes are possible.

Use aggregate versioning and reject stale updates rather than silently overwriting state.

## 9. Indexing

Tenant-scoped indexes should generally lead with tenant_id where appropriate.

High-frequency operational indexes include:

- tenant_id + branch_id
- product_id + batch/expiry
- barcode
- sale date/status
- sync/device sequence
- outbox status
- audit actor/time
- accounting period/status

Exact index definitions are implementation specifications and must be validated with query plans.

## 10. Partitioning

Partitioning is not required for MVP. Audit, Outbox and high-volume transaction tables are candidates for partitioning after measured scale justifies it.
