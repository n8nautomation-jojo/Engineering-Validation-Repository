# R1-B.4 Security Prototype & Verification Plan

**Status:** ACTIVE SECURITY WORK PACKAGE — PROPOSED / NOT LOCKED  
**Track:** R1-B Security  
**Depends on:** R1-B.1 Threat Model, R1-B.2 Local POS Data Protection Requirements, R1-B.3 Technology Evaluation  
**Purpose:** Produce executable evidence before locking the local POS security technology decisions.

## 1. Objective

R1-B.4 does not select a technology by preference.

It defines the minimum prototype and verification evidence required to decide whether the proposed layered local POS security architecture is viable on the supported Windows POS environment.

The prototype must answer:

- Can protected local data remain confidential against the agreed attacker classes?
- Can security-critical state be detected as tampered?
- Can device identity and local key material be bound to the intended device?
- Can revoked devices be contained after reconnect?
- Can the system recover from restart, database copy, corruption, and device replacement?
- Can the controls coexist with the required POS latency and offline operation?
- Can support staff recover a legitimate device without creating a bypass?
- Can the security model fail closed when required protection is unavailable?

## 2. Security architecture under test

The prototype evaluates this layered model:

1. Registered device identity and cloud revalidation.
2. OS-backed protection for device/key material.
3. Database-level encryption for SQLite, if compatibility evidence supports it.
4. Authenticated integrity/provenance for security-critical local state.
5. Full-disk/filesystem protection as defense in depth.
6. Server-side validation after synchronization.
7. Controlled device revocation and re-provisioning.

No single layer is considered sufficient for every threat.

## 3. Attacker classes

The prototype must distinguish:

### A0 — Ordinary application user
Can use the POS application but does not have administrative access.

### A1 — Local filesystem/database user
Can inspect or copy local application files and the SQLite database using ordinary user-level access.

### A2 — Local administrator
Can inspect files, processes, configuration and operating-system resources within the agreed Windows deployment model.

### A3 — Lost/stolen device
Has physical possession of the device and may attempt offline access or data extraction.

### A4 — Fully compromised endpoint
Assumes malware or equivalent control of the endpoint.

The prototype must not claim that local encryption completely defeats A2/A4. It must demonstrate the actual residual-risk boundary.

## 4. Prototype components

The prototype should contain only the minimum required components:

- Tauri-compatible desktop shell or equivalent test harness;
- SQLite operational database;
- representative domain records;
- representative Outbox records;
- representative offline authorization snapshot;
- representative payment evidence metadata;
- device identity;
- protected key material;
- cloud verification stub/service;
- tamper/recovery test utilities.

The prototype is not the production POS.

## 5. Required experiments

### SEC-P01 — Database confidentiality

Actions:
1. Create representative local data.
2. Close the application.
3. Copy the SQLite database.
4. Attempt direct inspection with standard SQLite tooling.
5. Attempt access without the required key material.

Acceptance:
- protected P0 data is not available as plaintext through ordinary database inspection;
- failure behavior is controlled;
- no plaintext fallback is silently enabled.

### SEC-P02 — Database tamper detection

Actions:
1. Modify protected local records outside the application.
2. Restart the POS.
3. Attempt normal operation and synchronization.

Acceptance:
- tampering is detected where integrity protection is required;
- affected security-critical operations fail closed or enter controlled recovery;
- tamper evidence is retained.

### SEC-P03 — Authorization snapshot tampering

Actions:
1. Modify an offline authorization snapshot.
2. Increase capability or scope.
3. Restart POS while disconnected.

Acceptance:
- forged privilege/scope is rejected;
- no privilege expansion occurs;
- security event is recorded locally and surfaced after reconnect.

### SEC-P04 — Device identity cloning

Actions:
1. Provision Device A.
2. Copy its local data to Device B.
3. Attempt offline operation and reconnect.

Acceptance:
- copied data cannot make Device B an authorized clone of Device A;
- device binding is enforced;
- cloud rejects unauthorized identity;
- recovery path remains available for legitimate replacement.

### SEC-P05 — Revoked device

Actions:
1. Provision a valid device.
2. Revoke it in the cloud.
3. Test disconnected behavior within the approved offline envelope.
4. Reconnect.

Acceptance:
- connected use is denied according to revocation policy;
- sync is rejected/contained;
- restart/reinstall cannot silently restore authority;
- historical accepted transactions are preserved.

Exact offline revocation timing remains an R1-B/R1-H decision.

### SEC-P06 — Key unavailability

Actions:
1. Remove or invalidate required key material.
2. Restart POS.
3. Attempt privileged/offline operations.

Acceptance:
- system does not fall back to plaintext;
- protected operations fail closed;
- recovery/re-provisioning is explicit and auditable.

### SEC-P07 — Database corruption

Actions:
1. Introduce controlled SQLite corruption.
2. Restart.
3. Attempt normal operation.
4. Execute recovery path.

