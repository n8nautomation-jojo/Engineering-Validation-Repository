# R1-A1.5 — Offline Safety Allocation Test Matrix

**Status:** ACTIVE R1 WORK PACKAGE  
**Owner:** CTO / Architecture  
**Co-Owner:** QA / Domain & Inventory Architecture  
**Cross-Track Contributors:** POS, Sync, Security, Product  
**Depends On:** R1-A1.1 Problem Definition; R1-A1.2 Model Evaluation; R1-A1.3 State Machine; R1-A1.4 Policy Specification; Domain Model v1.1; Phase 2.2; ADR-011  
**Decision:** Acceptance test matrix — PROPOSED, NOT LOCKED

## 1. Purpose

This matrix defines the minimum evidence required before the Offline Stock Safety Policy can be considered lockable.

It is an **acceptance matrix**, not an implementation test suite. Test cases may later be implemented as unit, integration, property-based, failure-injection, end-to-end, or synchronization tests.

No implementation may claim R1-A1 compliance from happy-path tests alone.

## 2. Test Classification

- **UNIT:** deterministic domain/state rule.
- **INTEGRATION:** local transaction or module boundary.
- **CONCURRENCY:** competing operations/devices.
- **FAILURE:** power loss, process crash, network/database failure.
- **SYNC:** push/pull/replay/reconciliation.
- **SECURITY:** authorization, tampering and trust boundary.
- **E2E:** complete business workflow.
- **PROPERTY:** invariant tested across generated inputs/state sequences.

## 3. Acceptance Rules

R1-A1 cannot be LOCKED unless:

1. All P0 tests pass.
2. No test demonstrates negative authoritative stock caused by accepted offline safety behavior.
3. No test demonstrates duplicate business effects from retry/replay.
4. No test demonstrates unrestricted offline selling after allocation exhaustion/staleness/expiry/suspension.
5. Power-loss recovery demonstrates durable accepted local transactions.
6. Multi-POS tests demonstrate device-scoped allocation.
7. FEFO and expiry tests demonstrate that allocation never bypasses inventory safety.
8. Reconciliation tests produce durable outcomes and preserve traceability.
9. Security tests demonstrate that offline authorization and allocation are separate controls.
10. Threshold tests are parameterized because numeric limits are not yet locked.
11. Every failed test has a classified disposition; no silent waiver is permitted for a P0 invariant.
12. Evidence is reproducible from test data, logs and correlation identifiers.

## 4. Core Invariant Matrix

| ID | Invariant | Test Type | Priority | Pass Oracle |
|---|---|---|---|---|
| INV-01 | Allocation cannot create authoritative stock | INTEGRATION/SYNC | P0 | Cloud stock increases only through valid inventory business effects |
| INV-02 | No authoritative negative stock | CONCURRENCY/SYNC | P0 | Accepted cloud state never becomes negative |
| INV-03 | Offline acceptance is atomic | INTEGRATION/FAILURE | P0 | Sale, payment, inventory, allocation and required Outbox effects commit together or not at all |
| INV-04 | Allocation consumption is idempotent | SYNC/PROPERTY | P0 | Replay never consumes capacity twice |
| INV-05 | Replenishment is idempotent | SYNC/PROPERTY | P0 | Duplicate delivery never creates duplicate capacity |
| INV-06 | Allocation is device-scoped | SECURITY/CONCURRENCY | P0 | Device A cannot consume Device B capacity |
| INV-07 | FEFO remains mandatory | UNIT/E2E | P0 | Eligible batch selection follows FEFO |
| INV-08 | Expired batch cannot be sold offline | UNIT/E2E/FAILURE | P0 | Expired batch is rejected regardless of remaining allocation |
| INV-09 | Exhaustion blocks offline selling | UNIT/E2E | P0 | Capacity=0 causes deterministic rejection |
| INV-10 | Stale/expired allocation cannot become unlimited | FAILURE/SECURITY | P0 | Clock/state manipulation does not permit unrestricted sales |
| INV-11 | Cross-device borrowing is disabled by default | SECURITY/CONCURRENCY | P0 | No implicit capacity transfer |
| INV-12 | Every mutation is traceable | INTEGRATION/AUDIT | P0 | Allocation mutation links actor, device, transaction and correlation data |
| INV-13 | Reconciliation is durable | SYNC/FAILURE | P0 | Restart preserves reconciliation state/outcome |
| INV-14 | Conflicts are explicit | SYNC/E2E | P0 | Unaccepted authoritative operation becomes durable conflict state |
| INV-15 | Local UI is not recovery truth | FAILURE | P0 | Recovery reconstructs from durable state |
| INV-16 | Valid allocation alone does not authorize selling | SECURITY | P0 | Missing/invalid offline authorization blocks operation |
| INV-17 | Reversal never deletes original history | E2E/AUDIT | P0 | Original sale and compensating effects remain traceable |
| INV-18 | Return cannot silently mint offline capacity | E2E | P0 | Return follows explicit capacity-restoration policy |
| INV-19 | Allocation never bypasses negative-stock policy | UNIT/E2E | P0 | Sale is rejected when authoritative safety constraints would be violated |
| INV-20 | No silent fallback to optimistic offline selling | FAILURE/E2E | P0 | Any safety boundary results in explicit block/recovery path |

