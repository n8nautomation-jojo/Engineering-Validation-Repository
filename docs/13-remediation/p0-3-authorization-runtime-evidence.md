# P0-3 Authorization Runtime Foundation — Evidence

**Status:** IMPLEMENTED & VERIFIED — RUNTIME EXECUTION EVIDENCE RECORDED  
**Decision:** D-036  
**Scope:** Runtime authorization foundation, cryptographic snapshot integrity, durable snapshot stores (SQLite + PostgreSQL), and SoD enforcement.

## Implemented

- Stable capability registry derived from Phase 3.4; fully reconciled with `allocations.replenish`, `authorization.manage`, and `devices.manage` mapped explicitly to `ONLINE_ONLY`.
- Explicit offline class mapping across all platform capabilities.
- Effective authorization evaluates assignment scope, request context, and resource scope as an intersection (never client-expanded).
- Cryptographic tamper-detection signatures (`computeSnapshotSignature` / `verifySnapshotSignature`) using SHA-256 canonical hashing over assignments, scopes, validity windows, and device/user bindings.
- Tamper detection halts compromised local snapshots with `SNAPSHOT_INTEGRITY_COMPROMISED`.
- Offline authorization strictly validates device/user bindings, expiry windows, and revocation flags.
- Online-only capabilities fail closed when requested offline (`OFFLINE_NOT_PERMITTED`).
- Snapshot revocation is durable across process restarts (`revoked = true`).
- Separation of Duties (SoD) against self-approval deterministically rejects self-approval with `SOD_SELF_APPROVAL_DENIED` for sensitive workflows (`inventory.adjust.approve`, `sync.conflict.resolve`, `cash.sessions.reconcile`, `payments.verify.manual`).
- Automated structured audit logging to `audit_records` table with actor, device, scope, capability, decision, policy/snapshot version, resource, timestamp, and correlation identifier.
- Production `AuthorizationSnapshotStore` adapters:
  - `SqliteAuthorizationSnapshotStore` supporting embedded/offline disk & in-memory databases with automated DDL initialization.
  - `PostgresAuthorizationSnapshotStore` supporting cloud database pooling and parameterized operations.
- `AuthorizationRuntime` unified coordinator orchestrating authorization evaluation, snapshot issuance, cryptographic verification, revocation, and audit emission.

## Tests & Execution Evidence

- `tests/authorization.test.mjs`: Reference model tests (10/10 PASS).
- `tests/p0-10-a3-authorization-runtime.test.mjs`: Production Authorization Runtime test suite (18/18 PASS):
  - `AUTH-01`: Actor with valid capability and scope receives ALLOW.
  - `AUTH-02`: Missing capability receives CAPABILITY_OR_SCOPE_DENIED.
  - `AUTH-03`: Context scope violation (mismatched branch) receives CAPABILITY_OR_SCOPE_DENIED.
  - `AUTH-04`: Resource scope violation receives CAPABILITY_OR_SCOPE_DENIED.
  - `AUTH-05`: Online-only capability requested offline receives OFFLINE_NOT_PERMITTED.
  - `AUTH-06`: Offline request without snapshot receives OFFLINE_AUTHORITY_INVALID.
  - `AUTH-07`: Offline request with mismatched device receives OFFLINE_AUTHORITY_INVALID.
  - `AUTH-08`: Offline request with expired snapshot receives OFFLINE_AUTHORITY_INVALID.
  - `AUTH-09`: Offline request with revoked snapshot receives OFFLINE_AUTHORITY_INVALID.
  - `AUTH-10`: Tampered snapshot (manipulated capabilities/scopes) receives SNAPSHOT_INTEGRITY_COMPROMISED.
  - `AUTH-11`: SoD self-approval rejected with SOD_SELF_APPROVAL_DENIED.
  - `AUTH-12`: SoD independent approval by distinct actor is ALLOWED.
  - `AUTH-13`: Payment recording and verification separation enforced.
  - `AUTH-14`: Automated structured audit event emitted to SQLite audit_records.
  - `AUTH-15`: Issue and store snapshot in SqliteAuthorizationSnapshotStore.
  - `AUTH-16`: Revoke snapshot persists revocation to database.
  - `AUTH-17`: Durable SQLite persistence survives process restart across disk connections.
  - `AUTH-18`: PostgreSQL snapshot store schema parity and contract verification.

Total test suite: 202 passed, 0 failed, 33 skipped (live PG).

## Exit Condition for P0-3 / Track R1-A3

The production Authorization Runtime is fully wired to durable persistence, cryptographic tamper detection, and SoD policy enforcement. Track R1-A3 has achieved DYNAMIC execution evidence parity and is ready for integration lock.
