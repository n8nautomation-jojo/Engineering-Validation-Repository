# R1-D — Integration Readiness & Provider Adapter Baseline

Status: ACTIVE REMEDIATION WORK PACKAGE — PROPOSED / NOT LOCKED
Track: R1-D Integration Readiness
Purpose: Define implementation-ready integration boundaries without inventing provider behavior.
Depends on: Domain Model v1.1, Payment ADR-012, Phase 2.2–2.4, Phase 3.1–3.3, R1-C Compliance.
Does not supersede: Locked baselines.

## 1. Executive Decision

PharmaTech uses a provider-agnostic integration architecture.

Core business domains do not depend directly on Bankak, Hisabati, a tax authority, a card network, or another external provider.

Core Domain → Provider Adapter → External Provider.

The core records business facts and verification state. The adapter translates those facts to provider-specific protocols.

No external integration is production-ready merely because an adapter interface exists. A provider is activated only after its real technical contract, credentials, legal boundary, sandbox or production behavior, failure semantics, and acceptance tests are verified.

## 2. Integration Classes

| Integration | Role | Default Status | Activation Gate |
|---|---|---|---|
| Hisabati | Revenue/payment-evidence verification | Adapter-ready; contract discovery required | Real API/SDK contract + security + acceptance |
| Bankak / mobile-money provider | Payment provider boundary | Adapter-ready; provider contract required | Official provider contract + approved verification capability |
| Sudan Tax / E-Invoice | Tax/e-invoice authority integration | Adapter-ready | Current official technical package + onboarding/certification |
| Other payment providers | Future provider adapters | Deferred | Provider-specific validation |

## 3. Core Integration Invariants

1. Provider-specific credentials never reside in POS client code or ordinary local business records.
2. Provider verification never occurs solely because evidence exists.
3. OCR or extracted evidence is data, not proof of settlement.
4. API_VERIFICATION is only assigned after successful provider verification.
5. Offline operation cannot manufacture an online provider-confirmed state.
6. Provider outages must not corrupt the core Payment aggregate.
7. External retries must be idempotent.
8. Webhook or callback processing, if supported, must be authenticated, replay-resistant, and idempotent.
9. Every provider state transition must be auditable.
10. Provider adapters cannot directly mutate Inventory, Sale, Cash, Accounting, or other private aggregates.
11. External identifiers are stored separately from internal identifiers.
12. Provider-specific fields must not leak into the provider-agnostic core contract unless promoted as a genuine domain concept.
13. Secrets are managed by the platform security boundary, not by integration business logic.
14. Provider integration failure is an integration state, not an excuse for silent financial mutation.
15. Tenant, Organization, Branch, and device scope is enforced before provider access.

## 4. Hisabati Boundary

Hisabati is treated as an external verification and evidence service, not as a core PharmaTech payment method.

The known business requirement is that Hisabati may receive payment or revenue evidence, including transfer-notification screenshots, extract transaction information, and support revenue verification.

Canonical flow:
PharmaTech Payment → Evidence Reference → Hisabati Adapter → External Verification → Verification Result → Payment State Update → Audit.

Conceptual adapter operations may include:
- submit evidence;
- request verification;
- query verification status;
- retrieve verification result;
- reconcile an external reference.

Exact endpoint names, HTTP methods, authentication mechanism, payloads, and callback behavior remain UNKNOWN until the real Hisabati contract is supplied or verified.

Before production activation, document: base URL and environments, authentication, API version, evidence types, upload limits, idempotency, external transaction reference, request/response schemas, verification statuses, OCR confidence semantics, webhook or polling model, callback authentication, retry rules, rate limits, errors, retention, residency, credential rotation, sandbox, production onboarding, and support process.

State rule:
EVIDENCE_CAPTURED → SUBMITTED → PENDING_VERIFICATION → VERIFIED / REJECTED / FAILED.

Successful evidence submission does not equal successful financial settlement. Only an explicitly verified provider result may move the relevant verification state to API_VERIFICATION or another final provider-confirmed state allowed by the Payment policy.

## 5. Bankak / Mobile-Money Boundary

PharmaTech remains a merchant-side ERP and payment-recording system unless a separate regulatory and commercial decision makes it a regulated payment intermediary.

Core payment methods remain CASH, BANK_TRANSFER, MOBILE_MONEY, CARD, and OTHER.

A provider such as Bankak is an adapter/provider identity, not a replacement for these domain methods.

Before activation, verify the official integration channel, merchant eligibility, authentication, transaction lookup or verification, transaction reference, callback model, signature/authentication, idempotency, settlement semantics, reversal/refund semantics, sandbox, limits, failure states, support, and regulatory obligations.

Offline rule: an offline POS may record a customer claim or evidence according to branch policy. It must not label the payment API_VERIFIED while disconnected.

## 6. Tax / E-Invoice Adapter

Tax remains an internal configurable domain.

Integration boundary:
TaxResolver / Invoice → Tax Adapter → Official Tax/E-Invoice Interface.

Where officially supported, the adapter should support invoice submission, status query, authority reference, rejection, safe retry, reconciliation, and preservation of submission evidence.

Production activation requires the current official technical specification, onboarding or certification requirements, and acceptance testing.

Tax rates remain configuration-driven and effective-dated. National rates are not hard-coded into the integration adapter.

## 7. Generic Provider Adapter Contract

