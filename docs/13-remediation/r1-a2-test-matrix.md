# R1-A2.3 — Conflict Resolution Acceptance Test Matrix

**Status:** ACTIVE R1 WORK PACKAGE  
**Owner:** CTO / Architecture  
**Co-Owner:** Sync & Consistency Architecture  
**Cross-Track Contributors:** Authorization, Inventory, Sales/POS, Accounting, Security, QA  
**Depends On:** R1-A2.1 Conflict Taxonomy; R1-A2.2 State Machine & Authority Matrix; R1-A1.5 Test Matrix; Phase 2.2; ADR-011; ADR-012  
**Decision:** PROPOSED — NOT LOCKED

## 1. Purpose

Define the acceptance tests required to prove that conflict detection, classification, resolution authority and compensating effects are safe before the Sync Contract and Phase 3.5.

The matrix validates both business correctness and governance correctness.

Passing the matrix does not automatically lock R1-A2.

## 2. Acceptance Gates

R1-A2 is ready for lock review only when:

1. Every P0 test passes.
2. No conflict can silently disappear.
3. Duplicate delivery never creates duplicate business effects.
4. Resolution retries are idempotent.
5. Original business history is never mutated to hide a conflict.
6. Unauthorized resolution is rejected.
7. Wrong-scope resolution is rejected.
8. Human-only conflicts cannot be auto-resolved.
9. P0 conflicts cannot be silently dismissed.
10. Containment survives restart.
11. Return and refund remain separate.
12. Payment verification cannot be fabricated.
13. Accounting history remains immutable.
14. Conflict state remains durable across worker/device restart.
15. All unresolved P0 items have explicit disposition.

## 3. Test Classification

- UNIT: state and policy rules.
- INTEGRATION: conflict creation and resolution transaction.
- SYNC: push/pull/replay/order/retry.
- AUTH: capability, scope and SoD.
- BUSINESS: inventory, sales, return, payment, accounting.
- FAILURE: crash, timeout, restart and partial execution.
- SECURITY: tampering, cross-tenant/branch/device access.
- E2E: complete conflict lifecycle.
- PROPERTY: generated operation sequences.

## 4. Core Invariant Matrix

| ID | Invariant | Priority | Pass Oracle |
|---|---|---|---|
| INV-01 | Conflict is durable | P0 | Conflict survives worker/device restart |
| INV-02 | Original operation remains traceable | P0 | Original IDs/history remain unchanged |
| INV-03 | No silent overwrite | P0 | Authoritative state is never replaced implicitly |
| INV-04 | No duplicate business effect | P0 | Replay/retry creates one effect |
| INV-05 | Resolution is idempotent | P0 | Same resolution request returns same durable outcome |
| INV-06 | Unauthorized resolution is rejected | P0 | Capability/scope check blocks it |
| INV-07 | Wrong scope is rejected | P0 | Cross-tenant/branch/device action has no effect |
| INV-08 | Human-only conflict cannot auto-resolve | P0 | System escalates/queues for human resolution |
| INV-09 | P0 conflict cannot be silently dismissed | P0 | Containment/escalation/resolution is explicit |
| INV-10 | Compensation uses valid domain operations | P0 | No historical mutation or direct ledger rewrite |
| INV-11 | Return ≠ refund | P0 | Each effect has independent lifecycle |
| INV-12 | Payment verification is truthful | P0 | API verified only with actual provider result |
| INV-13 | Accounting history is immutable | P0 | Corrections are reversals/adjustments |
| INV-14 | Containment is durable | P0 | Restart preserves containment |
| INV-15 | Terminal resolution is immutable | P0 | RESOLVED cannot be edited |
| INV-16 | SoD controls are observable | P0 | Self-approval attempts are detected/audited |

## 5. State Machine Tests

### SM-01 — Detection
Trigger a known business conflict. Expected state: DETECTED. No compensation is created.

### SM-02 — Classification
Classify a detected conflict. Expected: CLASSIFIED. Type, severity and proposed resolution class are durable.

