# Phase 2.1 Baseline

**Status: LOCKED**
**Phase:** 2.1
**Decision Basis:** Architecture Phase 1

## Included decisions

- Cloud runtime layers are API → Application → Domain with Infrastructure adapters.
- Modular Monolith remains the initial architecture.
- POS is Tauri-based and Windows-first, pending physical hardware validation.
- Hardware is accessed through explicit ports/adapters.
- POS local transactions are atomic.
- PostgreSQL uses shared schema + tenant_id for MVP.
- SQLite is a purpose-built local operational store, not a full cloud database replica.
- PostgreSQL and SQLite schemas may differ while domain identifiers and semantics remain compatible.
- Stock ledger is authoritative; stock projections are derived.
- Cloud is financial/accounting authority.
- Reporting is split into basic local reports and advanced online reports.
- Historical transactions preserve their own business facts.
- Currency is a value object; exchange rates are organization-scoped data.
- Branch Local Server and microservices remain deferred.

## Locked Baseline

Phase 2.1 establishes the approved runtime, persistence, deployment-shape and ownership baseline for subsequent architecture phases. Later phases may refine implementation details through explicit revisions/ADRs, but must not silently contradict this baseline.

## Remaining Phase 2 design focus

The highest-risk unresolved topic was inventory consistency across Sale, Inventory, Outbox, asynchronous handlers, offline execution and synchronization. This was resolved through ADR-011 and the subsequent Phase 2.2–2.4 baselines.

## Change Control

Any material change to the locked baseline requires an explicit decision/ADR, impact review and documented revision.