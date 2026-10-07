# R1-A2 Reference Conformance Evidence

**Status:** EXECUTED — REFERENCE MODEL PASS; PRODUCTION GATE REMAINS OPEN

## Scope

This evidence records execution of the repository's R1-A2 reference conformance tests.

It validates only deterministic invariants already defined by:
- `docs/13-remediation/r1-a2-final-reconciliation.md`
- `docs/13-remediation/r1-a2-test-matrix.md`

It does **not** claim that the future production Sync/Conflict implementation passes A2.

## Test Artifact

`tests/r1-a2/conflict-conformance.test.mjs`

## Execution

Command:

```text
node --test tests/r1-a2/conflict-conformance.test.mjs
```

Reference execution environment:
- Node.js built-in test runner
- No third-party dependencies
- Local isolated execution

## Result

**PASS: 8 / 8 tests**

Covered:
1. lifecycle terminal immutability;
2. explicit failure/containment transitions;
3. resolution identity idempotency;
4. capability + scope authorization;
5. compensation as a new effect;
6. payment evidence cannot manufacture API verification;
7. return/refund separation;
8. containment durability across restart.

Observed:
- tests: 8
- passed: 8
- failed: 0
- skipped: 0
- cancelled: 0

## Evidence Classification

**DYNAMIC — REFERENCE MODEL**

The tests were executed, not inferred from documentation.

## Important Limitation

This is a reference conformance harness because the repository does not yet contain the production Sync/Conflict Engine.

Therefore:
- this evidence cannot close the A2 production gate;
- no production conflict state, database transaction, worker, API or device behavior is being represented as tested;
- the full A2 matrix remains required when the corresponding implementation exists.

## A2 Promotion Impact

R1-A2 remains:

**READY FOR LOCK — EXECUTION GATE REMAINS**

The reference harness reduces semantic drift risk and provides the first executable contract layer. Production integration, authorization, persistence, restart, sync replay/order, inventory, payment, accounting and security tests remain mandatory before A2 promotion.

No locked baseline or business rule was changed by this evidence.
