# ADR-012 — Flexible Payment & Payment Verification Architecture

**Status:** Proposed for Phase 3 Contract Baseline

## Context
Sudanese pharmacy workflows may involve cash, Bankak or other bank/mobile transfers, a pharmacist viewing a customer's transfer notification, trust-based/manual confirmation without capturing proof, captured screenshots/receipts, and automated verification through an external revenue/accounting system.

The ERP must not assume every digital payment has an immediate machine-verifiable API response.

## Decision
Payments are modeled independently from payment providers.

### Payment Methods
Supported/configurable methods include CASH, BANK_TRANSFER, MOBILE_MONEY, CARD, ACCOUNT_CREDIT and OTHER_CONFIGURED.

### Provider Adapters
A payment provider adapter may be configured for a method. The Sales/Cash domain does not depend on Bankak or any other provider.

### Payment Lifecycle
Normal lifecycle:
INITIATED → PENDING_VERIFICATION → VERIFIED → CAPTURED

Alternative terminal outcomes:
REJECTED, CANCELLED

Cash may transition directly to a confirmed/captured state according to policy.

### Verification Modes
Every non-cash payment records an explicit verification mode:
- MANUAL_CONFIRMED
- PROOF_CAPTURED
- API_VERIFIED
- PROVIDER_CONFIRMED
- TRUSTED_FLOW

TRUSTED_FLOW is still audited; it means an authorized staff member may confirm payment based on observed evidence without uploading a proof artifact.

### Payment Evidence
Evidence is optional and separate from the payment. A payment may reference a screenshot/image, receipt/document, provider transaction/reference number, or external verification reference.

The ERP must never require a screenshot merely because the payment is digital.

Evidence metadata includes evidence type, captured_at, captured_by, storage reference, source, and checksum where appropriate.

### External Verification Adapter
The core exposes a provider-neutral verification contract conceptually equivalent to:

verifyPayment(paymentReference, amount, currency, providerContext)

The adapter returns verification status, provider transaction/reference, verified amount/currency, verified timestamp, provider metadata and rejection/failure reason.

The first external integration may be the user's existing revenue/accounting verification system ("حساباتي"), but provider-specific logic stays inside its adapter.

### Sale Acceptance Policy
Verification policy is configurable by organization/branch/payment method.

Examples:
- CASH: immediate acceptance.
- Manual digital confirmation: allowed for authorized staff.
- API verification: pending until verification succeeds unless policy permits controlled manual override.
- Unverified digital payment: may remain pending and must not be falsely represented as verified revenue.

The UI explicitly distinguishes **payment recorded** from **payment verified**.

### Offline Rules
Cash can be fully confirmed offline.

Digital/manual payment may be recorded offline when policy permits, but verification state and actor are preserved. External API verification requires connectivity.

Offline payment must never fabricate an API verification result.

### Reconciliation
Payment records support reconciliation between ERP sales, cash sessions, bank/provider transactions, external revenue systems and accounting journal entries.

A mismatch creates a reconciliation exception rather than silently changing historical sales.

### Security
API keys/secrets are stored in secure configuration/secret storage and never logged. Payment evidence access follows role/branch permissions. Verification actions are auditable.

### Consequence
This supports Sudan-first payment workflows without hard-coding Bankak and keeps the ERP extensible to banks, mobile-money providers and external verification systems.

A screenshot is evidence, not proof by itself; verification status remains an explicit business state.
