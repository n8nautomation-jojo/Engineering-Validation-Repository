# R1-B.4 Security Prototype Execution Report

**Status:** PARTIAL EXECUTION EVIDENCE — PRODUCTION WINDOWS/SQLITE GATE REMAINS OPEN  
**Prototype commit:** 7334f2ec15defdccd81b495663b01056779d0346

## 1. Execution Environment

The available execution environment was:
- Node.js v22.16.0
- Linux x86_64
- SQLite CLI unavailable
- No Windows host
- No Tauri production build
- No OS-backed Windows secret-store integration
- No TPM/hardware-backed key integration

Therefore this execution cannot close the Windows/Tauri/SQLite security gate.

## 2. Executed Prototype Result

The portable security prototype was executed with Node's built-in test runner.

Result:
- 11 tests
- 11 passed
- 0 failed
- 0 skipped
- 0 cancelled
- duration approximately 60 ms

Covered:
- protected-state tamper detection;
- offline authorization snapshot forgery rejection;
- wrong-key/device protection;
- revocation boundary model;
- missing-key fail-closed behavior;
- commit-or-absent reference atomicity model;
- payment evidence alteration detection;
- duplicate security-event idempotency;
- A2 local-admin residual-risk boundary;
- A4 fully-compromised-endpoint claim boundary;
- authorization expiry boundary.

## 3. Evidence Classification

These results are **portable prototype/reference evidence**, not production dynamic evidence for the B4 test register.

They validate selected security invariants and cryptographic primitives in isolation.

They do NOT establish:
- SEC-P01 real local database confidentiality;
- SEC-P02 production SQLite tamper protection;
- SEC-P03 production authorization snapshot storage/integrity;
- SEC-P04 production device identity binding;
- SEC-P05 real cloud/device revocation;
- SEC-P06 production key lifecycle;
- SEC-P07 real SQLite corruption recovery;
- SEC-P08 real POS power-loss atomicity;
- SEC-P09 production evidence file integrity;
- SEC-P10 POS performance under real supported hardware;
- SEC-P11 OS reinstall;
- SEC-P12 device replacement;
- SEC-P13 real offline/online transition;
- SEC-P15 Windows local-admin boundary;
- SEC-P16 fully compromised endpoint containment.

## 4. Important Boundary

The prototype uses Node's cryptographic primitives to verify selected integrity/confidentiality behavior. It intentionally does not declare these primitives as the final production technology.

No decision has been made that AES-256-GCM, HMAC-SHA-256, a particular SQLite encryption library, DPAPI/Credential Manager, TPM, or any hardware SKU is mandatory.

## 5. Gate Decision

**R1-B remains NOT READY FOR LOCK.**

The executed portable prototype is useful evidence but is insufficient to satisfy the B4 exit criteria because the P0 Windows/Tauri/SQLite experiments remain unexecuted.

## 6. Next Required Execution

The next gate requires a supported Windows test environment with:
1. actual Tauri POS build;
2. actual SQLite implementation selected for prototype evaluation;
3. Windows OS-backed secret storage;
4. representative hardware profile;
5. controlled device identity/revocation test setup;
6. repeatable power-loss and corruption test procedure;
7. benchmark collection.

The existing architecture is not reopened. Only the security technology decision remains pending evidence.
