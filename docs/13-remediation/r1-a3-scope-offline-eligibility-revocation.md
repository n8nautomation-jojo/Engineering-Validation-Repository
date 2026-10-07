# R1-A3.3 — Scope, Offline Eligibility & Revocation Policy

**Status:** PROPOSED POLICY ARTIFACT — NOT LOCKED  
**Track:** R1-A3 — Authorization Policy  
**Depends On:** R1-A3.1; R1-A3.2; R1-A2.2; R1-A1.4; Phase 2.3; Phase 3.4  
**Purpose:** Define how effective authorization is bounded by scope, offline eligibility, validity, and revocation without turning local authorization into an independent authority source.

## 1. Policy Objective

Effective authorization is:

> **Capability × Policy × Assignment × Scope × Resource State × Offline Eligibility × SoD**

A valid role assignment alone is never sufficient.

The authorization system must answer four separate questions:

1. **What may this actor do?** — Capability.
2. **Under which business policy?** — Policy.
3. **Where may the actor do it?** — Scope.
4. **Can it be done in the current runtime state?** — Resource state + offline eligibility + SoD.

## 2. Scope Hierarchy

The platform scope hierarchy is:

**Tenant → Organization → Branch → Warehouse → POS Device**

Scope is explicit. A broader scope does not automatically imply every narrower scope unless the assignment policy explicitly permits inheritance.

### 2.1 Scope Rules

- Tenant scope may contain multiple Organizations.
- Organization scope may contain multiple Branches.
- Branch scope may contain multiple Warehouses and POS Devices.
- Warehouse scope is inventory-specific and must not silently grant sales or cash authority.
- POS Device scope is required for POS runtime operations that are device-bound.
- A role assignment must carry an explicit effective scope.
- Cross-branch actions require a capability whose policy explicitly permits cross-branch scope; default behavior is deny.
- Cross-organization access is denied by default.
- Platform-level access to tenant data requires an explicit audited policy and is not implied by Platform Owner role.

### 2.2 Scope Resolution

Effective scope is the intersection of:

**Assignment Scope ∩ Request Context ∩ Resource Scope ∩ Policy Scope**

If the intersection is empty, authorization is denied.

No client-provided branch, organization, warehouse, or device identifier may expand the authenticated subject's scope.

## 3. Resource and Runtime Context

Every authorization decision for a sensitive operation should evaluate, as applicable:

- authenticated user;
- tenant;
- organization;
- branch;
- warehouse;
- POS device;
- capability;
- resource identifier;
- current resource lifecycle/state;
- assignment status;
- authorization snapshot version;
- device registration/revocation state;
- offline eligibility;
- SoD policy;
- conflict/containment state.

The client may request a resource; the server/runtime resolves and validates its authoritative scope.

## 4. Offline Authorization Model

Offline authorization is a bounded local projection of previously approved cloud authorization.

It is **not** a second identity or permission authority.

A local authorization snapshot may contain:

- subject/user identifier;
- role assignment reference;
- capability;
- scope;
- offline class;
- effective-from;
- effective-until where applicable;
- authorization snapshot version;
- issuing authority;
- issued-at;
- last-known revocation/version marker;
- device binding where required;
- integrity/provenance metadata.

The local POS may use the snapshot only for operations classified as:

- **OFFLINE_ELIGIBLE**
- **OFFLINE_RESTRICTED**, when its additional local policy conditions are satisfied.

Operations classified **ONLINE_ONLY** or **NEVER_OFFLINE** must not be enabled merely because a capability exists in the general role assignment.

## 5. Offline Eligibility

Offline eligibility is evaluated independently from role possession.

### 5.1 OFFLINE_ELIGIBLE

An operation may proceed offline when:

- user has the capability;
- assignment is valid in the local snapshot;
- requested scope matches the snapshot;
- device is registered and not locally marked revoked/suspended;
- required local resource state is available;
- SoD constraints can be enforced locally;
- operation is not blocked by a higher-priority domain rule.

