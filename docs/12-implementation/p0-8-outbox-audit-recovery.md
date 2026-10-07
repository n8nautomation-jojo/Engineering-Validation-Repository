# P0-8 — Outbox + Audit + Recovery

**Status:** IMPLEMENTED FOUNDATION — EXECUTION EVIDENCE PENDING

## Implemented
- Outbox event contract carrying event identity, aggregate identity/version, tenant scope, device/correlation metadata and payload.
- Outbox store contract for append, pending retrieval and dispatch acknowledgement.
- Immutable audit record construction.
- Transactional command wrapper with trusted scope, commit on success and rollback on failure.

## Binding rules
- Syncable domain events remain required to be written to Outbox in the same business transaction.
- Audit remains append-only and immutable.
- Financial/inventory history is never deleted.
- A failed command must not report success before transaction commit.
- Recovery must be restart-safe and idempotent; transport retry is not a business conflict.

## Not yet proven
This foundation does not establish durable PostgreSQL/SQLite Outbox storage, crash/power-loss atomicity, worker leasing, retry/DLQ behavior, duplicate delivery handling, production audit durability, or full Sale + Inventory + Outbox atomicity. Those require executable infrastructure adapters and dynamic evidence.
