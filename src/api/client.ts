import type {
  CompleteSaleRequestDto,
  CompleteSaleResponseDto,
  SyncConflictResolutionRequestDto,
  ApiErrorResponseDto
} from "./types.js";
import type { ApiRouter, HttpRequest, HttpResponse } from "./router.js";

export interface ClientRequestOptions {
  readonly idempotencyKey?: string;
  readonly correlationId?: string;
  readonly deviceId?: string;
  readonly authToken?: string;
}

export class PharmaTechApiClient {
  private readonly router: ApiRouter;
  private readonly defaultDeviceId?: string;

  constructor(router: ApiRouter, defaultDeviceId?: string) {
    this.router = router;
    if (defaultDeviceId) this.defaultDeviceId = defaultDeviceId;
  }

  private buildHeaders(options?: ClientRequestOptions): Record<string, string> {
    const headers: Record<string, string> = {};
    if (options?.idempotencyKey) headers["idempotency-key"] = options.idempotencyKey;
    if (options?.correlationId) headers["x-correlation-id"] = options.correlationId;
    const devId = options?.deviceId ?? this.defaultDeviceId;
    if (devId) headers["x-device-id"] = devId;
    if (options?.authToken) headers["authorization"] = `Bearer ${options.authToken}`;
    return headers;
  }

  public async completeSale(
    request: CompleteSaleRequestDto,
    options: ClientRequestOptions
  ): Promise<CompleteSaleResponseDto> {
    const httpRequest: HttpRequest = {
      method: "POST",
      path: "/sales",
      headers: this.buildHeaders(options),
      body: request
    };

    const response = await this.router.dispatch(httpRequest);
    if (response.status !== 201) {
      const errBody = response.body as ApiErrorResponseDto;
      throw new Error(`API Error [${response.status}] ${errBody.error?.code}: ${errBody.error?.message}`);
    }

    return response.body as CompleteSaleResponseDto;
  }

  public async getSale(saleId: string, options?: ClientRequestOptions): Promise<unknown> {
    const httpRequest: HttpRequest = {
      method: "GET",
      path: `/sales/${saleId}`,
      headers: this.buildHeaders(options)
    };

    const response = await this.router.dispatch(httpRequest);
    if (response.status !== 200) {
      throw new Error(`Failed to get sale ${saleId}: status ${response.status}`);
    }
    return response.body;
  }

  public async resolveSyncConflict(
    conflictId: string,
    resolution: SyncConflictResolutionRequestDto,
    options: ClientRequestOptions
  ): Promise<unknown> {
    const httpRequest: HttpRequest = {
      method: "POST",
      path: `/sync/conflicts/${conflictId}/resolution`,
      headers: this.buildHeaders(options),
      body: resolution
    };

    const response = await this.router.dispatch(httpRequest);
    if (response.status !== 200) {
      throw new Error(`Failed to resolve conflict ${conflictId}: status ${response.status}`);
    }
    return response.body;
  }
}
