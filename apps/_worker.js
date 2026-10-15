/**
 * Cloudflare Worker / Pages Advanced Mode Entrypoint
 * Handles /health, /api/* serverlessly at the global Edge
 * Falls back to env.ASSETS.fetch(request) for static HTML/CSS/JS/Images
 */

import { catalogRepository } from "./api/catalog.mjs";
import { sessionRepository } from "./api/session.mjs";
import { salesRepository } from "./api/sales.mjs";
import { purchasingRepository } from "./api/purchasing.mjs";
import { reportsRepository } from "./api/reports.mjs";
import { settingsRepository } from "./api/settings.mjs";
import { authRepository } from "./api/auth.mjs";
import { platformRepository } from "./api/platform.mjs";
import { inventoryMovementsRepository } from "./api/inventoryMovements.mjs";

function jsonResponse(data, status = 200, customHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Idempotency-Key, X-Correlation-Id, Authorization",
      ...customHeaders
    }
  });
}

function errorResponse(status, code, message, correlationId = `corr-${Date.now()}`) {
  return jsonResponse(
    {
      error: {
        code,
        message,
        retryable: status >= 500
      },
      meta: { correlation_id: correlationId }
    },
    status
  );
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const method = request.method;

    // 1. CORS Preflight
    if (method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Idempotency-Key, X-Correlation-Id, Authorization"
        }
      });
    }

    const correlationId = request.headers.get("x-correlation-id") || `corr-${Date.now()}`;

    // 2. Health & Service Status
    if (pathname === "/health" || pathname === "/api/health") {
      return jsonResponse({
        status: "healthy",
        service: "pharmatech-os",
        version: "MVP-0.1",
        runtime: "cloudflare-edge",
        timestamp: new Date().toISOString()
      });
    }

    // 3. API Routes (/api/*)
    if (pathname.startsWith("/api/")) {
      let body = {};
      if (method === "POST" || method === "PUT" || method === "PATCH") {
        try {
          body = await request.json();
        } catch {
          body = {};
        }
      }

      const headersObj = {};
      for (const [key, value] of request.headers.entries()) {
        headersObj[key.toLowerCase()] = value;
      }

      try {
        // Cash Sessions
        if (method === "GET" && (pathname === "/api/session/current" || pathname === "/api/sessions/current")) {
          return jsonResponse(sessionRepository.getCurrentSession(salesRepository.getAllSales()));
        }

        if (method === "GET" && pathname === "/api/sessions") {
          return jsonResponse(sessionRepository.getAllSessions(salesRepository.getAllSales()));
        }

        if (method === "POST" && pathname === "/api/sessions/open") {
          const newSession = sessionRepository.openNewSession(body);
          return jsonResponse(newSession, 201);
        }

        if (method === "POST" && pathname === "/api/sessions/movement") {
          const movement = sessionRepository.addCashMovement(body.sessionId, body);
          return jsonResponse(movement, 201);
        }

        if (method === "POST" && pathname === "/api/sessions/close") {
          const result = sessionRepository.closeSession(
            body.sessionId,
            body.countedCash,
            body.note,
            salesRepository.getAllSales()
          );
          return jsonResponse(result, 200);
        }

        // Allocation Capacity
        if (method === "GET" && pathname === "/api/allocation/status") {
          return jsonResponse(sessionRepository.getAllocationStatus());
        }

        // Products Catalog
        if (method === "GET" && (pathname === "/api/products" || pathname === "/api/catalog")) {
          return jsonResponse(catalogRepository.getAll());
        }

        if (method === "GET" && (pathname.startsWith("/api/products/") || pathname.startsWith("/api/catalog/"))) {
          const id = pathname.replace(/^\/api\/(products|catalog)\//, "");
          const product = catalogRepository.getById(id);
          if (!product) {
            return errorResponse(404, "PRODUCT_NOT_FOUND", `Product ${id} not found`, correlationId);
          }
          return jsonResponse(product, 200);
        }

        if (method === "POST" && pathname === "/api/products") {
          const newProduct = catalogRepository.addProduct(body);
          return jsonResponse(newProduct, 201);
        }

        if (method === "POST" && pathname === "/api/products/adjust") {
          const result = catalogRepository.adjustBatchStock(
            body.productId,
            body.batchNumber,
            body.newQuantity,
            body.reason
          );
          return jsonResponse(result, 200);
        }

        if (method === "DELETE" && pathname.startsWith("/api/products/")) {
          const id = pathname.replace("/api/products/", "");
          const deleted = catalogRepository.deleteProduct(id);
          if (!deleted) {
            return jsonResponse({ error: { code: "PRODUCT_NOT_FOUND", message: `Product ${id} not found` } }, 404);
          }
          return jsonResponse({ success: true, deletedId: id });
        }

        // =========================================================================
        // INVENTORY AUDIT & STOCK MOVEMENTS (P0-7 / FEFO LEDGER)
        // =========================================================================
        if (method === "GET" && (pathname === "/api/inventory/movements" || pathname === "/api/inventory/movements/")) {
          const filters = {
            productId: url.searchParams.get("productId") || undefined,
            batchNumber: url.searchParams.get("batchNumber") || undefined,
            type: url.searchParams.get("type") || undefined,
            direction: url.searchParams.get("direction") || undefined,
            search: url.searchParams.get("search") || undefined,
            dateFrom: url.searchParams.get("dateFrom") || undefined,
            dateTo: url.searchParams.get("dateTo") || undefined,
            limit: url.searchParams.get("limit") || 100
          };
          return jsonResponse(inventoryMovementsRepository.getAllMovements(filters));
        }

        if (method === "GET" && pathname === "/api/inventory/movements/stats") {
          return jsonResponse(inventoryMovementsRepository.getMovementsStats());
        }

        // Sales & Invoices
        if (method === "GET" && pathname === "/api/sales") {
          return jsonResponse(salesRepository.getAllSales());
        }

        if (method === "GET" && pathname.startsWith("/api/sales/")) {
          const idOrInv = pathname.replace("/api/sales/", "");
          const sale = salesRepository.getSaleById(idOrInv);
          if (!sale) {
            return errorResponse(404, "SALE_NOT_FOUND", `Sale or Invoice ${idOrInv} not found`, correlationId);
          }
          return jsonResponse(sale, 200);
        }

        if (method === "POST" && pathname.startsWith("/api/sales/") && pathname.endsWith("/reverse")) {
          const authHeader = request.headers.get("authorization") || "";
          const token = authHeader.replace(/^Bearer\s+/i, "").trim();
          if (token) {
            const session = authRepository.validateToken(token);
            if (session && session.role === "CASHIER") {
              return errorResponse(403, "FORBIDDEN", "إرجاع الفواتير يتطلب موافقة مدير الصيدلية (Segregation of Duties)", correlationId);
            }
          }
          const saleId = pathname.split("/")[3];
          const reversed = salesRepository.reverseSale(saleId, body?.reason, body?.note);
          return jsonResponse(reversed, 200);
        }

        if (method === "POST" && pathname === "/api/sales") {
          const result = await salesRepository.processSale(body, headersObj);
          return jsonResponse(result, 201, { "X-Correlation-Id": correlationId });
        }

        // =========================================================================
        // PURCHASING & SUPPLY CHAIN
        // =========================================================================
        if (method === "GET" && pathname === "/api/purchasing/suppliers") {
          return jsonResponse(purchasingRepository.getAllSuppliers());
        }

        if (method === "POST" && pathname === "/api/purchasing/suppliers") {
          const newSupplier = purchasingRepository.addSupplier(body);
          return jsonResponse(newSupplier, 201);
        }

        if (method === "GET" && pathname === "/api/purchasing/orders") {
          return jsonResponse(purchasingRepository.getAllOrders());
        }

        if (method === "POST" && pathname === "/api/purchasing/orders") {
          const newOrder = purchasingRepository.createPurchaseOrder(body);
          return jsonResponse(newOrder, 201);
        }

        if (method === "POST" && pathname.startsWith("/api/purchasing/orders/") && pathname.endsWith("/receive")) {
          const parts = pathname.split("/");
          const orderId = parts[4];
          const result = purchasingRepository.receiveGoodsReceipt(orderId, body);
          return jsonResponse(result, 200);
        }

        // =========================================================================
        // REPORTS & ANALYTICS
        // =========================================================================
        if (method === "GET" && (pathname === "/api/reports" || pathname === "/api/reports/summary")) {
          const startDate = url.searchParams.get("startDate");
          const endDate = url.searchParams.get("endDate");
          return jsonResponse(reportsRepository.getFinancialSummary(startDate, endDate));
        }

        if (method === "GET" && pathname === "/api/reports/categories") {
          const startDate = url.searchParams.get("startDate");
          const endDate = url.searchParams.get("endDate");
          return jsonResponse(reportsRepository.getCategoryAnalytics(startDate, endDate));
        }

        if (method === "GET" && pathname === "/api/reports/inventory") {
          return jsonResponse(reportsRepository.getInventoryHealth());
        }

        if (method === "GET" && pathname === "/api/reports/top-products") {
          const startDate = url.searchParams.get("startDate");
          const endDate = url.searchParams.get("endDate");
          return jsonResponse(reportsRepository.getTopSellingProducts(startDate, endDate));
        }

        // =========================================================================
        // SETTINGS
        // =========================================================================
        if (method === "GET" && pathname === "/api/settings") {
          return jsonResponse(settingsRepository.getSettings());
        }

        if ((method === "POST" || method === "PUT") && pathname === "/api/settings") {
          const authHeader = request.headers.get("authorization") || "";
          const token = authHeader.replace(/^Bearer\s+/i, "").trim();
          if (token) {
            const session = authRepository.validateToken(token);
            if (session && session.role === "CASHIER") {
              return errorResponse(403, "FORBIDDEN", "تعديل الإعدادات والبيانات القانونية للصيدلية مخصص لمدير الصيدلية فقط", correlationId);
            }
          }
          const updated = settingsRepository.updateSettings(body);
          return jsonResponse(updated, 200);
        }

        // =========================================================================
        // AUTHENTICATION & SECURITY ENDPOINTS (ADR-013 / D-041)
        // =========================================================================
        if (method === "POST" && pathname === "/api/auth/login") {
          const clientIp = request.headers.get("cf-connecting-ip") || request.headers.get("x-real-ip") || "127.0.0.1";
          const result = authRepository.login(body.username, body.password, body.tenantCode, clientIp);
          return jsonResponse(result, 200);
        }

        if (method === "POST" && pathname === "/api/auth/change-password") {
          const result = authRepository.changePassword(body.tempToken, body.newPassword, body.confirmPassword);
          return jsonResponse(result, 200);
        }

        if (method === "GET" && pathname === "/api/auth/me") {
          const authHeader = request.headers.get("authorization") || "";
          const token = authHeader.replace(/^Bearer\s+/i, "").trim();
          const session = authRepository.validateToken(token);
          if (!session) {
            return errorResponse(401, "UNAUTHORIZED", "الجلسة غير صالحة أو انتهت مدة صلاحيتها", correlationId);
          }
          return jsonResponse({ user: session }, 200);
        }

        if (method === "POST" && pathname === "/api/auth/logout") {
          const authHeader = request.headers.get("authorization") || "";
          const token = authHeader.replace(/^Bearer\s+/i, "").trim();
          const result = authRepository.logout(token);
          return jsonResponse(result, 200);
        }

        // =========================================================================
        // PLATFORM ADMINISTRATION & SAAS MULTI-TENANCY ENDPOINTS (D-038 / D-041)
        // =========================================================================
        if (method === "GET" && pathname === "/api/platform/tenants") {
          return jsonResponse(platformRepository.getAllTenants(), 200);
        }

        if (method === "POST" && pathname === "/api/platform/tenants") {
          const idempotencyKey = request.headers.get("idempotency-key") || body.idempotencyKey;
          const result = platformRepository.provisionTenant({
            ...body,
            idempotencyKey
          });
          return jsonResponse(result, 201);
        }

        if ((method === "PATCH" || method === "POST") && pathname.startsWith("/api/platform/tenants/") && pathname.endsWith("/status")) {
          const tenantId = pathname.replace("/api/platform/tenants/", "").replace("/status", "");
          const updated = platformRepository.toggleTenantStatus(tenantId);
          return jsonResponse({ success: true, tenant: updated }, 200);
        }

        if (method === "GET" && pathname === "/api/platform/audit") {
          const q = url.searchParams.get("q") || "";
          return jsonResponse(platformRepository.getAuditTrail(q), 200);
        }

        if (method === "POST" && pathname === "/api/platform/audit") {
          const entry = platformRepository.recordAuditEvent(body);
          return jsonResponse(entry, 201);
        }

        if (method === "GET" && pathname === "/api/platform/telemetry") {
          return jsonResponse(platformRepository.getTelemetry(), 200);
        }

        return errorResponse(404, "NOT_FOUND", `Endpoint '${method} ${pathname}' not found.`, correlationId);
      } catch (apiErr) {
        console.error(`[Edge API Error] ${method} ${pathname}:`, apiErr);
        const msg = String(apiErr?.message || "");
        let statusCode = 500;
        let errorCode = "INTERNAL_ERROR";

        if (msg.includes("SECURITY_VIOLATION")) {
          statusCode = 400;
          errorCode = "SECURITY_VIOLATION";
        } else if (msg.includes("ACCOUNT_LOCKED")) {
          statusCode = 423;
          errorCode = "ACCOUNT_LOCKED";
        } else if (msg.includes("INVALID_CREDENTIALS")) {
          statusCode = 401;
          errorCode = "INVALID_CREDENTIALS";
        } else if (msg.includes("PASSWORD_EXPIRED")) {
          statusCode = 403;
          errorCode = "PASSWORD_EXPIRED";
        } else if (msg.includes("PASSWORD_POLICY_VIOLATION")) {
          statusCode = 422;
          errorCode = "PASSWORD_POLICY_VIOLATION";
        } else if (
          msg.includes("VALIDATION_ERROR") ||
          msg.includes("INSUFFICIENT_PAYMENT") ||
          msg.includes("BATCH_EXPIRED") ||
          msg.includes("INSUFFICIENT_BATCH_STOCK") ||
          msg.includes("NO_VALID_STOCK") ||
          msg.includes("CASH_SESSION_") ||
          msg.includes("INVALID_COUNTED_CASH") ||
          msg.includes("INVALID_AMOUNT")
        ) {
          statusCode = 422;
          errorCode = "BUSINESS_RULE_VIOLATION";
        }

        return errorResponse(
          statusCode,
          errorCode,
          apiErr.message,
          correlationId
        );
      }
    }

    // 4. Fallback to Static Assets (Pages & Workers Assets)
    if (env && env.ASSETS && typeof env.ASSETS.fetch === "function") {
      return env.ASSETS.fetch(request);
    }

    return new Response("Not Found", { status: 404 });
  }
};
