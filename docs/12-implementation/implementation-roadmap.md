# Implementation Roadmap

**Status: APPROVED BASELINE**

## Phase 0 — Documentation & Architecture Foundation

Formalize product, domain and architecture baselines and resolve high-risk questions before coding.

## MVP-0 — Online Core

Platform: Authentication, Users, Roles & Permissions, Organizations, Branches, Warehouses, Settings, Audit Log.

Pharmacy: Products, MedicineProfile, Categories, Manufacturers, Units/UoM, Batches, Expiry, Inventory, Stock Adjustments, Stock Transfers.

Purchasing: Suppliers, Purchase Orders, Goods Receipt, Basic Supplier Invoices.

Sales/POS: Customers, Online POS, Sales Orders, Sales Invoices, Sales Returns, Payments, Cash Register.

Reporting: Sales, Inventory, Expiry, Basic Dashboard.

## MVP-1 — Offline POS + Sync

SQLite operational store, Tauri POS, offline auth/RBAC cache, Outbox/Inbox, delta Push/Pull, sync cursor, conflict handling, recovery, hardware abstraction validation.

## MVP-2 — Accounting

Chart of Accounts, Fiscal Periods, Journal Entries, posting handlers, AR/AP foundations, financial statements, reconciliation foundations.

## MVP-3 — Multi-Branch Intelligence

Cross-branch reporting, consolidated analytics, operational intelligence and branch controls.

## Later

HR/Payroll, CRM, e-commerce, mobile, active multi-tenancy and MENA/global localization. Manufacturing is not currently planned.
