# Phase 2.4 Baseline — Failure, Recovery, Observability & Open Issues

**Status:** LOCKED
**Phase:** 2.4
**Purpose:** Close Architecture Phase 2 operational and reliability contracts.

## 1. Reliability Principles
- Never trade business correctness for availability.
- Accepted local transactions must survive process crashes and power loss.
- Synchronization is retryable and resumable.
- Duplicate delivery is expected; duplicate business effect is forbidden.
- Financial and inventory history is immutable through reversal/adjustment semantics.
- Recovery must be observable and auditable.

## 2. Failure Matrix

| Failure | Expected behavior |
|---|---|
| Internet unavailable | POS continues within offline policy |
| Cloud unavailable | POS continues locally within offline policy; sync resumes later |
| POS process crash | SQLite recovers; committed transactions remain; uncommitted work rolls back |
| Power loss | SQLite WAL/recovery restores transactional consistency |
| Outbox worker crash | Unfinished item becomes retryable |
| Sync interruption | Resume from durable cursor/outbox state |
| Duplicate event | Inbox/idempotency prevents duplicate effect |
| Cloud validation rejection | Durable conflict/rejection; local history preserved |
| Accounting failure | Retryable posting state; no duplicate Journal Entry |
| Database unavailable | Reject transaction safely; do not fabricate success |
| Token/session expiry | Require valid authentication context |
| Device revoked | Synchronization denied; local high-risk operations restricted |
| Corrupt local DB | Stop unsafe writes and enter recovery path; never silently rebuild from incomplete data |

## 3. Recovery Model

### POS Startup Recovery
1. Open SQLite.
2. Allow SQLite crash recovery.
3. Validate schema/migration state.
4. Load durable device/session state.
5. Reconcile pending worker state.
6. Resume Outbox/Sync processing.
7. Surface unresolved conflicts without blocking safe POS operations.

### Sync Recovery
- Outbox is durable.
- Pull cursor is durable.
- Acknowledgement occurs only after durable application.
- Replaying a delivery is safe because consumers are idempotent.
- A failed page/batch is retried without advancing its cursor past unapplied data.

## 4. Backup and Restore
Cloud PostgreSQL requires automated backups and tested restoration procedures.

Backup policy must define:
- frequency;
- retention;
- encryption;
- access control;
- restore testing;
- RPO;
- RTO.

Local SQLite is operational state, not the organization's permanent backup authority. Cloud synchronization and recovery procedures must preserve accepted business transactions.

## 5. Observability

Three layers:

### Logs
Structured logs with:
- timestamp;
- level;
- service/module;
- correlation_id;
- tenant_id where safe;
- branch_id where safe;
- device_id where safe;
- actor_id where safe;
- event/job id;
- error category.

Never log credentials, tokens, payment secrets or sensitive payloads unnecessarily.

### Metrics
Minimum metrics:
- API latency/error rate;
- sync lag;
- Outbox pending count;
- Inbox duplicate/replay count;
- DLQ count;
- conflict count;
- authentication failures;
- offline session age;
- worker execution/failure rate;
- accounting posting lag/failures;
- database health;
- local POS transaction latency.

### Traces
Distributed tracing is correlation-based across API, sync, workers and domain operations. Tracing must not expose secrets.

## 6. Health Checks
Cloud:
- liveness;
- readiness;
- database connectivity;
- worker health.

POS:
- application health;
- SQLite health;
- device registration state;
- sync connectivity/state;
- local storage capacity;
- printer/hardware adapter state.

Health checks distinguish **healthy**, **degraded**, and **blocked** states.

## 7. Operational Alerts

Critical alerts:
- persistent sync failure;
- DLQ growth;
- conflict backlog above threshold;
- accounting posting backlog;
- database failure;
- repeated authentication/device failures;
- storage exhaustion;
- backup failure;
- failed restore test.

Alerts are operational signals, not substitutes for domain audit.

## 8. SLO Baseline

Initial targets are:
- local POS business operations: P95 < 200 ms excluding physical hardware latency;
- cloud API availability target: 99.9% monthly, subject to deployment maturity;
- successful accepted local transactions: 100% durable after commit;
- duplicate business effects from retry/replay: 0;
- silent inventory corruption: 0;
- silent financial posting duplication: 0.

Formal error budgets are defined during production hardening.

## 9. Data Integrity Invariants

The system must continuously preserve:
- no sale of expired batches;
- no unauthorized negative stock;
- no duplicate business effect from event replay;
- no hard deletion of immutable financial/audit history;
- no cross-branch stock mutation except through Stock Transfer;
- accounting entries are generated only by authorized accounting flows;
- every accepted offline transaction has durable local provenance.

## 10. Open Issues for Implementation
These are intentionally not blockers for beginning implementation:
- exact Offline Stock Safety quota algorithm;
- exact offline authentication TTL;
- final high-risk offline permission matrix;
- exact retry/lease timings;
- PostgreSQL backup RPO/RTO values;
- production deployment topology;
- final API schemas;
- detailed hardware certification matrix.

These must be resolved before the corresponding production feature is enabled.
