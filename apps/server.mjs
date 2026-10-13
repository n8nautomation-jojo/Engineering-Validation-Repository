import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { catalogRepository } from "./api/catalog.mjs";
import { sessionRepository } from "./api/session.mjs";
import { salesRepository } from "./api/sales.mjs";

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
  ".ico": "image/x-icon"
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
      if (req.method === "GET" && pathname === "/api/products") {
        sendJson(res, 200, catalogRepository.getAll());
        return;
      }

      // POST /api/products — add new medicine / batch
      if (req.method === "POST" && pathname === "/api/products") {
        const body = await readJsonBody(req);
        const newProduct = catalogRepository.addProduct(body);
        sendJson(res, 201, newProduct);
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
        const saleId = pathname.split("/")[3];
        const reversed = salesRepository.reverseSale(saleId);
        sendJson(res, 200, reversed);
        return;
      }

      // POST /api/sales — CompleteSale OpenAPI 3.1 endpoint
      if (req.method === "POST" && pathname === "/api/sales") {
        const body = await readJsonBody(req);
        const result = await salesRepository.processSale(body, req.headers);
        sendJson(res, 201, result, { "X-Correlation-Id": correlationId });
        return;
      }

      // 404 for unhandled API route
      sendError(res, 404, "NOT_FOUND", `Endpoint '${req.method} ${pathname}' not found.`, correlationId);
      return;
    } catch (apiErr) {
      console.error(`[API Error] ${req.method} ${pathname}:`, apiErr);
      const isValidation = String(apiErr.message).includes("VALIDATION_ERROR") ||
                           String(apiErr.message).includes("INSUFFICIENT_PAYMENT") ||
                           String(apiErr.message).includes("BATCH_EXPIRED") ||
                           String(apiErr.message).includes("INSUFFICIENT_BATCH_STOCK") ||
                           String(apiErr.message).includes("NO_VALID_STOCK") ||
                           String(apiErr.message).includes("CASH_SESSION_") ||
                           String(apiErr.message).includes("INVALID_COUNTED_CASH") ||
                           String(apiErr.message).includes("INVALID_AMOUNT");
      
      const statusCode = isValidation ? 422 : 500;
      sendError(res, statusCode, isValidation ? "BUSINESS_RULE_VIOLATION" : "INTERNAL_ERROR", apiErr.message, correlationId);
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

  // Map to local file
  let filePath = path.join(__dirname, pathname);
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
