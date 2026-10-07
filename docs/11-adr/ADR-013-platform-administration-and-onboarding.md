# ADR-013 — Platform Administration, Tenant Provisioning & First-Login Security

**Status:** ACCEPTED — PRODUCT/SECURITY REQUIREMENT
**Owner:** CEO / CTO
**Date:** 2026-10-07

## Context

PharmaTech is SaaS-ready. The platform operator must provision organizations, manage subscriptions and operate the platform without unnecessary access to customer business data.

There is no public self-service tenant registration. New customer organizations are provisioned by an authorized platform operator through a protected administration console.

## Decision

### 1. Platform administration boundary

Introduce a **Platform Administration Console** for the platform operator.

The existing **Platform Owner** actor is the business/domain identity for this authority.

The console may, subject to explicit capabilities and audit:
- create/provision a Tenant;
- create the initial Organization and administrative Branch context;
- activate, suspend, resume and manage subscription state;
- configure plan limits and subscription metadata;
- create/deactivate tenant administrators;
- reset/reissue an administrator's temporary onboarding credential;
- view platform health and operational metrics;
- view aggregate tenant/platform usage metrics;
- inspect synchronization health, failed jobs, error rates and service incidents;
- access security/audit events required for platform security operations.

### 2. Minimum-data principle

Default platform telemetry is metadata/aggregate-oriented:
- tenant/org identifier and status;
- subscription/plan/status and dates;
- branch/device counts;
- active user counts;
- aggregate transaction volumes;
- storage/queue/sync health;
- error/latency/service metrics;
- operational incidents;
- security events.

The platform console must not expose patient profiles, prescription contents, medicine-level customer history, payment evidence images, or arbitrary customer transaction content merely for ordinary platform administration.

Exceptional support access to customer content must be separately authorized, purpose-bound, time-bounded where practical, explicitly audited, and subject to applicable law/contracts.

### 3. No public registration

There is no public "Create account / Sign up" flow for platform tenants. The public authentication surface is Login.

Tenant onboarding is an administrative provisioning workflow.

### 4. Initial credential lifecycle

When the platform provisions the first administrative user:
1. Generate a cryptographically strong temporary credential.
2. Store only an appropriate password verifier; never store plaintext password.
3. Mark the identity as PASSWORD_CHANGE_REQUIRED.
4. Deliver the temporary credential through an approved secure onboarding channel.
5. Permit authentication only far enough to reach the mandatory password-change flow.
6. Do not grant normal application access until the temporary credential is replaced.
7. Invalidate the temporary credential immediately after successful replacement.
8. Temporary credentials are single-use and expire according to security policy.
9. Password reset/reissue is fully audited.

### 5. Authentication state

The identity lifecycle explicitly distinguishes:
PROVISIONED → PASSWORD_CHANGE_REQUIRED → ACTIVE

Security states include:
DISABLED, LOCKED, REVOKED.

PASSWORD_CHANGE_REQUIRED is not an authorization bypass. The user may access only the credential-change operation and required authentication/session endpoints.

### 6. Separation of powers

Platform Owner authority is not inherited by Tenant Admins.

Tenant Admins manage only their tenant according to tenant-scoped capabilities and cannot create other tenants, manage platform-wide subscriptions, access platform-wide operational telemetry, change platform authorization policy, or access another tenant.

### 7. Audit

All platform provisioning, subscription changes, administrator credential operations, support-access grants and security-sensitive platform actions are append-only audited with actor, scope, target, action, timestamp and reason/correlation where applicable.

### 8. Observability boundary

Operational monitoring is allowed and required for reliability. It focuses on service health, aggregate usage, failures, performance, synchronization, infrastructure and security signals rather than customer-content inspection.

## Non-goals

- No public tenant self-registration.
- No platform-owner access to customer passwords.
- No routine inspection of patient/customer clinical or transaction content.
- No hidden telemetry intended to profile customers beyond what is necessary for service operation, security, billing and aggregate product management.
- No bypass of tenant isolation.

## Governance impact

This requirement does not silently modify locked Domain Model v1.1 or Phase 3.4 capability vocabulary. Required platform-management capabilities must be reconciled into the authorization/API contract before implementation is promoted as stable.

## Acceptance criteria

- Platform Owner can provision a tenant through an authenticated admin console.
- Initial admin is forced through password change before normal application access.
- No public signup route exists.
- Subscription state can be managed with audit.
- Platform health/operational dashboards expose minimum necessary data.
- Tenant isolation is enforced.
- Sensitive customer content is not visible in ordinary platform dashboards.
- All privileged platform operations are auditable.
