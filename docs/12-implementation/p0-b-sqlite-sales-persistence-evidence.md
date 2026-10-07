# P0-B SQLite Sales Persistence & Concurrency Hardening Evidence

**Status:** IMPLEMENTED & LOCALLY VERIFIED (PR B HARDENING GATE SATISFIED)  
**Phase:** P0 First Production Vertical Slice  
**Authority:** CTO Directive — PR B Hardening Gate  
**Execution Environment:** Node.js v25.8.0 / Native SQLite (`node:sqlite`) / Windows 11  

---

## 1. Scope & Objective

PR B establishes the first durable SQLite persistence vertical slice for retail sales in PharmaTech:
- Atomic coordination of `Sale`, `SaleLine`, `Payment`, `InventoryTransaction`, `StockMovement`, `OfflineSafetyAllocation`, `OutboxEvent`, `AuditRecord`, and `IdempotencyRecord` in a single SQLite transaction.
- Authoritative movement ledger (`stock_movements` + `inventory_transactions`) as stock truth without introducing competing inventory ledgers.
- Guarded concurrent mutations and in-transaction re-verification protecting against stale FEFO and allocation execution plans.
- Deterministic FEFO selection and multi-line batch safety.
- Durable idempotency replay and conflict rejection.
- Failure injection and rollback across all 9 internal mutation stages.
- Process crash/restart simulation and durability across process boundaries.

---

## 2. Concurrency & Stale Stock Safety (Gate 1 — P0)

### 2.1 The Race Condition Threat
When a sales request plans FEFO deductions in application memory prior to transaction acquisition, a concurrent transaction could commit between the planning phase and the execution phase:
```text
POS Transaction A                   POS Transaction B
Reads Batch BN-1 (10 units)         
Plans to sell 7 units
                                    Reads Batch BN-1 (10 units)
                                    Plans to sell 6 units
BEGIN IMMEDIATE
Updates BN-1 (remaining: 3)
COMMIT
                                    BEGIN IMMEDIATE
                                    Uses stale plan (demands 6 units)
                                    [WITHOUT GUARD: Quantity drops to -3 or corrupts]
```

### 2.2 Dual-Layer Guard Mechanism Implemented
Under `BEGIN IMMEDIATE`, PharmaTech enforces two strict validation layers:

1. **In-Transaction Re-Verification Under Exclusive Write Lock:**
   Before applying deductions, every batch is re-read directly from SQLite under the active write lock:
   ```ts
   for (const b of plan.batchDeductions) {
     const row = this.db.prepare("SELECT quantity, status, expiry_date FROM batches WHERE id = ?").get(b.batchId);
     if (!row || (row.status !== "ACTIVE" && row.status !== "NEAR_EXPIRY") || Number(row.quantity) < b.quantity) {
       throw new Error("STALE_BATCH_OR_INSUFFICIENT_STOCK");
     }
   }
   ```

2. **Guarded Atomic SQL Mutations Checking Affected Rows:**
   Every update executes a guarded atomic condition requiring `quantity >= requested`:
   ```sql
   UPDATE batches
   SET quantity = quantity - ?,
       status = CASE WHEN quantity - ? = 0 THEN 'DEPLETED' ELSE status END,
       version = version + 1
   WHERE id = ?
     AND quantity >= ?
     AND status IN ('ACTIVE', 'NEAR_EXPIRY');
   ```
   The engine asserts `result.changes === 1`. If `changes !== 1`, it immediately aborts with `STALE_BATCH_OR_INSUFFICIENT_STOCK`.

3. **Offline Safety Allocation Concurrency Guard:**
   The identical atomic pattern guards offline device quotas:
   ```sql
   UPDATE offline_allocations
   SET consumed_capacity = consumed_capacity + ?,
       state = CASE WHEN (allocated_capacity - (consumed_capacity + ?) + released_capacity) <= 0 THEN 'EXHAUSTED' ELSE state END,
       version = version + 1
   WHERE id = ?
     AND state = 'ACTIVE'
     AND (allocated_capacity - consumed_capacity + released_capacity) >= ?;
   ```
   The engine asserts `result.changes === 1`. If `changes !== 1`, it immediately aborts with `STALE_ALLOCATION_OR_CAPACITY_EXHAUSTED`.

---

## 3. Inventory Source of Truth (Gate 2 — P0)

### 3.1 Architectural Classification
- **Authoritative Ledger:** `stock_movements` + `inventory_transactions` is the **sole, immutable, append-only source of truth** for inventory in PharmaTech. Every movement is signed with direction (`IN` / `OUT`), product, batch, warehouse, and source transaction ID.
- **Transactional Projection / Read Model:** `batches.quantity` and `batches.status` is strictly a transactional projection used for high-performance localized operational queries and guarded atomic decrements. It does **not** constitute a competing inventory ledger.

### 3.2 Verification & Reconstructability Proof
In `tests/p0-b-sqlite-sales-hardening.test.mjs`, the following was verified:
1. Across multiple sequential and split sales, `SUM(quantity)` from `stock_movements WHERE direction = 'OUT'` exactly matched the cumulative quantity deducted.
2. If `batches.quantity` was deleted or lost, current available stock is 100% reconstructable from the ledger:
   $$\text{Available Stock} = \text{Initial Quantity} - \sum \text{stock\_movements.quantity}_{\text{OUT}}$$
