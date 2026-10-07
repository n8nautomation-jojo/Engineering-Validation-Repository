# Platform Administration — Authorization/API/Data Reconciliation

**Status:** PROPOSED — RECONCILIATION REQUIRED  
**Source:** ADR-013, D-038, R1-A3 and Phase 3.4 governance  
**Constraint:** This artifact does not silently modify locked Phase 3.4 capabilities.

## 1. Platform boundary

Platform Administration is a separate application surface from the tenant pharmacy application.

Platform Owner is a platform-scoped actor. Tenant Admin remains tenant/organization scoped.

## 2. Proposed platform capabilities

The following capability family is proposed for controlled reconciliation:
- platform.tenants.read
- platform.tenants.provision
- platform.tenants.update
- platform.subscriptions.read
- platform.subscriptions.manage
- platform.admins.provision
- platform.admins.disable
- platform.admins.credential.reset
- platform.health.read
- platform.audit.read
- platform.support.access

These are proposed names only until the formal authorization/API gate promotes them.

## 3. Minimum-necessary visibility

Ordinary Platform Administration may expose:
- tenant/organization identifiers and status;
- subscription state/plan/limits;
- branch/device/user counts;
- aggregate transaction volumes;
- API/worker/sync/database health;
- latency/error rates;
- failed jobs and incidents;
- security events and privileged-action audit metadata.

It must not expose patient profiles, prescription contents, payment evidence images, or arbitrary customer transaction content for ordinary administration.

Support access is a separate capability, disabled by default, purpose-bound, minimum-scope, time-bounded where practical, and fully audited.

## 4. Provisioning workflow

Tenant provisioning:
1. authenticated Platform Owner;
2. create Tenant;
3. create Organization;
4. create initial Branch context;
5. configure subscription;
6. create initial Tenant Admin;
7. generate single-use temporary credential;
8. mark PASSWORD_CHANGE_REQUIRED;
9. deliver through approved secure channel;
10. audit the complete operation.

No public signup endpoint exists.

## 5. First-login lifecycle

PROVISIONED → PASSWORD_CHANGE_REQUIRED → ACTIVE

Security states:
DISABLED, LOCKED, REVOKED.

During PASSWORD_CHANGE_REQUIRED, only authentication and mandatory password-change operations are available.

Temporary credential plaintext is never persisted.

## 6. Subscription management

Subscription changes are platform-scoped, idempotent, authorized and audited.

Plan limits are enforced by the platform boundary and do not grant tenant users additional authorization capabilities.

## 7. Operational monitoring

Health dashboards aggregate service signals. Monitoring is for reliability/security/billing/product operations, not customer-content surveillance.

Required signals include:
- service availability;
- API latency/error rate;
- worker health;
- sync backlog/conflicts;
- failed jobs;
- infrastructure/database health;
- security events.

## 8. Persistence boundary

Platform-owned data includes:
- Tenant;
- Subscription;
- platform provisioning records;
- platform operational/health projections;
- platform audit records.

Customer business records remain tenant-owned and isolated.

Credential records store password verifiers and required security metadata only.

## 9. API candidates

Proposed routes:
- GET /api/v1/platform/tenants
- POST /api/v1/platform/tenants
- GET /api/v1/platform/tenants/{tenantId}
- PATCH /api/v1/platform/tenants/{tenantId}
- GET /api/v1/platform/subscriptions
- POST /api/v1/platform/tenants/{tenantId}/subscription
- POST /api/v1/platform/tenants/{tenantId}/admins
- POST /api/v1/platform/admins/{userId}/credential-reset
- GET /api/v1/platform/health
- GET /api/v1/platform/audit

All platform routes are ONLINE_ONLY.

## 10. Security acceptance

- Platform Owner scope cannot be supplied or elevated by client DTOs.
- Tenant Admin cannot call platform-scoped operations.
- Every privileged mutation is audited.
- Support access cannot be silently enabled.
- No endpoint returns password material.
- Tenant isolation remains enforced even for operational queries.
- Platform health queries use aggregate/operational data by default.

## 11. Promotion gate

Before implementation promotion:
1. reconcile capability vocabulary with R1-A3;
2. define DTOs and error behavior under Phase 3 API conventions;
3. add OpenAPI operations and fixtures;
4. define physical persistence and migration;
5. implement authentication state transition tests;
6. test tenant isolation and platform/tenant privilege separation;
7. test temporary credential single-use/expiry/revocation;
8. record formal promotion in Decision Log.
