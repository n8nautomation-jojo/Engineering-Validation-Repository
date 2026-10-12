import type { TenantId, OrganizationId, BranchId, DeviceId } from "../kernel/identifiers.js";

export type ProviderEnvironment = "SANDBOX" | "PRODUCTION";
export type ProviderActivationStatus = "ACTIVE" | "SUSPENDED" | "DISCOVERY_PENDING" | "RECONCILIATION_REQUIRED";

export interface ProviderIdentity {
  readonly providerId: string;
  readonly providerName: string;
  readonly providerVersion: string;
  readonly environment: ProviderEnvironment;
  readonly status: ProviderActivationStatus;
}

export type ProviderVerificationState =
  | "UNVERIFIED"
  | "SUBMITTED"
  | "PENDING_VERIFICATION"
  | "API_VERIFIED"
  | "REJECTED"
  | "FAILED"
  | "RECONCILIATION_REQUIRED";

export interface IntegrationError {
  readonly code: string;
  readonly message: string;
  readonly retryable: boolean;
  readonly retryAfterMs?: number;
  readonly terminal: boolean;
  readonly providerRawError?: string;
}

export interface IntegrationRequest<T = unknown> {
  readonly requestId: string;
  readonly correlationId: string;
  readonly idempotencyKey: string;
  readonly tenantId: TenantId;
  readonly organizationId: OrganizationId;
  readonly branchId: BranchId;
  readonly deviceId: DeviceId;
  readonly operation: string;
  readonly timestamp: string;
  readonly payload: T;
}

export interface IntegrationResponse<R = unknown> {
  readonly requestId: string;
  readonly correlationId: string;
  readonly providerReference?: string;
  readonly providerStatus: ProviderVerificationState;
  readonly timestamp: string;
  readonly result?: R;
  readonly error?: IntegrationError;
}

export interface WebhookEvent<T = unknown> {
  readonly eventId: string;
  readonly providerId: string;
  readonly signature: string;
  readonly timestamp: string;
  readonly payload: T;
}
