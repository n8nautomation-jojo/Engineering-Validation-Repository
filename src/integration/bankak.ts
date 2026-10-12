import type { ProviderAdapter } from "./adapter.js";
import type { ProviderIdentity, IntegrationRequest, IntegrationResponse } from "./types.js";

export interface BankakPaymentPayload {
  readonly transactionReference: string;
  readonly accountNumber?: string;
  readonly amount: number;
  readonly currency: string;
  readonly saleId: string;
  readonly paymentDate: string;
}

export interface BankakPaymentResult {
  readonly bankakReference: string;
  readonly settlementStatus: "SETTLED" | "PENDING" | "FAILED";
  readonly settledAmount: number;
  readonly currency: string;
  readonly senderAccountMasked: string;
  readonly transactionTimestamp: string;
}

export class BankakPaymentAdapter implements ProviderAdapter<BankakPaymentPayload, BankakPaymentResult> {
  readonly identity: ProviderIdentity = {
    providerId: "bankak-payment-adapter-v1",
    providerName: "Bank of Khartoum - Bankak Verification Gateway",
    providerVersion: "1.0.0",
    environment: "SANDBOX",
    status: "ACTIVE"
  };

  private simulateTimeout = false;

  public setSimulateTimeout(simulate: boolean): void {
    this.simulateTimeout = simulate;
  }

  async execute(
    request: IntegrationRequest<BankakPaymentPayload>
  ): Promise<IntegrationResponse<BankakPaymentResult>> {
    if (this.simulateTimeout) {
      throw new Error("ETIMEDOUT: Connection to Bankak gateway timed out after 5000ms");
    }

    const payload = request.payload;

    return {
      requestId: request.requestId,
      correlationId: request.correlationId,
      providerReference: `BOK-TXN-${payload.transactionReference}`,
      providerStatus: "API_VERIFIED",
      timestamp: new Date().toISOString(),
      result: {
        bankakReference: `BOK-TXN-${payload.transactionReference}`,
        settlementStatus: "SETTLED",
        settledAmount: payload.amount,
        currency: payload.currency,
        senderAccountMasked: "******1234",
        transactionTimestamp: payload.paymentDate
      }
    };
  }

  async queryStatus(providerReference: string): Promise<IntegrationResponse<BankakPaymentResult>> {
    return {
      requestId: `req-query-${Date.now()}`,
      correlationId: `corr-${providerReference}`,
      providerReference,
      providerStatus: "API_VERIFIED",
      timestamp: new Date().toISOString()
    };
  }
}