Acceptance:
- corruption is detected;
- the system does not silently continue from inconsistent state;
- recovery/re-provisioning preserves cloud-authoritative data;
- accepted local transactions are recoverable when covered by the approved durability model.

### SEC-P08 — Power loss

Actions:
1. Execute a representative offline transaction.
2. Interrupt power/process at controlled points around commit.
3. Restart.
4. Inspect local state and Outbox.

Acceptance:
- transaction is either durably committed or safely absent;
- no half-completed business effect;
- no duplicate Outbox effect;
- recovery is deterministic.

### SEC-P09 — Payment evidence integrity

Actions:
1. Store representative evidence metadata/file reference.
2. Alter or replace the evidence outside the application.
3. Attempt review.

Acceptance:
- integrity failure is detected where integrity protection is required;
- evidence is quarantined/rejected;
- OCR/extracted fields are not promoted to settlement proof automatically.

### SEC-P10 — Performance

Measure:
- protected SQLite open/read/write;
- local transaction;
- authorization snapshot validation;
- key retrieval;
- Outbox write;
- representative POS command.

Acceptance:
- security controls do not violate the approved local POS P95 target under representative workload;
- benchmark results are recorded by hardware profile.

The existing architectural target remains P95 <200 ms for local POS operations, excluding printer/cloud/reporting latency.

## 6. Recovery experiments

The prototype must demonstrate:

- normal restart;
- application crash;
- power interruption;
- database copy;
- database corruption;
- lost device;
- device replacement;
- key unavailability;
- revoked device reconnect;
- failed synchronization;
- interrupted Outbox processing.

Each scenario must have an explicit recovery owner and outcome.

## 7. Key-management verification

The prototype must document:

- where device identity is stored;
- where encryption/integrity key material is stored;
- who/what can access it;
- whether it is exportable;
- how rotation occurs;
- how revocation occurs;
- what happens after OS reinstall;
- what happens after device replacement;
- how legitimate recovery is authorized;
- what evidence recovery produces.

No password-derived local secret is acceptable as the sole protection for P0 security material.

## 8. Compatibility matrix

The prototype report must record results against the supported baseline for:

- Windows version;
- hardware profile;
- CPU/RAM/storage class;
- Tauri runtime;
- SQLite version;
- selected encryption library/version if any;
- OS-backed secret mechanism;
- antivirus/EDR assumptions;
- local administrator policy;
- disk encryption state.

The supported hardware/software baseline must be explicit before the security technology is locked.

## 9. Decision matrix

Each candidate control must receive:

- PASS;
- CONDITIONAL PASS;
- FAIL;
- NOT TESTED.

Criteria:

1. confidentiality;
2. integrity;
3. device binding;
4. offline compatibility;
5. key protection;
6. revocation;
7. recovery;
8. device replacement;
9. performance;
10. Windows compatibility;
11. Tauri compatibility;
12. SQLite compatibility;
13. supportability;
14. operational complexity;
15. residual risk.

A P0 criterion marked NOT TESTED cannot be treated as an approved security decision.

## 10. Required evidence package

The R1-B.4 evidence package should contain:

- prototype source;
- environment specification;
- experiment scripts;
- benchmark results;
- tamper results;
- recovery results;
- screenshots/logs where useful;
- key lifecycle notes;
- compatibility findings;
- residual-risk statement;
- recommendation;
- unresolved questions.

Evidence should be reproducible by another engineer.

## 11. Technology decision gate

Only after B.4 evidence is reviewed may the project lock decisions for:

- SQLite/database encryption approach;
- OS-backed secret storage;
- device identity mechanism;
- key hierarchy implementation;
- hardware-backed protection requirements;
- recovery/re-provisioning mechanism;
- required deployment security baseline.

If evidence fails, return only to the failed decision.

Do not reopen unrelated architecture.

## 12. Security claims that remain prohibited

Until evidence exists, the project must not claim:

- local encryption defeats a fully compromised endpoint;
- TPM is mandatory;
- SQLCipher is mandatory;
- Windows Credential Manager/DPAPI is sufficient by itself;
- disk encryption alone protects application secrets;
- reinstalling the OS cannot affect local security;
- revocation is instantaneous while offline;
- all local evidence is cryptographically non-repudiable.

Claims must match demonstrated controls and attacker assumptions.

## 13. Exit criteria

R1-B.4 is complete when:

- attacker classes are tested or explicitly bounded;
- all P0 experiments have evidence;
- key lifecycle is documented;
- recovery paths are demonstrated;
- performance is measured;
- compatibility is verified;
- residual risks are explicit;
- no untested P0 assumption remains in the proposed technology decision;
- failed experiments have a documented targeted resolution or remain an explicit R1 blocker.

## 14. Relationship to later implementation

B.4 is a security verification gate, not production implementation.

Once the security decision is approved, the final controls are reconciled into the permanent security architecture documentation and implementation specifications.

R1 remains the remediation history and evidence trail.
