import type { ProviderAdapter } from "./adapter.js";
import type { ProviderIdentity, IntegrationRequest, IntegrationResponse } from "./types.js";

export interface TaxInvoiceItem {
  readonly itemId: string;
  readonly description: string;
  readonly quantity: number;
  readonly unitPrice: number;
  readonly taxRatePercent: number; // Configurable rate, e.g. 0% for basic medicine, 17% for cosmetics
  readonly taxAmount: number;
  readonly totalAmount: number;
}

export interface TaxInvoicePayload {
  readonly invoiceId: string;
  readonly saleId: string;
  readonly branchTaxId: string;
  readonly customerTaxId?: string;
  readonly subtotal: number;
  readonly totalTax: number;
  readonly grandTotal: number;
  readonly currency: string;
  readonly issuedAt: string;
  readonly items: readonly TaxInvoiceItem[];
}

export interface TaxInvoiceResult {
  readonly taxAuthorityReference: string;
  readonly digitalSignature: string;
  readonly qrCodePayload: string;
  readonly clearanceStatus: "CLEARED" | "PENDING_AUDIT" | "REJECTED";
  readonly submittedAt: string;
}

export class SudanTaxInvoiceAdapter implements ProviderAdapter<TaxInvoicePayload, TaxInvoiceResult> {
  readonly identity: ProviderIdentity = {
    providerId: "sudan-tax-e-invoice-v1",
    providerName: "Sudan Tax Chamber - Electronic Invoicing Gateway",
    providerVersion: "1.0.0",
    environment: "SANDBOX",
    status: "ACTIVE"
  };

  async execute(
    request: IntegrationRequest<TaxInvoicePayload>
  ): Promise<IntegrationResponse<TaxInvoiceResult>> {
    const payload = request.payload;

    // Validate that tax amounts match item calculations (integrity guard)
    const computedTax = payload.items.reduce((sum, it) => sum + it.taxAmount, 0);
    const taxDiscrepancy = Math.abs(computedTax - payload.totalTax);
    if (taxDiscrepancy > 0.01) {
      return {
        requestId: request.requestId,
        correlationId: request.correlationId,
        providerStatus: "REJECTED",
        timestamp: new Date().toISOString(),
        error: {
          code: "TAX_CALCULATION_MISMATCH",
          message: `Calculated item tax (${computedTax}) does not match invoice totalTax (${payload.totalTax}).`,
          retryable: false,
          terminal: true
        }
      };
    }

    const authorityRef = `SD-TAX-INV-${payload.invoiceId}-${Date.now().toString().slice(-6)}`;
    const qrPayload = `TIN=${payload.branchTaxId}|INV=${payload.invoiceId}|TOTAL=${payload.grandTotal}|TAX=${payload.totalTax}`;

    return {
      requestId: request.requestId,
      correlationId: request.correlationId,
      providerReference: authorityRef,
      providerStatus: "API_VERIFIED",
      timestamp: new Date().toISOString(),
      result: {
        taxAuthorityReference: authorityRef,
        digitalSignature: `SIG-${Buffer.from(authorityRef).toString("base64")}`,
        qrCodePayload: qrPayload,
        clearanceStatus: "CLEARED",
        submittedAt: new Date().toISOString()
      }
    };
  }

  async queryStatus(providerReference: string): Promise<IntegrationResponse<TaxInvoiceResult>> {
    return {
      requestId: `req-query-${Date.now()}`,
      correlationId: `corr-${providerReference}`,
      providerReference,
      providerStatus: "API_VERIFIED",
      timestamp: new Date().toISOString()
    };
  }
}
