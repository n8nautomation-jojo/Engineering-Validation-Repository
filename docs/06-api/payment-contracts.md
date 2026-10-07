# Payment API Contracts

**Status:** Proposed contract  
**Depends on:** ADR-012, Phase 3.1 and Phase 3.2 catalog.

## 1. Design Principle

Payment is a business record. Verification is a separate process and state. Evidence is supporting material, not proof of settlement by itself.

The core must support Sudanese pharmacy workflows without requiring every transfer to have a provider API:
- cash;
- bank transfer where staff visually inspect the customer's notification;
- optional screenshot/photo evidence;
- later verification or reconciliation through a revenue system such as Hisabati via an adapter and API credential;
- future banks, mobile-money services and payment gateways.

Sales and Payments must not contain provider-specific conditionals. Provider-specific behavior belongs in an integration adapter.

## 2. Conceptual Payment Record

Illustrative JSON (not a final schema):

    {
      "payment_id": "uuid-v7",
      "sale_id": "uuid-v7",
      "method_code": "BANK_TRANSFER",
      "amount": { "value": "12500.00", "currency": "SDG" },
      "status": "RECORDED",
      "verification": {
        "mode": "MANUAL",
        "status": "PENDING",
        "provider_id": null,
        "provider_reference": null,
        "verified_at": null
      },
      "evidence": { "status": "NOT_PROVIDED", "references": [] },
      "recorded_at": "UTC timestamp",
      "recorded_by": "uuid-v7"
    }

Use decimal strings or currency-specific integer minor units for money; binary floating point is prohibited.

## 3. Separate State Axes

### Payment lifecycle (proposed)
- RECORDED
- VOIDED only where policy permits before finalization
- REFUNDED / PARTIALLY_REFUNDED derived from explicit refund operations, not by editing the original amount

### Verification status (proposed)
- NOT_REQUIRED
- PENDING
- MANUAL_CONFIRMED
- API_VERIFIED
- REJECTED
- REVIEW_REQUIRED
- EXPIRED where requests have a defined validity window

### Evidence status (proposed)
- NOT_PROVIDED
- CAPTURED
- REVIEWED
- UNAVAILABLE
- REJECTED

MANUAL_CONFIRMED means an authorized user recorded a decision; it does not claim independent bank-side confirmation. The audit record identifies who, when, policy, reason and evidence.

## 4. Method and Verification Mode

Possible method codes: CASH, BANK_TRANSFER, MOBILE_MONEY, CARD, CHEQUE, OTHER. Methods are configurable by organization/branch; this is not a closed enum.

Possible verification modes: NONE_REQUIRED, MANUAL, EXTERNAL_PROVIDER, RECONCILIATION, HYBRID.

For cash, configured policy may mark verification NOT_REQUIRED after the cashier records receipt. For bank transfer, a branch may allow manual confirmation, require evidence, or require provider verification. The policy must be explicit and auditable.

## 5. Proposed Commands

### Record payment
POST /api/v1/sales/{saleId}/payments

Headers:
- Idempotency-Key: unique opaque key
- X-Correlation-ID: optional correlation identifier

Illustrative body:

    {
      "method_code": "BANK_TRANSFER",
      "amount": { "value": "12500.00", "currency": "SDG" },
      "verification_mode": "MANUAL",
      "client_payment_reference": "optional",
      "note": "Optional"
    }

The server derives actor, organization, branch and device from authenticated context and validates amount, currency, sale balance, payment policy and permission.

### Capture evidence
POST /api/v1/payments/{paymentId}/evidence

Illustrative metadata:

    {
      "upload_reference": "server-issued-reference",
      "evidence_type": "TRANSFER_NOTIFICATION_SCREENSHOT",
      "captured_at": "UTC timestamp",
      "note": "Optional"
    }

Binary uploads use a separate bounded upload flow with content-type/size validation, malware scanning, access control and retention rules. Do not place large base64 images in ordinary payment JSON.

### Record manual decision
POST /api/v1/payments/{paymentId}/verification-decisions

    {
      "decision": "CONFIRM",
      "reason_code": "CUSTOMER_NOTIFICATION_VISUALLY_CHECKED",
      "note": "Optional",
      "evidence_references": []
    }

Requires a dedicated permission. Decisions are append-only; correction is a new decision/event.

### Request external verification
POST /api/v1/payments/{paymentId}/verification-requests

    {
      "provider_id": "configured-provider-id",
      "provider_reference": "optional",
      "evidence_references": []
    }

Provider selection must be checked against organization configuration. The client never sends API keys or secrets.

## 6. Verification Result Semantics

Provider adapters return normalized outcomes: VERIFIED, NOT_VERIFIED, PENDING, REVIEW_REQUIRED or TEMPORARY_FAILURE.

A timeout, network interruption or provider 5xx must not become VERIFIED or definitive NOT_VERIFIED automatically. Keep the request pending/unknown and retry safely. Store provider request ID, normalized result, reference, timestamps, adapter version and safe diagnostic code. Never log secrets, full tokens or unnecessary personal/financial data.

## 7. Integration Credentials

Provider API keys belong in a protected integration-credential store, never in payment payloads or source control. Encrypt at rest; redact logs; restrict access; support rotation/revocation; scope credentials to tenant/organization and provider; do not expose credentials to POS clients.

Hisabati can be integrated through an adapter once its actual API/authentication contract is available and authorized. Do not claim live verification capability until that contract has been validated.

## 8. Offline Behavior

- Cash may be recorded locally under cash-session policy.
- Bank transfer may be recorded locally as pending or manually confirmed according to explicit branch policy.
- Evidence capture can be queued locally and uploaded later.
- Offline clients must never claim API_VERIFIED without a durable trusted verification result.
- Sync preserves actor/device/time provenance and manual decisions.
- Cloud reconciliation may accept, reject or flag a record for review, but must not silently rewrite the recorded decision.
- Manual confirmation is a business attestation, not independent settlement confirmation.

## 9. Sale Completion Policy

Do not assume every tender has identical acceptance rules. A configured policy determines whether a sale can complete for cash, manually confirmed transfers, pending external verification, rejected payments and split tenders. An unverified transfer must never be described as independently verified merely because the sale completed.

## 10. Acceptance Tests

1. Cash sale works without a provider integration when cash-session rules are satisfied.
2. Bank transfer can be recorded without provider API if branch policy permits.
3. Screenshot capture does not set API_VERIFIED.
4. Manual confirmation records actor, time, reason and audit.
5. Provider timeout remains pending/unknown and safe to retry.
6. Duplicate requests do not create duplicate payments or provider side effects.
7. API keys never appear in client payloads, logs, DTO responses or repository files.
8. Offline operation never fabricates external verification.
9. Split tenders reconcile to sale amount under explicit rounding rules.
10. Refund/reversal creates traceable operations and does not erase payment history.
