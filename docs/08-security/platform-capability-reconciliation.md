# Platform Capability Reconciliation

**Status:** PROPOSED — NOT STABLE

Platform administration requires a separate capability vocabulary and authority plane. It MUST NOT be appended to the locked tenant capability list until reconciliation and API promotion are complete.

## Proposed capabilities
- platform.tenants.provision
- platform.tenants.read
- platform.subscriptions.manage
- platform.admins.provision
- platform.admins.disable
- platform.admins.credential.reset
- platform.health.read
- platform.audit.read
- platform.support.access

These names are proposals only.

## Scope model
Platform capabilities operate under the PLATFORM_OWNER authority plane and must not accept ordinary tenant scope as an elevation mechanism. Tenant resources may be referenced as targets of a platform operation, but a TENANT_USER cannot acquire platform authority by supplying a tenant identifier.

## Data minimization
Normal platform operations expose only the minimum operational metadata required to provision, administer subscriptions, troubleshoot service health, and audit privileged platform actions. Customer-content inspection is not part of ordinary platform capabilities.

## Support access
Exceptional support access, if activated later, requires explicit authorization, purpose/reason, minimum resource scope, time limitation where practical, and complete audit.

## Offline
All proposed platform administration capabilities are ONLINE_ONLY unless a later security-approved requirement explicitly establishes otherwise.

## Promotion gate
Before any capability becomes stable, reconcile capability definition, authority plane, effective scope, SoD, API contract, audit, minimum-data boundary, authentication/session boundary, OpenAPI fixtures, and production security/persistence evidence.
