# Architecture Overview

**Status: APPROVED BASELINE — Phase 2.1**

## 1. Architectural goals

PharmaTech is a pharmacy ERP platform designed around these non-negotiable properties:

- Modular Monolith as the initial application architecture.
- Offline-First capability for POS, activated in MVP-1.
- Cloud-Synchronized operating model.
- Tenant-Ready boundaries from day one.
- Strong domain ownership and explicit module boundaries.
- PostgreSQL as cloud persistence.
- SQLite as local POS operational persistence.
- Accounting as an independent, cloud-authoritative domain.
- Inventory ledger as the source of stock truth.
- Auditability and financial immutability by design.

## 2. Logical architecture

The system is divided into:

1. Presentation/API
2. Application
3. Domain
4. Infrastructure
5. Persistence and external adapters

The dependency direction is inward:

Presentation → Application → Domain

Infrastructure implements ports defined by Application/Domain and must not become the location of business rules.

## 3. Runtime environments

### Cloud

The cloud runtime hosts:

- API
- Application modules
- Domain modules
- PostgreSQL
- Background workers
- Sync endpoints
- Accounting posting
- Advanced reporting
- Central audit
- Notifications

### POS Desktop

The POS runtime hosts:

- Tauri desktop shell
- POS application UI
- Local application services
- Local domain operations required for offline workflows
- SQLite
- Local Outbox/Inbox
- Sync Agent
- Hardware abstraction adapters

The POS must remain operational for approved offline workflows without requiring network access.

## 4. Source of truth

Cloud is authoritative for:

- Organization configuration
- Global product master
- Pricing configuration
- Users and roles
- Central audit
- Accounting
- Consolidated reporting
- Synchronization state

Local POS is authoritative only for local transactional execution while offline. Offline transactions are provisional until accepted by the cloud synchronization protocol.

## 5. Architectural constraints

- Modules must not access another module's database tables directly.
- Cross-module interaction uses Commands, Queries, or Domain/Integration Events.
- Aggregate invariants are enforced inside aggregate/domain boundaries.
- Financial records cannot be deleted.
- Stock truth is represented by immutable inventory transactions/movements.
- Syncable events use Outbox.
- Cloud event consumers use Inbox/idempotency.
- Tenant context must be resolved before tenant-scoped application operations.
- Every security-sensitive operation must be auditable.

## 6. Phase 2.1 decision

The initial deployment remains a Modular Monolith. We deliberately avoid microservices, distributed transactions, and a branch server in MVP-0.

This preserves strong transaction boundaries and developer velocity while leaving explicit ports/events available for later extraction if scale requires it.
