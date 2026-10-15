import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { catalogRepository } from "./api/catalog.mjs";
import { sessionRepository } from "./api/session.mjs";
import { salesRepository } from "./api/sales.mjs";
import { purchasingRepository } from "./api/purchasing.mjs";
import { reportsRepository } from "./api/reports.mjs";
import { settingsRepository } from "./api/settings.mjs";
import { authRepository } from "./api/auth.mjs";
import { platformRepository } from "./api/platform.mjs";
import { inventoryMovementsRepository } from "./api/inventoryMovements.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".ttf": "font/ttf",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".otf": "font/otf"
};

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 2 * 1024 * 1024) {
        reject(new Error("PAYLOAD_TOO_LARGE"));
      }
    });
    req.on("end", () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        reject(new Error("INVALID_JSON"));
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res, statusCode, data, customHeaders = {}) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Idempotency-Key, X-Correlation-Id",
    ...customHeaders
  });
  res.end(JSON.stringify(data));
}

function sendError(res, statusCode, code, message, correlationId = `corr-${Date.now()}`) {
  sendJson(res, statusCode, {
    error: {
      code,
      message,
      retryable: statusCode >= 500
    },
    meta: { correlation_id: correlationId }
  });
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
  let pathname = parsedUrl.pathname;
  const correlationId = req.headers["x-correlation-id"] || `corr-${Date.now()}`;

  // CORS Preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Idempotency-Key, X-Correlation-Id"
    });
    res.end();
    return;
  }

  // =========================================================================
  // 1. HEALTH & METRICS ENDPOINTS
  // =========================================================================
  if (pathname === "/health" || pathname === "/api/health") {
    sendJson(res, 200, {
      status: "healthy",
      service: "pharmatech-os",
      version: "MVP-0.1",
      timestamp: new Date().toISOString()
    });
    return;
  }

  // =========================================================================
  // 2. CORE BACKEND REST API ROUTES (/api/*)
  // =========================================================================
  if (pathname.startsWith("/api/")) {
    try {
      // GET /api/session/current or /api/sessions/current
      if (req.method === "GET" && (pathname === "/api/session/current" || pathname === "/api/sessions/current")) {
        sendJson(res, 200, sessionRepository.getCurrentSession(salesRepository.getAllSales()));
        return;
      }

      // GET /api/sessions — all sessions (current + past Z-Reports)
      if (req.method === "GET" && pathname === "/api/sessions") {
        sendJson(res, 200, sessionRepository.getAllSessions(salesRepository.getAllSales()));
        return;
      }

      // POST /api/sessions/open — open new shift
      if (req.method === "POST" && pathname === "/api/sessions/open") {
        const body = await readJsonBody(req);
        const newSession = sessionRepository.openNewSession(body);
        sendJson(res, 201, newSession);
        return;
      }

      // POST /api/sessions/movement — record CASH_IN or CASH_OUT
      if (req.method === "POST" && pathname === "/api/sessions/movement") {
        const body = await readJsonBody(req);
        const movement = sessionRepository.addCashMovement(body.sessionId, body);
        sendJson(res, 201, movement);
        return;
      }

      // POST /api/sessions/close — close shift and generate Z-Report
      if (req.method === "POST" && pathname === "/api/sessions/close") {
        const body = await readJsonBody(req);
        const result = sessionRepository.closeSession(body.sessionId, body.countedCash, body.note, salesRepository.getAllSales());
        sendJson(res, 200, result);
        return;
      }

      // GET /api/allocation/status
      if (req.method === "GET" && pathname === "/api/allocation/status") {
        sendJson(res, 200, sessionRepository.getAllocationStatus());
        return;
      }

      // GET /api/products — catalog with FEFO batches
      if (req.method === "GET" && (pathname === "/api/products" || pathname === "/api/catalog")) {
        sendJson(res, 200, catalogRepository.getAll());
        return;
      }

      // GET /api/products/:id or /api/catalog/:id — get specific product
      if (req.method === "GET" && (pathname.startsWith("/api/products/") || pathname.startsWith("/api/catalog/"))) {
        const id = pathname.replace(/^\/api\/(products|catalog)\//, "");
        const product = catalogRepository.getById(id);
        if (!product) {
          sendError(res, 404, "PRODUCT_NOT_FOUND", `Product ${id} not found`, correlationId);
          return;
        }
        sendJson(res, 200, product);
        return;
      }

      // POST /api/products — add new medicine / batch
      if (req.method === "POST" && pathname === "/api/products") {
        const body = await readJsonBody(req);
        const newProduct = catalogRepository.addProduct(body);
        sendJson(res, 201, newProduct);
        return;
      }

      // POST /api/products/adjust — stock inventory adjustment
      if (req.method === "POST" && pathname === "/api/products/adjust") {
        const body = await readJsonBody(req);
        const result = catalogRepository.adjustBatchStock(
          body.productId,
          body.batchNumber,
          body.newQuantity,
          body.reason
        );
        sendJson(res, 200, result);
        return;
      }

      // DELETE /api/products/:id — remove medicine from catalog
      if (req.method === "DELETE" && pathname.startsWith("/api/products/")) {
        const id = pathname.replace("/api/products/", "");
        const deleted = catalogRepository.deleteProduct(id);
        if (!deleted) {
          sendError(res, 404, "PRODUCT_NOT_FOUND", `Product ${id} not found`, correlationId);
          return;
        }
        sendJson(res, 200, { success: true, deletedId: id });
        return;
      }

      // =========================================================================
      // INVENTORY AUDIT & STOCK MOVEMENTS ENDPOINTS (P0-7 / FEFO LEDGER)
      // =========================================================================

      // GET /api/inventory/movements — query stock movements stream
      if (req.method === "GET" && (pathname === "/api/inventory/movements" || pathname === "/api/inventory/movements/")) {
        const filters = {
          productId: parsedUrl.searchParams.get("productId") || undefined,
          batchNumber: parsedUrl.searchParams.get("batchNumber") || undefined,
          type: parsedUrl.searchParams.get("type") || undefined,
          direction: parsedUrl.searchParams.get("direction") || undefined,
          search: parsedUrl.searchParams.get("search") || undefined,
          dateFrom: parsedUrl.searchParams.get("dateFrom") || undefined,
          dateTo: parsedUrl.searchParams.get("dateTo") || undefined,
          limit: parsedUrl.searchParams.get("limit") || 100
        };
        sendJson(res, 200, inventoryMovementsRepository.getAllMovements(filters));
        return;
      }

      // GET /api/inventory/movements/stats — aggregated stock movement statistics
      if (req.method === "GET" && pathname === "/api/inventory/movements/stats") {
        sendJson(res, 200, inventoryMovementsRepository.getMovementsStats());
        return;
      }

      // GET /api/sales — completed sales & invoices ledger
      if (req.method === "GET" && pathname === "/api/sales") {
        sendJson(res, 200, salesRepository.getAllSales());
        return;
      }

      // GET /api/sales/:id — get specific invoice / sale details
      if (req.method === "GET" && pathname.startsWith("/api/sales/")) {
        const idOrInv = pathname.replace("/api/sales/", "");
        const sale = salesRepository.getSaleById(idOrInv);
        if (!sale) {
          sendError(res, 404, "SALE_NOT_FOUND", `Sale or Invoice ${idOrInv} not found`, correlationId);
          return;
        }
        sendJson(res, 200, sale);
        return;
      }

      // POST /api/sales/:id/reverse — reverse sale
      if (req.method === "POST" && pathname.startsWith("/api/sales/") && pathname.endsWith("/reverse")) {
        const authHeader = req.headers["authorization"] || "";
        const token = authHeader.replace(/^Bearer\s+/i, "").trim();
        if (token) {
          const session = authRepository.validateToken(token);
          if (session && session.role === "CASHIER") {
            sendError(res, 403, "FORBIDDEN", "إرجاع الفواتير يتطلب موافقة مدير الصيدلية (Segregation of Duties)", correlationId);
            return;
          }
        }
        const saleId = pathname.split("/")[3];
        const body = await readJsonBody(req).catch(() => ({}));
        try {
          const reversed = salesRepository.reverseSale(saleId, body?.reason, body?.note);
          sendJson(res, 200, reversed, { "X-Correlation-Id": correlationId });
        } catch (err) {
          const status = err.message === "SALE_NOT_FOUND" ? 404 : 400;
          sendError(res, status, err.message, err.message, correlationId);
        }
        return;
      }

      // POST /api/sales — CompleteSale OpenAPI 3.1 endpoint
      if (req.method === "POST" && pathname === "/api/sales") {
        const body = await readJsonBody(req);
        const result = await salesRepository.processSale(body, req.headers);
        sendJson(res, 201, result, { "X-Correlation-Id": correlationId });
        return;
      }

      // =========================================================================
      // PURCHASING & SUPPLY CHAIN ENDPOINTS
      // =========================================================================

      // GET /api/purchasing/suppliers — list suppliers
      if (req.method === "GET" && pathname === "/api/purchasing/suppliers") {
        sendJson(res, 200, purchasingRepository.getAllSuppliers());
        return;
      }

      // POST /api/purchasing/suppliers — register supplier
      if (req.method === "POST" && pathname === "/api/purchasing/suppliers") {
        const body = await readJsonBody(req);
        const newSupplier = purchasingRepository.addSupplier(body);
        sendJson(res, 201, newSupplier);
        return;
      }

      // GET /api/purchasing/orders — list purchase orders
      if (req.method === "GET" && pathname === "/api/purchasing/orders") {
        sendJson(res, 200, purchasingRepository.getAllOrders());
        return;
      }

      // POST /api/purchasing/orders — create purchase order
      if (req.method === "POST" && pathname === "/api/purchasing/orders") {
        const body = await readJsonBody(req);
        const newOrder = purchasingRepository.createPurchaseOrder(body);
        sendJson(res, 201, newOrder);
        return;
      }

      // POST /api/purchasing/orders/:id/receive — Goods Receipt (authoritative stock injection)
      if (req.method === "POST" && pathname.startsWith("/api/purchasing/orders/") && pathname.endsWith("/receive")) {
        const parts = pathname.split("/");
        const orderId = parts[4];
        const body = await readJsonBody(req);
        const result = purchasingRepository.receiveGoodsReceipt(orderId, body);
        sendJson(res, 200, result);
        return;
      }

      // =========================================================================
      // REPORTS & ANALYTICS ENDPOINTS
      // =========================================================================

      // GET /api/reports or /api/reports/summary — financial KPIs & payment breakdown
      if (req.method === "GET" && (pathname === "/api/reports" || pathname === "/api/reports/summary")) {
        const startDate = parsedUrl.searchParams.get("startDate");
        const endDate = parsedUrl.searchParams.get("endDate");
        sendJson(res, 200, reportsRepository.getFinancialSummary(startDate, endDate));
        return;
      }

      // GET /api/reports/categories — category sales analytics
      if (req.method === "GET" && pathname === "/api/reports/categories") {
        const startDate = parsedUrl.searchParams.get("startDate");
        const endDate = parsedUrl.searchParams.get("endDate");
        sendJson(res, 200, reportsRepository.getCategoryAnalytics(startDate, endDate));
        return;
      }

      // GET /api/reports/inventory — inventory safety & expiry risk
      if (req.method === "GET" && pathname === "/api/reports/inventory") {
        sendJson(res, 200, reportsRepository.getInventoryHealth());
        return;
      }

      // GET /api/reports/top-products — top selling medicines
      if (req.method === "GET" && pathname === "/api/reports/top-products") {
        const startDate = parsedUrl.searchParams.get("startDate");
        const endDate = parsedUrl.searchParams.get("endDate");
        sendJson(res, 200, reportsRepository.getTopSellingProducts(startDate, endDate));
        return;
      }

      // =========================================================================
      // PHARMACY PROFILE & SETTINGS ENDPOINTS
      // =========================================================================

      // GET /api/settings — get pharmacy config
      if (req.method === "GET" && pathname === "/api/settings") {
        sendJson(res, 200, settingsRepository.getSettings());
        return;
      }

      // POST or PUT /api/settings — update pharmacy config
      if ((req.method === "POST" || req.method === "PUT") && pathname === "/api/settings") {
        const authHeader = req.headers["authorization"] || "";
        const token = authHeader.replace(/^Bearer\s+/i, "").trim();
        if (token) {
          const session = authRepository.validateToken(token);
          if (session && session.role === "CASHIER") {
            sendError(res, 403, "FORBIDDEN", "تعديل الإعدادات والبيانات القانونية للصيدلية مخصص لمدير الصيدلية فقط", correlationId);
            return;
          }
        }
        const body = await readJsonBody(req);
        const updated = settingsRepository.updateSettings(body);
        sendJson(res, 200, updated);
        return;
      }

      // =========================================================================
      // AUTHENTICATION & SECURITY ENDPOINTS (ADR-013 / D-041)
      // =========================================================================

      // POST /api/auth/login — authenticate with injection defense & rate limiting
      if (req.method === "POST" && pathname === "/api/auth/login") {
        const body = await readJsonBody(req);
        const clientIp = req.socket?.remoteAddress || "127.0.0.1";
        const result = authRepository.login(body.username, body.password, body.tenantCode, clientIp);
        sendJson(res, 200, result);
        return;
      }

      // POST /api/auth/change-password — mandatory first-login password rotation
      if (req.method === "POST" && pathname === "/api/auth/change-password") {
        const body = await readJsonBody(req);
        const result = authRepository.changePassword(body.tempToken, body.newPassword, body.confirmPassword);
        sendJson(res, 200, result);
        return;
      }

      // GET /api/auth/me — validate bearer session and return user identity
      if (req.method === "GET" && pathname === "/api/auth/me") {
        const authHeader = req.headers["authorization"] || "";
        const token = authHeader.replace(/^Bearer\s+/i, "").trim();
        const session = authRepository.validateToken(token);
        if (!session) {
          sendError(res, 401, "UNAUTHORIZED", "الجلسة غير صالحة أو انتهت مدة صلاحيتها", correlationId);
          return;
        }
        sendJson(res, 200, { user: session });
        return;
      }

      // POST /api/auth/logout — revoke session
      if (req.method === "POST" && pathname === "/api/auth/logout") {
        const authHeader = req.headers["authorization"] || "";
        const token = authHeader.replace(/^Bearer\s+/i, "").trim();
        const result = authRepository.logout(token);
        sendJson(res, 200, result);
        return;
      }

      // =========================================================================
      // PLATFORM ADMINISTRATION & SAAS MULTI-TENANCY ENDPOINTS (D-038 / D-041)
      // =========================================================================

      // GET /api/platform/tenants — list all provisioned tenants
      if (req.method === "GET" && pathname === "/api/platform/tenants") {
        sendJson(res, 200, platformRepository.getAllTenants());
        return;
      }

      // POST /api/platform/tenants — atomic tenant provisioning
      if (req.method === "POST" && pathname === "/api/platform/tenants") {
        const body = await readJsonBody(req);
        const idempotencyKey = req.headers["idempotency-key"] || body.idempotencyKey;
        const result = platformRepository.provisionTenant({
          ...body,
          idempotencyKey
        });
        sendJson(res, 201, result);
        return;
      }

      // PATCH or POST /api/platform/tenants/:id/status — toggle tenant status
      if ((req.method === "PATCH" || req.method === "POST") && pathname.startsWith("/api/platform/tenants/") && pathname.endsWith("/status")) {
        const tenantId = pathname.replace("/api/platform/tenants/", "").replace("/status", "");
        const updated = platformRepository.toggleTenantStatus(tenantId);
        sendJson(res, 200, { success: true, tenant: updated });
        return;
      }

      // GET /api/platform/audit — security audit trail
      if (req.method === "GET" && pathname === "/api/platform/audit") {
        const q = parsedUrl.searchParams.get("q") || "";
        sendJson(res, 200, platformRepository.getAuditTrail(q));
        return;
      }

      // POST /api/platform/audit — append audit log entry
      if (req.method === "POST" && pathname === "/api/platform/audit") {
        const body = await readJsonBody(req);
        const entry = platformRepository.recordAuditEvent(body);
        sendJson(res, 201, entry);
        return;
      }

      // GET /api/platform/telemetry — SaaS metrics snapshot
      if (req.method === "GET" && pathname === "/api/platform/telemetry") {
        sendJson(res, 200, platformRepository.getTelemetry());
        return;
      }

      // 404 for unhandled API route
      sendError(res, 404, "NOT_FOUND", `Endpoint '${req.method} ${pathname}' not found.`, correlationId);
      return;
    } catch (apiErr) {
      console.error(`[API Error] ${req.method} ${pathname}:`, apiErr);
      const msg = String(apiErr.message || "");
      
      let statusCode = 500;
      let errorCode = "INTERNAL_ERROR";

      if (msg.includes("SECURITY_VIOLATION")) {
        statusCode = 400;
        errorCode = "SECURITY_VIOLATION";
      } else if (msg.includes("CONFLICT")) {
        statusCode = 409;
        errorCode = "CONFLICT";
      } else if (msg.includes("NOT_FOUND")) {
        statusCode = 404;
        errorCode = "NOT_FOUND";
      } else if (msg.includes("INVALID_CREDENTIALS") || msg.includes("UNAUTHORIZED") || msg.includes("TOKEN_EXPIRED")) {
        statusCode = 401;
        errorCode = "UNAUTHORIZED";
      } else if (msg.includes("ACCOUNT_LOCKED_TEMPORARILY")) {
        statusCode = 429;
        errorCode = "TOO_MANY_REQUESTS";
      } else if (msg.includes("ACCOUNT_LOCKED") || msg.includes("ACCOUNT_DISABLED")) {
        statusCode = 403;
        errorCode = "FORBIDDEN";
      } else if (msg.includes("VALIDATION_ERROR") ||
                 msg.includes("INSUFFICIENT_PAYMENT") ||
                 msg.includes("BATCH_EXPIRED") ||
                 msg.includes("INSUFFICIENT_BATCH_STOCK") ||
                 msg.includes("NO_VALID_STOCK") ||
                 msg.includes("CASH_SESSION_") ||
                 msg.includes("INVALID_COUNTED_CASH") ||
                 msg.includes("INVALID_AMOUNT")) {
        statusCode = 422;
        errorCode = "BUSINESS_RULE_VIOLATION";
      }

      sendError(res, statusCode, errorCode, apiErr.message, correlationId);
      return;
    }
  }

  // =========================================================================
  // 3. STATIC ASSETS & SINGLE PAGE APPS SERVING
  // =========================================================================

  // Root landing page
  if (pathname === "/" || pathname === "/index.html") {
    const indexPath = path.join(__dirname, "landing", "index.html");
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    fs.createReadStream(indexPath).pipe(res);
    return;
  }

  // Map to local file (supports both /apps/... and /... routes)
  const normalizedPath = pathname.startsWith("/apps/") ? pathname.slice(5) : pathname;
  let filePath = path.join(__dirname, normalizedPath);
  if (pathname.endsWith("/")) {
    filePath = path.join(filePath, "index.html");
  }

  // Security check: stay within apps dir
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Try appending index.html if it's a directory
      const indexPath = path.join(filePath, "index.html");
      if (fs.existsSync(indexPath)) {
        filePath = indexPath;
      } else {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("404 Not Found");
        return;
      }
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    res.writeHead(200, { "Content-Type": contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`PharmaTech Official Enterprise Server running on http://localhost:${PORT}`);
});
