# R1 Unified Conformance Gate

**Status:** ACTIVE — EVIDENCE AGGREGATION ONLY  
**Purpose:** Provide one machine-readable/documented gate for R1 tracks without changing any locked baseline, business rule, permission, offline class, legal rule, or production acceptance criterion.

## Governing rule

A track may only be promoted when its required evidence has actually been observed. The gate never converts design/static/reference evidence into production PASS.

## Evidence classes

- DESIGN — specification exists.
- STATIC — repository/static inspection completed.
- REFERENCE_AUTOMATED — reference/conformance model executed successfully.
- DYNAMIC — real runtime execution observed.
- OPERATIONAL — production-like environment/recovery evidence observed.
- EXTERNAL — evidence depends on an external/regulatory/provider authority.

## Track status

| Track | Current status | Evidence ceiling | Blocking reason |
|---|---|---|---|
| A1 Offline Stock Safety | DURABLE RUNTIME PASS — READY FOR INTEGRATION LOCK | DYNAMIC (SQLite 35/35 runtime tests PASS) | Production CI run & active sync replenishment transport |
| A2 Conflict Resolution | DURABLE PERSISTENCE & UOW IMPLEMENTED | DYNAMIC (SQLite & PostgreSQL durable tests PASS) | Multi-device transport sync & active sync pipeline integration |
| A3 Authorization | DURABLE RUNTIME PASS — READY FOR INTEGRATION LOCK | DYNAMIC (AUTH-01 to AUTH-18 PASS, 18/18) | Cloud revocation push transport & R1-B device secret binding integration |
| B Security | NOT READY FOR LOCK | Reference prototype execution evidence | Windows/SQLite/Tauri production security boundary and key/device/recovery evidence absent |
| C Compliance | READY FOR RECONCILIATION WITH LEGAL GATES | Design/external-source analysis | Statutory/provider/legal gates remain |
| D Integration | PROPOSED / NOT LOCKED | Design | Provider contracts/activation evidence absent |
| E Product Readiness | OPEN | Design/specification | Product/module/data/development implementation gates remain |
| F Commercial | OPEN | Design | Commercial validation remains |
| G Governance | LOCKED | Governance evidence | No current closure blocker |
| H Measurement & Verification | PROPOSED / NOT LOCKED | Design | Runtime evidence pipeline not yet complete |

## Non-negotiable closure rule

R1 is **NOT CLOSED** while any required P0 exit criterion remains unverified.

A reference harness PASS is evidence about the reference model only. It is not evidence that the production runtime satisfies the same invariant.

## Current hard blockers

1. A1 production runtime and persistence verified; cloud sync transport integration pending.
2. A2 durable persistence and UoW implemented; full sync transport pipeline integration pending.
3. A3 production Authorization Runtime implemented and verified via durable SQLite/Postgres snapshot stores; cloud revocation push integration pending.
4. B production security boundary is not verified.
5. Compliance legal gates remain open.
6. Product/module/data/development implementation gates remain open.

## Change-control protection

This gate must not reopen locked Domain, Architecture, API, or Governance baselines unless the existing R1 change-control conditions are satisfied.

CTO anti-loop question:

> What unresolved R1 exit criterion or verified defect requires this change?

If there is no such answer, no architecture change is authorized.

## Evidence record requirement

Every future result must record:
- track;
- invariant/test ID;
- evidence class;
- exact environment;
- commit/ref;
- execution timestamp;
- observed result;
- artifact/log reference;
- limitations;
- reviewer/approval where required.

No unobserved PASS is permitted.

## Relationship to implementation

This gate is a readiness control, not a replacement for production tests. It does not authorize MVP implementation by itself and does not imply that any currently absent runtime component exists.
