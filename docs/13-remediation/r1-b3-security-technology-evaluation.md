# R1-B.3 — Local POS Security Technology Evaluation & Protection Decision

**Status:** PROPOSED SECURITY DECISION — NOT LOCKED  
**Track:** R1-B — Security  
**Depends On:** R1-B.1 Threat Model; R1-B.2 Local POS Data Protection Requirements; R1-A1; R1-A2; R1-A3; Phase 2.3

## 1. Purpose

Evaluate candidate technology/control families against the approved threat model and B.2 requirements without prematurely selecting a single product or library.

The intended result is a layered protection architecture with explicit residual risks, test requirements, and a technology-selection gate.

This document does **not** lock a specific encryption library, SQLCipher deployment, Windows API, TPM requirement, key store, or hardware baseline.

## 2. Decision Principles

1. Security controls are selected from Assets → Threats → Required Properties → Controls → Evidence.
2. No single technology is expected to satisfy all P0 requirements.
3. Integrity and authenticity are mandatory for P0 operational/security state.
4. Confidentiality requirements depend on the attacker model and data class.
5. Device identity and server revalidation remain separate from database encryption.
6. A copied database must not, by itself, create an operational POS.
7. Local administrators and fully compromised endpoints are distinct threat models; claims must state the boundary.
8. Recovery must not become an undocumented security bypass.
9. Controls must preserve the Phase 2.2 atomic transaction boundary.
10. Technology is not considered selected until prototype evidence validates the required guarantees and performance.

## 3. Attacker Models

| Model | Meaning | Security expectation |
|---|---|---|
| A0 | Ordinary filesystem/database inspection | Strong confidentiality + integrity expected |
| A1 | Compromised application user without OS admin | Privileged operations remain authorization-controlled |
| A2 | Local OS administrator | Application-only secrecy cannot be assumed absolute; stronger OS/hardware controls evaluated |
| A3 | Fully compromised endpoint/malware with equivalent local control | No absolute prevention claim; focus on containment, revocation, detection, recovery |
| A4 | Remote/cloud attacker | TLS, authentication, tenant isolation, authorization, idempotency and server validation |

## 4. Candidate Control Families

### C1 — Application-Level Authenticated Encryption / Integrity

Protect selected P0/P1 records or payloads at the application layer.

**Strengths**
- explicit control over cryptographic boundaries;
- portable across SQLite/cloud implementations;
- can protect selected high-value fields;
- can provide authenticated integrity independent of ordinary database access.

**Weaknesses**
- key management is the hard problem;
- indexing/querying encrypted fields can be constrained;
- implementation mistakes can create serious vulnerabilities;
- does not protect a key already exposed to a compromised endpoint.

**A0:** Strong when keys are separately protected.  
**A2/A3:** Limited by key accessibility and host compromise.  
**Decision role:** Supporting layer, not sole local protection.

### C2 — SQLite / Database-Level Encryption

Encrypt the local SQLite database through an appropriate encryption-capable implementation.

**Strengths**
- broad database-at-rest coverage;
- transparent protection for many sensitive tables;
- reduces exposure from copied database files;
- operationally attractive for offline POS.

**Weaknesses**
- key storage remains external to the database;
- database encryption does not itself solve device identity, authorization, revocation, or replay;
- compatibility/licensing/build/support must be validated;
- a running process with access to the database key may still expose data.

**A0:** Strong candidate.  
**A2:** Depends heavily on key protection and OS assumptions.  
**A3:** Not an absolute defense.  
**Decision role:** Strong candidate for broad local confidentiality, subject to compatibility and key-management evidence.

### C3 — Windows OS-Backed Secret Storage

Use a Windows-protected mechanism to protect device-bound secrets or key-encryption material.

**Strengths**
- moves long-lived secrets out of plaintext application configuration;
- can bind protection to OS/user/device context depending on mechanism;
- appropriate for credential/key lifecycle controls;
- avoids deriving operational secrets from user passwords.

**Weaknesses**
- behavior varies with Windows identity and deployment model;
- recovery and device replacement require explicit design;
- local administrators may retain significant capability depending on configuration;
- not itself database encryption.

**A0:** Strong for secret protection.  
**A2:** Partial/assumption-dependent.  
**A3:** Containment rather than prevention.  
**Decision role:** Strong candidate for the key-protection layer.

### C4 — Filesystem / Full-Disk Encryption

Use platform/device storage encryption to protect the local volume.

**Strengths**
- broad protection against offline disk theft and raw filesystem inspection;
- protects many application files without application changes;
- useful baseline control.

**Weaknesses**
- weak against an already running authenticated OS session;
- does not provide application authorization;
- does not independently provide event-level integrity/provenance;
- recovery keys and device lifecycle require operational controls.

