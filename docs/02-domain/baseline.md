# Domain Baseline

**Status: LOCKED — Domain Model v1.1**

## Aggregate Roots

Tenant, Organization, Branch, Warehouse, Product, Batch, InventoryTransaction, StockAdjustment, StockTransfer, Supplier, PurchaseOrder, GoodsReceipt, Customer, Sale, SalesReturn, PriceList, POSDevice, CashRegister, CashSession, Prescription, ChartOfAccounts, FiscalPeriod, JournalEntry, User, Role, Tax.

## Entities

SaleLine, Payment, PurchaseOrderLine, GoodsReceiptLine, PrescriptionItem, Dispensing, JournalEntryLine, StockMovement, PriceListItem, RoleAssignment, RolePermission, MedicineProfile, PatientProfile, TaxRule.

## Value Objects

Money, Quantity, Address, Contact, TaxInfo, Barcode, SKU, ExpiryDate, Currency.

## Critical rules

- Tenant → Organization → Branch → Warehouse.
- Product Master belongs to Organization.
- Branch Inventory and Batch belong to Branch.
- Sale belongs to Branch + POS Device.
- Customer belongs to Organization; PatientProfile is inside Customer.
- Accounting belongs to Organization.
- CashSession belongs to POSDevice + Branch.
- Audit is immutable and append-only.
- StockMovement is immutable inside InventoryTransaction.
- InventoryTransaction is POSTED → REVERSED; reversal creates a new transaction.
- Sale owns SaleLines and Payments, not StockMovement or JournalEntry.
- PurchaseOrder does not increase stock; GoodsReceipt does.
- Prescription: DRAFT → ISSUED → PARTIALLY_DISPENSED → DISPENSED → CANCELLED.
- Accounting posting is cloud-only.
- Syncable domain events are written to Outbox in the same business transaction.

## High-risk open item

Inventory consistency between Sale acceptance, stock availability/reservation, offline operation and asynchronous event processing must be resolved before multi-device offline stock sales.
