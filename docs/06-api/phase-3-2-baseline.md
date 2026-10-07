# Phase 3.2 — Domain Commands & Queries Baseline

**Status:** LOCKED
**Lock Rule:** This baseline is the binding contract reference for subsequent API phases. Material changes require an explicit revision/decision.  
**Parent:** Phase 3.1 API & Contract Architecture

## Scope

Phase 3.2 translates the approved Domain Model and Phase 3.1 API principles into implementation-facing business Commands and read-side Queries.

## Locked Constraints Inherited

- Commands express business intent; they do not expose aggregate internals.
- Queries use read models/projections where practical.
- Sales does not own StockMovement.
- Inventory is the authoritative owner of stock effects.
- Offline Sale + Payment + InventoryTransaction + StockMovement + Outbox are coordinated atomically.
- Payment is provider-agnostic and supports manual confirmation, evidence and external verification.
- API idempotency protects command replay; Inbox idempotency protects event replay.
- Financial records are not deleted; reversal/return operations preserve history.
- Tenant, organization, branch and device scope come from trusted authorization context.

## Primary Command Families

### Sales & POS

- Create Sale
- Add Payment
- Complete Sale
- Cancel Sale
- Return Sale
- Add Payment Evidence
- Confirm Manual Payment
- Request Payment Verification

### Cash

- Open Cash Session
- Add Cash Movement
- Close Cash Session
- Reconcile Cash Session

### Inventory

- Create Stock Adjustment
- Approve Stock Adjustment
- Execute Stock Transfer
- Receive Stock Transfer
- Create/Receive Goods Receipt
- Reserve/Release Offline Stock Safety allocation where configured

### Sync

- Push Device Operations
- Apply Pull Batch
- Acknowledge Durable Application
- Resolve/Record Sync Conflict

## Primary Query Families

- Sale by ID
- Sales list and filtered sales
- Payment status and verification history
- Current inventory
- Batch availability and FEFO candidates
- Expiring stock
- Stock movement history
- Cash session and reconciliation summary
- Device sync status
- Pending Outbox count
- Conflict status

## Payment Boundary

Payment contracts intentionally separate:
1. Payment Method
2. Payment Status
3. Verification Mode
4. Payment Evidence
5. External Provider Verification

This supports cash, Bankak/bank transfer workflows, manual confirmation, screenshot evidence and future API verification through an integration adapter without coupling Sales to a provider.

## Contract Sequence

Phase 3.2 defines business intent and boundaries.

Phase 3.3 will define:
- request DTOs;
- response DTOs;
- validation matrices;
- HTTP status mapping;
- stable error codes;
- idempotency behavior per command;
- optimistic concurrency fields;
- OpenAPI conventions.

## Implementation Gate

No endpoint is considered implementation-ready until its command/query contract, authorization requirements, validation rules, transaction boundary and error behavior are specified.