**A0:** Strong candidate.  
**A2/A3:** Limited.  
**Decision role:** Baseline defense where supported; not sufficient alone.

### C5 — Hardware-Backed Key Protection / TPM

Use available hardware-backed facilities to protect high-value key material or device identity.

**Strengths**
- raises the difficulty of extracting protected keys;
- can strengthen device binding and recovery controls;
- useful against some forms of disk/database copying and credential extraction.

**Weaknesses**
- hardware availability/configuration cannot be assumed;
- provisioning, replacement and recovery become more operationally complex;
- virtualization/repair/support scenarios require testing;
- does not make a compromised running endpoint trustworthy.

**A0:** Strong supporting control.  
**A2:** Potentially stronger than software-only protection.  
**A3:** Still bounded by endpoint compromise.  
**Decision role:** Preferred enhancement where supported; exact requirement remains open pending hardware baseline.

### C6 — Device Identity + Cloud Revalidation

Register each POS device and bind synchronization/privileged operations to a server-recognized device identity.

**Strengths**
- enables revocation, suspension and replacement;
- prevents a copied database from becoming a valid device by itself;
- provides cloud-side authoritative control;
- directly supports A3 offline authorization and security containment.

**Weaknesses**
- cannot prevent all local tampering while disconnected;
- requires reliable provisioning/revocation lifecycle;
- cloud unavailability means bounded offline authority must still exist.

**A0:** Strong as identity control.  
**A2:** Stronger server-side containment, but not local secrecy.  
**A3:** Critical containment mechanism.  
**Decision role:** Mandatory architectural layer.

## 5. Comparative Evaluation

| Control | Confidentiality | Integrity/Tamper Detection | Device Binding | Revocation | Offline | A0 | A2 | A3 | Recommended role |
|---|---|---|---|---|---|---|---|---|---|
| C1 App crypto | Strong/selective | Strong if authenticated | Possible | External | Yes | Strong | Limited | Limited | Supporting P0 layer |
| C2 DB encryption | Strong/broad | Depends on implementation | External | External | Yes | Strong | Limited/conditional | Limited | Strong candidate for DB-at-rest |
| C3 OS secret storage | Key protection | Indirect | Strong/conditional | Supported via lifecycle | Yes | Strong | Conditional | Limited | Key protection |
| C4 Disk encryption | Strong at rest | Limited application provenance | Device-level | Device lifecycle | Yes | Strong | Weak while running | Weak | Baseline at-rest control |
| C5 TPM/hardware | Key protection | Indirect | Strong | Strong with provisioning | Yes | Strong | Potentially stronger | Limited | Optional/preferred enhancement |
| C6 Device + cloud | No local data secrecy by itself | Strong server validation | Strong | Strong | Bounded | Strong | Strong server control | Critical containment | Mandatory |

## 6. Recommended Layered Direction

The evaluation supports a **layered architecture**, rather than choosing one technology as the security solution:

### Layer A — Device Identity and Server Control
**Mandatory.**

Every POS device has a registered identity with lifecycle states such as active, suspended and revoked. Cloud revalidation remains authoritative.

### Layer B — OS/Hardware-Backed Secret Protection
**Mandatory for P0 long-lived secrets where supported.**

The exact Windows facility and whether TPM/hardware binding is required must be selected after deployment/hardware evidence.

### Layer C — Local Database At-Rest Protection
**Strongly recommended; technology selection remains gated.**

The preferred direction is database-level protection for the local operational store, subject to Windows/Tauri/SQLite compatibility, licensing, recovery and performance validation.

### Layer D — Application-Level Integrity for Security-Critical State
**Mandatory where database-level guarantees alone are insufficient.**

At minimum, security-sensitive state must have authenticated integrity/provenance semantics sufficient to detect unauthorized modification or rollback.

### Layer E — Full-Disk / Filesystem Protection
**Recommended deployment baseline where available.**

This is defense in depth against offline device/storage exposure, not a substitute for application controls.

### Layer F — Cloud Revalidation and Containment
**Mandatory.**

Sync, authorization revocation, inventory validation, conflict resolution and payment verification remain authoritative cloud controls where applicable.

## 7. What This Decision Does Not Approve

The following remain **OPEN**:

- exact SQLite encryption implementation;
- exact Windows secret-storage API/mechanism;
- mandatory TPM requirement;
- exact cryptographic algorithms/parameters;
- exact key derivation scheme;
- exact device credential format;
- exact key rotation period;
- exact recovery/re-provisioning workflow;
- supported Windows hardware baseline;
- exact local-admin threat assumptions;
- exact disk-encryption deployment policy.

No implementation should treat any of these as locked merely because this document recommends a layered direction.

## 8. Performance and POS UX

