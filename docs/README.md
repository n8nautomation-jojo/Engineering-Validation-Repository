# PharmaTech Documentation

**Single Source of Truth (SSOT) for engineering execution.**

## Documentation hierarchy

- `00-governance/` — documentation governance and decisions
- `01-product/` — product vision, scope, actors, roadmap
- `02-domain/` — domain model, aggregates, rules, state machines, events
- `03-architecture/` — system, module, runtime, data, messaging, security architecture
- `04-modules/` — module specifications
- `05-data/` — PostgreSQL, SQLite, migrations, indexing, projections
- `06-api/` — API contracts and engineering rules
- `07-offline-sync/` — offline operation, Outbox/Inbox, sync, conflicts, recovery
- `08-security/` — security, tenant isolation, audit, secrets
- `09-operations/` — deployment, observability, backup and recovery
- `10-development/` — coding, Git, testing and PR workflow
- `11-adr/` — Architecture Decision Records
- `12-implementation/` — implementation roadmap and technical debt

## Authority chain

Business Decision → Domain Specification → Architecture Decision → Technical Specification → Implementation → Tests → Implementation Status

Approved decisions must not be silently changed. Contradictions require an ADR or explicit decision update.

## Status vocabulary

`PROPOSED` · `APPROVED` · `LOCKED` · `DEPRECATED` · `IMPLEMENTED` · `PARTIAL`
