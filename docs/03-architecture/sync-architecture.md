# Sync Architecture — Phase 2.2

**Status:** Baseline  
**Phase:** 2.2

## Scope
Sync connects offline POS devices to the cloud while preserving domain invariants, idempotency and auditability.

MVP protocol:
- REST over HTTPS.
- Bidirectional Push/Pull.
- JWT authentication.
- Registered devices.
- Delta Pull using a server-issued cursor.
- Compressed payloads.
- Retry with backoff.

## Source of Truth
- Product/catalog configuration: Cloud.
- Organization configuration: Cloud.
- Branch inventory while connected: Cloud.
- Offline POS operational state: local SQLite until synchronized.
- Authoritative organization-wide financial state: Cloud.
- Stock truth: immutable inventory transaction/movement ledger.

## Push
The Sync Agent reads pending Outbox entries from SQLite and submits a batch.

Each event carries:
- event_id;
- event_type;
- schema_version;
- aggregate_id;
- aggregate_version;
- device_id;
- local_sequence;
- occurred_at_utc;
- tenant_id / organization_id / branch_id;
- actor_id;
- payload.

Server acknowledgements distinguish accepted, duplicate, rejected and conflict outcomes.

## Pull
The device requests changes after its last acknowledged cloud cursor. The cursor advances only after the corresponding page is durably applied locally.

## Cursor
Conceptually: **device_id + last_synced_sequence/cursor**.

The exact server implementation may evolve, but timestamp-only synchronization is prohibited.

## Transactional Upload
A logical offline sale is one coherent local business transaction. Its sync representation may contain multiple events, but cloud processing applies related business state transactionally where required.

Cloud must never accept an InventoryTransaction independently in a way that violates Sale/Inventory correlation.

## Conflict Detection
Cloud evaluates conflicts against authoritative state, including:
- two offline POS devices consuming scarce stock;
- stale aggregate version;
- incompatible batch state;
- duplicate business operation;
- unauthorized/stale master-data operation.

## Conflict Resolution
Conflicts are never silently overwritten. Each conflict contains conflict_id, event/operation identity, scope, originating device/user, detected_at, conflict type, authoritative/submitted state references, resolution status, resolution actor/action and audit reference.

Resolution uses explicit domain operations such as reversal or stock adjustment.

## Offline Stock Safety Policy
The POS consults a local policy before completing an offline sale.

The policy can enforce device/session capacity or quota. It is branch-aware and batch-aware where required.

A quota is a **safety allocation, not authoritative stock truth**.

## FEFO
FEFO is applied locally using the current batch projection. Cloud revalidates the submitted batch allocation against authoritative state. If invalid, the operation enters the conflict path rather than silently changing the historical sale.

## Multi-Branch
Each Branch has independent inventory scope. Cross-branch movement occurs only through Stock Transfer workflows.

## Security
The server validates tenant isolation, device registration, branch scope, permission, event schema version, idempotency and cursor/sequence validity.

## Recovery
Power loss during local processing is safe because Sale, Payment, InventoryTransaction, StockMovement and required Outbox records commit atomically.

Power loss during synchronization is safe because cloud Inbox/idempotency prevents duplicate application.
