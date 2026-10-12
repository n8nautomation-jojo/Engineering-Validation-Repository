import { createHash } from "node:crypto";
import type { AuthorizationAssignment, AuthorizationSnapshot } from "./policy.js";
import type { DeviceId, UserId, TenantId, OrganizationId } from "../kernel/types.js";

export function computeSnapshotSignature(input: {
  snapshotId: string;
  version: number;
  issuedAt: string;
  expiresAt: string;
  deviceId: DeviceId;
  userId: UserId;
  tenantId?: TenantId | undefined;
  organizationId?: OrganizationId | undefined;
  assignments: readonly AuthorizationAssignment[];
}, secretKey?: string | undefined): string {
  const payload = {
    snapshotId: input.snapshotId,
    version: input.version,
    issuedAt: input.issuedAt,
    expiresAt: input.expiresAt,
    deviceId: input.deviceId,
    userId: input.userId,
    tenantId: input.tenantId ?? null,
    organizationId: input.organizationId ?? null,
    assignments: input.assignments.map(a => ({
      userId: a.userId,
      capabilities: [...a.capabilities].sort(),
      scope: {
        tenantId: a.scope.tenantId ?? null,
        organizationId: a.scope.organizationId ?? null,
        branchIds: a.scope.branchIds ? [...a.scope.branchIds].sort() : null,
        warehouseIds: a.scope.warehouseIds ? [...a.scope.warehouseIds].sort() : null,
        deviceIds: a.scope.deviceIds ? [...a.scope.deviceIds].sort() : null
      },
      policyVersion: a.policyVersion
    })),
    salt: secretKey ?? "pharmatech-offline-auth-snapshot-key-v1"
  };
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export function verifySnapshotSignature(snapshot: AuthorizationSnapshot, secretKey?: string): boolean {
  if (!snapshot.signature) return false;
  const expected = computeSnapshotSignature(snapshot, secretKey);
  return snapshot.signature === expected;
}

export function createAuthorizationSnapshot(input: {
  snapshotId: string;
  version: number;
  issuedAt: string;
  expiresAt: string;
  deviceId: DeviceId;
  userId: UserId;
  tenantId?: TenantId | undefined;
  organizationId?: OrganizationId | undefined;
  assignments: readonly AuthorizationAssignment[];
  secretKey?: string | undefined;
}): AuthorizationSnapshot {
  const issued = Date.parse(input.issuedAt);
  const expires = Date.parse(input.expiresAt);
  if (!Number.isFinite(issued) || !Number.isFinite(expires) || expires <= issued) {
    throw new Error("INVALID_AUTHORIZATION_SNAPSHOT_WINDOW");
  }
  const signature = computeSnapshotSignature(input, input.secretKey);
  return Object.freeze({
    snapshotId: input.snapshotId,
    version: input.version,
    issuedAt: input.issuedAt,
    expiresAt: input.expiresAt,
    deviceId: input.deviceId,
    userId: input.userId,
    assignments: input.assignments,
    revoked: false,
    integrityVerified: true,
    signature,
    ...(input.tenantId ? { tenantId: input.tenantId } : {}),
    ...(input.organizationId ? { organizationId: input.organizationId } : {})
  });
}

export function revokeAuthorizationSnapshot(snapshot: AuthorizationSnapshot): AuthorizationSnapshot {
  return Object.freeze({
    ...snapshot,
    revoked: true
  });
}

export function assertSnapshotDevice(snapshot: AuthorizationSnapshot, userId: UserId, deviceId: DeviceId): void {
  if (snapshot.userId !== userId || snapshot.deviceId !== deviceId) {
    throw new Error("AUTHORIZATION_SNAPSHOT_DEVICE_MISMATCH");
  }
}

