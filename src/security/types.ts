import type { DeviceId, TenantId, OrganizationId, BranchId } from "../kernel/identifiers.js";

export type DeviceSecurityStatus = "ACTIVE" | "SUSPENDED" | "REVOKED";

export interface DeviceIdentity {
  readonly deviceId: DeviceId;
  readonly tenantId: TenantId;
  readonly organizationId: OrganizationId;
  readonly branchId: BranchId;
  readonly keyBindingDigest: string;
  readonly status: DeviceSecurityStatus;
  readonly registeredAt: string;
  readonly revokedAt?: string;
  readonly suspensionReason?: string;
}

export type SecurityKeyType =
  | "DEVICE_IDENTITY"
  | "DATA_PROTECTION"
  | "SNAPSHOT_INTEGRITY"
  | "EVIDENCE_PROTECTION";

export interface SecurityKeyMaterial {
  readonly keyId: string;
  readonly keyType: SecurityKeyType;
  readonly secret: string;
  readonly createdAt: string;
  readonly expiresAt?: string;
}

export interface IntegritySealedRecord<T = unknown> {
  readonly payload: T;
  readonly digest: string;
  readonly keyId: string;
  readonly sealedAt: string;
  readonly deviceId: DeviceId;
}

export type PaymentVerificationMethod = "EVIDENCE_REVIEW" | "API_VERIFICATION";
export type PaymentEvidenceStatus = "UNVERIFIED" | "EVIDENCE_REVIEWED" | "API_VERIFIED" | "QUARANTINED";

export interface PaymentEvidence {
  readonly evidenceId: string;
  readonly saleId: string;
  readonly paymentMethod: string;
  readonly amount: number;
  readonly currency: string;
  readonly capturedAt: string;
  readonly fileHash: string;
  readonly evidenceDigest: string;
  readonly verificationStatus: PaymentEvidenceStatus;
  readonly verificationMethod?: PaymentVerificationMethod;
  readonly reviewerId?: string;
  readonly verifiedAt?: string;
  readonly quarantineReason?: string;
}

export type SecurityEventType =
  | "TAMPER_DETECTED"
  | "DEVICE_REVOKED"
  | "KEY_UNAVAILABLE"
  | "CLONE_ATTEMPT_DETECTED"
  | "EVIDENCE_QUARANTINED"
  | "CORRUPTION_DETECTED";

export type SecurityEventSeverity = "WARN" | "CRITICAL";

export interface SecurityEvent {
  readonly eventId: string;
  readonly eventType: SecurityEventType;
  readonly deviceId: DeviceId;
  readonly severity: SecurityEventSeverity;
  readonly timestamp: string;
  readonly details: Record<string, unknown>;
}

export type AttackerClass = "A0" | "A1" | "A2" | "A3" | "A4";

export interface AttackerBoundary {
  readonly attackerClass: AttackerClass;
  readonly name: string;
  readonly description: string;
  readonly preventionGuaranteed: boolean;
  readonly containmentStrategy: string;
  readonly residualRisk: string;
}

export interface TamperCheckResult {
  readonly passed: boolean;
  readonly totalChecked: number;
  readonly tamperedCount: number;
  readonly tamperedRecordIds: readonly string[];
  readonly reason?: string;
}
