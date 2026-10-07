# Phase 2.3 Baseline — Workers, Authentication Runtime & Transaction Boundaries

**Status:** LOCKED
**Phase:** 2.3
**Depends on:** ADR-011 and Phase 2.2

## Runtime Principles
- Business correctness is enforced synchronously inside the transaction that owns the business operation.
- Background workers handle durable asynchronous work, not primary business invariants.
- Every worker is idempotent and restart-safe.
- Local POS remains usable without network connectivity.
- Cloud remains authoritative for organization-wide identity, authorization policy, inventory reconciliation and financial posting.
- A worker crash must not create a partial business transaction.

## Workers

| Worker | Runtime | Responsibility |
|---|---|---|
| Outbox Worker | POS + Cloud where applicable | Publish durable events |
| Sync Worker | Tauri POS | Push/Pull synchronization |
| Accounting Posting | Cloud | Consume financial events and post Journal Entries |
| Expiry Check | Cloud | Detect near-expiry/expired batches |
| Notification | Cloud | Deliver in-app/email notifications |
| Report Generation | Cloud | Generate expensive reports |
| Cleanup | Cloud + controlled local cleanup | Retention and operational cleanup |

Workers use leases/claiming where concurrent execution is possible. A lost worker lease makes work eligible again.

## Transaction Boundaries

### Local POS Sale
One SQLite transaction contains Sale, SaleLines, Payments, InventoryTransaction, StockMovements, required Outbox and local audit metadata.

Commit means the local sale is accepted.

### Local Projection Update
Projection updates are transactional with cursor advancement. A page is acknowledged only after its changes are durable locally.

### Cloud Sync Ingestion
The cloud groups logically related submitted operations and validates them transactionally. Inbox/idempotency state and business changes commit together where they belong to the same operation.

### Accounting
Accounting posting is its own cloud transaction. A sale does not wait for accounting. Failed posting is retryable and operationally visible.

### Reversal
A reversal is a new business transaction. Historical financial/inventory records are not edited or deleted.

## Worker State Model
PENDING → CLAIMED → PROCESSING → SUCCEEDED

Failure:
PROCESSING → RETRY_WAIT → CLAIMED

Exhausted:
RETRY_WAIT → DEAD_LETTERED

A worker must resume safely after process termination.

## Graceful Shutdown
POS shutdown:
1. stop accepting new background work;
2. finish or safely release current worker lease;
3. commit/rollback active SQLite transaction;
4. persist sync state;
5. close SQLite cleanly.

Forced power loss is handled by SQLite recovery plus transaction atomicity. Uncommitted business state is rolled back.

## Offline Authentication
Offline login is allowed only for a user/device combination that previously authenticated successfully online and whose local authentication material remains valid under policy.

The device stores no plaintext password.

Offline authentication verifies device registration, local user status, branch/device scope, cached role/permission snapshot, offline-session eligibility, local credential verifier/token material, and security-policy expiry.

Cloud remains authoritative when connectivity returns.

## Token Lifecycle
Online authentication produces a short-lived access token and refresh token.

Refresh material is stored in OS-protected secure storage where available and is revocable server-side.

Offline operation does not attempt network refresh. The POS uses a previously established offline authorization context and requires online re-authentication after policy expiry.

Exact durations are configuration decisions, not hardcoded domain rules.

## Offline Authorization
Permissions are cached as a signed/versioned authorization snapshot.

Every offline command carries actor_id and device_id.

High-risk operations may require online connectivity or stricter offline permission policy.

Cloud wins when a newer authorization snapshot arrives.

## Device Registration
Every POS Device has a stable device identity and organization/branch scope.

Registration binds device_id, organization_id, branch_id, device status, credential/public-key material where applicable, and registration metadata.

Revoked/deactivated devices must not synchronize.

## Failure Rules
- Network failure: continue offline where policy permits.
- SQLite failure: fail the business operation; never partially commit.
- Outbox failure: business transaction remains committed; retry publishing.
- Sync rejection: preserve local history and create explicit conflict/rejection state.
- Accounting failure: retry; never duplicate Journal Entries.
- Worker crash: lease expiry/recovery makes unfinished work eligible again.
- Token expiry offline: deny operations requiring a valid authenticated context.

## Observability Requirements
Every worker operation should expose worker name, job/event identifier, attempt, start/completion timestamps, duration, outcome, error category and correlation_id.

Security-sensitive authentication failures must be auditable without logging secrets or tokens.

## Deferred Configuration
Exact token TTLs, offline authentication TTL, lease duration, retry delays, worker concurrency, maximum batch sizes and local database maintenance schedule remain implementation/Phase 2.4 decisions.
