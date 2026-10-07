# P0-4 — Physical Persistence Schema Contract

**Status:** IMPLEMENTATION CONTRACT — DRIVER/ORM AGNOSTIC
**Authority:** P0-4 Persistence Foundation Contract + locked Domain/Architecture baselines

## Purpose

Define the minimum durable schema required by the first vertical slice and A2 conflict-resolution boundary without selecting an ORM, PostgreSQL driver, SQLite driver, or local encryption technology.

## Required durable records

### Conflict resolution: sync_conflicts

- id — primary key
- operation_id
- conflict_type
- severity
- state
- resolution_class
- original_effect_ids — structured JSON
- resulting_effect_ids — structured JSON
- created_at
- version
- request_fingerprint — nullable
- resolved_at — nullable

### Audit: audit_records

- id — primary key
- occurred_at
- actor_id
- action
- resource_type
- resource_id
- tenant_id
- organization_id
- branch_id — nullable
- device_id — nullable
- correlation_id
- reason — nullable
- before_json — nullable
- after_json — nullable

Audit records are append-only.

### Idempotency: idempotency_records

- key
- command_name
- request_hash
- response_status
- response_body
- created_at

Uniqueness is enforced on (key, command_name).

## Transaction boundary

A conflict resolution command must persist, in one transaction:

1. idempotency decision;
2. conflict state/effect mutation;
3. resulting compensation/effect references;
4. audit record.

A replay with the same request fingerprint returns the durable prior result without producing another effect or audit record.

A different fingerprint for an already-resolved conflict is rejected.

A failure before commit leaves no conflict mutation, idempotency record, or audit record from that attempt.

## Scope and tenancy

Production tables must preserve the existing trusted scope model. Tenant/organization/branch/device identifiers are data-boundary fields where applicable; request identifiers must never expand effective scope.

## PostgreSQL / SQLite parity

The PostgreSQL and SQLite adapters must expose the same application semantics.

Allowed implementation differences:
- SQL dialect;
- JSON storage representation;
- native UUID/integer/text representation;
- transaction API;
- driver-specific parameter binding.

Forbidden differences:
- business rules;
- conflict classification;
- authorization;
- idempotency semantics;
- audit semantics;
- offline policy.

## Required physical tests before P0-4 promotion

- migration create/update;
- transaction commit;
- transaction rollback;
- durable readback;
- stale/concurrent write rejection;
- idempotency uniqueness and replay;
- audit append-only behavior;
- tenant/scope isolation;
- restart persistence;
- crash/power-loss recovery;
- PostgreSQL execution;
- SQLite execution.

**No production PASS is claimed by this schema contract alone.**
