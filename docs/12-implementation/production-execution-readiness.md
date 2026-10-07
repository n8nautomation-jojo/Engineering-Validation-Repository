# Production Execution Readiness Gate

**Status:** ACTIVE — PRE-IMPLEMENTATION EXECUTION CONTROL  
**Authority:** R1 Unified Conformance Gate + Implementation Readiness Gap Register  
**Purpose:** Define the minimum executable evidence and implementation contracts required before broad MVP coding.

## 1. Current decision

PharmaTech is **NOT YET READY for broad MVP-0 implementation**.

The repository has a strong architectural/specification baseline, but production runtime components and several P0 implementation contracts are not yet present.

This gate does not reopen locked architecture/domain/API decisions.

## 2. Readiness levels

### Level 0 — Specification Ready
Authoritative decision exists and dependencies are known.

### Level 1 — Implementation Ready
The affected module has an implementation contract, persistence contract, API mapping, authorization/offline mapping, transaction boundary, test acceptance, and explicit non-goals.

### Level 2 — Runtime Proven
Executable implementation exists and automated tests prove the relevant invariants.

### Level 3 — Production Proven
Production-like evidence covers persistence recovery, security boundary, sync/recovery, operational behavior, and realistic hardware/environment where applicable.

A higher level must never be inferred from a lower level.

## 3. P0 prerequisites before broad MVP coding

| Area | Required evidence/artifact | Current |
|---|---|---|
| Product | Authoritative MVP-0 baseline + acceptance | PARTIAL / PROPOSED |
| Modules | Module-specific contracts for MVP-0 | PARTIAL |
| PostgreSQL | Executable MVP-0 schema + migrations | MISSING |
| SQLite | Executable operational schema + migrations | MISSING |
| Development | Project structure + enforceable quality gates | PROPOSED |
| Tests | Project-wide executable test structure | PROPOSED |
| API | Phase 3.5 parser/fixture promotion | NOT PROMOTED |
| Security | R1-B production boundary evidence | OPEN |
| Authorization | A3 production runtime evidence | OPEN |
| Sync/Conflict | A2 production runtime evidence | OPEN |
| Offline Safety | A1 production runtime evidence | OPEN |
| Compliance | Required legal gates reconciled before regulated hard-coding | OPEN |

## 4. First implementation slice

Before broad MVP implementation, build a deliberately narrow vertical slice that proves the engineering foundation:

1. Tenant/Organization/Branch/warehouse scope.
2. User/session and trusted authorization context.
3. Product + Batch read/write foundation.
4. SQLite local operational transaction.
5. Sale + Payment + InventoryTransaction + StockMovement atomicity according to locked architecture.
6. Outbox persistence.
7. Audit persistence.
8. Idempotency.
9. Optimistic concurrency.
10. Basic PostgreSQL persistence counterpart.
11. Automated tests for the corresponding P0 invariants.
12. Recovery/restart test at the persistence layer.

This slice is an **engineering proof**, not a new product scope or business-rule baseline.

## 5. Explicitly excluded from the first slice

Do not implement merely to make the repository appear complete:

- full UI;
- full reporting;
- full accounting;
- provider-specific payment integration;
- Hisabati integration without verified contract;
- dynamic multi-POS allocation;
- Branch Local Server;
- active multi-tenancy;
- advanced analytics;
- manufacturing.

## 6. A1 production execution requirements

A1 cannot be locked until evidence covers, at minimum:

- real SQLite transaction atomicity;
- allocation consumption coupled to accepted offline sale;
- exact exhaustion behavior;
- FEFO and expiry;
- device/branch/warehouse scope;
- authorization enforcement;
- rejected sale non-consumption;
- duplicate/replay behavior;
- restart/crash recovery;
- multi-POS isolation;
- authoritative replenishment;
- reconciliation/conflict behavior;
- power-loss evidence.

Reference harness evidence is necessary but insufficient.

## 7. A2 production execution requirements

A2 cannot be locked until a real Sync/Conflict runtime demonstrates:

- duplicate delivery idempotency;
- ordering behavior;
- explicit conflict creation;
- classification;
- authorized resolution;
- compensation without destructive mutation;
- audit;
- retry/restart behavior;
- P0 conflict containment.

Reference model PASS remains reference evidence only.

## 8. A3 production execution requirements

A3 cannot be locked until the real Authorization Runtime demonstrates:

- trusted scope derivation;
- capability enforcement;
- offline eligibility enforcement;
- bounded offline authorization;
- revocation behavior;
- SoD enforcement;
- sensitive-action audit;
- device/context binding where required.

Exact cryptographic technology remains governed by R1-B.

## 9. B production execution requirements

B remains open until production-like evidence addresses:

- local database confidentiality/protection;
- tamper detection/protection boundaries;
- device identity;
- secure credential/session handling;
- key lifecycle;
- revocation;
- corruption/re-provisioning;
- offline/online transition;
- Windows target behavior;
- realistic SQLite deployment;
- A2/A4 threat boundaries.

No specific cryptographic product is mandated by this gate.

## 10. Exit criteria for broad implementation

Broad MVP implementation may begin only when:

- all P0 implementation-readiness gaps are closed or explicitly isolated behind an approved controlled exception;
- Phase 3.5 is promoted;
- R1 P0 blockers have executable owners/evidence paths;
- the first vertical slice proves the core persistence/transaction/audit/idempotency foundation;
- no locked baseline contradiction exists;
- CI can execute the relevant automated suites.

## 11. Anti-loop protection

Once a contract reaches Level 1, implementation proceeds.

Do not reopen architecture because implementation is inconvenient.

Reopen only under the established change-control rule:

> What unresolved R1 exit criterion or verified defect requires this change?

If there is no such answer, no architecture change is authorized.

## 12. Current CTO verdict

**Overall:** NOT READY FOR BROAD MVP CODING.

**Next controlled action:** close the P0 implementation contracts and construct the first vertical execution slice, while separately continuing R1 production evidence.

**No architecture redesign is required by the current evidence.**
