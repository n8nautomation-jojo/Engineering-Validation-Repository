# R1 — Architecture & Security Remediation Baseline

**Status:** ACTIVE REMEDIATION  
**Phase:** R1  
**Precedes:** Phase 3.5  
**Does not supersede:** Locked baselines unless an explicit revision is approved.

## 1. Objective

R1 closes the highest-impact architectural, security, compliance and contract gaps discovered before finalizing the machine-readable API contract.

The goal is not to expand scope indiscriminately. The goal is to eliminate ambiguity where ambiguity could create unsafe offline behavior, financial inconsistency, security exposure, regulatory failure or implementation divergence.

## 2. Binding Decisions

### R1-D01 — Do not open Phase 3.5 yet

Phase 3.5 remains blocked until R1 exit criteria are met.

### R1-D02 — Phase 3.4 remains Proposed

Phase 3.4 will be promoted only after its endpoint contracts, authorization model, offline eligibility, evidence lifecycle and unresolved domain policies are reconciled.

### R1-D03 — Locked baselines are preserved

R1 does not reopen Domain Model v1.1, Phase 2.1–2.4, Phase 3.1 or Phase 3.3 by implication.

If a finding requires a change to a locked decision, the change must be represented by an explicit revision/ADR and linked from the Decision Log.

### R1-D04 — Offline Stock Safety must become an explicit policy specification

The existing principle remains binding:

- safety allocation is not authoritative stock truth;
- cloud remains authoritative for organization-wide consistency;
- accepted local transactions must be inventory-safe within the active local policy;
- conflicts are explicit, durable and auditable.

Before MVP-1 implementation, the exact policy must define allocation, consumption, release, replenishment, expiry, device/branch scope, exhaustion, synchronization, conflict and recovery behavior.

Whether this is exposed through ordinary REST endpoints, sync metadata, or both is intentionally deferred until the policy is designed.

### R1-D05 — Conflict Resolution is a first-class workflow

A synchronization conflict is not assumed to require sale reversal.

The resolution model must distinguish, where applicable:
- accepted business transaction;
- inventory discrepancy;
- financial/payment validity;
- reconciliation adjustment;
- compensating transaction;
- human approval;
- escalation.

No silent overwrite is permitted.

### R1-D06 — Offline eligibility becomes explicit contract metadata

API and local command contracts must use a controlled vocabulary. Initial vocabulary:

- OFFLINE_ALLOWED
- OFFLINE_ALLOWED_WITH_POLICY
- OFFLINE_QUEUEABLE
- ONLINE_REQUIRED
- OFFLINE_FORBIDDEN

Each mutation must additionally define local durability, synchronization behavior, conflict behavior and whether cloud revalidation is mandatory.

### R1-D07 — Authorization separates capability from policy

The authorization model must distinguish:
- capability;
- actor role;
- organization/branch/device scope;
- business policy;
- approval requirement;
- separation of duties;
- offline eligibility.

High-risk operations cannot be authorized solely by a broad capability name.

### R1-D08 — Payment evidence is a secured artifact lifecycle

Evidence is not settlement proof.

The final contract must define:
- upload initiation/reference;
- MIME allowlist;
- size limits;
- storage boundary;
- malware/content scanning;
- authorization;
- retention;
- retrieval/access control;
- deletion/expiry policy;
- audit metadata;
- offline queue behavior.

### R1-D09 — Refund is distinct from Sales Return

A merchandise return and a monetary refund are separate business effects.

The contract must support applicable outcomes such as:
- full refund;
- partial refund;
- original tender;
- alternate tender where policy permits;
- pending refund;
- rejected refund;
- non-cash compensation/store-credit only if explicitly approved later.

Accounting and audit implications must be defined before final API contracts.

### R1-D10 — Local data protection is mandatory design work

The POS local store contains operational and sensitive data and must have an explicit protection design covering:
- encryption at rest;
- key management;
- OS secure storage;
- device binding;
- credential/token protection;
- rotation/revocation;
- backup/export implications;
- corruption recovery;
- data minimization.

No specific encryption library is selected by R1-D10 alone.

### R1-D11 — Sudan compliance is validated before hard-coding domain rules

A regulatory assessment must establish authoritative requirements for:
- pharmacy operations;
- prescription handling;
- controlled medicines;
- tax/invoicing;
- retention;
- auditability;
- reporting;
- data/privacy obligations.

Validated requirements become configurable compliance profiles where practical, preserving the Sudan-first and future MENA/global strategy.

### R1-D12 — Hisabati remains an external adapter

Hisabati is not a core payment type.

Before implementation, the real integration contract must be discovered and validated. No provider-specific API behavior will be invented from assumptions.

### R1-D13 — Product readiness is a parallel track

Training, onboarding, conflict UX, support and pilot readiness are product gates, not substitutes for technical security controls.

### R1-D14 — Documentation is a delivery artifact

Any document marked as a binding baseline must have a matching status in the Decision Log. A decision cannot be considered locked when its source document remains Proposed unless the Decision Log explicitly states the temporary governance exception.

## 3. R1 Workstreams

| ID | Workstream | Priority | Exit Artifact |
|---|---|---|---|
| A1 | Offline Stock Safety Policy | P0 | Policy specification + API/Sync impact |
| A2 | Conflict Resolution Workflow | P0 | State/workflow specification |
| A3 | Refund Domain/API Model | P0 | Domain + API contract |
| A4 | Offline Eligibility Matrix | P0 | Endpoint/local-command matrix |
| A5 | Authorization & SoD Model | P0 | Capability/policy/scope matrix |
| S1 | Local Data Protection | P0 | Security design + ADR if needed |
| S2 | Evidence Security Lifecycle | P0 | Upload/storage/access contract |
| S3 | Device & Secret Protection review | P1 | Security controls matrix |
| C1 | Sudan Regulatory Assessment | P0 | Regulatory compliance matrix |
| I1 | Hisabati Integration Discovery | P1 | Validated adapter contract |
| P1 | Product Readiness | P1 | Pilot/training readiness checklist |
| G1 | Documentation Reconciliation | P0 | Consistent SSOT status matrix |

## 4. R1 Non-Goals

R1 does not:
- implement the sync engine;
- implement payment providers;
- generate the final OpenAPI document;
- activate multi-tenancy;
- introduce a branch-local server;
- redesign the Modular Monolith;
- replace the immutable inventory ledger;
- turn assessment observations into domain rules without validation.

## 5. Required Review Sequence

1. R1 impact assessment.
2. Domain/policy specifications.
3. Security design.
4. Regulatory validation.
5. API reconciliation.
6. Phase 3.4 review and promotion decision.
7. Phase 3.5 final OpenAPI and fixtures.

## 6. Exit Principle

R1 is complete when every P0 item has either:
- an approved decision and implementation-ready contract; or
- an explicitly deferred decision with an owner, reason, dependency and phase target.

No P0 ambiguity may remain hidden inside endpoint prose.
