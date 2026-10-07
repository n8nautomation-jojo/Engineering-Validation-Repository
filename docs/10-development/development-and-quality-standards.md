# Development & Quality Standards — Working Baseline

**Status:** PROPOSED DEVELOPMENT STANDARD — NOT LOCKED  
**Purpose:** Define the minimum engineering discipline required before implementation begins.

## 1. Source-of-truth rule

For every implementation decision, engineers must identify the authoritative source:

1. Governance / approved product decision
2. Domain baseline
3. Architecture baseline
4. API contract
5. Module implementation contract
6. Data implementation contract
7. Tests / executable evidence

No developer should infer business semantics from UI behavior, database structure, or an outdated document when an authoritative contract exists.

## 2. Change control

A change must be classified as:
- implementation detail;
- documentation correction;
- contract change;
- architecture change;
- business requirement change;
- security/compliance change.

Locked baselines cannot be silently changed.

Architecture changes require the existing governance gate and, where appropriate, an ADR.

## 3. Code organization

The implementation should preserve the modular-monolith boundary.

Recommended logical layers:

- API / presentation
- Application
- Domain
- Infrastructure
- Persistence
- Background workers

Domain modules own their business invariants.

Infrastructure must not become a hidden business-rule layer.

## 4. Dependency rules

Forbidden:
- direct cross-module private-table access;
- aggregate mutation from another module;
- API DTOs used as domain entities;
- UI logic deciding business invariants;
- reporting queries mutating operational state;
- provider-specific payment branching inside core Payment domain.

Allowed:
- explicit application contracts;
- domain events;
- read projections;
- shared technical infrastructure with no business ownership.

## 5. Testing pyramid

Every module should contain:

### Unit tests
- value objects;
- domain invariants;
- state transitions;
- authorization decisions;
- calculation rules.

### Application tests
- command handlers;
- transaction boundaries;
- idempotency;
- concurrency;
- authorization and scope.

### Integration tests
- PostgreSQL;
- SQLite;
- Outbox/Inbox;
- sync;
- provider adapters where real contracts exist.

### Contract tests
- OpenAPI;
- DTO validation;
- error codes;
- idempotency;
- concurrency;
- sync contracts.

### End-to-end tests
Critical workflows:
- sale;
- return/refund;
- purchase/receipt;
- stock adjustment;
- cash session;
- offline sale;
- sync recovery;
- conflict resolution.

## 6. Invariant-first testing

A feature is not considered tested merely because its happy path succeeds.

Tests must demonstrate:
- invalid state rejection;
- authorization rejection;
- scope rejection;
- duplicate request handling;
- stale version handling;
- restart/power-loss behavior where relevant;
- recovery;
- audit;
- event publication;
- no duplicate business effects.

## 7. Migration discipline

Every schema change requires:
- forward migration;
- rollback/recovery consideration where practical;
- compatibility assessment;
- seed/reference-data impact;
- test migration;
- production migration notes.

Migrations must not silently alter historical financial meaning.

## 8. API implementation gate

An endpoint is not implementation-ready until:
- endpoint contract exists;
- DTO exists;
- authorization capability exists;
- scope rules exist;
- validation order exists;
- error mapping exists;
- idempotency behavior is defined where required;
- concurrency behavior is defined where required;
- transaction boundary is defined;
- audit behavior is defined;
- OpenAPI contract is approved.

## 9. Definition of Ready

A work item is Ready when:
- business outcome is clear;
- source-of-truth documents are identified;
- dependencies are known;
- acceptance criteria exist;
- authorization is defined;
- persistence impact is known;
- offline behavior is known or explicitly out of scope;
- test strategy is identified.

## 10. Definition of Done

A work item is Done when:
- code is implemented;
- unit/application/integration tests appropriate to the risk pass;
- contract tests pass;
- migrations are tested where applicable;
- audit/security requirements are verified;
- documentation is updated;
- no known P0/P1 defect remains within the work item;
- review is completed.

## 11. CI quality gates

The eventual CI pipeline should enforce, at minimum:
- formatting;
- lint/static analysis;
- compilation/build;
- unit tests;
- relevant integration tests;
- API contract validation;
- migration validation;
- dependency/security scanning;
- forbidden-boundary checks where technically enforceable.

The exact toolchain remains an implementation decision and is not fixed here.

## 12. Observability requirements

Business-critical operations must expose:
- correlation ID;
- actor/device context where safe;
- operation result;
- latency;
- failure category;
- retry state;
- audit linkage.

Sensitive data and credentials must never be logged.

## 13. Review discipline

Reviews should ask:
1. Which invariant does this code protect?
2. Which aggregate/module owns the behavior?
3. Can this operation be retried safely?
4. What happens after power loss or process restart?
5. What happens offline?
6. What happens if the request is duplicated?
7. What happens if authorization changes?
8. What is audited?
9. What is the recovery path?

## 14. Implementation prohibition

Do not start broad MVP coding while any unresolved P0 architecture/security/API contradiction blocks the corresponding work.

Targeted prototypes are allowed when they produce evidence for a named decision gate.

## 15. Anti-loop rule

Once a specification satisfies its readiness gate, implementation should proceed.

Do not reopen settled decisions because a developer prefers another pattern unless new evidence demonstrates a defect, incompatibility, or approved requirement.
