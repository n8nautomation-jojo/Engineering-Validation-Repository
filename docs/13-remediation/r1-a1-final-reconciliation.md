# R1-A1 — Final Reconciliation

**Status:** READY FOR EXECUTION VALIDATION — POLICY NOT LOCKED  
**Track:** R1-A1 Offline Stock Safety  
**Owner:** CTO / Architecture  
**Source:** R1-A1 problem definition, model evaluation, state machine, policy specification and acceptance matrix  
**Governance:** R1 change-control guardrail; no locked baseline is revised by this reconciliation.

## 1. Executive Decision

R1-A1 is architecturally reconciled around a **Controlled Offline Safety Allocation** model with reservation-like accounting semantics, while preserving a single authoritative inventory ledger.

The policy is **not** a second inventory ledger and does not create authoritative stock.

The selected direction for MVP-1 is:

- product-level quantity capacity;
- scoped to POS device;
- within branch/warehouse;
- authoritative creation/replenishment;
- atomic local consumption with the accepted offline sale;
- no implicit cross-device borrowing;
- exhaustion blocks offline consumption;
- FEFO and expiry remain binding;
- cloud revalidation remains authoritative;
- conflicts are handed to R1-A2;
- authorization and local data protection remain bounded by R1-A3/R1-B.

This reconciliation does not introduce new business rules; it records the already-evaluated direction and its dependencies.

## 2. Reconciled Invariants

The following are accepted as binding R1-A1 implementation invariants:

1. Allocation cannot create authoritative stock.
2. Authoritative stock remains the inventory transaction/movement truth.
3. Offline safety consumption is atomic with the accepted local transaction.
4. Duplicate delivery/reconciliation cannot create duplicate business effects.
5. Allocation is explicitly device-scoped.
6. Branch/warehouse isolation is preserved.
7. FEFO remains mandatory.
8. Expired stock remains unsellable offline.
9. Negative stock is not enabled by the allocation mechanism.
10. Exhaustion is explicit and blocks further offline consumption.
11. Replenishment is authoritative and idempotent.
12. Cross-device borrowing is not allowed by default.
13. Recovery is based on durable state, not UI state.
14. Known authoritative conflicts are durable and auditable.
15. Original financial/business history is not silently mutated.
16. Allocation mutations have provenance and auditability.

## 3. Explicit Boundaries

### Inventory
The allocation state constrains offline execution. It does not replace the immutable inventory ledger.

### Sync
The Outbox/Inbox and sequence model remain governed by Phase 2.2. R1-A1 does not redefine synchronization transport.

### Conflict
Business conflicts are classified and resolved under R1-A2. A1 may detect/emit the condition but does not create an independent conflict-resolution model.

### Authorization
Offline eligibility, scope intersection, revocation and SoD remain governed by R1-A3.

### Security
Cryptographic storage, device-key protection, local database protection and attacker-class boundaries remain governed by R1-B.

### Payment
Payment verification remains governed by ADR-012. Allocation consumption does not convert payment evidence into provider verification.

## 4. MVP-1 Guardrails

The following are intentionally excluded from MVP-1 unless separately approved:

- pure optimistic offline selling;
- branch-wide shared offline capacity;
- implicit cross-device borrowing;
- dynamic global rebalancing;
- speculative batch-level reservation engine;
- automatic exhaustion override;
- heuristic automatic conflict resolution;
- a second stock ledger;
- provider-specific inventory behavior.

## 5. Remaining Execution Gates

R1-A1 is **not promoted to LOCKED** because the following require executable evidence or cross-track closure:

1. Numeric validity/staleness thresholds.
2. Final reversal-capacity restoration behavior.
3. Return-capacity restoration behavior.
4. Exact replenishment approval path.
5. Final A1/A2 conflict taxonomy reconciliation.
6. A1/A3 offline authorization execution evidence.
7. A1/B security and tamper-control execution evidence.
8. Final A1 synchronization contract.
9. Full P0 acceptance matrix execution.
10. Power-loss and multi-POS evidence.

These are execution gates, not reasons to redesign the architecture.

## 6. Exit Criteria

A1 may be promoted only when:

- all P0 A1 acceptance tests pass;
- power-loss recovery is demonstrated;
- multi-POS device isolation is demonstrated;
- duplicate/replay behavior is demonstrated;
- FEFO/expiry behavior is demonstrated offline;
- allocation exhaustion is demonstrated as fail-closed;
- authorization boundaries are demonstrated;
- reconciliation is durable and idempotent;
- thresholds are measured and approved;
- A2/A3/B dependencies are reconciled;
- evidence is reproducible.

## 7. CTO Decision

**R1-A1 design direction: ACCEPTED FOR EXECUTION.**

**R1-A1 policy lock: DEFERRED UNTIL EXECUTION EVIDENCE.**

No architecture redesign is authorized or required by the current evidence.

Next execution priority:

**A1 P0 executable conformance → A2/A3 production-runtime evidence → B Windows/SQLite/Tauri evidence → R1 final reconciliation.**