### SM-03 — Triage
Evaluate the conflict against current policy. Expected: TRIAGED. Resolution route is explicit.

### SM-04 — Begin Resolution
Authorized resolver starts resolution. Expected: RESOLVING. Resolution request has idempotency identity.

### SM-05 — Successful Resolution
All required business effects commit. Expected: RESOLVED. Audit and resulting business IDs are present.

### SM-06 — Resolution Failure
Inject a technical failure. Expected: FAILED. No partial compensation is presented as successful.

### SM-07 — Retry After Failure
Retry a safe failed operation. Expected: TRIAGED or RESOLVING according to implementation, with no duplicate effect.

### SM-08 — Escalation
Resolver lacks authority. Expected: ESCALATED. Required authority is recorded.

### SM-09 — Containment
Integrity cannot be trusted. Expected: CONTAINED. Affected unsafe operation is blocked.

### SM-10 — Recovery From Containment
Approved recovery restores integrity. Expected: TRIAGED and never direct silent resolution.

### SM-11 — Terminal Immutability
Attempt to mutate a RESOLVED conflict. Expected: rejected; a new corrective workflow is required.

## 6. Idempotency and Replay

- ID-01 Duplicate Conflict Detection: same operation produces one logical conflict.
- ID-02 Duplicate Resolution Request: same resolution_request_id produces one resolution effect and the durable prior result.
- ID-03 Timeout After Resolution Commit: retry retrieves existing outcome.
- ID-04 Concurrent Resolvers: one wins; the other receives the durable existing result or deterministic conflict.
- ID-05 Duplicate Compensation: replay creates no second compensation.

## 7. Ordering Tests

- OR-01 Valid Out-of-Order Delivery: dependency/sequence handling prevents a false business conflict.
- OR-02 Genuine Ordering Conflict: unsafe reconciliation becomes a durable business conflict.
- OR-03 Duplicate After Reordering: one business effect.

## 8. Inventory Tests

- INV-T01 Authoritative Stock Shortfall: no negative authoritative stock; durable conflict; original sale traceable; no silent deletion.
- INV-T02 Batch Expired: explicit conflict/reconciliation outcome; no silent historical batch substitution.
- INV-T03 Batch Depleted: explicit business handling; no negative stock.
- INV-T04 Deterministic Safe Substitution: only where policy explicitly permits it before final business commit; deterministic and auditable.
- INV-T05 Inventory Compensation: new valid InventoryTransaction/StockMovement; original history preserved.
- INV-T06 Cross-Branch Conflict: rejection plus audit/security event.

## 9. Allocation Tests

- AL-01 Allocation Exhausted: durable allocation conflict; no capacity manufactured.
- AL-02 Allocation Expired: explicit conflict; no silent extension.
- AL-03 Duplicate Replenishment: one capacity increase.
- AL-04 Allocation Version Collision: deterministic handling or durable conflict; never silent overwrite.
- AL-05 Cross-Device Allocation: scope rejection.
- AL-06 Reversal Release: approved reversal restores capacity according to final A1 policy; release is a new immutable allocation effect.

## 10. Sales / Return / Refund Tests

- SR-01 Sale Already Reversed: duplicate reversal is idempotent.
- SR-02 Conflicting Sale Lifecycle: one valid outcome; incompatible operation becomes durable conflict.
- SR-03 Return Accepted, Refund Pending: inventory return and monetary refund remain separate states.
- SR-04 Refund Already Completed: duplicate refund creates no second refund.
- SR-05 Return Quantity Exceeded: human resolution unless deterministic policy exists.
- SR-06 Return Capacity Loop: repeated return/retry cannot mint offline capacity beyond policy.

## 11. Payment Tests

- PAY-01 Manual Confirmation Conflict: incompatible manual decisions become durable conflict.
- PAY-02 Provider Verification Conflict: actual provider result is recorded; prior local attempt remains traceable.
- PAY-03 Evidence Is Not Proof: screenshot/OCR alone cannot produce API_VERIFIED.
- PAY-04 Duplicate Verification: same provider verification is idempotent.
- PAY-05 Hisabati Adapter Failure: payment remains pending/retryable; core payment remains provider-agnostic.

