# R1-B.1 — Security Threat Model & Trust Boundaries

**Status:** ACTIVE WORK PACKAGE — PROPOSED / NOT LOCKED  
**Track:** R1-B — Security  
**Purpose:** Establish the security decision boundary before selecting concrete local POS protection technologies.

## 1. Security Decision Rule

R1-B will not begin with a technology preference.

The sequence is:

**Assets → Trust Boundaries → Threats → Security Invariants → Controls → Evidence → Technology Selection**

Therefore this document does **not** select SQLCipher, filesystem encryption, TPM, OS keychain, Secure Enclave, DPAPI, or another implementation mechanism.

## 2. Security Scope

R1-B covers:
- POS desktop/local SQLite;
- offline authorization snapshots;
- local credentials/session artifacts;
- offline transactions and Outbox;
- payment evidence;
- device identity and registration;
- synchronization credentials/tokens;
- cloud APIs;
- tenant/organization/branch isolation;
- audit integrity;
- conflict-resolution authority;
- sensitive operational data at rest and in transit.

Out of immediate scope:
- application feature design unrelated to security;
- final compliance/legal conclusions;
- provider-specific Hisabati security contract until its real integration contract is obtained;
- choosing a cryptographic library solely by preference.

## 3. System Trust Zones

### Z0 — External / Untrusted Environment
Examples:
- Internet;
- arbitrary local network;
- malicious or compromised external endpoint;
- user-supplied files/images;
- third-party payment/provider systems.

Assumption: no implicit trust.

### Z1 — Cloud Control Plane
Contains:
- authoritative tenant/organization data;
- authoritative inventory;
- authorization authority;
- synchronization endpoints;
- accounting posting;
- audit persistence;
- provider integration boundary.

Trust level: controlled application infrastructure, but every request remains authenticated, authorized, validated, and tenant-scoped.

### Z2 — POS Application Runtime
Contains:
- Tauri application;
- local business logic;
- local authorization evaluator;
- local operational projection;
- transaction processing;
- sync worker.

Trust level: trusted application process only to the extent its execution environment remains uncompromised.

### Z3 — POS Local Data Store
Contains:
- SQLite operational data;
- offline transactions;
- Outbox;
- authorization snapshots;
- device/session metadata;
- potentially payment evidence metadata and cached business data.

Trust level: **sensitive storage boundary**. The host machine is not assumed fully trustworthy.

### Z4 — OS / Device Boundary
Includes:
- Windows user account;
- OS credential/key storage facilities;
- filesystem;
- device hardware;
- installed applications;
- administrator privileges.

Trust level: partially trusted. A local administrator or malware may be able to inspect or modify application files unless additional controls exist.

### Z5 — Human Actor Boundary
Actors include:
- cashier;
- pharmacist;
- branch manager;
- inventory officer;
- purchasing officer;
- accountant;
- auditor;
- tenant/platform administrator.

Human authorization is policy-controlled but credentials may be stolen or abused.

## 4. Primary Assets

| Asset | Security Property | Priority |
|---|---|---|
| Offline sales | Integrity, durability, provenance | P0 |
| Local inventory projections | Integrity, availability | P0 |
| Outbox | Integrity, durability, idempotency | P0 |
| Authorization snapshot | Integrity, confidentiality, freshness | P0 |
| Device identity | Authenticity, integrity | P0 |
| Session/grant artifacts | Confidentiality, integrity, expiry | P0 |
| Payment evidence | Confidentiality, integrity, provenance | P0 |
| Sync credentials/tokens | Confidentiality, revocation | P0 |
| Audit records | Integrity, provenance, availability | P0 |
| Tenant data | Confidentiality, isolation, integrity | P0 |
| Conflict records | Integrity, provenance | P0 |
| Accounting events | Integrity, non-duplication | P0 |
| Product/customer data | Confidentiality, integrity | P1 |
| Reports/cache | Confidentiality, integrity | P1 |

## 5. Security Invariants

1. A client cannot authenticate as another tenant/organization/device through identifier manipulation.
2. A client cannot expand its authorization scope through request parameters.
3. Offline authorization cannot be forged or extended by editing local storage.
4. A revoked device cannot silently regain authority by restart/reinstall.
5. A payment evidence file cannot silently replace another evidence object while retaining trusted provenance.
6. Outbox records cannot be silently deleted after an accepted local transaction.
7. Accepted business transactions remain durable across process restart/power loss according to the transaction boundary.
8. Duplicate sync delivery cannot create duplicate business effects.
9. Tenant boundaries are enforced server-side and cannot depend on UI filtering.
10. Audit provenance cannot be silently rewritten by ordinary business operations.
11. Secrets are not stored as plaintext in application databases where a safer boundary is available.
12. Local compromise is treated as a security event and must have a containment/revocation path.
13. Security controls must not become a second source of domain truth.
14. Evidence extraction/OCR never becomes proof merely because it was machine-generated.
15. Security failure must fail closed for privileged authorization decisions where safe to do so.

## 6. Threat Categories

### T-01 — Local Database Tampering
Attacker modifies quantities, sales, payment states, Outbox rows, authorization snapshots, or device state directly in SQLite.

Primary impact: fraudulent transactions, inventory corruption, privilege escalation.

Required control classes:
- integrity protection;
- tamper detection;
- authoritative cloud validation;
- audit/provenance;
- containment.

### T-02 — Credential/Session Theft
Attacker obtains credentials, refresh tokens, device secrets, or local authorization artifacts.

Impact: impersonation and unauthorized operations.

Controls:
- secure credential lifecycle;
- bounded sessions/grants;
- device binding;
- revocation;
- least privilege.

### T-03 — Offline Authorization Forgery
Attacker edits local snapshot validity, capabilities, scope, or expiry.

