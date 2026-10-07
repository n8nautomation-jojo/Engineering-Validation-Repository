# API HTTP Status & Error Matrix

**Status:** Proposed Baseline  
**Depends on:** Phase 3.3 DTO, Validation and Error Model.

| Scenario | HTTP | Error code |
|---|---:|---|
| Malformed request syntax | 400 | REQUEST_MALFORMED |
| Missing/invalid authentication | 401 | AUTHENTICATION_REQUIRED |
| Expired credential | 401 | TOKEN_EXPIRED |
| Authenticated but unauthorized | 403 | FORBIDDEN |
| Operation forbidden offline | 403 | OFFLINE_OPERATION_FORBIDDEN |
| POS device untrusted/revoked | 403 | DEVICE_NOT_REGISTERED / DEVICE_REVOKED |
| Authorized resource absent | 404 | NOT_FOUND |
| Field/type/format validation | 422 | VALIDATION_ERROR |
| Unsupported capability | 422 | UNSUPPORTED_OPERATION |
| General domain invariant | 422 | DOMAIN_RULE_VIOLATION |
| Expired batch | 422 | EXPIRED_BATCH |
| No open cash session | 422 | CASH_SESSION_REQUIRED |
| Unauthorized discount | 403 | DISCOUNT_NOT_AUTHORIZED |
| Payment allocation violates policy | 422 | PAYMENT_POLICY_VIOLATION |
| Return exceeds returnable quantity | 422 | RETURN_QUANTITY_EXCEEDED |
| Invalid lifecycle transition | 409 | INVALID_STATE_TRANSITION |
| Stale aggregate version | 409 | CONCURRENCY_CONFLICT |
| Same idempotency key, different request | 409 | IDEMPOTENCY_CONFLICT |
| Durable business conflict | 409 | CONFLICT |
| Authoritative stock cannot satisfy effect | 409 | INSUFFICIENT_STOCK |
| Offline sync conflicts with cloud truth | 409 | SYNC_CONFLICT |
| Sync cursor cannot resume | 409 | SYNC_CURSOR_INVALID |
| Duplicate operation identity conflict | 409 | DUPLICATE_OPERATION |
| Locked fiscal period | 409 | PERIOD_LOCKED |
| Verification accepted, final result pending | 202 | PAYMENT_VERIFICATION_PENDING |
| Payment requires review | 409 | PAYMENT_REVIEW_REQUIRED |
| Provider definitively rejects verification | 422 | PAYMENT_PROVIDER_REJECTED / PAYMENT_VERIFICATION_FAILED |
| Provider temporarily unavailable | 503 | PAYMENT_PROVIDER_UNAVAILABLE |
| General temporary outage | 503 | TEMPORARY_UNAVAILABLE |
| Rate limit exceeded | 429 | RATE_LIMITED |
| Unexpected server exception | 500 | INTERNAL_ERROR |

## Retry Guidance

- 400/401/403/404/422: do not blindly retry unchanged.
- 409: reconcile state, idempotency or version before retrying.
- 202: query the operation/status resource or await documented completion.
- 429: honor Retry-After when supplied.
- 503: bounded exponential backoff with jitter where semantics permit.
- Retry the same logical mutation with the same Idempotency-Key.

## Canonical Error Response

{
  "error": {
    "code": "CONCURRENCY_CONFLICT",
    "message": "The resource changed after it was read.",
    "details": {
      "resource_id": "uuid-v7",
      "expected_version": 7,
      "current_version": 8
    },
    "retryable": false
  },
  "meta": {
    "correlation_id": "uuid-v7"
  }
}

Security-sensitive resources may return NOT_FOUND instead of revealing cross-scope existence.
