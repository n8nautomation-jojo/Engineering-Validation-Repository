# Authorization Runtime

**Status:** Phase 2.3 Baseline

## Model
Authorization is based on User → RoleAssignment → Role → Permission with organization/branch/device scope.

## Offline Snapshot
The POS stores a versioned authorization snapshot containing only the permissions required by the local device scope.

The snapshot contains authorization_version, user_id, device_id, scope, permissions, issued_at, expires_at and integrity/signature metadata.

## Evaluation
Offline commands are checked against the local snapshot before execution.

Cloud authorization remains authoritative.

## High-Risk Operations
Examples that may require stricter policy:
- stock adjustment;
- sale reversal;
- price override;
- exceptional FEFO override;
- cash session close with discrepancy;
- administrative configuration.

The final online/offline availability matrix is defined in Phase 2.4.