Impact: privilege escalation while disconnected.

Controls:
- authenticated/integrity-protected snapshot;
- protected key material;
- bounded validity;
- device binding;
- reconnect validation.

### T-04 — Device Impersonation
Attacker clones or reuses a device identity.

Impact: unauthorized sync and transaction submission.

Controls:
- device registration;
- credential binding;
- server-side device status;
- replay/idempotency controls;
- revocation.

### T-05 — Sync Manipulation / Replay
Attacker replays, reorders, modifies, or suppresses sync operations.

Impact: duplicate effects, stale authorization, inventory/payment inconsistency.

Controls:
- authenticated transport;
- event identity;
- device sequence;
- aggregate sequence;
- Inbox/idempotency;
- authoritative validation;
- durable conflict records.

### T-06 — Payment Evidence Substitution
Attacker replaces or alters screenshot/evidence content or metadata.

Impact: false payment verification and revenue loss.

Controls:
- immutable evidence identity;
- content integrity;
- provenance;
- secure upload;
- review workflow;
- verification state distinct from evidence.

### T-07 — Privileged Insider Abuse
Authorized actor performs actions outside intended business purpose.

Controls:
- capability/policy/scope;
- SoD;
- audit;
- anomaly detection;
- review/containment.

### T-08 — Tenant Isolation Failure
Bug or malicious request crosses tenant/organization/branch boundary.

Impact: confidentiality/integrity breach.

Controls:
- server-side tenant context;
- policy enforcement;
- database constraints/indexing strategy;
- authorization tests;
- isolation tests.

### T-09 — Local Malware / Host Compromise
Malware with user-level or administrative access reads or alters local files/processes.

Security conclusion:
The platform must explicitly define the assumed host threat level. It cannot promise protection against a fully compromised operating system without hardware/OS-backed trust controls.

### T-10 — Data Exfiltration
Sensitive local or cloud data is copied by unauthorized software/person.

Controls:
- data minimization;
- encryption at rest where required;
- access controls;
- evidence lifecycle;
- secure transport;
- retention policy.

### T-11 — Denial of Service / Local Destruction
Local database or application files are deleted/corrupted.

Controls:
- transaction durability;
- backups/recovery where applicable;
- integrity checks;
- resynchronization;
- device re-provisioning;
- operational recovery procedure.

### T-12 — Audit Manipulation
Attacker attempts to alter/delete evidence of privileged activity.

Controls:
- append-only semantics;
- server-side audit;
- local audit integrity;
- event provenance;
- restricted access.

## 7. Threats Specific to Offline-First Architecture

Offline mode increases exposure because:
- cloud revocation is delayed;
- authoritative validation is temporarily unavailable;
- local storage becomes operationally critical;
- authorization snapshots have finite freshness;
- local tampering may occur before reconnect.

Therefore offline operation must be treated as a **bounded risk envelope**, not as equivalent to online trust.

The following remain mandatory:
- bounded offline authority;
- no privilege expansion offline;
- domain safety gates remain active;
- accepted local transactions remain durable;
- reconnect revalidation is authoritative;
- conflicts are durable and auditable.

## 8. Security Boundaries for R1-A1/A2/A3

### A1 — Offline Allocation
Security protects allocation state from unauthorized local mutation, but does not redefine allocation semantics.

### A2 — Conflict Resolution
Security must protect:
- resolver identity;
- authority scope;
- original provenance;
- resolution request integrity;
- compensation authorization.

### A3 — Authorization
Security must protect:
- snapshot integrity;
- credential/session artifacts;
- device binding;
- revocation state;
- audit evidence.

## 9. Threat Model Assumptions to Validate

The following assumptions are intentionally open until evidence is collected:

1. Is the POS Windows account shared or individually assigned?
2. Can cashier users obtain local administrator rights?
3. Is the POS device physically accessible to untrusted persons?
4. Are POS machines dedicated to PharmaTech or general-purpose computers?
5. Is disk encryption enabled by deployment policy?
6. Is antivirus/EDR present and centrally managed?
7. What recovery media/backup access exists?
8. Can attackers boot external media?
9. What hardware security features are available on supported POS devices?
10. What evidence can be retained centrally when a local device is suspected compromised?

These are deployment/security inputs, not reasons to redesign the domain model.

## 10. Required Security Evidence

Before selecting a concrete local protection technology, R1-B should obtain evidence for:
- realistic POS threat environment;
- Windows deployment privileges;
- physical access model;
- expected attacker capability;
- regulatory/security requirements affecting personal/payment data;
- device hardware/OS capabilities;
- operational support constraints;
- recovery requirements;
- acceptable performance impact;
- key lifecycle requirements.

## 11. Technology Selection Gate

Only after the threat model is accepted should the team compare:
- database-level encryption;
- filesystem/disk encryption;
- OS-backed secret storage;
- hardware-backed keys;
- application-level integrity/authentication;
- combinations of the above.

The decision must state:
- protected asset;
- attacker model;
- security property;
- operational trade-off;
- recovery behavior;
- key provisioning;
- key rotation/revocation;
- failure mode;
- test evidence.

## 12. R1-B.1 Acceptance Gate

This work package is ready for review when:
- trust zones are accepted;
- primary assets are classified;
- P0 security invariants are accepted;
- threat categories are covered by explicit controls or downstream work;
- host threat assumptions are documented;
- technology selection remains evidence-driven;
- no unresolved P0 threat is hidden behind an implementation choice.

**Decision status:** ACTIVE SECURITY WORKING MODEL — NOT LOCKED.

**Governance:** Do not select a security technology merely to close a documentation gap. Any change must answer:

> What unresolved R1 security criterion or verified threat requires this change?