## 5. State-Machine Tests

### SM-01 — Allocate

**Setup:** UNALLOCATED device, authorized administrator, valid product/scope.

**Action:** Create allocation.

**Expected:** ACTIVE with positive capacity and valid validity window.

**Failure:** Allocation exists without provenance or device scope.

### SM-02 — Consume

**Setup:** ACTIVE allocation, eligible batch, sufficient stock and authorization.

**Action:** Complete offline sale.

**Expected:** Sale accepted; capacity decreases exactly by accepted quantity; inventory movement and Outbox exist.

### SM-03 — Exact Exhaustion

**Setup:** Remaining capacity = sale quantity.

**Action:** Complete offline sale.

**Expected:** Sale succeeds; allocation becomes EXHAUSTED; next offline consumption is blocked.

### SM-04 — Over-Consumption

**Setup:** Remaining capacity < requested quantity.

**Action:** Attempt sale.

**Expected:** Sale rejected before commit; capacity unchanged.

### SM-05 — Suspend

**Setup:** ACTIVE allocation.

**Action:** Apply valid suspension.

**Expected:** SUSPENDED; offline selling blocked; state survives restart.

### SM-06 — Reactivate

**Setup:** SUSPENDED allocation with valid recovery condition.

**Action:** Authorized reactivation.

**Expected:** ACTIVE only if capacity and validity remain valid; otherwise EXHAUSTED/EXPIRED.

### SM-07 — Expire

**Setup:** Allocation reaches expires_at.

**Action:** Attempt offline sale.

**Expected:** EXPIRED; sale blocked.

### SM-08 — Replenish

**Setup:** EXHAUSTED allocation.

**Action:** Authoritative replenishment arrives.

**Expected:** Capacity increases once; allocation becomes ACTIVE only after durable application.

### SM-09 — Reconciliation

**Setup:** Unsynchronized local consumption.

**Action:** Begin sync.

**Expected:** RECONCILING; final durable state is RECONCILED or explicitly conflicted.

### SM-10 — Retry

**Setup:** Reconciliation interrupted after partial network response.

**Action:** Retry.

**Expected:** No duplicate effect; state converges.

## 6. Atomicity and Power-Loss Tests

### PL-01 — Crash Before Commit

Inject process termination before local commit.

Expected:
- no accepted sale;
- no allocation consumption;
- no inventory movement;
- no false success response.

### PL-02 — Crash After Commit Before UI Response

Inject process termination immediately after durable commit.

Expected:
- transaction recoverable;
- allocation consumption present exactly once;
- Outbox present;
- retry does not duplicate sale.

### PL-03 — Crash During Outbox Publication

Expected:
- committed business transaction remains;
- Outbox remains pending;
- publication retry is idempotent.

### PL-04 — Device Restart While Reconnecting

Expected:
- pending synchronization resumes;
- reconciliation state is durable;
- no duplicate capacity mutation.

### PL-05 — Local DB Recovery

Corrupt or partially damaged local operational state within the tested recovery model.

Expected:
- unsafe state is detected;
- offline selling is suspended when integrity cannot be established;
- no silent reconstruction from UI state.

## 7. Multi-POS Tests

### MP-01 — Independent Allocations

Two devices receive separate allocations for the same product.

Expected:
- each consumes only its own allocation.

### MP-02 — Same Batch Offline

Two devices sell from the same projected batch while offline.

Expected:
- each is bounded by its allocation;
- no device accesses another device's capacity;
- cloud performs authoritative validation during synchronization.

