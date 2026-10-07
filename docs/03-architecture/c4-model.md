# C4 Model

**Status: APPROVED BASELINE — Phase 2.1**

## Level 1 — System Context

### PharmaTech

A pharmacy ERP platform serving pharmacy organizations, branches and operational users.

### External actors

- Platform Owner
- Tenant Admin
- Branch Manager
- Pharmacist
- Cashier
- Inventory Officer
- Purchasing Officer
- Accountant
- Auditor
- Customer/Patient
- Payment provider (future)
- Email/SMS/Push providers (future)
- Physical POS hardware

## Level 2 — Containers

### Web Admin

Browser-based administrative and operational interface.

### POS Desktop

Tauri-based Windows desktop application with local SQLite for POS operations.

### Cloud API

Primary application/API boundary. Handles authentication, authorization, tenant resolution, commands, queries and synchronization endpoints.

### Application Modules

Modular Monolith containing bounded business modules.

### PostgreSQL

Central persistent database.

### Background Workers

Asynchronous processing for Outbox publishing, synchronization, accounting posting, expiry checks, notifications, reports and cleanup.

### External Services

Optional adapters for email, SMS, push notifications, payment providers and other integrations.

## Level 3 — Major modules

Platform:

- Identity
- Tenant
- Organization
- Branch
- Authorization
- Audit

Business:

- Catalog
- Pricing
- Inventory
- Purchasing
- Sales
- Customers
- Prescriptions
- Cash
- Accounting
- Reporting

Infrastructure:

- Sync
- Notifications
- Files
- Background Jobs
- Observability

## Level 4

Level 4 component diagrams are module-specific and must be documented before implementation of complex modules. Inventory, Sales/POS, Sync and Accounting receive priority because they contain the highest consistency risk.

## C4 boundary rule

C4 describes runtime/container/component responsibility. It does not replace aggregate boundaries or domain ownership rules.
