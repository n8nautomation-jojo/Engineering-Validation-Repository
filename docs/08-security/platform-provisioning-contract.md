# Platform Provisioning Contract

**Status:** ACTIVE — RECONCILIATION / IMPLEMENTATION CONTRACT

## Purpose

Define the controlled onboarding transaction: Tenant -> Organization -> Branch -> Initial Admin -> Temporary Credential -> PASSWORD_CHANGE_REQUIRED.

This contract does not create products, batches, inventory, patients, prescriptions, sales, purchases, payments, or other pharmacy transactions.

## Command boundary

The command requires a trusted PLATFORM_OWNER authority context, an idempotency key, correlation ID, explicit reason, tenant/organization/branch metadata, initial-admin metadata, and subscription metadata. A TENANT_USER context is rejected.

## Credential boundary

Temporary credentials are issued through a dedicated service boundary. Plaintext credentials must never be persisted in domain records, audit records, idempotency records, or ordinary logs. The initial admin is created in PASSWORD_CHANGE_REQUIRED and cannot enter normal application access until the mandatory password change transitions the identity to ACTIVE.

## Atomicity and idempotency

The persistence boundary must atomically establish tenant, organization, branch, initial-admin lifecycle, and subscription metadata. Idempotent replay returns the original result without duplicate provisioning or credential issuance. Audit is mandatory.

Production promotion requires durable transactionality for provisioning, idempotency, and audit; this application contract alone is not production evidence.

## SoD and authority

Provisioning is subject to platform authorization and SoD policy. This contract does not invent a new approval rule. Any independent-approval requirement must be promoted through the authorization reconciliation gate.

## Minimum-data boundary

Ordinary platform administration uses operational metadata and aggregate health/usage. It does not expose patient profiles, prescription contents, medicine-level customer history, payment evidence images, or arbitrary customer transaction content.

## Explicit non-effects

A successful provisioning result guarantees:
- stockCreated = false
- pharmacyTransactionsCreated = false
- no automatic product creation
- no patient/customer creation
- no sale/purchase/payment creation

## Production evidence gate

Before promotion, verify platform authority separation, no public signup, mandatory password change, temporary credential single-use/expiry, verifier-only storage, atomic provisioning, idempotent replay, durable append-only audit, tenant isolation, rollback on failure, and no pharmacy-data side effects.