Typical candidates include:

- sales.create;
- payments.record;
- payments.read;
- cash.sessions.move;
- inventory.read;
- sync.push/pull.

### 5.2 OFFLINE_RESTRICTED

An operation may be performed offline only when an explicit policy permits it and all additional safeguards are satisfied.

Examples:

- sales.return;
- sales.reverse;
- payments.evidence.add;
- payments.verify.manual;
- cash.sessions.open;
- cash.sessions.close;
- inventory.adjust.create.

The final restricted-operation list and numeric validity windows remain open until verification.

### 5.3 ONLINE_ONLY

These require current cloud authority and must not be completed from a stale local authorization snapshot.

Examples:

- role assignment;
- role management;
- device revocation;
- external payment verification;
- conflict resolution;
- allocation replenishment approval;
- audit access;
- final reconciliation.

### 5.4 NEVER_OFFLINE

This category is reserved for operations that policy or verified security/compliance requirements prohibit from local execution under any offline condition.

It is intentionally not populated universally at this stage. An operation enters this category only through explicit policy evidence.

## 6. Offline Snapshot Validity

The system must distinguish:

- **authorization validity** — whether the assignment remains valid;
- **snapshot freshness** — whether the local copy is recent enough for the operation;
- **offline eligibility** — whether the operation is allowed without live authority;
- **device validity** — whether the device remains trusted;
- **business validity** — whether domain rules permit the operation.

A fresh snapshot does not guarantee business authorization.

A stale snapshot does not become valid merely because connectivity is unavailable.

Numeric freshness/staleness durations are deliberately **NOT LOCKED** and must be selected through R1-H verification and R1-B security analysis.

## 7. Revocation Model

Revocation is authoritative at cloud level.

Revocation sources may include:

- user deactivation;
- role removal;
- role assignment scope reduction;
- capability policy change;
- device revocation;
- organization/branch suspension;
- security containment;
- conflict containment;
- emergency administrative action.

### 7.1 Connected Runtime

When connected:

1. authorization is evaluated against current authoritative state;
2. revoked/changed assignments are rejected immediately;
3. local snapshots are updated;
4. stale privileges must not be silently retained.

### 7.2 Disconnected Runtime

A disconnected device cannot know about a future cloud revocation.

Therefore offline authorization is bounded by:

- previously issued authority;
- local validity policy;
- device trust state;
- operation offline class;
- local containment state.

A local device must not manufacture extended authorization because the cloud is unavailable.

### 7.3 Revocation on Reconnection

After reconnecting:

1. receive authoritative authorization changes;
2. apply them idempotently;
3. invalidate affected local capabilities/scopes;
4. preserve already accepted transactions;
5. synchronize those transactions through normal reconciliation;
6. audit the revocation and resulting state;
7. block future unauthorized operations.

A valid transaction accepted before revocation is not retroactively deleted.

## 8. Device Revocation and Containment

Device revocation is stronger than ordinary user role change.

A revoked or contained POS device must not initiate new offline business transactions requiring trusted device state.

Containment may be triggered by:

- security incident;
- local integrity failure;
- repeated authorization anomalies;
- unresolved critical conflict;
- administrator action;
- device identity compromise.

Containment state must be durable locally and auditable.

Recovery from containment requires an explicit authorized action. Reinstalling or restarting the client must not be sufficient to bypass containment.

## 9. Scope Reduction While Offline

If a local snapshot contains broader scope than the currently known local policy, the local runtime may continue only within the last valid approved scope until its validity boundary is reached.

It must never expand scope while offline.

For example:

- Branch A assignment cannot become Branch A+B offline.
- Warehouse 1 assignment cannot become Warehouse 1+2 offline.
- Device 01 cannot consume Device 02's authorization.

Scope reduction received from the cloud must be applied idempotently and immediately when available.

