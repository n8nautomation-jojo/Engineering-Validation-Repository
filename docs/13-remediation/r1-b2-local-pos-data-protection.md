# R1-B.2 — Local POS Data Protection & Key Management Requirements

**Status:** ACTIVE SECURITY WORK PACKAGE — PROPOSED / NOT LOCKED  
**Track:** R1-B — Security  
**Depends On:** R1-B.1 Threat Model; R1-A3 Authorization; R1-A1 Offline Safety; Phase 2.3 Authentication/Authorization Runtime

## 1. Purpose

Translate the accepted threat model into concrete security requirements for the local POS environment before selecting implementation technologies.

This document defines **what must be protected and what guarantees are required**. It does not yet select SQLCipher, Windows DPAPI, Credential Manager, TPM, filesystem encryption, or another specific technology.

## 2. Security Objective

The local POS must provide a bounded security envelope for offline operation:

- confidentiality against ordinary local data exposure;
- integrity against unauthorized application-level modification;
- authenticated device/application state;
- bounded offline authorization;
- durable transaction provenance;
- protected synchronization credentials;
- tamper detection and cloud revalidation;
- recoverability after corruption or device replacement.

The platform must not claim to defeat a fully compromised operating system or a hostile administrator without an explicit stronger trust mechanism.

## 3. Asset Protection Classes

### Class P0 — Critical

1. Device identity and device credentials.
2. Offline authorization snapshots.
3. Authentication/session grants.
4. Outbox and sync state.
5. Accepted offline business transactions.
6. Local inventory safety allocation state.
7. Payment verification state and evidence provenance.
8. Audit/provenance records.
9. Cryptographic key material or key-encryption material.

### Class P1 — Sensitive

- customer/patient information;
- supplier information;
- product/pricing data;
- cached reports;
- operational configuration;
- local logs that may contain business identifiers.

### Class P2 — Low Sensitivity

- static UI assets;
- non-sensitive application metadata;
- rebuildable caches.

## 4. Required Security Properties

| Asset | Confidentiality | Integrity | Authenticity | Freshness | Recovery |
|---|---|---|---|---|---|
| Device credentials | MUST | MUST | MUST | MUST | MUST |
| Authorization snapshot | SHOULD | MUST | MUST | MUST | MUST |
| Outbox | SHOULD | MUST | MUST | MUST | MUST |
| Offline transaction | SHOULD | MUST | MUST | MUST | MUST |
| Allocation state | SHOULD | MUST | MUST | MUST | MUST |
| Payment evidence | MUST | MUST | MUST | MUST | MUST |
| Audit/provenance | SHOULD | MUST | MUST | MUST | MUST |
| Customer/patient data | MUST | MUST | MUST | POLICY | MUST |
| Product catalog | SHOULD | MUST | MUST | POLICY | MUST |

## 5. Protection Layers

The final design should be layered rather than relying on one control.

### Layer 1 — Transport Security

All cloud communication MUST use authenticated encrypted transport.

Requirements:
- TLS;
- server certificate validation;
- no plaintext sync/authentication endpoints;
- credential/token protection;
- replay resistance at protocol/application level.

### Layer 2 — Application Authorization

Every privileged local operation MUST pass the A3 authorization model.

Local storage access alone must not be treated as authorization.

### Layer 3 — Data Integrity

P0 local state MUST have a mechanism allowing the application to detect unauthorized modification.

Required properties:
- tamper detection;
- binding to the intended device/application context where feasible;
- detection of rollback or stale privileged state;
- deterministic failure behavior.

### Layer 4 — Data Confidentiality

Sensitive local data SHOULD be protected against offline filesystem inspection.

The required strength depends on the host threat model.

### Layer 5 — Secret Protection

Long-lived secrets MUST NOT be stored as plaintext in SQLite or ordinary configuration files.

Secrets should be protected using an OS/hardware-backed facility where supported.

### Layer 6 — Server Revalidation

Cloud remains authoritative.

Local protection does not replace:
- sync validation;
- authorization revocation;
- inventory validation;
- payment verification;
- conflict handling.

## 6. Key Hierarchy Requirements

The final implementation should use a logical key hierarchy rather than one application-wide plaintext secret.

At minimum distinguish:

1. **Device identity secret**
2. **Local data protection key/material**
3. **Authorization snapshot integrity key/material**
4. **Evidence protection key/material**, where required
5. **Transport/session credentials**

The exact cryptographic algorithms and storage mechanisms remain open.

### Required properties

Keys MUST:
- have explicit ownership;
- have defined lifecycle;
- be non-exportable where platform facilities permit;
- support revocation/rotation;
- not be derived from a user's password alone;
- not be recoverable merely by copying the SQLite database.

## 7. Device Binding

Local security state should be bound to the registered POS device.

A copied database should therefore be insufficient by itself to create a valid operational device.

Device binding must support:
- registration;
- activation;
- suspension;
- revocation;
- replacement/re-provisioning;
- secure recovery;
- audit.

Device replacement must not silently inherit unrestricted authority from the old device.

## 8. Authorization Snapshot Protection

The snapshot must protect:

- subject identity;
- assigned capabilities;
- scope;
- offline class;
- validity;
- snapshot version;
- issuing authority;
- device binding;
- revocation/version metadata.

The application must detect unauthorized changes to any security-sensitive field.

A snapshot that fails integrity validation MUST NOT be used to authorize sensitive offline actions.

## 9. Offline Transaction Protection

Accepted local transactions MUST be protected against:

- partial writes;
- deletion;
- modification;
- duplicate local commit;
- replay after restart;
- sequence rollback.

