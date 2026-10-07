# Platform Administration API Contract Proposal

**Status:** PROPOSED — NOT PROMOTED
**Authority:** PLATFORM_OWNER only

This is a reconciliation proposal. It does not modify the promoted Phase 3.4 contract.

## Candidate operations
- Provision tenant → platform.tenants.provision
- Read tenant → platform.tenants.read
- Manage subscription → platform.subscriptions.manage
- Provision admin → platform.admins.provision
- Disable admin → platform.admins.disable
- Reset credential → platform.admins.credential.reset
- Read health → platform.health.read
- Read platform audit → platform.audit.read
- Exceptional support access → platform.support.access

## Provisioning
Creates only Tenant, Organization, Branch, Initial Admin, subscription metadata, and credential lifecycle metadata. It creates no stock or pharmacy transaction.

The initial admin is PASSWORD_CHANGE_REQUIRED and normal access is blocked until password change.

## API separation
Platform administration should use a dedicated platform administration surface rather than the ordinary tenant API surface, while sharing common authentication, idempotency, audit, and error foundations.

Exact paths, DTOs, status matrix, and fixtures remain gated until capability reconciliation is promoted.

## Security
No public signup endpoint is proposed. Platform operations require a PLATFORM_OWNER authority context. Customer content is excluded from ordinary administration responses.
