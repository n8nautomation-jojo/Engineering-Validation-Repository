# Inbox Pattern

**Status:** Baseline — Phase 2.2

## Purpose
Guarantee idempotent cloud processing of events that may be delivered multiple times.

## Idempotency Key
Primary consumer key:

**event_id + consumer_id**

The database must enforce uniqueness.

## Processing
Within the relevant cloud transaction:
1. Validate authentication and scope.
2. Check Inbox.
3. If already processed, return the previous idempotent result.
4. Validate schema/version.
5. Validate domain invariants.
6. Apply the business operation.
7. Record Inbox completion.
8. Commit.

## Duplicate Delivery
Duplicate delivery is expected and safe. A timeout after cloud commit may cause resend; the second attempt must not create a second Sale, Payment, InventoryTransaction or StockMovement.

## Retention
Initial Inbox retention target: 30–90 days, configurable from operational evidence.

Long-term audit is handled by the Audit domain, not Inbox retention.

## Failure
A failed transaction does not create a successful Inbox marker. Transient failures are retried; deterministic domain conflicts return explicit conflict outcomes.
