# R1-B Security Verification Register

**Status:** ACTIVE VERIFICATION — NOT CLOSED  
**Track:** R1-B Security  
**Decision:** No production security technology is declared PASS without executable evidence.

## 1. Executive Disposition

The R1-B security architecture is sufficiently defined to enter verification, but the repository currently contains **no trustworthy executed Windows/Tauri/SQLite prototype evidence** for the required security experiments.

Therefore:

- Security design: **PASS / READY FOR VERIFICATION**
- Technology selection: **NOT LOCKED**
- Executed prototype evidence: **NOT TESTED**
- R1-B closure: **BLOCKED**
- R1 overall closure: **BLOCKED**

This is an evidence decision, not an architecture failure.

## 2. Controls Accepted at Design Level

The following control direction is accepted as the working security baseline:

1. Registered POS device identity.
2. Cloud-side device lifecycle and revalidation.
3. OS-backed protection for long-lived local secrets.
4. Database-level protection for the local SQLite operational store, subject to compatibility evidence.
5. Authenticated integrity/provenance for security-critical local state.
6. Full-disk/filesystem protection as defense in depth.
7. Cloud revalidation and authoritative server validation.
8. Controlled revocation and re-provisioning.
9. Fail-closed behavior for privileged security decisions when required protection is unavailable.
10. No plaintext security fallback.

This does **not** select a specific encryption library, Windows API, TPM requirement, cryptographic parameter set, or hardware SKU.

## 3. Verification Register

| Test | Requirement | Evidence Type | Current Result | Gate |
|---|---|---|---|---|
| SEC-P01 | Local DB confidentiality | DYNAMIC | NOT TESTED | P0 |
| SEC-P02 | Local DB tamper detection | DYNAMIC | NOT TESTED | P0 |
| SEC-P03 | Offline auth snapshot forgery | DYNAMIC | NOT TESTED | P0 |
| SEC-P04 | Device identity cloning | DYNAMIC | NOT TESTED | P0 |
| SEC-P05 | Revoked device containment | DYNAMIC | NOT TESTED | P0 |
| SEC-P06 | Key unavailable behavior | DYNAMIC | NOT TESTED | P0 |
| SEC-P07 | DB corruption/recovery | DYNAMIC | NOT TESTED | P0 |
| SEC-P08 | Power-loss atomicity | DYNAMIC | NOT TESTED | P0 |
| SEC-P09 | Payment evidence integrity | DYNAMIC | NOT TESTED | P0 |
| SEC-P10 | Security performance overhead | DYNAMIC | NOT TESTED | P0 |
| SEC-P11 | OS reinstall/re-provisioning | DYNAMIC | NOT TESTED | P0 |
| SEC-P12 | Device replacement | DYNAMIC | NOT TESTED | P0 |
| SEC-P13 | Offline → online security transition | DYNAMIC | NOT TESTED | P0 |
| SEC-P14 | Duplicate security event handling | AUTOMATED/DYNAMIC | NOT TESTED | P1/P0 if invariant violated |
| SEC-P15 | Local-admin boundary | DYNAMIC | NOT TESTED | P0 |
| SEC-P16 | Fully compromised endpoint boundary | DYNAMIC | NOT TESTED | P0 |

## 4. Required Test Evidence

Each executed case must record:

- Test ID;
- repository commit/build;
- Windows version;
- hardware profile;
- Tauri version/build;
- SQLite implementation/version;
- security libraries and versions;
- deployment privilege model;
- preconditions;
- exact steps;
- expected result;
- actual result;
- PASS / FAIL / CONDITIONAL PASS / NOT TESTED;
- logs/artifacts;
- reviewer;
- residual risk;
- follow-up action.

A verbal assertion or architecture document is not sufficient evidence for a P0 dynamic test.

## 5. Attacker-Class Reporting

Every applicable test must identify its security boundary:

