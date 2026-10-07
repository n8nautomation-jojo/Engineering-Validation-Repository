# Platform Administration & Tenant Onboarding Addendum

**Status:** ACCEPTED REQUIREMENT — RECONCILIATION REQUIRED

## Purpose

Define the platform-level administrative product surface required for successful SaaS operation.

## Platform Console

The platform console is separate from the pharmacy/tenant application.

### Core screens

1. Platform Overview
   - service health
   - active tenants
   - subscription status summary
   - aggregate usage
   - active incidents
   - synchronization health
   - error/latency indicators

2. Tenant Management
   - tenant list
   - tenant status
   - organization/branch summary
   - administrators
   - subscription state
   - provisioning actions

3. Tenant Provisioning
   - create tenant
   - create initial organization
   - create initial administrator
   - assign subscription/plan
   - generate temporary onboarding credential
   - record provisioning audit

4. Subscription Management
   - plan
   - status
   - start/end dates
   - limits
   - suspension/resumption
   - billing metadata

5. Operational Health
   - API health
   - worker health
   - sync queues
   - failed jobs
   - conflict backlog
   - database/infra health
   - service incidents

6. Security & Audit
   - platform security events
   - privileged actions
   - administrator credential events
   - support-access events
   - audit search by scope/time/action

7. Support Access
   - disabled by default
   - explicit authorization
   - purpose/reason
   - time-bounded where applicable
   - full audit trail
   - minimum required resource scope

## Customer-data boundary

Ordinary platform administration exposes metadata and aggregate operational information only. Patient, prescription, payment-evidence and arbitrary transaction content are outside the ordinary platform dashboard.

## Authentication

There is no tenant self-registration.

The initial administrator receives a temporary credential and enters a mandatory password-change flow before normal application access.

## Product acceptance

A platform-management feature is implementation-ready only after it has:
- actor/capability;
- scope;
- workflow;
- audit behavior;
- security boundary;
- API contract;
- persistence model;
- acceptance tests.
