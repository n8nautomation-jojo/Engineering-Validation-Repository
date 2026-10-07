# PharmaTech Product Baseline

**Status:** PROPOSED PRODUCT BASELINE — NOT LOCKED  
**Purpose:** Establish the authoritative product-level reference for implementation.  
**Relationship:** This document does not supersede Domain Model, Architecture, API, or R1 decisions.

## 1. Product

PharmaTech is a pharmacy ERP platform designed for Sudan-first deployment with SaaS-ready tenancy, offline-capable POS, cloud synchronization, Arabic RTL and English LTR support, multi-currency capability, and an architecture suitable for later MENA/global expansion.

## 2. Product principles

1. Offline-first operational resilience.
2. Cloud-synchronized authoritative consistency.
3. Pharmacy-specific inventory safety.
4. Financial immutability through reversal/adjustment.
5. Explicit auditability.
6. Modular monolith before distributed complexity.
7. Tenant-ready architecture from day one.
8. Configuration over country-specific hard-coding.
9. Human workflows remain understandable even when technical synchronization is complex.

## 3. MVP roadmap

### MVP-0 — Online Core

Platform:
- Authentication
- Users
- Roles and permissions
- Organizations
- Branches
- Warehouses
- Settings
- Audit log

Pharmacy:
- Products
- Medicine profile
- Categories
- Manufacturers
- Units/UoM
- Batches
- Expiry management
- Inventory
- Stock adjustments
- Stock transfers

Purchasing:
- Suppliers
- Purchase orders
- Goods receipt
- Basic supplier invoices

Sales/POS:
- Customers
- Online POS
- Sales orders
- Sales invoices
- Sales returns
- Payments
- Cash register

Reporting:
- Sales reports
- Inventory reports
- Expiry reports
- Basic dashboard

### MVP-1

- Tauri desktop POS
- SQLite operational store
- Offline authentication/authorization projection
- Offline Stock Safety Allocation
- Outbox/Inbox
- Delta push/pull synchronization
- Sync cursor
- Conflict handling
- Recovery
- Hardware abstraction validation

### MVP-2

- Chart of Accounts
- Fiscal Periods
- Journal Entries
- Accounting posting handlers
- AR/AP foundations
- Financial statements
- Reconciliation foundations

### MVP-3

- Cross-branch reporting
- Consolidated analytics
- Operational intelligence
- Branch controls

Later:
- HR/Payroll
- CRM
- E-commerce
- Mobile
- Active multi-tenancy
- MENA/global localization

Manufacturing is not currently planned.

## 4. Actors

- Platform Owner
- Tenant Admin
- Branch Manager
- Pharmacist
- Cashier
- Inventory Officer
- Purchasing Officer
- Accountant
- Auditor
- Customer/Patient — future portal/mobile role

## 5. Critical workflows

### Sale

Cashier login → branch context → open cash session → scan/select product → select valid batch using FEFO → cart → permitted discount → payment → confirm → invoice → print → local inventory effect → synchronization when applicable.

### Purchase

Purchase Order → approval where configured → batch-wise Goods Receipt → optional QC → inventory effect → supplier invoice → later payment.

### Stock adjustment

Select product/batch → reason → before/after quantity → approval where required → audit.

### Expiry management

Scheduled detection → identify configurable expiry horizon → notify responsible user → return/discount/other approved action.

### Sales return

Original invoice → select eligible items → reason → return → refund according to payment/refund policy → audit.

## 6. Core business rules

- BR-001: Expired batches cannot be sold.
- BR-002: FEFO is mandatory for normal batch selection.
- BR-003: A sale cannot exceed available valid batch quantity.
- BR-004: A sale requires an open cash register session.
- BR-005: Cash session closure requires an explainable reconciliation result.
- BR-006: Stock adjustment requires reason, actor, timestamp, and audit.
- BR-007: Sales, purchases, and stock adjustments are not hard-deleted; compensating/reversal mechanisms are used.
- BR-008: Financial operations require auditability.
- BR-009: Prices originate from an applicable price list and customer/branch context.
- BR-010: Discounts require the configured capability/policy.
- BR-011: Negative stock is disabled by default.
- BR-012: Expiry restrictions remain binding while offline.
- BR-013: Financial records are immutable in principle; correction is by reversal/adjustment.
- BR-014: FEFO exception requires explicit permission and reason.
- BR-015: Purchase Orders do not increase stock; Goods Receipt does.
- BR-016: Stock truth is represented by immutable inventory movements/transactions rather than an independently authoritative mutable quantity.
- BR-017: A payment being recorded does not imply provider verification.
- BR-018: Payment evidence is evidence, not automatic settlement proof.
- BR-019: Offline success means durable local acceptance within the approved offline envelope, not cloud confirmation.
- BR-020: Cross-branch inventory movement occurs through Stock Transfer rather than direct branch stock mutation.

## 7. Product-level non-functional requirements

- Local POS target: P95 under 200 ms for local operational actions, excluding cloud synchronization, large reports, and physical printer latency.
- Accepted local transactions must survive power failure without loss.
- Duplicate business effects must be prevented.
- Silent inventory corruption is unacceptable.
- Silent financial duplication is unacceptable.
- Arabic RTL and English LTR are first-class supported presentation directions.
- Currency, tax, and locale behavior must be configurable rather than hard-coded to Sudan-only assumptions.

## 8. Explicit non-goals for MVP-0

- Full offline operation
- Full accounting
- Active multi-tenancy
- HR/payroll
- CRM
- Manufacturing
- E-commerce
- Mobile application
- Complex branch analytics

## 9. Product acceptance principle

A product capability is not implementation-ready merely because an endpoint exists.

It must have:
- business purpose;
- actor and authorization expectations;
- workflow;
- business rules;
- failure behavior;
- audit expectations;
- acceptance scenarios;
- dependency mapping to domain/module/API/data.

## 10. Reconciliation requirements

Before this baseline is promoted to LOCKED, reconcile it against:
- Domain Model v1.1
- Architecture Phase 1 and Phase 2 baselines
- API Phase 3.1–3.4
- R1-A1/A2/A3 decisions
- R1-B/C/D/H outcomes
- final compliance evidence

No product statement in this document is intended to silently override those sources.
