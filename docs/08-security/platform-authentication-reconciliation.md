# Platform Authentication & Identity Lifecycle Reconciliation

**Status:** ACTIVE — SECURITY/IMPLEMENTATION RECONCILIATION  
**Derived from:** ADR-013, D-038, R1-A3, Phase 3.4  
**Rule:** This artifact does not add or promote stable capabilities.

## 1. Boundary

PharmaTech has two authority planes:

- **PLATFORM_OWNER** — platform-wide operational authority, explicitly scoped by platform capabilities.
- **TENANT_USER** — organization/branch/warehouse/device-scoped business authority.

Platform Owner is not a tenant role and Tenant Admin does not inherit platform authority.

## 2. Authentication lifecycle

The first-login lifecycle is:

`PROVISIONED → PASSWORD_CHANGE_REQUIRED → ACTIVE`

Security states are orthogonal:

- `DISABLED`
- `LOCKED`
- `REVOKED`

A security state blocks normal authentication. It also blocks the mandatory password-change flow when the identity is disabled, locked or revoked.

The implementation contract is intentionally narrower than a full authentication provider. Password hashing, session/token issuance, device binding, temporary-credential delivery, revocation propagation and key management remain security-runtime responsibilities.

## 3. Mandatory password change

An identity in `PASSWORD_CHANGE_REQUIRED`:

- may authenticate only into the credential-change flow;
- may not enter normal tenant or platform application routes;
- must replace the temporary credential before normal access;
- has the temporary credential invalidated after successful replacement;
- must have provisioning/reset/reissue operations audited.

No plaintext temporary password is persisted.

## 4. Public registration

There is no public tenant signup route. Tenant creation and initial administrator provisioning are administrative commands behind authenticated platform authorization.

## 5. Authorization integration

The existing Phase 3.4 capability vocabulary remains unchanged.

Platform capabilities, tenant onboarding capabilities and password-management capabilities are not considered stable until separately reconciled through:

**Capability → Scope → API → OpenAPI → Persistence → Audit → Tests → Security evidence**

This prevents an implicit `super_admin = everything` implementation.

## 6. Platform data boundary

Ordinary platform administration is limited to minimum-necessary operational metadata and aggregate telemetry. Patient profiles, prescription contents, medicine-level customer history, payment evidence images and arbitrary transaction content are not ordinary platform-dashboard data.

Exceptional support access, if activated later, requires separate authorization, purpose, minimum scope, time bounds where practical and complete audit.

## 7. Implemented foundation

`src/authorization/identity-lifecycle.ts` provides the deterministic lifecycle guard used by future authentication orchestration.

It currently enforces:

- no PROVISIONED → ACTIVE bypass;
- no PASSWORD_CHANGE_REQUIRED → normal access;
- no normal access while a security state is active;
- no password-change flow while disabled/locked/revoked.

Reference tests are in `tests/identity-lifecycle.test.mjs`.

## 8. Remaining gate

This foundation is **not authentication production evidence**.

Still required before promotion:

1. real credential storage/verifier integration;
2. temporary credential generation and one-time invalidation;
3. session/token boundary;
4. platform-vs-tenant authorization context;
5. revocation and lock propagation;
6. audit persistence;
7. real database integration;
8. security prototype/Windows evidence;
9. OpenAPI and contract fixtures;
10. observed CI execution.

