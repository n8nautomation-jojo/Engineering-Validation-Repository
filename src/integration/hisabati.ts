import type { ProviderAdapter } from "./adapter.js";
import type { ProviderIdentity, IntegrationRequest, IntegrationResponse } from "./types.js";

export interface HisabatiEvidencePayload {
  readonly evidenceId: string;
  readonly saleId: string;
  readonly paymentMethod: string;
  readonly declaredAmount: number;
  readonly currency: string;
  readonly receiptImageHash: string;
  readonly externalReference?: string;
}

export interface HisabatiVerificationResult {
  readonly evidenceId: string;
  readonly verificationId: string;
  readonly extractedAmount: number;
  readonly extractedReference: string;
  readonly ocrConfidence: number;
  readonly verifiedMatch: boolean;
  readonly verifiedAt: string;
}

export class HisabatiAdapter implements ProviderAdapter<HisabatiEvidencePayload, HisabatiVerificationResult> {
  readonly identity: ProviderIdentity = {
    providerId: "hisabati-evidence-v1",
    providerName: "Hisabati Revenue & Evidence Verification Service",
    providerVersion: "1.0.0",
    environment: "SANDBOX",
    status: "ACTIVE"
  };

  /**
   * Submits evidence and executes verification.
   * Enforces:
   * 1. If OCR confidence < 0.85 or extracted amount does not match declared amount,
   *    does NOT automatically verify; marks as PENDING_VERIFICATION / RECONCILIATION_REQUIRED.
   * 2. Only exact matches with high confidence transition to API_VERIFIED.
   */
  async execute(
    request: IntegrationRequest<HisabatiEvidencePayload>
  ): Promise<IntegrationResponse<HisabatiVerificationResult>> {
    const payload = request.payload;

    // Simulate Hisabati verification logic
    const extractedAmount = payload.declaredAmount; // In mock/sandbox
    const ocrConfidence = 0.95; // High confidence mock
    const verifiedMatch = extractedAmount === payload.declaredAmount;

    if (!verifiedMatch || ocrConfidence < 0.85) {
      return {
        requestId: request.requestId,
        correlationId: request.correlationId,
        providerReference: `HISABATI-REF-${request.payload.evidenceId}`,
        providerStatus: "PENDING_VERIFICATION",
        timestamp: new Date().toISOString(),
        result: {
          evidenceId: payload.evidenceId,
          verificationId: `V-${Date.now()}`,
          extractedAmount,
          extractedReference: payload.externalReference ?? "UNKNOWN-REF",
          ocrConfidence,
          verifiedMatch: false,
          verifiedAt: new Date().toISOString()
        }
      };
    }

    return {
      requestId: request.requestId,
      correlationId: request.correlationId,
      providerReference: `HISABATI-REF-${request.payload.evidenceId}`,
      providerStatus: "API_VERIFIED",
      timestamp: new Date().toISOString(),
      result: {
        evidenceId: payload.evidenceId,
        verificationId: `V-${Date.now()}`,
        extractedAmount,
        extractedReference: payload.externalReference ?? "TXN-12345",
        ocrConfidence,
        verifiedMatch: true,
        verifiedAt: new Date().toISOString()
      }
    };
  }

  async queryStatus(providerReference: string): Promise<IntegrationResponse<HisabatiVerificationResult>> {
    return {
      requestId: `req-query-${Date.now()}`,
      correlationId: `corr-${providerReference}`,
      providerReference,
      providerStatus: "API_VERIFIED",
      timestamp: new Date().toISOString()
    };
  }
}
