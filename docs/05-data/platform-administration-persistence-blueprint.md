# Platform Administration Persistence Blueprint

**Status:** PROPOSED — IMPLEMENTATION CONTRACT / NOT PROMOTED

## Durable records

The platform administration boundary requires durable records for:

- platform tenants
- organizations
- branches
- subscriptions
- platform/tenant users
- credential lifecycle metadata
- idempotency records
- platform audit records

The existing shared persistence primitives remain authoritative for transaction and idempotency semantics.

## Ownership

Tenant is the SaaS boundary. Organization belongs to Tenant. Branch belongs to Organization. Subscription belongs to Tenant. Initial Admin belongs to Tenant + Organization + Branch.

No pharmacy inventory or operational transaction is created by provisioning.

## Transaction

Provisioning must execute as one durable transaction:

1. validate PLATFORM_OWNER authority;
2. check idempotency by command + key + request fingerprint;
3. create Tenant;
4. create Organization;
5. create Branch;
6. create Subscription metadata;
7. create Initial Admin with PASSWORD_CHANGE_REQUIRED;
8. persist credential lifecycle metadata only;
9. persist idempotency result;
10. append immutable audit record;
11. commit.

Any failure before commit must leave no partial provisioning graph.

## Credential storage

Only verifier/lifecycle metadata may be persisted. Plaintext temporary credentials are never stored in tenant/domain tables, audit, idempotency, or ordinary logs.

Credential issuance and secure delivery remain external service boundaries.

## Isolation

Tenant identifiers in a request are data, not authority. Platform authorization is established by the PLATFORM_OWNER authority plane. Tenant-user requests cannot invoke platform provisioning.

## Concurrency

Provisioning requires uniqueness constraints for tenant code, organization/branch identifiers as appropriate, usernames, and idempotency key + command. Conflicting concurrent provisioning attempts must resolve deterministically without duplicate graphs.

## Required physical validation

Before promotion:
- PostgreSQL migration/readback;
- transaction rollback;
- duplicate/concurrent provisioning;
- idempotent replay;
- audit append-only behavior;
- tenant isolation;
- credential verifier-only persistence;
- restart/crash recovery;
- SQLite semantic parity where local platform administration storage is actually required.

This blueprint does not activate platform capabilities or change Phase 3.4.
