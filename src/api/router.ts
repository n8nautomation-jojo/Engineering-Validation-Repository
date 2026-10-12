import type { CompleteSaleRequestDto, CompleteSaleResponseDto, ApiErrorResponseDto } from "./types.js";
import { AuthorizationRuntime } from "../authorization/runtime.js";

export interface HttpRequest {
  readonly method: "GET" | "POST" | "PUT" | "DELETE";
  readonly path: string;
  readonly headers: Record<string, string>;
  readonly query?: Record<string, string>;
  readonly body?: unknown;
}

export interface HttpResponse<T = unknown> {
  readonly status: number;
  readonly headers: Record<string, string>;
  readonly body: T;
}

export interface ApiRouterDependencies {
  readonly authRuntime?: AuthorizationRuntime;
  readonly salesHandler?: (req: CompleteSaleRequestDto, headers: Record<string, string>) => Promise<CompleteSaleResponseDto>;
  readonly conflictResolver?: (conflictId: string, resolution: unknown, headers: Record<string, string>) => Promise<unknown>;
}

export class ApiRouter {
  private readonly authRuntime: AuthorizationRuntime;
  private readonly salesHandler?: (req: CompleteSaleRequestDto, headers: Record<string, string>) => Promise<CompleteSaleResponseDto>;
  private readonly conflictResolver?: (conflictId: string, resolution: unknown, headers: Record<string, string>) => Promise<unknown>;

  constructor(deps: ApiRouterDependencies = {}) {
    this.authRuntime = deps.authRuntime ?? new AuthorizationRuntime();
    if (deps.salesHandler) this.salesHandler = deps.salesHandler;
    if (deps.conflictResolver) this.conflictResolver = deps.conflictResolver;
  }

  public async dispatch(request: HttpRequest): Promise<HttpResponse> {
    const correlationId = request.headers["x-correlation-id"] || `corr-${Date.now()}`;
    const defaultHeaders: Record<string, string> = {
      "content-type": "application/json",
      "x-correlation-id": correlationId
    };

    try {
      // 1. POST /sales — completeSale
      if (request.method === "POST" && request.path === "/sales") {
        const idempotencyKey = request.headers["idempotency-key"];
        if (!idempotencyKey) {
          return {
            status: 400,
            headers: defaultHeaders,
            body: this.createErrorResponse("MISSING_HEADER", "Header 'Idempotency-Key' is required for /sales", correlationId)
          };
        }

        const body = request.body as CompleteSaleRequestDto;
        if (!body || !body.cash_session_id || !body.lines || !body.payments) {
          return {
            status: 422,
            headers: defaultHeaders,
            body: this.createErrorResponse("VALIDATION_ERROR", "Request body missing required sales fields.", correlationId, {
              required: ["cash_session_id", "lines", "payments"]
            })
          };
        }

        if (this.salesHandler) {
          const result = await this.salesHandler(body, request.headers);
          return {
            status: 201,
            headers: defaultHeaders,
            body: result
          };
        }

        // Default mock response when handler not directly wired
        const mockResponse: CompleteSaleResponseDto = {
          sale_id: `sale-${Date.now()}`,
          invoice_number: `INV-${Date.now().toString().slice(-6)}`,
          status: "COMPLETED",
          totals: { subtotal: "100.00", tax: "0.00", total: "100.00", currency: "SDG" },
          payment_summary: { paid_amount: "100.00", change_amount: "0.00" },
          inventory_effect: { transaction_id: `tx-${Date.now()}` },
          sync_status: "PENDING_SYNC",
          correlation_id: correlationId
        };

        return {
          status: 201,
          headers: defaultHeaders,
          body: mockResponse
        };
      }

      // 2. GET /sales/{saleId} — getSale
      if (request.method === "GET" && request.path.startsWith("/sales/")) {
        const saleId = request.path.replace("/sales/", "");
        return {
          status: 200,
          headers: defaultHeaders,
          body: { sale_id: saleId, status: "COMPLETED", correlation_id: correlationId }
        };
      }

      // 3. POST /sync/conflicts/{conflictId}/resolution — resolveSyncConflict
      if (request.method === "POST" && request.path.includes("/resolution")) {
        const parts = request.path.split("/");
        const conflictId = parts[3] ?? "unknown";

        if (this.conflictResolver) {
          const res = await this.conflictResolver(conflictId, request.body, request.headers);
          return {
            status: 200,
            headers: defaultHeaders,
            body: res
          };
        }

        return {
          status: 200,
          headers: defaultHeaders,
          body: { conflict_id: conflictId, status: "RESOLVED", correlation_id: correlationId }
        };
      }

      // 4. Default 404 Not Found
      return {
        status: 404,
        headers: defaultHeaders,
        body: this.createErrorResponse("NOT_FOUND", `Endpoint '${request.method} ${request.path}' not found.`, correlationId)
      };
    } catch (err) {
      return {
        status: 500,
        headers: defaultHeaders,
        body: this.createErrorResponse("INTERNAL_SERVER_ERROR", String(err), correlationId)
      };
    }
  }

  private createErrorResponse(code: string, message: string, correlationId: string, details: Record<string, unknown> = {}): ApiErrorResponseDto {
    return {
      error: {
        code,
        message,
        details,
        retryable: code === "TIMEOUT" || code === "UNAVAILABLE"
      },
      meta: {
        correlation_id: correlationId
      }
    };
  }
}
