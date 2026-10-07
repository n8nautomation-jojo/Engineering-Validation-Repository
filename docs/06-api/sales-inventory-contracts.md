# Sales & Inventory Contracts

**Status:** Proposed Baseline  
**Scope:** Contract boundary between Sales/POS and Inventory.

## Sale Lifecycle

Initial lifecycle:

DRAFT → COMPLETED

Exceptional/compensating paths use explicit cancellation or Sales Return operations according to the domain rules.

A completed Sale is not deleted.

## Complete Sale Preconditions

Before a Sale becomes COMPLETED:

1. authenticated actor and device are valid;
2. branch and cash-session policy are satisfied;
3. product lines are valid;
4. pricing and discount permissions are valid;
5. batch availability is validated;
6. expired batches are rejected;
7. FEFO is applied by default;
8. negative stock is rejected unless an explicitly enabled policy permits it;
9. payment allocations satisfy the sale's payment policy;
10. idempotency/concurrency checks pass.

## Inventory Ownership

Sales does not own StockMovement.

Inventory owns inventory transactions and creates StockMovement records as the authoritative stock effect.

For offline POS, the accepted local business transaction atomically coordinates:
- Sale
- Payment
- InventoryTransaction
- StockMovement
- Outbox

## FEFO

The POS/read model provides eligible batch candidates ordered according to FEFO rules.

The client may propose a batch, but the domain must validate that:
- the batch is active;
- it is not expired;
- sufficient quantity exists under the applicable offline safety policy;
- the operation does not violate stock rules.

## Offline Stock Safety

The offline safety allocation is a protection mechanism, not authoritative stock truth.

Cloud synchronization revalidates the resulting business effect against authoritative branch inventory.

If authoritative validation fails:
- the conflict is durable;
- the original operation is not silently rewritten;
- the resolution uses a domain operation such as reversal or stock adjustment;
- the event is audited.

## Sale Completion Result

A successful completion returns:
- sale_id;
- invoice/reference number;
- final status;
- payment summaries;
- inventory effect summary where appropriate;
- correlation_id.

The response must not expose internal database identifiers that are not part of the contract.

## Sales Return

A return references the original sale and selected sale lines.

The return:
- records a reason;
- validates returnable quantity;
- restores inventory through Inventory operations;
- handles refund/credit according to payment policy;
- creates audit records.

It does not delete or mutate the historical original sale into a different sale.

## Concurrency

Completion and return operations use aggregate versioning/idempotency.

A stale expected_version returns a stable conflict error.

## Queries

The read side should provide:
- current sale;
- sale lines;
- payment state;
- return state;
- available batches;
- stock by branch/warehouse;
- stock movement history.

These are read models, not direct aggregate serialization.

## Deferred

Exact JSON DTOs, validation codes, HTTP status matrix and OpenAPI schema are Phase 3.3 deliverables.
