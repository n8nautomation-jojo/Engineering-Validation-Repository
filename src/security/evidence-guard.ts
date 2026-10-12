import type { PaymentEvidence, PaymentEvidenceStatus } from "./types.js";
import { canonicalJsonStringify, computeHmacSha256, timingSafeEqualHex } from "./crypto.js";

export interface PaymentEvidenceInput {
  readonly evidenceId: string;
  readonly saleId: string;
  readonly paymentMethod: string;
  readonly amount: number;
  readonly currency: string;
  readonly capturedAt: string;
  readonly fileHash: string; // SHA-256 of the receipt image or payment voucher
}

export class EvidenceTamperedError extends Error {
  constructor(message: string, public readonly evidenceId: string) {
    super(message);
    this.name = "EvidenceTamperedError";
  }
}

export class PaymentEvidenceGuard {
  /**
   * Computes an HMAC digest sealing the payment evidence attributes and fileHash.
   */
  public computeEvidenceDigest(input: PaymentEvidenceInput, secret: string): string {
    const canonical = canonicalJsonStringify({
      evidenceId: input.evidenceId,
      saleId: input.saleId,
      paymentMethod: input.paymentMethod,
      amount: input.amount,
      currency: input.currency,
      capturedAt: input.capturedAt,
      fileHash: input.fileHash
    });
    return computeHmacSha256(canonical, secret);
  }

  /**
   * Creates a new sealed payment evidence record in UNVERIFIED status.
   */
  public createEvidence(input: PaymentEvidenceInput, secret: string): PaymentEvidence {
    const digest = this.computeEvidenceDigest(input, secret);
    return {
      ...input,
      evidenceDigest: digest,
      verificationStatus: "UNVERIFIED"
    };
  }

  /**
   * Verifies the cryptographic integrity of a payment evidence record against the file hash.
   */
  public verifyEvidenceIntegrity(evidence: PaymentEvidence, currentFileHash: string, secret: string): boolean {
    if (evidence.fileHash !== currentFileHash) {
      return false; // Physical file altered!
    }
    const expectedDigest = this.computeEvidenceDigest(
      {
        evidenceId: evidence.evidenceId,
        saleId: evidence.saleId,
        paymentMethod: evidence.paymentMethod,
        amount: evidence.amount,
        currency: evidence.currency,
        capturedAt: evidence.capturedAt,
        fileHash: currentFileHash
      },
      secret
    );
    return timingSafeEqualHex(evidence.evidenceDigest, expectedDigest);
  }

  /**
   * Reviews and verifies evidence offline.
   * Enforces: offline review can only set verificationMethod to "EVIDENCE_REVIEW", NEVER "API_VERIFICATION".
   */
  public reviewEvidenceOffline(
    evidence: PaymentEvidence,
    reviewerId: string,
    verifiedAt: string,
    currentFileHash: string,
    secret: string
  ): PaymentEvidence {
    const valid = this.verifyEvidenceIntegrity(evidence, currentFileHash, secret);
    if (!valid) {
      return {
        ...evidence,
        verificationStatus: "QUARANTINED",
        quarantineReason: "Evidence integrity verification failed. Potential file or attribute tampering."
      };
    }

    return {
      ...evidence,
      verificationStatus: "EVIDENCE_REVIEWED",
      verificationMethod: "EVIDENCE_REVIEW",
      reviewerId,
      verifiedAt
    };
  }

  /**
   * Transitions evidence to API_VERIFIED only through an authoritative provider verification response.
   */
  public applyProviderVerification(
    evidence: PaymentEvidence,
    providerReference: string,
    verifiedAt: string
  ): PaymentEvidence {
    if (evidence.verificationStatus === "QUARANTINED") {
      throw new EvidenceTamperedError(
        `Cannot apply provider verification to quarantined evidence '${evidence.evidenceId}'.`,
        evidence.evidenceId
      );
    }

    return {
      ...evidence,
      verificationStatus: "API_VERIFIED",
      verificationMethod: "API_VERIFICATION",
      verifiedAt
    };
  }
}
