# R1-B.4 Security Test Case Register

**Status:** ACTIVE SECURITY WORK PACKAGE — PROPOSED / NOT LOCKED

| ID | Scenario | Priority | Expected evidence |
|---|---|---:|---|
| SEC-P01 | Local DB confidentiality | P0 | DB inspection attempt + result |
| SEC-P02 | Local DB tamper detection | P0 | Tamper + detection + recovery |
| SEC-P03 | Offline authorization snapshot forgery | P0 | Privilege/scope modification rejected |
| SEC-P04 | Device identity cloning | P0 | Clone rejected / device binding |
| SEC-P05 | Device revocation and reconnect | P0 | Revocation + containment + reconnect |
| SEC-P06 | Required key unavailable | P0 | Fail-closed behavior |
| SEC-P07 | SQLite corruption | P0 | Detection + re-provisioning/recovery |
| SEC-P08 | Power loss around commit | P0 | Atomicity + Outbox evidence |
| SEC-P09 | Payment evidence substitution | P0 | Integrity failure/quarantine |
| SEC-P10 | Security overhead/performance | P0 | Benchmark by hardware profile |
| SEC-P11 | OS reinstall | P1 | Device re-provisioning behavior |
| SEC-P12 | Device replacement | P1 | Controlled recovery |
| SEC-P13 | Offline/cloud transition | P1 | Correct state transition |
| SEC-P14 | Duplicate security event | P1 | Idempotent processing |
| SEC-P15 | Local admin boundary | P0 | Residual-risk characterization |
| SEC-P16 | Fully compromised endpoint | P0 | Explicit limitation/containment evidence |

## Required result fields

Every executed case must record:

- Test ID
- Environment
- Preconditions
- Exact steps
- Expected result
- Actual result
- PASS / FAIL / CONDITIONAL
- Evidence location
- Build/commit
- Reviewer
- Residual risk
- Follow-up decision if failed

## Gate

No P0 security technology decision may be locked while a P0 test is marked NOT TESTED unless the governing decision explicitly documents why the test is impossible and what compensating evidence establishes the boundary.