Every adapter should expose these conceptual areas:

Identity: provider_id, provider_version, environment, organization or tenant scope.
Security: credential reference, secret owner, authentication mechanism, credential lifecycle, revocation state.
Request: correlation_id, idempotency_key, internal aggregate reference, provider operation, normalized request.
Response: provider reference, provider status, normalized result, raw-response reference where permitted, timestamps.
Failure: normalized error code, retryability, retry-after when available, provider error reference, terminal or non-terminal classification.

Provider-specific error codes must not become the only business error vocabulary.

## 8. Idempotency and Retry

1. Generate a stable internal idempotency key.
2. Persist the outbound attempt before or atomically with the integration work item.
3. Retry only according to the provider contract.
4. Never create a second business effect because an earlier response was lost.
5. Reconcile ambiguous outcomes by querying the provider when supported.
6. Mark an outcome as UNKNOWN or RECONCILIATION_REQUIRED when it cannot safely be determined.

Retries must be restart-safe.

## 9. Webhooks / Callbacks

If a provider supports callbacks:
- authenticate the callback;
- validate provider signatures where supported;
- reject malformed or unauthorized callbacks;
- deduplicate callback events;
- persist receipt metadata;
- process asynchronously;
- enforce aggregate/version rules;
- do not trust callback order blindly;
- retain provenance for audit.

If callbacks are unavailable, polling or reconciliation may be used. The choice is provider-specific and must not be invented in the core architecture.

## 10. Secrets and Credentials

Credentials belong to the secure integration boundary.

Minimum requirements: never embed secrets in desktop binaries; never expose provider credentials to POS users; encrypted storage using the approved security design; access limited to authorized server-side integration workers; rotation and revocation; environment separation; audit access; no secrets in logs or error responses; no secrets in ordinary sync payloads.

Actual technology follows R1-B security decisions.

## 11. Failure and Recovery

Classify provider failures at least as validation failure, authentication or authorization failure, provider unavailable, timeout, rate limited, duplicate or idempotency collision, provider rejected, ambiguous outcome, local integration failure, and permanent configuration failure.

Retryable failures use bounded retry with backoff. Ambiguous outcomes require reconciliation rather than blind replay. Permanent failures remain visible and auditable.

## 12. Data Provenance

For each provider interaction preserve as appropriate: internal correlation ID, tenant or organization or branch, provider, operation, internal aggregate ID, provider reference, request and response timestamps, normalized result, error classification, actor or worker, evidence reference, retry count, and final disposition.

Raw provider payloads are retained only where legally and operationally justified; otherwise keep a secure reference and normalized data.

## 13. Security, Compliance, Reliability, and Acceptance Gates

Security: credential protection, authentication, replay and idempotency protection, callback security, tenant isolation, secret-leakage tests, and logging review.

Compliance: provider regulatory boundary, data-processing responsibilities, retention and residency, required contracts or licences, and e-invoice onboarding or certification.

Reliability: timeout and retry tests, duplicate requests, lost responses, provider outage, restart and recovery, and reconciliation.

Business acceptance: happy path, rejection, ambiguous outcome, refund or reversal where supported, evidence lifecycle, and audit trail.

## 14. Current Readiness

| Integration | Architecture Boundary | Real Contract | Security Evidence | Acceptance | Status |
|---|---|---|---|---|---|
| Hisabati | Defined | Not supplied/verified | Pending | Pending | NOT ACTIVATED |
| Bankak/mobile-money | Defined | Provider-specific | Pending | Pending | NOT ACTIVATED |
| Tax/E-Invoice | Defined | Current technical package required | Pending | Pending | NOT ACTIVATED |

Adapter-ready does not mean provider-connected.

## 15. R1-D Exit Criteria

R1-D can move to reconciliation when:
1. Provider boundaries are represented without speculative APIs.
2. Hisabati contract discovery is explicitly tracked.
3. Payment-provider responsibilities are separated from PharmaTech responsibilities.
4. Tax/e-invoice adapter boundary is represented.
5. Credential and security requirements map to R1-B.
6. Idempotency, retry, and reconciliation behavior is defined.
7. Evidence lifecycle maps to ADR-012 and R1-B.
8. Provider activation gates are explicit.
9. No P0 ambiguity is hidden in provider-specific assumptions.
10. Product, API, Data, and Module documents can consume this boundary without reopening locked architecture.

## 16. Non-Goals

This document does not invent a Hisabati API, claim Bankak API access, claim Tax Authority production certification, turn PharmaTech into a payment provider, select secret-management technology before R1-B, define final OpenAPI schemas, activate an external provider, or reopen locked architecture.

## 17. Evidence Required Before Provider Activation

1. Hisabati API documentation or validated sandbox contract.
2. Bankak or relevant provider merchant integration documentation if direct verification is required.
3. Current official Tax/E-Invoice technical package and onboarding requirements.
4. Provider contracts, service levels, and credential lifecycle documentation.

Until these artifacts exist, this adapter boundary is the source of truth and provider-specific behavior remains unimplemented.

## 18. Governance

Status: PROPOSED / NOT LOCKED.

Promotion requires reconciliation with R1-B Security, R1-C Compliance, ADR-012 Payment, Phase 3.1–3.3 API contracts, Module Implementation Contracts, Data Implementation Blueprint, R1-H measurement and evidence, and R1-G documentation governance.

No architecture change is authorized by this document.