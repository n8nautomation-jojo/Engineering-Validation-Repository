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
import { customersRepository } from "./api/customers.mjs";
import { salesOrdersRepository } from "./api/salesOrders.mjs";
import { transfersRepository } from "./api/transfers.mjs";
import { syncRepository } from "./api/sync.mjs";
import { accountingRepository } from "./api/accounting.mjs";
import { branchesRepository } from "./api/branches.mjs";

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

        // =========================================================================
        // CUSTOMER & PATIENT DIRECTORY
        // =========================================================================
        if (method === "GET" && pathname === "/api/customers/stats") {
          return jsonResponse(customersRepository.getStats());
        }

        if (method === "GET" && (pathname === "/api/customers" || pathname === "/api/customers/")) {
          const filters = {
            search: url.searchParams.get("search") || undefined,
            type: url.searchParams.get("type") || undefined,
            status: url.searchParams.get("status") || undefined,
            limit: url.searchParams.get("limit") || undefined
          };
          return jsonResponse(customersRepository.getAll(filters));
        }

        if (method === "GET" && pathname.startsWith("/api/customers/")) {
          const id = pathname.replace("/api/customers/", "");
          const customer = customersRepository.getById(id);
          if (!customer) {
            return errorResponse(404, "CUSTOMER_NOT_FOUND", `المريض/العميل ${id} غير مسجل`, correlationId);
          }
          const purchases = salesRepository.getAllSales().filter(s => s.customer_id === id);
          return jsonResponse({ ...customer, purchases }, 200);
        }

        if (method === "POST" && pathname === "/api/customers") {
          const created = customersRepository.create(body);
          return jsonResponse(created, 201);
        }

        if (method === "PUT" && pathname.startsWith("/api/customers/")) {
          const id = pathname.replace("/api/customers/", "");
          const updated = customersRepository.update(id, body);
          return jsonResponse(updated, 200);
        }

        // =========================================================================
        // SALES ORDERS & PRESCRIPTION RESERVATIONS
        // =========================================================================
        if (method === "GET" && pathname === "/api/sales-orders/stats") {
          return jsonResponse(salesOrdersRepository.getStats());
        }

        if (method === "GET" && (pathname === "/api/sales-orders" || pathname === "/api/sales-orders/")) {
          const filters = {
            status: url.searchParams.get("status") || undefined,
            search: url.searchParams.get("search") || undefined,
            customerId: url.searchParams.get("customerId") || undefined,
            limit: url.searchParams.get("limit") || undefined
          };
          return jsonResponse(salesOrdersRepository.getAll(filters));
        }

        if (method === "GET" && pathname.startsWith("/api/sales-orders/")) {
          const id = pathname.replace("/api/sales-orders/", "");
          const order = salesOrdersRepository.getById(id);
          if (!order) {
            return errorResponse(404, "ORDER_NOT_FOUND", `أمر البيع/الحجز ${id} غير موجود`, correlationId);
          }
          return jsonResponse(order, 200);
        }

        if (method === "POST" && pathname === "/api/sales-orders") {
          try {
            const newOrder = salesOrdersRepository.create(body);
            return jsonResponse(newOrder, 201);
          } catch (err) {
            const status = err.message.includes("NOT_FOUND") ? 404 : 400;
            return errorResponse(status, "BAD_REQUEST", err.message, correlationId);
          }
        }

        if (method === "POST" && pathname.startsWith("/api/sales-orders/") && pathname.endsWith("/fulfill")) {
          try {
            const id = pathname.split("/")[3];
            const fulfilled = salesOrdersRepository.fulfill(id, body?.invoiceNumber);
            return jsonResponse(fulfilled, 200);
          } catch (err) {
            const status = err.message.includes("NOT_FOUND") ? 404 : 400;
            return errorResponse(status, "BAD_REQUEST", err.message, correlationId);
          }
        }

        if (method === "POST" && pathname.startsWith("/api/sales-orders/") && pathname.endsWith("/cancel")) {
          try {
            const id = pathname.split("/")[3];
            const cancelled = salesOrdersRepository.cancel(id, body?.reason);
            return jsonResponse(cancelled, 200);
          } catch (err) {
            const status = err.message.includes("NOT_FOUND") ? 404 : 400;
            return errorResponse(status, "BAD_REQUEST", err.message, correlationId);
          }
        }

        // =========================================================================
        // MULTI-WAREHOUSE & STOCK TRANSFERS
        // =========================================================================
        if (method === "GET" && pathname === "/api/warehouses") {
          return jsonResponse(transfersRepository.getWarehouses());
        }

        if (method === "GET" && pathname === "/api/transfers/stats") {
          return jsonResponse(transfersRepository.getStats());
        }

        if (method === "GET" && pathname === "/api/transfers") {
          const filters = {
            status: url.searchParams.get("status") || undefined,
            fromWarehouseId: url.searchParams.get("fromWarehouseId") || undefined,
            toWarehouseId: url.searchParams.get("toWarehouseId") || undefined,
            search: url.searchParams.get("search") || undefined,
            limit: url.searchParams.get("limit") || undefined
          };
          return jsonResponse(transfersRepository.getAll(filters));
        }

        if (method === "GET" && pathname.startsWith("/api/transfers/") && !pathname.endsWith("/complete") && !pathname.endsWith("/cancel")) {
          const id = pathname.replace("/api/transfers/", "");
          const transfer = transfersRepository.getById(id);
          if (!transfer) {
            return errorResponse(404, "TRANSFER_NOT_FOUND", `أمر التحويل ${id} غير موجود`, correlationId);
          }
          return jsonResponse(transfer, 200);
        }

        if (method === "POST" && pathname === "/api/transfers") {
          try {
            const newTransfer = transfersRepository.create(body);
            return jsonResponse(newTransfer, 201);
          } catch (err) {
            const status = err.message.includes("NOT_FOUND") ? 404 : 400;
            return errorResponse(status, "BAD_REQUEST", err.message, correlationId);
          }
        }

        if (method === "POST" && pathname.startsWith("/api/transfers/") && pathname.endsWith("/complete")) {
          try {
            const id = pathname.split("/")[3];
            const completed = transfersRepository.complete(id, body?.approvedBy);
            return jsonResponse(completed, 200);
          } catch (err) {
            const status = err.message.includes("NOT_FOUND") ? 404 : 400;
            return errorResponse(status, "BAD_REQUEST", err.message, correlationId);
          }
        }

        if (method === "POST" && pathname.startsWith("/api/transfers/") && pathname.endsWith("/cancel")) {
          try {
            const id = pathname.split("/")[3];
            const cancelled = transfersRepository.cancel(id, body?.reason);
            return jsonResponse(cancelled, 200);
          } catch (err) {
            const status = err.message.includes("NOT_FOUND") ? 404 : 400;
            return errorResponse(status, "BAD_REQUEST", err.message, correlationId);
          }
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

        if (method === "GET" && pathname === "/api/purchasing/invoices/stats") {
          return jsonResponse(purchasingRepository.getInvoicesStats(), 200);
        }

        if (method === "GET" && pathname === "/api/purchasing/invoices") {
          const filters = {
            supplierId: url.searchParams.get("supplierId") || undefined,
            status: url.searchParams.get("status") || undefined,
            search: url.searchParams.get("search") || undefined
          };
          return jsonResponse(purchasingRepository.getAllInvoices(filters), 200);
        }

        if (method === "GET" && pathname.startsWith("/api/purchasing/invoices/") && pathname !== "/api/purchasing/invoices/stats") {
          const id = pathname.replace("/api/purchasing/invoices/", "");
          const invoice = purchasingRepository.getInvoiceById(id);
          if (!invoice) {
            return errorResponse(404, "INVOICE_NOT_FOUND", `فاتورة المورد ${id} غير موجودة`, correlationId);
          }
          return jsonResponse(invoice, 200);
        }

        if (method === "POST" && pathname === "/api/purchasing/invoices") {
          try {
            const newInvoice = purchasingRepository.createInvoice(body);
            return jsonResponse(newInvoice, 201);
          } catch (err) {
            const status = err.message.includes("غير موجود") ? 404 : 400;
            return errorResponse(status, err.message, err.message, correlationId);
          }
        }

        if (method === "POST" && pathname.startsWith("/api/purchasing/invoices/") && pathname.endsWith("/pay")) {
          try {
            const id = pathname.split("/")[4];
            const updatedInvoice = purchasingRepository.payInvoice(id, body);
            return jsonResponse(updatedInvoice, 200);
          } catch (err) {
            const status = err.message.includes("غير موجودة") ? 404 : 400;
            return errorResponse(status, err.message, err.message, correlationId);
          }
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

        // =========================================================================
        // OFFLINE POS SYNCHRONIZATION & CONFLICT CONTAINMENT (ADR-011 / Phase 2.2)
        // =========================================================================
        if (method === "GET" && pathname === "/api/sync/status") {
          const deviceId = url.searchParams.get("deviceId");
          return jsonResponse(syncRepository.getSyncStatus(deviceId), 200);
        }

        if (method === "GET" && pathname === "/api/sync/telemetry") {
          return jsonResponse(syncRepository.getSyncTelemetry(), 200);
        }

        if (method === "GET" && pathname === "/api/sync/devices") {
          return jsonResponse(syncRepository.getRegisteredDevices(), 200);
        }

        if (method === "POST" && pathname === "/api/sync/devices/register") {
          try {
            const dev = syncRepository.registerDevice(body);
            return jsonResponse(dev, 201);
          } catch (err) {
            return errorResponse(400, "DEVICE_REGISTRATION_FAILED", err.message, correlationId);
          }
        }

        if (method === "GET" && pathname === "/api/sync/pull") {
          const queryParams = {
            deviceId: url.searchParams.get("deviceId") || undefined,
            branchId: url.searchParams.get("branchId") || undefined,
            cursor: url.searchParams.get("cursor") || undefined,
            limit: url.searchParams.get("limit") ? Number(url.searchParams.get("limit")) : 100
          };
          return jsonResponse(syncRepository.handlePull(queryParams), 200);
        }

        if (method === "POST" && pathname === "/api/sync/push") {
          try {
            const pushResult = await syncRepository.handlePush(body);
            return jsonResponse(pushResult, 200);
          } catch (err) {
            return errorResponse(400, "SYNC_PUSH_FAILED", err.message, correlationId);
          }
        }

        if (method === "GET" && pathname === "/api/sync/conflicts") {
          const filters = {
            state: url.searchParams.get("state") || undefined,
            deviceId: url.searchParams.get("deviceId") || undefined
          };
          return jsonResponse(syncRepository.getConflicts(filters), 200);
        }

        if (method === "POST" && pathname.startsWith("/api/sync/conflicts/") && pathname.endsWith("/resolve")) {
          try {
            const id = pathname.split("/")[4];
            const resolved = syncRepository.resolveConflict(id, body);
            return jsonResponse(resolved, 200);
          } catch (err) {
            const status = err.message.includes("غير موجود") ? 404 : 400;
            return errorResponse(status, err.message, err.message, correlationId);
          }
        }

        // =========================================================================
        // ACCOUNTING & GENERAL LEDGER (MVP-2 / Module Boundary)
        // =========================================================================

        if (method === "GET" && pathname === "/api/accounting/accounts") {
          const filter = {
            type: url.searchParams.get("type") || undefined,
            category: url.searchParams.get("category") || undefined,
            search: url.searchParams.get("search") || undefined
          };
          return jsonResponse(accountingRepository.getChartOfAccounts(filter), 200);
        }

        if (method === "POST" && pathname === "/api/accounting/accounts") {
          try {
            const acc = accountingRepository.createAccount(body);
            return jsonResponse(acc, 201);
          } catch (err) {
            return errorResponse(400, "ACCOUNT_CREATION_FAILED", err.message, correlationId);
          }
        }

        if (method === "GET" && pathname === "/api/accounting/periods") {
          return jsonResponse(accountingRepository.getFiscalPeriods(), 200);
        }

        if (method === "POST" && pathname.startsWith("/api/accounting/periods/") && pathname.endsWith("/lock")) {
          try {
            const id = pathname.split("/")[4];
            const locked = accountingRepository.lockFiscalPeriod(id);
            return jsonResponse(locked, 200);
          } catch (err) {
            return errorResponse(400, "PERIOD_LOCK_FAILED", err.message, correlationId);
          }
        }

        if (method === "POST" && pathname.startsWith("/api/accounting/periods/") && pathname.endsWith("/reopen")) {
          try {
            const id = pathname.split("/")[4];
            const reopened = accountingRepository.reopenFiscalPeriod(id);
            return jsonResponse(reopened, 200);
          } catch (err) {
            return errorResponse(400, "PERIOD_REOPEN_FAILED", err.message, correlationId);
          }
        }

        if (method === "GET" && pathname === "/api/accounting/journal-entries") {
          const filters = {
            status: url.searchParams.get("status") || undefined,
            sourceModule: url.searchParams.get("sourceModule") || undefined,
            startDate: url.searchParams.get("startDate") || undefined,
            endDate: url.searchParams.get("endDate") || undefined
          };
          return jsonResponse(accountingRepository.getJournalEntries(filters), 200);
        }

        if (method === "POST" && pathname === "/api/accounting/journal-entries") {
          try {
            const entry = accountingRepository.createJournalEntry(body);
            return jsonResponse(entry, 201);
          } catch (err) {
            return errorResponse(400, "JOURNAL_ENTRY_FAILED", err.message, correlationId);
          }
        }

        if (method === "GET" && pathname.startsWith("/api/accounting/journal-entries/") && !pathname.endsWith("/reverse")) {
          const id = pathname.split("/")[4];
          const entry = accountingRepository.getJournalEntryById(id);
          if (!entry) {
            return errorResponse(404, "ENTRY_NOT_FOUND", `قيد اليومية (${id}) غير موجود`, correlationId);
          }
          return jsonResponse(entry, 200);
        }

        if (method === "POST" && pathname.startsWith("/api/accounting/journal-entries/") && pathname.endsWith("/reverse")) {
          try {
            const id = pathname.split("/")[4];
            const resResult = accountingRepository.reverseJournalEntry(id, body);
            return jsonResponse(resResult, 200);
          } catch (err) {
            const status = err.message.includes("غير موجود") ? 404 : 400;
            return errorResponse(status, "REVERSAL_FAILED", err.message, correlationId);
          }
        }

        if (method === "GET" && pathname === "/api/accounting/statements/trial-balance") {
          const asOfDate = url.searchParams.get("asOfDate") || undefined;
          return jsonResponse(accountingRepository.getTrialBalance(asOfDate), 200);
        }

        if (method === "GET" && pathname === "/api/accounting/statements/income-statement") {
          const startDate = url.searchParams.get("startDate") || undefined;
          const endDate = url.searchParams.get("endDate") || undefined;
          return jsonResponse(accountingRepository.getIncomeStatement(startDate, endDate), 200);
        }

        if (method === "GET" && pathname === "/api/accounting/statements/balance-sheet") {
          const asOfDate = url.searchParams.get("asOfDate") || undefined;
          return jsonResponse(accountingRepository.getBalanceSheet(asOfDate), 200);
        }

        if (method === "GET" && pathname.startsWith("/api/accounting/ledger/")) {
          try {
            const accountId = pathname.split("/")[4];
            const startDate = url.searchParams.get("startDate") || undefined;
            const endDate = url.searchParams.get("endDate") || undefined;
            return jsonResponse(accountingRepository.getGeneralLedgerAccountStatement(accountId, startDate, endDate), 200);
          } catch (err) {
            return errorResponse(404, "ACCOUNT_NOT_FOUND", err.message, correlationId);
          }
        }

        // =========================================================================
        // MULTI-BRANCH INTELLIGENCE & GOVERNANCE (MVP-3)
        // =========================================================================

        if (method === "GET" && pathname === "/api/branches/intelligence/consolidated") {
          const period = url.searchParams.get("period") || "TODAY";
          return jsonResponse(branchesRepository.getConsolidatedAnalytics(period), 200);
        }

        if (method === "GET" && pathname === "/api/branches/intelligence/rebalancing-recommendations") {
          return jsonResponse(branchesRepository.getStockRebalancingRecommendations(), 200);
        }

        if (method === "POST" && pathname.startsWith("/api/branches/intelligence/rebalancing-recommendations/") && pathname.endsWith("/apply")) {
          try {
            const recId = pathname.split("/")[5];
            const result = branchesRepository.applyStockRebalancingRecommendation(recId, body.authorizedUser);
            return jsonResponse(result, 200);
          } catch (err) {
            return errorResponse(400, "REBALANCING_FAILED", err.message, correlationId);
          }
        }

        if (method === "GET" && pathname === "/api/branches/intelligence/expiry-risk-matrix") {
          return jsonResponse(branchesRepository.getConsolidatedExpiryMatrix(), 200);
        }

        if (method === "GET" && pathname === "/api/branches/intelligence/governance-health") {
          return jsonResponse(branchesRepository.getBranchGovernanceHealth(), 200);
        }

        if (method === "GET" && pathname === "/api/branches") {
          return jsonResponse(branchesRepository.getBranches(), 200);
        }

        if (method === "POST" && pathname === "/api/branches") {
          try {
            const branch = branchesRepository.createBranch(body);
            return jsonResponse(branch, 201);
          } catch (err) {
            return errorResponse(400, "BRANCH_CREATION_FAILED", err.message, correlationId);
          }
        }

        if (method === "GET" && pathname.startsWith("/api/branches/") && !pathname.includes("/intelligence")) {
          const id = pathname.split("/")[3];
          const branch = branchesRepository.getBranchById(id);
          if (!branch) {
            return errorResponse(404, "BRANCH_NOT_FOUND", `الفرع (${id}) غير موجود`, correlationId);
          }
          return jsonResponse(branch, 200);
        }

        if (method === "PUT" && pathname.startsWith("/api/branches/")) {
          try {
            const id = pathname.split("/")[3];
            const updated = branchesRepository.updateBranch(id, body);
            return jsonResponse(updated, 200);
          } catch (err) {
            return errorResponse(400, "BRANCH_UPDATE_FAILED", err.message, correlationId);
          }
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
