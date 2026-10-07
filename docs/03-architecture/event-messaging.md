# Event & Messaging Architecture — Phase 2.2

**Status:** Baseline  
**Phase:** 2.2

## Goals
The messaging architecture provides reliable event publication, transactional Outbox, idempotent Inbox processing, deterministic ordering, safe synchronization, and clear domain ownership.

## Internal Event Bus
MVP uses an **in-process event bus** inside the Modular Monolith.

Application/domain transactions complete first. Post-commit handlers process asynchronous events through the Outbox worker.

The event bus is not a reliability boundary. The Outbox is the durability boundary.

## Event Categories
**Domain Event:** meaningful state transition inside a module.

**Integration Event:** versioned contract intended for another module or synchronization boundary.

Every syncable event includes stable identity, aggregate identity/version, occurrence time, scope, actor/device context, event type, schema version, and payload.

## Transaction Rule
For syncable events:

**Business State Change + Outbox Record = Same Local Database Transaction**

A successful business commit without its required Outbox record is unacceptable.

## Ordering
- Device sequence: device_id + local_sequence.
- Aggregate sequence: aggregate_id + aggregate_version.
- Global order for presentation only: occurred_at + device_id + local_sequence.

Global timestamps are never business truth.

## Idempotency
Consumers use **event_id + consumer_id** as the Inbox idempotency key. Duplicate delivery must create no duplicate business effect.

## Failure
Transient failures use exponential backoff with jitter. Default maximum: 5 automatic attempts, then DLQ. Replay is explicit and audited.

## Cross-Module Rule
Modules communicate through Commands, Queries/read models, Domain Events and Integration Events. Modules must not directly write another module's tables.

## Accounting
Accounting consumes business events asynchronously. POS does not create Journal Entries.

Offline sale:
**POS transaction → Outbox → Cloud → Accounting Handler**

Accounting failure creates a retryable posting failure and operational alert; it does not invalidate a committed sale.

## Sale + Inventory
For MVP-1, local POS completion is coordinated synchronously at the application transaction boundary. Post-commit events communicate the resulting state; they are not relied upon to retroactively make an accepted Sale valid.

## Observability
Events include correlation_id, causation_id where applicable, event_id, aggregate_id, actor_id, device_id when applicable, tenant_id, organization_id and branch_id when applicable.
