# Outbox Pattern

**Status:** Baseline — Phase 2.2

## Purpose
Guarantee that a committed syncable business change has a durable message available for synchronization.

## Local Transaction
**Sale + Payments + InventoryTransaction + StockMovements + Outbox = one SQLite transaction**

The transaction either commits completely or rolls back completely.

## Minimum Fields
- outbox_id
- event_id
- event_type
- schema_version
- aggregate_type
- aggregate_id
- aggregate_version
- tenant_id
- organization_id
- branch_id
- device_id
- local_sequence
- occurred_at_utc
- payload
- status
- attempt_count
- next_attempt_at
- last_error
- created_at

## Worker
The background worker claims eligible records, sends batches, processes acknowledgements, marks accepted/duplicate records complete, schedules transient retries, and moves exhausted records to DLQ.

Polling target: approximately 1–2 seconds, subject to device conditions and backoff.

## Retry
Exponential backoff with jitter. Default maximum automatic attempts: 5. Retries must be idempotent.

## DLQ
Dead-letter records remain durable and operationally visible. Replay requires explicit authorization and audit.

## Important Rule
The Outbox is a reliability mechanism, not a substitute for transaction boundaries. A post-commit handler must never be the only mechanism that makes an accepted Sale inventory-safe.
