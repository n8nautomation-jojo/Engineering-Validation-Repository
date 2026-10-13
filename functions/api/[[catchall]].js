/**
 * Cloudflare Pages Function: /api/*
 * Serverless Edge API Router & Controller for PharmaTech OS
 * Routes requests to Core Catalog, Sales, and Cash Session Repositories
 */

import { catalogRepository } from "../../apps/api/catalog.mjs";
import { sessionRepository } from "../../apps/api/session.mjs";
import { salesRepository } from "../../apps/api/sales.mjs";

function jsonResponse(data, status = 200, customHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Idempotency-Key, X-Correlation-Id",
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

export async function onRequest(context) {
  const { request } = context;
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
        "Access-Control-Allow-Headers": "Content-Type, Idempotency-Key, X-Correlation-Id"
      }
    });
  }

  const correlationId = request.headers.get("x-correlation-id") || `corr-${Date.now()}`;

  // Parse JSON body for mutation requests
  let body = {};
  if (method === "POST" || method === "PUT" || method === "PATCH") {
    try {
      body = await request.json();
    } catch {
      body = {};
    }
  }

  // Convert Request headers to plain object with lowercase keys
  const headersObj = {};
  for (const [key, value] of request.headers.entries()) {
    headersObj[key.toLowerCase()] = value;
  }

  try {
    // 2. Health Check
    if (pathname === "/api/health") {
      return jsonResponse({
        status: "healthy",
        service: "pharmatech-os",
        version: "MVP-0.1",
        runtime: "cloudflare-pages-edge",
        timestamp: new Date().toISOString()
      });
    }

    // 3. Cash Sessions
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

    // 4. Offline Allocation Capacity
    if (method === "GET" && pathname === "/api/allocation/status") {
      return jsonResponse(sessionRepository.getAllocationStatus());
    }

    // 5. Products Catalog (FEFO Batches)
    if (method === "GET" && pathname === "/api/products") {
      return jsonResponse(catalogRepository.getAll());
    }

    if (method === "POST" && pathname === "/api/products") {
      const newProduct = catalogRepository.addProduct(body);
      return jsonResponse(newProduct, 201);
    }

    // 6. Sales & Invoices Ledger
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
      const saleId = pathname.split("/")[3];
      const reversed = salesRepository.reverseSale(saleId);
      return jsonResponse(reversed, 200);
    }

    if (method === "POST" && pathname === "/api/sales") {
      const result = await salesRepository.processSale(body, headersObj);
      return jsonResponse(result, 201, { "X-Correlation-Id": correlationId });
    }

    // 7. Route Not Found
    return errorResponse(404, "NOT_FOUND", `Endpoint '${method} ${pathname}' not found.`, correlationId);
  } catch (apiErr) {
    console.error(`[Edge API Error] ${method} ${pathname}:`, apiErr);
    const msg = String(apiErr?.message || "");
    const isValidation =
      msg.includes("VALIDATION_ERROR") ||
      msg.includes("INSUFFICIENT_PAYMENT") ||
      msg.includes("BATCH_EXPIRED") ||
      msg.includes("INSUFFICIENT_BATCH_STOCK") ||
      msg.includes("NO_VALID_STOCK") ||
      msg.includes("CASH_SESSION_") ||
      msg.includes("INVALID_COUNTED_CASH") ||
      msg.includes("INVALID_AMOUNT");

    const statusCode = isValidation ? 422 : 500;
    return errorResponse(
      statusCode,
      isValidation ? "BUSINESS_RULE_VIOLATION" : "INTERNAL_ERROR",
      apiErr.message,
      correlationId
    );
  }
}