The local transaction boundary already defined by Phase 2.2 remains authoritative:

**Sale + Payment + InventoryTransaction + StockMovement + Allocation consumption + Outbox/Audit → one atomic commit**

Security controls must reinforce this boundary, not create a second transaction system.

## 10. Outbox Protection

Outbox is P0 state.

Required:
- durable write in the same transaction as the accepted business operation;
- integrity validation;
- unique event identity;
- local sequence;
- retry-safe state;
- protection from silent deletion;
- reconciliation with authoritative cloud state.

An attacker deleting an Outbox row must be detectable as a local integrity/security event where practical.

## 11. Payment Evidence Protection

Evidence may contain sensitive financial/customer information.

Requirements:
- unique evidence identifier;
- immutable provenance metadata;
- content integrity;
- authenticated upload;
- access authorization;
- controlled retention;
- reviewer identity;
- verification decision separate from evidence itself.

OCR/extracted metadata must remain untrusted input until a business verification decision occurs.

## 12. Local Logs and Audit

Local logs must not become an alternate source of financial truth.

Security-relevant logs should capture:
- device;
- actor;
- operation;
- authorization decision;
- offline/online state;
- snapshot version;
- correlation/idempotency identifier;
- integrity/security failure.

Authoritative audit persistence remains governed by the existing Audit baseline.

## 13. Backup and Recovery

Recovery must distinguish:

### A. Normal application restart
Local database and pending Outbox remain usable.

### B. Local database corruption
Device enters a controlled recovery state.

### C. Device replacement
New device registration is required.

### D. Suspected compromise
Device can be remotely suspended/revoked when connectivity is available.

### E. Lost device
Device credentials must be revocable independently of user role changes.

A copied database without valid device security material must not automatically become an operational POS.

## 14. Failure Modes

Security failure behavior:

| Condition | Required Behavior |
|---|---|
| Snapshot integrity failure | Deny affected offline privileged operation |
| Device credential invalid | Stop privileged sync/operation |
| Local key unavailable | Controlled recovery; no plaintext fallback |
| Database corruption | Recovery/re-provisioning path |
| Revoked device reconnects | Reject synchronization and contain device |
| Evidence integrity failure | Evidence rejected/quarantined |
| Security state ambiguous | Fail closed for privileged actions |
| Cloud unavailable | Continue only within approved offline envelope |

No fallback may silently downgrade security.

## 15. Threat-to-Control Mapping

| Threat | Required Control |
|---|---|
| Local DB tampering | Integrity protection + detection + cloud revalidation |
| Credential theft | Secure secret storage + bounded sessions + revocation |
| Snapshot forgery | Authenticated/integrity-protected snapshot + device binding |
| Device cloning | Device credential binding + server registration |
| Sync replay | Event IDs + sequence + Inbox/idempotency |
| Evidence substitution | Content/provenance integrity |
| Insider abuse | A3 capability/policy/SoD/audit |
| Tenant breach | Server-side tenant isolation |
| Local malware | Host threat boundary + containment |
| Data theft | Data minimization + appropriate encryption |
| DB destruction | Recovery/re-provisioning |
| Audit manipulation | Append-only authoritative audit + integrity controls |

## 16. Technology Decision Criteria

Candidate technology must be evaluated against:

1. Does it protect the identified asset?
2. Against which attacker?
3. Does it provide confidentiality, integrity, or both?
4. Where are keys stored?
5. Can keys be extracted by a local administrator?
6. What happens after OS reinstall?
7. What happens after database copy?
8. What happens after device replacement?
9. Can support recover the device without bypassing security?
10. Does it work on supported Windows versions/hardware?
11. What is the performance impact on P95 local POS latency?
12. Does it work offline?
13. How is revocation handled?
14. How are keys rotated?
15. What evidence can verify the guarantee?

## 17. Candidate Control Families

The next technology evaluation should compare combinations of:

- application-level authenticated encryption/integrity;
- SQLite/database-level encryption;
- OS-backed secret storage;
- filesystem/disk encryption;
- hardware-backed key protection;
- remote/device identity controls;
- server-side revalidation.

No candidate is approved by this document.

## 18. Important Security Boundary

The platform must distinguish:

### Protection from ordinary filesystem/database inspection
Potentially achievable through encryption and secure secret storage.

### Protection from a local administrator
Requires stronger OS/hardware trust assumptions and may not be fully achievable by application-only controls.

### Protection from a fully compromised endpoint
Cannot honestly be guaranteed by the application alone.

Therefore security claims must always name the attacker model.

## 19. Required R1-B Evidence

Before technology lock:

- supported Windows baseline;
- POS privilege model;
- physical access model;
- expected malware/administrator threat;
- available OS credential protection;
- available hardware security features;
- deployment/maintenance model;
- recovery/re-provisioning process;
- acceptable performance impact;
- evidence from prototype/verification tests.

## 20. Acceptance Gate

R1-B.2 is ready for technology decision when:

- every P0 asset has explicit required protections;
- key ownership/lifecycle is defined;
- device binding requirements are defined;
- recovery behavior is defined;
- failure behavior is fail-closed for privileged security decisions;
- threat-to-control mapping is complete;
- candidate technologies can be compared against the same criteria;
- no security requirement depends on an untested implementation assumption.

**Decision status:** PROPOSED SECURITY REQUIREMENTS — NOT LOCKED.

**Next artifact:** R1-B.3 — Technology Evaluation Matrix & Local POS Protection Decision.

**Governance:** Do not select a technology merely because it is familiar or convenient. Selection requires a threat-model-backed control/evidence match.
