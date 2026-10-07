# Implementation Readiness Gate

**Status:** PROPOSED GOVERNANCE GATE — NOT LOCKED

## Purpose

Determine objectively whether PharmaTech is ready to move from specification into broad implementation.

## Gate 1 — Governance

Required:
- no unresolved contradiction among locked baselines;
- Phase 3.2 status reconciled;
- Phase 3.4 reviewed/promoted or explicitly held with reason;
- R1 exit criteria satisfied;
- no silent baseline changes.

## Gate 2 — Product

Required:
- product scope authoritative;
- MVP-0 acceptance criteria defined;
- actors/workflows/business rules documented;
- explicit non-goals;
- compliance-dependent behavior identified.

## Gate 3 — Domain & Architecture

Required:
- Domain Model v1.1 remains valid;
- aggregate ownership unambiguous;
- transaction boundaries defined;
- event ownership defined;
- offline/sync invariants reconciled.

## Gate 4 — Security & Authorization

Required:
- R1-A3 authorization policy reconciled;
- R1-B security decision complete;
- local POS protection approach tested sufficiently;
- device identity/revocation behavior defined;
- tenant isolation controls defined;
- sensitive-action SoD policy defined.

## Gate 5 — API

Required:
- Phase 3.4 endpoint contracts approved;
- DTO/error contracts approved;
- OpenAPI machine-readable contract generated/reconciled;
- contract fixtures pass;
- idempotency/concurrency semantics implemented in contract tests.

## Gate 6 — Data

Required:
- PostgreSQL schema for MVP-0 defined;
- SQLite MVP-0/MVP-1 operational schema defined to required depth;
- migrations defined;
- indexes/constraints reviewed;
- tenant isolation represented in persistence;
- Outbox/Inbox/audit persistence defined.

## Gate 7 — Modules

Required for every MVP-0 module:
- module implementation contract;
- commands/queries;
- ownership;
- dependencies;
- transaction boundary;
- authorization;
- audit;
- tests;
- API/data mapping.

## Gate 8 — Development

Required:
- project structure;
- coding standards;
- test strategy;
- CI quality gates;
- migration discipline;
- Definition of Ready/Done;
- review rules;
- local development environment instructions.

## Gate 9 — Operations

Required before pilot:
- deployment model;
- POS provisioning;
- backup/restore;
- device replacement;
- update strategy;
- monitoring/alerts;
- incident/recovery procedures.

## Gate 10 — Evidence

The team must demonstrate, with executable evidence where applicable:

- valid sale;
- invalid sale rejection;
- stock safety;
- authorization enforcement;
- idempotent command;
- migration success;
- audit trace;
- power-loss recovery;
- synchronization recovery for the relevant MVP;
- no duplicate business effect.

## Gate result

### READY

All P0 gates pass and remaining P1 items have owners and explicit timing.

### READY WITH CONTROLLED EXCEPTIONS

No P0 blocker remains; documented P1 gaps are isolated from the implementation slice.

### NOT READY

Any unresolved P0 contradiction, unverified P0 security boundary, missing critical data contract, missing API contract, or inability to prove a core invariant.

## Anti-loop rule

Passing this gate means implementation begins.

The project does not return to broad architecture redesign for normal implementation questions. Changes after the gate require targeted evidence and the established change-control process.
