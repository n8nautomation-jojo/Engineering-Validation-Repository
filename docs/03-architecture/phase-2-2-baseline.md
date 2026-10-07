# Phase 2.2 Baseline — Event, Messaging & Sync

**Status:** LOCKED  
**Decision Basis:** ADR-011

## Locked Decisions

1. Internal Event Bus: in-process for MVP.
2. Reliable publication: transactional Outbox.
3. Processing idempotency: Inbox keyed by event_id + consumer_id.
4. Outbox worker: background worker, approximately 1–2 second polling target, exponential backoff + jitter, 5 automatic retries, then DLQ.
5. Sync protocol: REST + HTTPS, bidirectional Push/Pull.
6. Sync cursor: device-scoped cursor/sequence; timestamp-only synchronization prohibited.
7. Device security: registered POS device + authenticated user context.
8. Offline transaction atomicity: Sale + Payment + InventoryTransaction + StockMovement + Outbox in one SQLite transaction.
9. Cloud consistency: authoritative transactional validation.
10. Offline Stock Safety Policy: quota/capacity policy is a safety allocation, not authoritative stock truth.
11. Conflicts: explicit, durable, auditable; never silent overwrite.
12. FEFO: local execution from local projection; cloud revalidation on synchronization.
13. Multi-branch: inventory isolated by Branch; cross-branch movement only through Stock Transfer.
14. Accounting: cloud-only posting from synchronized business events.
15. Cashier UX: sync/conflict internals remain outside the normal POS workflow.

## Critical Invariant

A post-commit event handler must never be the only mechanism that makes an accepted Sale inventory-safe.

## Phase 2.2 Deliverables

- Event & Messaging Architecture
- Sync Architecture
- Outbox Pattern
- Inbox Pattern
- Conflict Resolution

## Deferred for Phase 2.3 / 2.4

- Exact worker implementation and transaction boundaries.
- Authentication runtime and refresh-token behavior.
- Detailed failure/recovery state machines.
- Observability dashboards and operational SLOs.
- Final API endpoint schemas.
- Exact Offline Stock Safety Policy algorithm and quota allocation formula.

## Next Phase

Phase 2.3 will define Background Workers + Authentication Runtime + Transaction Boundaries in implementation-ready detail.