## 10. Privilege Escalation Rules

The following are prohibited offline:

- creating a role;
- assigning a role;
- increasing assignment scope;
- adding a capability;
- extending authorization validity;
- approving one's own privileged escalation;
- changing device trust state;
- bypassing SoD by switching accounts without an independently authorized workflow.

Administrative emergency actions require an explicit online policy unless a future verified emergency mode is approved.

## 11. Interaction with R1-A1 Allocation

Authorization and allocation remain separate controls.

To consume offline safety allocation, the runtime must satisfy both:

**Authorization Gate**
- user authorized;
- device authorized;
- branch/warehouse scope valid;
- sale operation offline-eligible;
- SoD satisfied.

**Allocation Gate**
- allocation exists;
- allocation is ACTIVE;
- product/device scope matches;
- remaining capacity is sufficient;
- allocation has not expired/suspended;
- consumption is atomic with the accepted sale.

Authorization cannot create allocation capacity.

Allocation cannot grant authorization.

Neither may bypass inventory truth, FEFO, expiry, negative-stock policy, or sale lifecycle rules.

## 12. Interaction with R1-A2 Conflicts

Authorization conflicts include, at minimum:

- revoked assignment received after a local operation;
- scope mismatch;
- device revocation;
- stale privilege;
- authorization snapshot integrity failure;
- conflicting role/policy versions.

A synchronization conflict must preserve:

- original actor;
- original capability;
- original scope;
- authorization snapshot version;
- operation timestamp;
- device;
- business transaction;
- authoritative authorization state;
- resolution outcome.

No conflict resolution may silently rewrite the historical actor or authorization context.

## 13. Audit Requirements

Authorization events requiring audit include:

- grant;
- revoke;
- scope change;
- role assignment;
- privileged capability change;
- denied sensitive action;
- offline authorization decision for restricted actions;
- device revocation;
- containment;
- release from containment;
- authorization conflict;
- emergency administrative action.

Audit records must identify:

**Who / What / When / Where / Before / After / Why**

Where a decision is made offline, the record must also include:

- device;
- authorization snapshot version;
- local decision context;
- later synchronization/reconciliation result.

## 14. Security Boundary

This policy does not select:

- SQLCipher;
- filesystem encryption;
- key storage technology;
- TPM/secure enclave requirements;
- local credential storage mechanism.

Those decisions belong to R1-B threat-model and security design.

The authorization policy only requires that local authorization state have integrity and provenance sufficient to prevent unauthorized privilege creation or silent modification.

## 15. Acceptance Criteria

R1-A3.3 is ready for lock review only when:

1. scope hierarchy is unambiguous;
2. every MVP command has an offline class;
3. restricted offline operations have explicit safeguards;
4. online-only operations cannot be completed from stale local authority;
5. revocation behavior is deterministic;
6. device containment cannot be bypassed by restart/reinstall;
7. local scope cannot expand offline;
8. A1 allocation and authorization gates remain independent;
9. A2 conflict provenance is preserved;
10. denied sensitive actions are auditable;
11. validity/staleness values are supported by verification/security evidence;
12. no P0 authorization ambiguity remains.

## 16. Open Decisions

1. Exact offline validity/staleness durations.
2. Final OFFLINE_RESTRICTED operation list.
3. Whether any MVP operation requires NEVER_OFFLINE.
4. Exact device containment triggers.
5. Local snapshot integrity mechanism, pending R1-B.
6. Revocation propagation priority.
7. Emergency administrative mode, if any.
8. Exact SoD enforcement behavior for offline-restricted actions.
9. Final scope inheritance rules for multi-branch users.
10. Retention and alerting for authorization-denial telemetry.

**Decision status:** PROPOSED — NOT LOCKED.

**Governance:** This artifact does not reopen locked baselines. Any change outside the listed open decisions requires a demonstrated R1 exit criterion, verified defect, or explicit approved requirement.
