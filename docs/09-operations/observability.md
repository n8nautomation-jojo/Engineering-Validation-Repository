# Observability Baseline

**Status:** Phase 2.4

## Structured Logging
All services and workers emit structured logs with correlation and operational identifiers. Secrets and sensitive credentials are never logged.

## Metrics
The platform tracks latency, errors, synchronization lag, Outbox/DLQ backlog, conflicts, authentication failures, worker health, accounting lag, database health and local POS performance.

## Tracing
Correlation IDs connect API requests, domain operations, sync operations and worker processing without exposing secrets.

## Health
Cloud and POS expose liveness/readiness-style health states and distinguish healthy, degraded and blocked conditions.

## Alerting
Alerts cover synchronization failures, DLQ growth, conflict backlog, accounting backlog, database failures, repeated security failures, storage exhaustion and backup failures.
