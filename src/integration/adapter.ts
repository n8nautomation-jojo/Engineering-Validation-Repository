import type { IntegrationRequest, IntegrationResponse, WebhookEvent, ProviderIdentity } from "./types.js";
import { computeHmacSha256, timingSafeEqualHex, canonicalJsonStringify } from "../security/crypto.js";

export interface ProviderAdapter<TReq = unknown, TRes = unknown> {
  readonly identity: ProviderIdentity;
  execute(request: IntegrationRequest<TReq>): Promise<IntegrationResponse<TRes>>;
  queryStatus?(providerReference: string): Promise<IntegrationResponse<TRes>>;
  reconcile?(internalReference: string): Promise<IntegrationResponse<TRes>>;
}

export class IdempotencyCollisionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IdempotencyCollisionError";
  }
}

interface StoredAttempt<TRes> {
  readonly payloadHash: string;
  readonly response: IntegrationResponse<TRes>;
}

/**
 * Ensures restart-safe, idempotent execution of outbound integration calls.
 * Prevents duplicate side-effects on external financial providers.
 */
export class IdempotentIntegrationExecutor {
  private readonly attempts = new Map<string, StoredAttempt<unknown>>();

  public async executeWithIdempotency<TReq, TRes>(
    adapter: ProviderAdapter<TReq, TRes>,
    request: IntegrationRequest<TReq>
  ): Promise<IntegrationResponse<TRes>> {
    const payloadHash = canonicalJsonStringify(request.payload);
    const existing = this.attempts.get(request.idempotencyKey);

    if (existing) {
      if (existing.payloadHash !== payloadHash) {
        throw new IdempotencyCollisionError(
          `Idempotency key '${request.idempotencyKey}' was previously used with a different request payload.`
        );
      }
      // Return cached response without repeating side-effect!
      return existing.response as IntegrationResponse<TRes>;
    }

    try {
      const response = await adapter.execute(request);
      this.attempts.set(request.idempotencyKey, {
        payloadHash,
        response
      });
      return response;
    } catch (err) {
      // Outage or timeout handling:
      const errorMsg = String(err);
      const isTimeout = errorMsg.includes("timeout") || errorMsg.includes("ETIMEDOUT");

      const errorResponse: IntegrationResponse<TRes> = {
        requestId: request.requestId,
        correlationId: request.correlationId,
        providerStatus: isTimeout ? "RECONCILIATION_REQUIRED" : "FAILED",
        timestamp: new Date().toISOString(),
        error: {
          code: isTimeout ? "PROVIDER_TIMEOUT" : "PROVIDER_UNAVAILABLE",
          message: errorMsg,
          retryable: isTimeout,
          terminal: false
        }
      };

      // Only store if ambiguous outcome needs reconciliation
      if (isTimeout) {
        this.attempts.set(request.idempotencyKey, {
          payloadHash,
          response: errorResponse
        });
      }

      return errorResponse;
    }
  }

  public getAttempt(idempotencyKey: string): IntegrationResponse<unknown> | null {
    return this.attempts.get(idempotencyKey)?.response ?? null;
  }
}

/**
 * Validates HMAC webhook callback signatures.
 */
export function verifyWebhookSignature<T>(webhook: WebhookEvent<T>, secret: string): boolean {
  const canonical = canonicalJsonStringify(webhook.payload);
  const expectedSig = computeHmacSha256(canonical, secret);
  return timingSafeEqualHex(webhook.signature, expectedSig);
}