### MP-03 — Allocation Exhaustion on A

Device A exhausts its allocation while B still has capacity.

Expected:
- A is blocked;
- B remains governed by B's allocation;
- A cannot borrow B's capacity implicitly.

### MP-04 — Out-of-Order Sync

B syncs before A despite A's local sale occurring earlier.

Expected:
- ordering does not create duplicate effects;
- authoritative validation and conflict state remain deterministic.

### MP-05 — Duplicate Sync

Same operation is pushed twice.

Expected:
- one business effect;
- one logical capacity consumption.

## 8. FEFO and Expiry Tests

### FE-01 — Single Eligible Batch

Expected selected batch is the earliest eligible batch.

### FE-02 — Multiple Eligible Batches

Expected quantity is consumed according to FEFO across batches where required.

### FE-03 — Oldest Batch Expired

Expected expired batch is skipped; next eligible batch is considered.

### FE-04 — All Batches Expired

Expected sale rejected; allocation unchanged.

### FE-05 — Allocation Present, Stock Absent

Expected sale rejected; allocation unchanged.

### FE-06 — Allocation Present, Batch Quantity Insufficient

Expected sale respects actual eligible stock; no capacity-only override.

## 9. Reversal and Return Tests

### RR-01 — Sale Reversal

Expected:
- original sale remains;
- compensating effect is recorded;
- any allocation release follows approved policy;
- no historical mutation.

### RR-02 — Partial Return

Expected:
- returned quantity follows return policy;
- inventory traceability preserved;
- allocation restoration follows explicit policy, not automatic assumption.

### RR-03 — Reversal Replay

Expected:
- repeated reversal request does not create duplicate compensation.

### RR-04 — Return Capacity Loop

Repeated return/retry must not generate capacity beyond policy limits.

## 10. Replenishment Tests

### RP-01 — Authorized Replenishment

Expected capacity increases by the approved amount.

### RP-02 — Duplicate Replenishment Delivery

Expected capacity increases once.

### RP-03 — Forged Local Replenishment

Attempt to modify allocation locally without authoritative input.

Expected rejection and audit/security signal.

### RP-04 — Wrong Device Replenishment

Expected device cannot apply another device's allocation.

### RP-05 — Expired Allocation Replenishment

Expected behavior follows final policy: new allocation or explicit reactivation; never silent extension.

## 11. Staleness and Threshold Tests

Numeric thresholds are parameterized.

### ST-01 — Before Warning

Expected normal operation.

### ST-02 — Warning Boundary

Expected user-visible warning without premature block if policy says warning-only.

### ST-03 — Stale Boundary

Expected policy-defined transition.

### ST-04 — Expiry Boundary

Expected offline consumption blocked exactly at the defined validity boundary.

### ST-05 — Clock Manipulation

Move local clock backward/forward within the threat model.

Expected no unauthorized extension of capacity or validity.

### ST-06 — Long Offline Duration

Expected explicit safety behavior rather than unlimited continuation.

## 12. Authorization and Security Tests

### SEC-01 — Valid Allocation, Invalid Offline Authorization

Expected sale blocked.

### SEC-02 — Valid Authorization, No Allocation

Expected offline sale blocked.

### SEC-03 — Wrong Branch Scope

Expected rejection.

### SEC-04 — Wrong Device Scope

Expected rejection.

### SEC-05 — Unauthorized Replenishment

Expected rejection and audit.

### SEC-06 — Unauthorized Suspension/Release

Expected rejection.

### SEC-07 — Exhaustion Override

Expected disabled by default.

### SEC-08 — Tampered Local Allocation Balance

Expected integrity validation detects unsafe state; offline selling is contained.

Exact cryptographic/tamper-control mechanism is deferred to R1-B.

## 13. Sync and Reconciliation Tests

### SY-01 — Push Success

Expected durable cloud acknowledgement.

### SY-02 — Push Timeout After Cloud Commit

Expected retry produces idempotent acknowledgement, not duplicate business effect.

### SY-03 — Push Rejected by Authoritative Inventory

Expected durable conflict/reconciliation state; no silent overwrite.

### SY-04 — Pull Duplicate

Expected idempotent local application.

### SY-05 — Pull Out of Order

Expected deterministic handling according to event/sequence rules.

### SY-06 — Partial Batch Failure