## 12. Authorization and SoD Tests

- AUTH-01 Missing Capability: rejected with no business effect.
- AUTH-02 Wrong Branch Scope: rejected.
- AUTH-03 Cross-Tenant Access: rejected and audited.
- AUTH-04 Self-Approval: blocked where prevention is required; otherwise detected/escalated according to SoD policy.
- AUTH-05 Revoked User: current authorization wins; action rejected.
- AUTH-06 Emergency Action: allowed only under approved policy with enhanced audit.
- AUTH-07 Containment Release: unauthorized user is rejected.

## 13. Security / Integrity Tests

- SEC-01 Forged Conflict ID: no access to another conflict.
- SEC-02 Tampered Resolution Payload: integrity/authentication validation fails.
- SEC-03 Cross-Device Resolution: scope rejection.
- SEC-04 Missing Provenance: containment/escalation according to policy.
- SEC-05 Local Integrity Failure: affected offline operation suspended; evidence preserved.

## 14. Accounting Tests

- ACC-01 Conflict Before Posting: no accounting entry solely from an attempted business event.
- ACC-02 Posted Effect Requires Correction: reversal/adjustment, never journal mutation.
- ACC-03 Locked Fiscal Period: Posting Exception/audit workflow according to Accounting policy.
- ACC-04 Duplicate Accounting Consumption: one financial effect per business event.

## 15. Failure / Restart Tests

- FAIL-01 Worker Crash During Classification: conflict remains DETECTED and can be classified after restart.
- FAIL-02 Worker Crash During Resolution: durable state indicates incomplete resolution; retry is safe.
- FAIL-03 Device Restart During Containment: containment survives restart.
- FAIL-04 Network Timeout After Cloud Resolution: retry retrieves durable outcome.
- FAIL-05 Database Failure: no partially presented successful resolution.

## 16. Property-Based Tests

Generated operation sequences should prove:
1. A conflict cannot disappear without a terminal or containment outcome.
2. Replaying any identical resolution request does not change the final business result.
3. Resolution never mutates the original transaction.
4. Unauthorized actors cannot produce resolution effects.
5. Cross-scope resolution cannot change another scope's business state.
6. Duplicate events cannot duplicate compensation.
7. Return and refund effects remain independently traceable.
8. Posted accounting entries are never mutated.
9. Containment cannot be bypassed through restart.
10. Equivalent operation sets converge to the same durable resolution.

## 17. Evidence Requirements

Each P0 test must retain:
- conflict_id;
- operation/event IDs;
- aggregate ID;
- device ID;
- organization/branch/warehouse;
- allocation ID where applicable;
- state before/after;
- actor/capability;
- idempotency identity;
- resulting business transaction IDs;
- audit records;
- sync/retry evidence;
- error/conflict codes.

Evidence must be reproducible and suitable for incident review.

## 18. Exit Evidence

R1-A2 is ready for governance lock review only when:
- all P0 tests pass;
- no unresolved P0 test failure remains without explicit disposition;
- state transitions are covered;
- authority boundaries are covered;
- idempotency/replay is proven;
- inventory safety is proven;
- payment truthfulness is proven;
- return/refund separation is proven;
- accounting immutability is proven;
- containment/recovery is proven;
- audit evidence is reproducible.

No arbitrary automatic-resolution percentage is required.

## 19. Open Items

1. Final capability/policy/SoD mapping from R1-A3.
2. Exact compensation rules for inventory and payment conflicts.
3. Numeric containment thresholds.
4. Final conflict retention.
5. Final sync conflict DTO.
6. Final API endpoints.
7. Notification/escalation SLAs.
8. Executable test framework and CI placement.

## 20. Decision Status

**Recommendation:** Adopt this as the R1-A2 acceptance matrix for implementation validation.

**Status:** PROPOSED TEST MATRIX — NOT LOCKED.

This matrix does not reopen locked baselines.

Phase 3.5 remains BLOCKED until R1 exit criteria are satisfied.
