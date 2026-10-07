# R1-B Reference Security Conformance Evidence

**Status:** EXECUTED — REFERENCE MODEL PASS; PRODUCTION SECURITY GATE REMAINS OPEN
**Track:** R1-B Security
**Commit under test:** 6f9d4565737a96be15e67b6df9637045f48fc51b

## Scope

This artifact records executable conformance evidence for security invariants that can be tested without claiming a Windows/Tauri/SQLite production security implementation.

It is NOT evidence for SEC-P01..SEC-P16 production dynamic security tests.

## Execution

Environment:
- Node.js built-in test runner
- Linux container execution environment
- No production POS runtime
- No Windows OS-backed secret store
- No production SQLite encryption implementation
- No TPM/hardware-backed key implementation

Result:
- 10 tests
- 10 passed
- 0 failed
- 0 skipped
- 0 cancelled
- duration approximately 54 ms

## Covered Reference Invariants

| Test | Invariant | Result |
|---|---|---|
| B-REF-01 | Offline authorization expires at the boundary | PASS |
| B-REF-02 | Forged capability/scope is denied | PASS |
| B-REF-03 | Authorization snapshot is device-bound | PASS |
| B-REF-04 | Integrity mismatch is detected | PASS |
| B-REF-05 | Device clone requires matching binding | PASS |
| B-REF-06 | Revocation removes privileged authority at revocation point | PASS |
| B-REF-07 | Required protection unavailable -> fail closed | PASS |
| B-REF-08 | Payment evidence is not provider verification | PASS |
| B-REF-09 | Security event processing is idempotent | PASS |
| B-REF-10 | Recovery cannot silently restore revoked authority | PASS |

## Important Finding During Execution

The first execution exposed a boundary defect in B-REF-01: the reference authorization function initially allowed access at exactly the expiration boundary.

The harness was corrected to deny at that boundary, then rerun.

This demonstrates that the conformance harness itself was tested rather than merely authored.

## What This Evidence Proves

The reference model is internally consistent for the ten tested invariants.

It does NOT prove:
- SQLite confidentiality;
- SQLite tamper resistance;
- Windows secret-storage security;
- device identity cryptographic binding;
- TPM/hardware-backed protection;
- actual cloud revocation;
- OS reinstall/device replacement behavior;
- power-loss durability of the production POS;
- real payment-evidence file integrity;
- production performance;
- A2/A4 host-boundary claims.

## R1-B Gate Decision

**R1-B remains NOT READY FOR LOCK.**

The reference evidence is supplementary and does not replace the required SEC-P01..SEC-P16 dynamic evidence defined by B4.

No production security technology is promoted or selected by this artifact.

## Next Gate

The next security action is to build and execute the actual Windows/Tauri/SQLite prototype against the B4 test register, beginning with the P0 experiments that determine:
1. local data confidentiality;
2. tamper detection;
3. authorization snapshot integrity;
4. device binding;
5. revocation;
6. key-unavailability fail-closed behavior;
7. corruption/recovery;
8. power-loss atomicity;
9. evidence integrity;
10. security performance;
11. host-boundary characterization.

Until that evidence exists, R1-B remains open and no claim of production security readiness is permitted.