3. No business rule relies on `batches` as an authoritative ledger; all auditing, reversal, and accounting track `inventory_transactions` and `stock_movements`.

---

## 4. Crash Recovery Classification (Gate 3)

### 4.1 Accurate Evidence Classification
- **Classification:** `AUTOMATED — PROCESS CRASH/RESTART SIMULATION`
- **What is Verified:**
  1. Abrupt process termination simulation: SQLite connection handles are abruptly closed and dropped without `COMMIT`. Re-opening via fresh `DatabaseSync` confirms zero orphaned or partial records.
  2. Committed transactions durability: Committed sales, sale lines, payments, stock movements, and outbox events survive process termination and remain fully readable and idempotent across new application service instances.
- **Explicit Boundary & Disclaimer:**
  - **NOT POWER-LOSS VERIFIED:** This automated suite simulates process-level crash and restart. It does **not** prove resilience against sudden physical power cut, kernel panic, or storage controller power-down under heavy write load. True power-loss durability testing requires dedicated POS hardware benches with controlled hardware power interrupts.

---

## 5. Schema Migration

Migration file: [`docs/05-data/migrations/sqlite/002_sales_vertical_slice.sql`](file:///c:/Users/HP/Downloads/pharmatech-main/pharmatech-main/docs/05-data/migrations/sqlite/002_sales_vertical_slice.sql)

Schema entities:
1. `sales`: Header record with tenant, branch, device, cash session, amount, currency, and timestamps.
2. `sale_lines`: Preserved historical sale lines with resolved `batch_id`, quantity, unit price, and line totals.
3. `payments`: Tender entries with payment method, amount, currency, and verification status (`NOT_REQUIRED` for cash, `PENDING` for mobile/bank).
4. `inventory_transactions`: Transaction envelope with `source_type = 'SALE'`, `source_id = sale.id`, and `status = 'POSTED'`.
5. `stock_movements`: Immutable ledger entries with `direction = 'OUT'`, product, batch, warehouse, and quantity.
6. `batches`: Transactional read-projection tracking available quantities and statuses (`ACTIVE`, `NEAR_EXPIRY`, `DEPLETED`).
7. `offline_allocations`: Device-level quota tracking (`allocated_capacity`, `consumed_capacity`, `state`).
8. `outbox_events`: Transactional outbox records with `event_type = 'sale.completed'`, aggregate version, correlation ID, and JSON payload.

---

## 6. Transaction Boundary

```text
BEGIN IMMEDIATE
  1. Insert Sale record
  2. Insert SaleLine records
  3. Insert Payment records
  4. Insert InventoryTransaction (status: POSTED)
  5. Insert StockMovements (direction: OUT)
  6. Re-verify Batches under write lock + Guarded Atomic Decrement (changes === 1)
  7. Re-verify OfflineAllocation (if offline) + Guarded Atomic Increment (changes === 1)
  8. Insert OutboxEvent (sale.completed, status: PENDING)
  9. Insert AuditRecord (SALE_COMPLETED)
  10. Insert IdempotencyRecord (command: sales.create, hash, result)
COMMIT
```
If any check fails or error is thrown at any step, `ROLLBACK` is executed immediately, leaving zero partial state.

---

## 7. Test Evidence Summary

Executed via `npm test` across repository:

| Suite | Tests | Result | Classification | Focus |
|---|---|---|---|---|
| `tests/p0-b-sqlite-sales-persistence.test.mjs` | 4 | PASS | AUTOMATED — UNIT/INTEGRATION | Happy path, multi-line FEFO, offline quota consumption, split payment |
| `tests/p0-b-sqlite-sales-validation.test.mjs` | 7 | PASS | AUTOMATED — INTEGRATION | Expired batch, stock shortage, allocation exhausted, FEFO violation, closed cash session, unauthorized actor, payment mismatch |
| `tests/p0-b-sqlite-sales-idempotency.test.mjs` | 2 | PASS | AUTOMATED — INTEGRATION | Exact replay (0 duplicate effects), conflicting request rejection |
| `tests/p0-b-sqlite-sales-rollback.test.mjs` | 9 | PASS | AUTOMATED — INTEGRATION | Failure injection across all internal stages proving atomicity and rollback |
| `tests/p0-b-sqlite-sales-recovery.test.mjs` | 2 | PASS | AUTOMATED — PROCESS CRASH/RESTART SIMULATION | Disk-backed crash/restart durability and abort cleanup across process instances |
| `tests/p0-b-sqlite-sales-hardening.test.mjs` | 3 | PASS | AUTOMATED — CONCURRENCY HARDENING | Stale batch race rejection, stale offline allocation race rejection, ledger source of truth proof |

**PR B Suite Total:** 27/27 PASS (100%)  
**Full Repository Total:** 150 tests (142 PASS, 0 FAIL, 8 PostgreSQL Environment-Skipped)  

---

## 8. Status of External & Central Systems

1. **PostgreSQL Sales Integration:**
   - **Status:** `NOT VERIFIED IN CURRENT EXECUTION ENVIRONMENT (8 SKIPPED)`
   - The central PostgreSQL adapter and distributed sync for sales are intentionally deferred to PR C / multi-branch stages.
2. **CI Pipeline Status:**
   - **Status:** `NOT VERIFIED IN CURRENT EXECUTION ENVIRONMENT`
   - Remote GitHub Actions CI runs with live database services must be observed in `completed / success` state before asserting CI verification.
