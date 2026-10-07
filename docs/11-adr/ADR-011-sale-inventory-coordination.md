# ADR-011: Sale ↔ Inventory Transaction Coordination

**Status:** Approved  
**Scope:** MVP-1 / Offline POS  
**Decision:** B — Sale + Inventory coordinated inside one local transaction, protected by an Offline Stock Safety Policy.

## Context

The platform supports one Organization with multiple independent Branches. Each Branch may operate online or offline, and a Branch may later contain multiple POS Devices.

The Domain Model requires:
- Sale Aggregate owns Sale, SaleLines, and Payments.
- Inventory owns InventoryTransaction and immutable StockMovement.
- Sale does not own StockMovement.
- Negative stock is disabled by default.
- FEFO and expiry rules remain mandatory offline.

The core correctness problem is preventing an accepted POS sale from existing without the corresponding inventory deduction, while preserving aggregate ownership.

## Considered Options

### A — Stock Reservation
Reserve stock before completing the sale. Strong for multi-POS coordination, but introduces Reservation state, lifecycle, synchronization and recovery complexity before it is required.

### B — Local Atomic Coordination
The application-level Sale use case coordinates Sales and Inventory inside the same SQLite transaction. This preserves aggregate boundaries while guaranteeing local atomicity.

### C — Sale Intent
Introduce an intermediate intent state before confirmation. This is appropriate for more distributed workflows but is unnecessary complexity for MVP-1.

## Decision

Adopt **B** for MVP-1, with an **Offline Stock Safety Policy** designed as a replaceable policy boundary.

The POS transaction is:
1. Validate authenticated actor and open CashSession.
2. Resolve Product and eligible Batch read models.
3. Validate expiry and FEFO.
4. Validate offline sellable quantity against the active stock-safety policy.
5. Create Sale and SaleLines.
6. Create Payment records.
7. Create InventoryTransaction and StockMovements through the Inventory module.
8. Append required Outbox records.
9. Commit atomically.

The Sale aggregate never directly creates or owns StockMovement.

## Multi-POS Offline Safety

Offline operation across multiple POS devices cannot provide a single globally authoritative stock view without coordination. Therefore the platform uses an Offline Stock Safety Policy.

For MVP-1 this policy may allocate per-device sellable capacity/quotas based on branch stock state and device/session configuration. The policy is deliberately abstracted so it can later be replaced or strengthened by a Reservation Service without changing Sale or Inventory aggregate ownership.

A quota is a **safety allocation**, not a source of truth.

## Cloud Synchronization

Offline transactions are uploaded through the Sync protocol with stable identifiers and idempotency keys. Cloud processing is authoritative for organization-wide consistency.

The cloud must not silently accept a transaction that would make authoritative inventory invalid. Such a submission is rejected or placed into a defined conflict workflow; it is never converted into an unexplained negative stock state.

## Conflict Policy

Conflicts are exceptional conditions, not normal POS flow. They are:
- detected by cloud-side transactional validation;
- recorded with immutable audit information;
- associated with the originating branch/device/user;
- surfaced to authorized management users;
- resolved through an explicit domain operation such as reversal, adjustment, or approved reconciliation.

The cashier UI does not expose internal sync/conflict mechanics.

## Consequences

### Positive
- Local Sale + Inventory atomicity.
- No new Reservation or Sale Intent aggregate for MVP-1.
- Clear module ownership.
- Simple cashier experience.
- Compatible with offline-first operation.
- Evolvable toward reservations.

### Negative
- Multi-POS offline coordination remains a constrained distributed-consistency problem.
- Offline Stock Safety Policy and conflict handling must be rigorously specified.
- Cloud synchronization must validate inventory atomically.

## Future Evolution

If operational scale requires stronger coordination, the safety policy may be replaced by a Reservation capability.

The following contracts must remain stable:
- Sale aggregate ownership.
- InventoryTransaction ownership.
- StockMovement immutability.
- Sale reversal semantics.
- Event and sync identifiers.

## Related Decisions
- ADR-003: Offline-First.
- ADR-004: Event/Transaction Based Sync.
- ADR-005: UUID v7.
- ADR-010: Windows Desktop-first.
