# R1-A3 Reference Authorization Conformance Evidence

**Status:** EXECUTED — REFERENCE MODEL PASS; PRODUCTION/SECURITY GATES REMAIN OPEN

## Scope

Reference-only executable checks derived from:
- `docs/13-remediation/r1-a3-authorization-reconciliation.md`
- locked Phase 3.4 capability vocabulary where applicable.

The harness does not claim production authorization, cryptographic snapshot integrity, device binding, revocation enforcement or R1-B security verification.

## Test Artifact

`tests/r1-a3/authorization-conformance.test.mjs`

## Execution

Command:

```text
node --test tests/r1-a3/authorization-conformance.test.mjs
```

## Result

**PASS: 13 / 13 tests**

Covered:
1. effective scope intersection;
2. missing capability denial;
3. valid capability acceptance;
4. cross-branch denial;
5. online-only offline denial;
6. restricted-operation policy gate;
7. offline-eligible operation acceptance;
8. self-approval detection;
9. independent approval distinction;
10. revocation cannot extend offline authority;
11. payment recording vs external verification separation;
12. conflict resolution is policy/type bounded;
13. sensitive authorization audit-field completeness.

## Evidence Classification

**DYNAMIC — REFERENCE MODEL**

The tests are executable and were run as deterministic reference conformance checks.

## Important Limitation

The repository does not yet contain the production authorization runtime or cryptographic offline authorization implementation.

Therefore this result does not close:
- A3 production authorization gate;
- R1-B snapshot integrity/device-binding gate;
- dynamic revocation tests against a real device/session;
- production SoD enforcement;
- production cross-tenant/branch authorization;
- production audit persistence.

## Capability Reconciliation Note

A3 reconciliation contains a working reference to `cash.sessions.read`, while the binding Phase 3.4 contract vocabulary does not introduce that stable capability. This harness deliberately does **not** create a new capability. Phase 3.4 remains the binding vocabulary and the discrepancy must remain a reconciliation item rather than becoming a new permission.

## Promotion Impact

**R1-A3 remains READY FOR LOCK — SECURITY/EXECUTION GATE REMAINS.**

No locked baseline or business rule was changed by these tests.
