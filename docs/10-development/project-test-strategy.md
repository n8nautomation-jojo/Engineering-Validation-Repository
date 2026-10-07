# Project Test Strategy

**Status:** PROPOSED TEST STRATEGY — NOT LOCKED  
**Purpose:** Connect domain invariants, R1 test matrices, API contracts, persistence, and end-to-end acceptance into one project testing model.

## 1. Test layers

| Layer | Primary purpose |
|---|---|
| Domain | Invariants and state machines |
| Application | Command orchestration, authorization, transactions |
| Persistence | Constraints, migrations, concurrency |
| API | DTO/error/idempotency/contract behavior |
| Sync | Ordering, idempotency, conflicts, recovery |
| Security | Auth, scope, revocation, tamper resistance |
| End-to-end | Real business workflows |
| Operational | Backup, restore, restart, deployment/recovery |

## 2. Risk-based priority

P0:
- inventory correctness;
- offline transaction durability;
- authorization/scope;
- synchronization idempotency;
- payment state integrity;
- financial immutability;
- tenant isolation;
- local security controls.

P1:
- purchasing;
- reporting correctness;
- hardware integration;
- operational recovery;
- performance.

P2:
- convenience features and non-critical UI behavior.

## 3. Existing R1 test suites

R1-A1:
- offline allocation;
- multi-POS safety;
- power loss;
- FEFO/expiry;
- replenishment;
- allocation conflicts.

R1-A2:
- conflict lifecycle;
- idempotency;
- ordering;
- inventory/payment/accounting conflicts;
- failure/restart.

R1-A3:
- authorization;
- scope;
- offline eligibility;
- revocation;
- SoD;
- sensitive actions.

These matrices remain the authoritative remediation acceptance suites until their decisions are reconciled.

## 4. Core business acceptance scenarios

### Sales
- valid cash sale;
- valid transfer sale;
- split payment;
- discount authorization;
- invalid/expired batch;
- insufficient stock;
- closed cash session;
- duplicate submission;
- stale version;
- sale reversal;
- sales return;
- refund state distinct from return.

### Purchasing
- create PO;
- receive against PO;
- partial receipt;
- batch/expiry validation;
- supplier invoice linkage;
- duplicate receipt prevention.

### Inventory
- adjustment;
- adjustment approval;
- transfer dispatch;
- transfer receipt;
- FEFO;
- expiry;
- stock movement history;
- reversal.

### Cash
- open session;
- movement;
- close;
- reconciliation;
- unexplained difference;
- authorization separation.

### Offline/sync
- offline sale;
- power loss;
- restart;
- duplicate push;
- out-of-order event;
- conflict creation;
- conflict resolution;
- device revocation after reconnect;
- local corruption/re-provisioning.

## 5. Property-based invariants

Where practical, automated tests should prove properties such as:

- stock movement history remains internally consistent;
- reversal is compensating rather than destructive;
- duplicate events do not duplicate business effects;
- scope cannot expand through identifiers;
- offline authorization cannot grant new capability;
- expired stock cannot be sold;
- FEFO ordering remains deterministic for eligible batches;
- financial records are not destructively edited.

## 6. Test fixtures

Fixtures should exist for:
- tenant/organization/branch/warehouse;
- POS device;
- users and role assignments;
- products and batches;
- price lists;
- customers;
- cash sessions;
- sales/payments;
- offline allocation;
- outbox/inbox events;
- conflicts;
- audit records.

Fixtures must avoid embedding provider-specific assumptions that have not been contractually verified.

## 7. Evidence

For P0 scenarios, evidence should identify:
- test ID;
- source invariant/requirement;
- input state;
- operation;
- expected result;
- actual result;
- logs/audit/event evidence where relevant;
- database state where relevant;
- pass/fail;
- build/commit identifier.

## 8. Performance testing

Performance targets must be tested against realistic hardware.

Priority:
- local POS command latency;
- SQLite transaction latency;
- sync throughput;
- API latency;
- report query performance.

The existing target of local POS P95 under 200 ms remains the architectural target; physical printer latency is excluded.

## 9. Security testing

Must include:
- tenant isolation;
- authorization bypass attempts;
- scope manipulation;
- offline snapshot tampering;
- device identity misuse;
- local database tampering;
- evidence substitution;
- replay;
- revoked device behavior.

Exact cryptographic technology follows R1-B decisions.

## 10. Release gate

A release cannot be promoted if:
- a P0 invariant fails;
- a duplicate financial/inventory effect is demonstrated;
- tenant isolation fails;
- a security-critical authorization bypass exists;
- an accepted local transaction can be lost without a defined recovery path.

Arbitrary auto-resolution percentage is not a release gate.

## 11. Test automation roadmap

First:
1. Domain invariants
2. Authorization/scope
3. Inventory
4. Sales/payment
5. Persistence/migrations
6. API contracts
7. Outbox/Inbox
8. Offline/sync
9. End-to-end critical workflows
10. Operational/security suites

