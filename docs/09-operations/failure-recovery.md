# Failure & Recovery Baseline

**Status:** Phase 2.4

## Core Rule
A crash may delay processing, but must not create an accepted half-transaction.

## POS Recovery
SQLite transaction atomicity and WAL/recovery protect committed local work. On startup the application validates migrations, restores worker state and resumes synchronization.

## Sync Recovery
The durable Outbox and Sync Cursor are the recovery anchors. Cursor advancement happens only after durable local application. Replays are safe through idempotent consumers.

## Cloud Recovery
Cloud business transactions are committed atomically. Failed asynchronous processing is retried and eventually dead-lettered for operator resolution.

## Database Recovery
Cloud PostgreSQL backup/restore is mandatory. Restore procedures must be tested periodically. Backup success alone is not considered proof of recoverability.

## Corruption
If local data integrity cannot be trusted, unsafe writes stop. The system must not silently recreate missing business history.

## Recovery Verification
Recovery tests must include:
- process crash during sale;
- power loss during sale;
- duplicate sync delivery;
- interrupted pull;
- worker crash;
- cloud outage;
- accounting retry;
- database restore;
- device revocation.