Security controls must not violate the existing local POS target of **P95 <200 ms** for normal local operations, excluding cloud synchronization, large reports and physical printer latency.

The benchmark must measure at least:

- product lookup;
- barcode scan → cart;
- FEFO batch selection;
- sale completion;
- payment capture;
- inventory transaction commit;
- Outbox write;
- application restart;
- database open;
- representative encrypted reads/writes;
- recovery/reconciliation operations.

Security correctness takes precedence over the latency target; performance regressions must be measured rather than assumed.

## 9. Recovery and Lifecycle Evaluation

Every candidate must be tested for:

1. normal restart;
2. application crash;
3. power loss;
4. database copy to another machine;
5. OS reinstall;
6. device replacement;
7. credential rotation;
8. device suspension;
9. device revocation;
10. database corruption;
11. lost recovery material;
12. re-provisioning;
13. support-assisted recovery without silent security bypass.

A solution that is secure only while the original device remains unchanged is not sufficient for a commercial POS lifecycle.

## 10. Evidence Gate

Technology selection requires executable evidence for:

### E-B3-01 — Database Copy
Copied DB alone cannot create an operational POS.

### E-B3-02 — Tamper Detection
Modification of security-critical local state is detected and handled deterministically.

### E-B3-03 — Snapshot Protection
Forged/modified offline authorization snapshot cannot authorize protected actions.

### E-B3-04 — Device Revocation
Revoked device cannot regain privileged synchronization/operation merely by restart or reinstall.

### E-B3-05 — Key Protection
Long-lived secrets are not present in plaintext application configuration/database.

### E-B3-06 — Power Loss
Accepted local transaction remains atomic and durable.

### E-B3-07 — Recovery
Corruption/replacement follows controlled recovery without unrestricted privilege inheritance.

### E-B3-08 — Performance
Measured security overhead remains compatible with the local POS UX target or has an explicitly approved exception.

### E-B3-09 — Compatibility
Validated on the supported Windows/Tauri/SQLite deployment matrix.

### E-B3-10 — Host Threat Boundary
Tests document what is and is not protected against local admin/full endpoint compromise.

## 11. Decision Matrix for Final Technology Selection

Final selection should score candidates on:

| Criterion | Weight |
|---|---:|
| P0 threat coverage | 20% |
| Key protection / lifecycle | 15% |
| Integrity / tamper detection | 15% |
| Device binding / revocation | 10% |
| Recovery / supportability | 10% |
| Windows/Tauri/SQLite compatibility | 10% |
| Offline reliability | 5% |
| Performance | 5% |
| Operational complexity | 5% |
| Testability / evidence quality | 5% |

The weights are a decision aid, not a substitute for security gates. A candidate that fails a mandatory P0 invariant cannot be selected merely by achieving a high weighted score.

## 12. Provisional Technology Direction

**Recommended direction, NOT LOCKED:**

1. Registered device identity + cloud revalidation.
2. OS-backed protection for device/key material.
3. Database-level encryption for the local SQLite store, subject to proof.
4. Authenticated integrity/provenance for P0 security-critical state.
5. Full-disk/filesystem encryption as defense in depth where operationally available.
6. Hardware-backed key protection as preferred enhancement where the supported POS hardware baseline provides it.
7. No plaintext fallback when a required security control is unavailable.

This is a **layered control architecture**, not approval of a specific vendor/library.

## 13. Residual Risk

Even with the recommended stack:

- a fully compromised endpoint may observe data or operations available to the running process;
- a malicious local administrator may have capabilities that application-only controls cannot fully defeat;
- offline operation inherently delays cloud revocation/revalidation;
- recovery procedures can become an attack surface;
- hardware heterogeneity may prevent uniform hardware-backed guarantees.

These are explicit residual risks to be mitigated by containment, revocation, audit, deployment controls and operational procedures.

## 14. Exit Criteria for R1-B.3

B.3 may be promoted only when:

- the deployment/hardware baseline is defined sufficiently for technology choice;
- Windows POS privilege assumptions are confirmed;
- candidate implementation compatibility is verified;
- key storage/recovery behavior is prototyped;
- database protection is benchmarked;
- tamper and device-copy tests pass;
- revocation/re-provisioning tests pass;
- power-loss/atomicity tests pass;
- residual risk is documented;
- no P0 security requirement depends on an untested assumption.

## 15. Governance

This document does not reopen locked baselines.

If prototype evidence disproves an existing locked invariant or architecture decision, the finding must follow the R1 change-control process and require an explicit revision/ADR.

**Decision status:** PROPOSED SECURITY DECISION — NOT LOCKED.

**Next:** R1-B.4 — Security Prototype & Verification Plan, followed by R1-H measurement/evidence reconciliation before technology lock.
