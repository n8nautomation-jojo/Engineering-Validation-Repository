# P0 Implementation Execution Map

**Status:** ACTIVE IMPLEMENTATION CONTROL — DERIVED, NOT A NEW BUSINESS BASELINE  
**Authority:** Production Execution Readiness Gate + locked Domain/Architecture/API baselines  
**Purpose:** Convert the existing readiness gaps into an executable order of work and evidence.  
**Change-control rule:** This document may organize implementation work, but may not introduce business rules, permissions, offline classes, aggregate ownership, legal assumptions, or provider behavior.

## 1. CTO execution decision

The project now moves from broad specification work to a **controlled production-foundation implementation**.

We will not implement the whole MVP at once.

The first objective is to produce a real, testable runtime capable of proving the highest-risk cross-cutting invariants before module expansion.

## 2. Execution order

### P0-1 — Repository/runtime foundation
Deliver:
- application/domain/infrastructure/persistence/test boundaries;
- deterministic configuration;
- environment separation;
- database migration runner;
- test runner;
- CI baseline;
- structured logging without sensitive data.

Exit evidence:
- project builds;
- tests execute in CI;
- migrations execute against test databases;
- module-boundary checks can run.

### P0-2 — Shared domain primitives
Deliver only primitives already established by the baseline:
- identifiers;
- timestamps;
- Money;
- Quantity;
- SKU/Barcode;
- Currency;
- ExpiryDate;
- scope identifiers;
- aggregate version/concurrency primitives;
- domain event envelope.

Exit evidence:
- unit tests;
- serialization tests;
- invalid-value rejection;
- deterministic behavior.

### P0-3 — Scope + authorization runtime foundation
Deliver:
- trusted tenant/organization/branch/device context;
- user/session context;
- capability evaluation;
- effective-scope intersection;
- offline authorization snapshot interface;
- audit hooks for protected decisions.

Do not finalize cryptographic technology here; that remains governed by R1-B.

Exit evidence:
- A3 reference invariants execute against production runtime;
- unauthorized capability is rejected;
- scope cannot expand through request identifiers;
- offline eligibility is enforced;
- bounded snapshot behavior is testable.

### P0-4 — Persistence foundation
Deliver both persistence paths required by the current slice:
- PostgreSQL repositories/migrations;
- SQLite repositories/migrations;
- transaction abstraction;
- optimistic concurrency;
- idempotency storage;
- append-only audit persistence.

Exit evidence:
- migration tests;
- rollback/recovery assessment;
- concurrent stale-write rejection;
- durable commit/readback;
- crash/restart persistence test.

### P0-5 — Product + Batch foundation
Deliver the minimum domain state required by the sale proof:
- Product;
- Batch;
- required medicine/product read data;
- branch/warehouse scope;
- expiry state;
- FEFO ordering data.

No full catalog UI or full product module is required.

Exit evidence:
- expired batch rejected;
- FEFO ordering deterministic;
- scope isolation;
- archival/lifecycle behavior.

### P0-6 — Cash Session + Sale + Payment foundation
Deliver the minimum production runtime for the locked sale transaction:
- CashSession;
- Sale/SaleLine;
- Payment;
- command idempotency;
- optimistic concurrency;
- authorization/offline classification enforcement;
- audit linkage.

The implementation must preserve ADR-012 semantics: recording a payment is not provider verification.

Exit evidence:
- valid sale;
- closed/no-session rejection;
- duplicate command idempotency;
- stale version rejection;
- payment state does not imply external verification.

### P0-7 — Inventory transaction + atomic sale coordination
Deliver:
- InventoryTransaction;
- immutable StockMovement;
- FEFO selection;
- expiry enforcement;
- quantity validation;
- compensating reversal structure;
- approved offline allocation interface where the execution environment is MVP-1.

The local sale transaction must atomically coordinate the already-approved components.

Exit evidence:
- no over-sale;
- no expired sale;
- immutable movement history;
- rejected sale leaves no partial financial/inventory effect;
- replay does not duplicate effects.

### P0-8 — Outbox + Audit + recovery
Deliver:
- transactional Outbox;
- event persistence;
- audit persistence;
- restart-safe pending work;
- correlation/causation metadata;
- durable recovery hooks.

Exit evidence:
- domain effect and Outbox commit atomically;
- no event without committed business state;
- restart preserves pending work;
- audit trace reconstructs the operation.

### P0-9 — A1 production conformance
Use the real runtime, not the reference harness, to execute the A1 P0 matrix:
- atomic consumption;
- exhaustion;
- FEFO/expiry;
- scope;
- authorization;
- rejected-sale non-consumption;
- replay;
- durable recovery;
- replenishment;
- multi-POS isolation;
- power-loss evidence.

A1 remains blocked if production runtime evidence is incomplete.

### P0-10 — A2 production conformance
Implement the minimum real Sync/Conflict runtime required to prove:
- Inbox idempotency;
- ordering;
- conflict detection/classification;
- authorized resolution;
- compensation;
- audit;
- retry/restart.

A2 remains blocked until real runtime evidence exists.

### P0-11 — B security boundary validation
After the persistence/device boundary exists, validate:
- local database protection;
- device identity;
- session/credential storage;
- tamper boundaries;
- corruption/re-provisioning;
- Windows deployment behavior;
- offline/online transition.

Do not claim protection against attacker classes that the selected OS/runtime boundary cannot actually resist.

### P0-12 — Phase 3.5 promotion
Run the repository-native parser/fixture validation and reconcile any observed failure.

Promotion requires observed execution evidence, not static inspection alone.

## 3. Parallel work allowed

The following may proceed in parallel where dependencies permit:
- product/module contract completion;
- schema specification;
- test fixture preparation;
- CI setup;
- compliance evidence gathering;
- A2/A3/B test harness preparation.

None may silently alter locked decisions.

## 4. Explicit stop conditions

Stop implementation and invoke change control if:
- an implementation requirement contradicts a locked baseline;
- a test disproves a locked invariant;
- a legal requirement invalidates an existing rule;
- security evidence reveals a material architectural defect;
- a provider contract requires core-domain behavior not covered by an approved decision.

Otherwise, solve implementation inconvenience inside the implementation layer.

## 5. Broad MVP authorization gate

Broad MVP coding remains prohibited until:
1. P0-1 through P0-8 foundation evidence exists;
2. the first vertical sale/inventory slice is executable;
3. Phase 3.5 has observed parser/fixture validation;
4. P0 A1/A3/B dependencies have an executable evidence path;
5. no unresolved P0 contradiction remains.

This is a sequencing control, not a request to redesign the architecture.

## 6. Evidence rule

Every P0 item must produce:
- exact commit/ref;
- environment;
- execution timestamp;
- test/invariant IDs;
- observed result;
- artifact/log reference;
- limitations.

No "PASS" may be inferred from code existence or static inspection.