Expected successful operations remain durable; failed operation remains retryable and traceable.

### SY-07 — Reconciliation Restart

Expected process resumes from durable state.

### SY-08 — Conflict Visibility

Expected conflict is durable and observable without pretending the operation succeeded.

## 14. Property-Based Tests

The implementation should eventually include generated state-sequence tests for:

1. Allocation balance never becomes negative.
2. Released capacity never exceeds prior consumed/allocation limits.
3. Duplicate event application does not change final business state.
4. Reordering sync operations does not create duplicate effects.
5. Accepted local sale always has corresponding inventory and allocation effects.
6. Rejected sale never consumes allocation.
7. Expired allocation never permits offline consumption.
8. Expired batch never permits sale.
9. Device A cannot consume Device B capacity.
10. Reconciliation is convergent for equivalent operation sets.

## 15. Failure-Injection Matrix

| Failure Point | Expected Result |
|---|---|
| Before validation | No business effect |
| After validation | No committed effect until atomic commit |
| During local transaction | Rollback or recovery to one durable outcome |
| After local commit | Transaction recoverable exactly once |
| Before Outbox write | Atomicity prevents accepted transaction without required Outbox |
| After Outbox write | Pending publication is recoverable |
| During network push | Retry is idempotent |
| After cloud commit before response | Retry returns existing result |
| During pull apply | Local application is restart-safe |
| During reconciliation | Durable RECONCILING state |
| During conflict creation | Conflict must remain durable or transaction retries safely |
| During device restart | State reconstructed from durable storage |

## 16. Evidence Requirements

Every P0 test must retain enough evidence to answer:

- What device executed it?
- Which allocation was involved?
- Which business transaction was involved?
- Which product/batch was involved?
- Which local sequence/event id was involved?
- What was the allocation state before and after?
- What was inventory state before and after?
- What sync outcome occurred?
- What actor/system performed the operation?
- Was the result replayed?
- Was any conflict created?

Minimum evidence sources:
- structured logs;
- audit records;
- allocation state;
- inventory movements;
- Sale/Payment records;
- Outbox/Inbox records;
- sync/conflict records;
- correlation identifiers.

## 17. Test Data Baseline

The eventual executable suite should include at least:

- 1 organization;
- 2 branches;
- 2 warehouses;
- 3 registered POS devices;
- multiple products;
- multiple batches per product;
- batches with different expiry dates;
- zero-stock product;
- low-stock product;
- active, exhausted, suspended and expired allocations;
- multiple payment methods;
- online and offline users;
- duplicate/replayed sync operations;
- simulated network partitions;
- simulated process/device failures.

Test data must not depend on production records.

## 18. Performance / Capacity Checks

Performance is not the primary R1-A1 acceptance criterion, but the policy implementation must not undermine the existing POS target.

Measure:
- local allocation validation latency;
- local sale transaction latency;
- allocation ledger/update latency;
- recovery/replay time;
- sync reconciliation throughput.

Existing target remains:
- local POS P95 <200ms for normal local operations, excluding cloud sync, large reports and physical printer latency.

## 19. Exit Evidence

R1-A1 should be considered ready for lock review only when:

- all P0 matrix rows pass;
- no unresolved P0 invariant failure remains;
- power-loss tests pass;
- multi-POS tests pass;
- idempotency tests pass;
- FEFO/expiry tests pass;
- authorization boundary tests pass;
- reconciliation tests pass;
- threshold behavior is measured;
- all known exceptions are explicitly documented;
- resulting API/Sync implications are recorded.

Passing this matrix does **not** automatically lock R1-A1. Governance review and cross-track dependencies remain required.

## 20. Open Items

The following remain intentionally open:
1. Numeric offline/staleness thresholds.
2. Final return/reversal capacity restoration policy.
3. Exact conflict taxonomy with R1-A2.
4. Exact security/tamper controls with R1-B.
5. Final synchronization contract.
6. Executable automation technology and CI placement.
7. Whether any controlled branch-level allocation sharing is justified by operational evidence.

## 21. Decision Status

**Recommendation:** Adopt this as the acceptance matrix for R1-A1 implementation validation.

**Status:** PROPOSED TEST MATRIX — NOT LOCKED.

This matrix does not modify Domain Model v1.1, Phase 2.2, ADR-011 or any other locked baseline.

Phase 3.5 remains blocked until R1 exit criteria are satisfied.
