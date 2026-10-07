# P0-3 Authorization Runtime Foundation — Evidence

**Status:** IMPLEMENTED — EXECUTION EVIDENCE PENDING
**Decision:** D-036
**Scope:** Runtime authorization foundation only. No R1-A3 promotion.

## Implemented

- Stable capability registry derived from Phase 3.4; no new stable permission vocabulary.
- Explicit offline class mapping.
- Effective authorization evaluates assignment scope, request context and resource scope as an intersection.
- Offline authorization requires an integrity-verified, device/user-bound snapshot with an explicit validity window.
- Online-only capabilities fail closed when requested offline.
- Snapshot revocation is represented explicitly.
- Self-approval is denied when the SoD policy requires independent approval.
- Sensitive authorization decisions produce a structured audit event containing actor, device, scope, capability, decision, policy/snapshot version, resource, timestamp and correlation identifier.

## Important reconciliation

`cash.sessions.read` is not introduced as a stable capability. The promoted Phase 3.4 contract uses the existing `cash.sessions.open` capability for the active-session read operation. The older A3 matrix entry is treated as a documentation reconciliation issue, not a reason to add a new capability.

## Tests

`tests/authorization.test.mjs` covers 10 reference/runtime-foundation cases: valid capability, missing capability, scope non-expansion, resource scope, valid offline snapshot, online-only denial, expiry, revocation, SoD self-approval, and audit metadata.

These are reference/runtime-foundation tests, not production security evidence.

## Explicit non-claims

This implementation does not yet prove cryptographic snapshot integrity, production SQLite protection, Windows local-admin/tamper boundaries, device identity/key lifecycle, real cloud revocation propagation, crash/power-loss recovery, production persistence durability, production performance, or R1-B security closure.

## Exit condition for P0-3

P0-3 is not considered complete until the production authorization path is wired to real persistence/device trust and its tests execute in the supported Windows/POS environment. The present code is the controlled foundation for that work.
