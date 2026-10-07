# Runtime Architecture

**Status: APPROVED BASELINE — Phase 2.1**

## Cloud request path

Client → API → Authentication → Tenant Resolution → Authorization → Application Use Case → Domain Aggregate/Domain Service → Repository → PostgreSQL → Outbox (same transaction where applicable) → Commit → Response.

The API layer must not contain domain rules.

## Application layer responsibilities

- Define use cases
- Establish transaction boundaries
- Load aggregates
- Validate application permissions
- Invoke domain behavior
- Persist changes
- Persist Outbox records in the same transaction
- Publish post-commit work asynchronously

## Domain layer responsibilities

- Aggregate invariants
- Entities and value objects
- Domain policies/services
- Domain events
- State transitions
- Business calculations

The domain layer must not depend on HTTP, PostgreSQL, SQLite, Tauri or external providers.

## Infrastructure responsibilities

- PostgreSQL repositories
- SQLite repositories
- HTTP clients
- Authentication providers
- Notification adapters
- File storage adapters
- POS hardware adapters
- Sync transport

## POS runtime

Tauri hosts the desktop shell. A Rust background task/process component runs the Sync Agent and hardware integration boundary.

The POS application communicates with hardware through a Hardware Abstraction Layer. Business modules must depend on interfaces such as:

- BarcodeScanner
- ReceiptPrinter
- CashDrawer
- CustomerDisplay (optional)
- Scale (future)

Physical devices are replaceable adapters.

## POS transaction boundary

A local sale transaction is All-or-Nothing:

1. Validate session and permissions.
2. Resolve product/price/batch read models.
3. Validate stock/availability policy.
4. Create Sale.
5. Record Payment.
6. Create local inventory transaction/reservation state as defined by the approved offline stock strategy.
7. Write Outbox events in the same local transaction.
8. Commit.
9. Print receipt after successful commit; failed printing must not roll back the financial transaction.

## Performance target

Local POS transactional operations target P95 < 200 ms excluding network, large reports and physical printer latency.

## Background processing

Post-commit asynchronous work must not block the interactive request unless explicitly required by a business invariant.