- **A0:** ordinary application user;
- **A1:** local filesystem/database access;
- **A2:** local administrator;
- **A3:** lost/stolen physical device;
- **A4:** fully compromised endpoint.

A PASS against A0/A1 cannot be generalized to A2/A4.

For A2/A4, the report must explicitly state what the platform cannot prevent and which containment/recovery controls remain effective.

## 6. Mandatory Acceptance Rules

### SEC-P01 — Database Confidentiality
PASS only if protected P0 data cannot be recovered through ordinary database inspection without required security material.

### SEC-P02 — Tamper Detection
PASS only if unauthorized modification of security-critical state is detected and does not silently become trusted state.

### SEC-P03 — Authorization Snapshot
PASS only if modification/forgery of a local authorization snapshot cannot create unauthorized protected capability.

### SEC-P04 — Device Cloning
PASS only if a copied local database/device material cannot independently become an authorized registered POS device.

### SEC-P05 — Revocation
PASS only if a revoked device cannot regain protected authority merely through restart, reconnect manipulation, or reinstall within the tested lifecycle.

### SEC-P06 — Key Unavailability
PASS only if missing/unavailable required security material results in controlled failure/recovery and never plaintext downgrade.

### SEC-P07 — Corruption
PASS only if corruption produces deterministic recovery/containment and cannot silently create invalid business state.

### SEC-P08 — Power Loss
PASS only if the accepted local transaction boundary remains atomic and durable.

### SEC-P09 — Evidence Integrity
PASS only if payment evidence cannot be silently substituted or transformed into provider verification without the required verification path.

### SEC-P10 — Performance
PASS only if security controls remain compatible with the P95 <200ms local POS target or an explicit exception is approved.

### SEC-P11/P12 — Lifecycle
PASS only if OS reinstall/device replacement require controlled re-provisioning and do not create a privilege bypass.

### SEC-P15/P16 — Host Boundary
PASS means the tested claims are true within the declared threat model. It does not mean a fully compromised endpoint is trustworthy.

## 7. What Can Be Locked Now

Without runtime evidence, the following can be locked as **architectural control requirements**:

- device identity is mandatory;
- cloud remains authoritative for device revocation;
- local security-critical state requires authenticated integrity/provenance;
- security-sensitive offline authorization must be bounded;
- required protection failure must fail closed for privileged actions;
- copied local data alone must not create a valid POS identity;
- no plaintext fallback;
- security claims must identify attacker class;
- recovery cannot silently bypass device trust.

The following remain **NOT LOCKED**:

- exact SQLite encryption technology;
- exact OS secret-storage mechanism;
- mandatory TPM;
- exact cryptographic algorithms/parameters;
- exact key rotation schedule;
- exact Windows/hardware baseline;
- exact recovery-key custody model.

## 8. R1-B Promotion Gate

R1-B can become **READY FOR LOCK** only when:

1. all P0 tests have executed;
2. no unaccepted P0 FAIL exists;
3. A0–A4 boundaries are documented from actual evidence;
4. key lifecycle is demonstrated;
5. device cloning/revocation/re-provisioning is demonstrated;
6. DB confidentiality/tamper behavior is demonstrated;
7. power-loss/recovery behavior is demonstrated;
8. performance is measured;
9. residual risks are accepted by the appropriate authority;
10. final technology choices are recorded with compatibility evidence.

## 9. Current CTO Decision

**R1-B = NOT READY FOR LOCK.**

No architecture change is required.

The correct next engineering action is to execute the prototype against a supported Windows/Tauri/SQLite environment and attach the resulting evidence to this register.

Until then, Phase 3.4 promotion and R1 closure remain gated.

## 10. Anti-Loop Constraint

Do not introduce another security architecture layer merely because a test is not yet executed.

The question for any proposed change is:

> What verified test result or R1 exit criterion proves the existing control boundary is insufficient?

If none, execute the existing verification plan instead of redesigning.
