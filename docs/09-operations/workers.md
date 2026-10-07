# Background Workers

**Status:** Phase 2.3 Baseline

Workers are durable asynchronous processors. They never replace synchronous domain validation.

## Common Contract
Each worker has a stable worker type, claims work safely, is idempotent, records attempt/outcome metadata, uses bounded retries, survives restart and exposes operational health.

## Outbox Worker
Reads pending Outbox entries, claims a batch, publishes them, records acknowledgements and schedules retry/DLQ.

## Sync Worker
Runs inside the Tauri POS process as a Rust background task. It pushes local Outbox data, pulls cloud deltas, applies them transactionally, and advances the cursor only after durable application.

## Accounting Posting Worker
Consumes accepted business events in Cloud and creates Journal Entries through the Accounting module. Duplicate events cannot create duplicate postings.

## Expiry Worker
Periodically evaluates active batches against configured expiry windows and emits notifications/events. It does not directly sell, delete or rewrite stock.

## Notification Worker
Consumes notification-worthy events and delivers configured channels. Delivery failure is retryable and must not roll back the originating business transaction.

## Report Worker
Handles expensive asynchronous report generation. Report jobs are immutable requests with status and result metadata.

## Cleanup Worker
Performs only retention-approved cleanup. Financial and audit immutability rules override generic cleanup.
