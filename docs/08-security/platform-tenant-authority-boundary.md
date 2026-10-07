# Platform / Tenant Authority Boundary

**Status:** ACTIVE — RECONCILIATION  
**Derived from:** ADR-013, D-038, R1-A3

## Authority planes

PharmaTech has two explicitly separated authority planes:

- `PLATFORM_OWNER`: platform operations, provisioning, subscription and operational administration.
- `TENANT_USER`: customer business operations inside an organization.

A tenant user cannot obtain platform authority by role naming, scope expansion or client-supplied tenant identifiers.

A platform context is not a tenant context. Platform operations must use platform-scoped capabilities and must not masquerade as an ordinary tenant request.

## Effective scope

For tenant operations the existing R1-A3 rule remains binding:

`Assignment Scope ∩ Request Context ∩ Resource Scope ∩ Policy Scope`

This artifact does not alter that rule.

Platform capabilities will receive their own explicit scope model during the API/capability reconciliation gate. No implicit wildcard tenant access is introduced.

## Separation of duties

Sensitive platform actions such as tenant provisioning, subscription changes, administrator credential reset and exceptional support access require explicit capability and audit semantics. If an action requires independent approval under the final policy, the existing SoD rule applies; no self-approval bypass is introduced.

## Implementation boundary

The runtime foundation exposes deterministic assertions for the two authority planes. It does not itself grant any platform capability.

Remaining gates:

1. platform capability vocabulary;
2. request DTOs and API commands;
3. audit contract;
4. persistence;
5. OpenAPI and fixtures;
6. SoD matrix;
7. observed security/CI evidence.

## Security invariant

**No tenant-supplied identifier may elevate a TENANT_USER request into PLATFORM_OWNER authority.**
