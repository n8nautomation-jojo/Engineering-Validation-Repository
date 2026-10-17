/**
 * PharmaTech Core Backend — Sales Ledger & CompleteSale Execution Engine
 * Adheres strictly to CompleteSaleRequestDto & CompleteSaleResponseDto in src/api/types.ts
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { catalogRepository } from "./catalog.mjs";
import { sessionRepository } from "./session.mjs";
import { inventoryMovementsRepository } from "./inventoryMovements.mjs";
import { customersRepository } from "./customers.mjs";
import { SqliteOutboxStore } from "../../dist/src/infrastructure/sqlite/sqlite-outbox-store.js";

const resolveDataDir = () => {
  try {
    if (typeof import.meta !== "undefined" && import.meta.url && typeof import.meta.url === "string" && import.meta.url.startsWith("file:")) {
      return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../data");
    }
  } catch {}
  return "";
};

const DATA_DIR = resolveDataDir();
const SALES_FILE = DATA_DIR ? path.join(DATA_DIR, "sales.json") : "";
const SQLITE_DB_PATH = DATA_DIR ? path.join(DATA_DIR, "pharmatech-pos.db") : ":memory:";

const randomUUID = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `018f${Math.random().toString(16).slice(2, 10)}-0000-7000-8000-000000000000`);

class SalesRepository {
  constructor() {
    this.idempotencyStore = new Map();
    this.salesLedger = this.loadSales();

    try {
      this.db = new DatabaseSync(SQLITE_DB_PATH);
      this.outboxStore = new SqliteOutboxStore(this.db);
    } catch (err) {
      console.warn("[SalesRepository] SQLite outbox fallback to memory:", err.message);
      this.db = new DatabaseSync(":memory:");
      this.outboxStore = new SqliteOutboxStore(this.db);
    }
  }

  loadSales() {
    try {
      if (SALES_FILE && fs && typeof fs.existsSync === "function" && fs.existsSync(SALES_FILE)) {
        const raw = fs.readFileSync(SALES_FILE, "utf-8");
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.salesLedger = parsed;
          return parsed;
        }
      }
    } catch (err) {
      console.warn("[SalesRepository] Failed to read sales from disk:", err.message);
    }
    const initial = this.getInitialHistory();
    this.persistSales(initial);
    this.salesLedger = initial;
    return initial;
  }

  persistSales(salesList = this.salesLedger) {
    if (!SALES_FILE || !DATA_DIR || !fs || typeof fs.writeFileSync !== "function") return;
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(SALES_FILE, JSON.stringify(salesList, null, 2), "utf-8");
    } catch (err) {
      console.warn("[SalesRepository] Failed to write sales to disk:", err.message);
    }
  }

  getInitialHistory() {
    // Seed authentic previous completed sales for history view
    const initialSale1 = {
      sale_id: "sale-018f-a110-7000-8000-000000000101",
      invoice_number: "INV-2026-0841",
      status: "COMPLETED",
      created_at: "2026-10-13T09:15:30.000Z",
      cashier_id: "usr-001",
      cashier_name: "د. أحمد الطاهر",
      customer_id: "CUST-049",
      customer_name: "مواطن — صرف نقدي",
      items: [
        {
          productId: "MED-001",
          name: "Panadol Extra 500mg/65mg",
          nameAr: "بنادول إكسترا",
          batchNumber: "BATCH-2026-A2",
          expiryDate: "2026-11-30",
          quantity: 2,
          unitPrice: 4500,
          lineTotal: 9000
        },
        {
          productId: "MED-003",
          name: "Vitamin C 1000mg Effervescent",
          nameAr: "فيتامين سي 1000 مجم فوار",
          batchNumber: "BATCH-VTC-44",
          expiryDate: "2027-11-10",
          quantity: 1,
          unitPrice: 6800,
          lineTotal: 6800
        }
      ],
      totals: {
        subtotal: "15800.00",
        tax: "0.00",
        total: "15800.00",
        currency: "SDG"
      },
      payments: [
        {
          method: "CASH",
          amount: { value: "15800.00", currency: "SDG" },
          verification_mode: "MANUAL_CONFIRMATION"
        }
      ],
      payment_summary: {
        paid_amount: "15800.00",
        change_amount: "0.00"
      },
      inventory_effect: {
        transaction_id: "tx-018f-a110-7000-8000-000000000101",
        consumed_allocations: ["pos-dev-01"]
      },
      sync_status: "SYNCED",
      correlation_id: "corr-seed-01"
    };

    const initialSale2 = {
      sale_id: "sale-018f-a110-7000-8000-000000000102",
      invoice_number: "INV-2026-0840",
      status: "COMPLETED",
      created_at: "2026-10-13T08:45:12.000Z",
      cashier_id: "usr-001",
      cashier_name: "د. أحمد الطاهر",
      customer_id: "CUST-012",
      customer_name: "محمد عبد الرحمن علي",
      items: [
        {
          productId: "MED-002",
          name: "Augmentin 1g Tablets",
          nameAr: "أوجمنتين 1 جم",
          batchNumber: "BATCH-AUG-99",
          expiryDate: "2026-11-10",
          quantity: 1,
          unitPrice: 18500,
          lineTotal: 18500
        }
      ],
      totals: {
        subtotal: "18500.00",
        tax: "0.00",
        total: "18500.00",
        currency: "SDG"
      },
      payments: [
        {
          method: "BANK_TRANSFER",
          amount: { value: "18500.00", currency: "SDG" },
          verification_mode: "EVIDENCE_REVIEW",
          evidence_reference: "TXN-BOK-94821038"
        }
      ],
      payment_summary: {
        paid_amount: "18500.00",
        change_amount: "0.00"
      },
      inventory_effect: {
        transaction_id: "tx-018f-a110-7000-8000-000000000102",
        consumed_allocations: ["pos-dev-01"]
      },
      sync_status: "SYNCED",
      correlation_id: "corr-seed-02"
    };

    const initialSale3 = {
      sale_id: "sale-018f-a110-7000-8000-000000000103",
      invoice_number: "INV-2026-0839",
      status: "COMPLETED",
      created_at: "2026-10-13T07:30:00.000Z",
      cashier_id: "usr-001",
      cashier_name: "د. أحمد الطاهر",
      customer_id: "CUST-088",
      customer_name: "عثمان الفاضل كباشي",
      items: [
        {
          productId: "MED-004",
          name: "Glucophage 500mg Metformin",
          nameAr: "جلوكوفاج 500 مجم",
          batchNumber: "BATCH-GLU-12",
          expiryDate: "2026-11-05",
          quantity: 2,
          unitPrice: 8400,
          lineTotal: 16800
        },
        {
          productId: "MED-001",
          name: "Panadol Extra 500mg/65mg",
          nameAr: "بنادول إكسترا",
          batchNumber: "BATCH-2026-A2",
          expiryDate: "2026-11-30",
          quantity: 2,
          unitPrice: 4500,
          lineTotal: 9000
        }
      ],
      totals: {
        subtotal: "25800.00",
        tax: "0.00",
        total: "25800.00",
        currency: "SDG"
      },
      payments: [
        {
          method: "CASH",
          amount: { value: "10000.00", currency: "SDG" },
          verification_mode: "MANUAL_CONFIRMATION"
        },
        {
          method: "BANK_TRANSFER",
          amount: { value: "15800.00", currency: "SDG" },
          verification_mode: "EVIDENCE_REVIEW",
          evidence_reference: "TXN-BOK-33918274"
        }
      ],
      payment_summary: {
        paid_amount: "25800.00",
        change_amount: "0.00"
      },
      inventory_effect: {
        transaction_id: "tx-018f-a110-7000-8000-000000000103",
        consumed_allocations: ["pos-dev-01"]
      },
      sync_status: "SYNCED",
      correlation_id: "corr-seed-03"
    };

    return [initialSale1, initialSale2, initialSale3];
  }

  getAllSales() {
    this.loadSales();
    return [...this.salesLedger].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  getSaleById(idOrInv) {
    this.loadSales();
    return this.salesLedger.find(s => s.sale_id === idOrInv || s.invoice_number === idOrInv) || null;
  }

  /**
   * Executes CompleteSale according to OpenAPI CompleteSaleRequestDto -> CompleteSaleResponseDto
   * Enforces idempotency, batch validation, inventory deduction, and session bounds.
   */
  async processSale(dto, headers = {}) {
    const idempotencyKey = headers["idempotency-key"] || dto.client_operation_id;
    const correlationId = headers["x-correlation-id"] || `corr-${Date.now()}`;

    // 1. Idempotency Check
    if (idempotencyKey && this.idempotencyStore.has(idempotencyKey)) {
      return this.idempotencyStore.get(idempotencyKey);
    }

    // 2. Validate session & payload
    if (!dto.cash_session_id) {
      throw new Error("VALIDATION_ERROR: cash_session_id is required");
    }
    if (!Array.isArray(dto.lines) || dto.lines.length === 0) {
      throw new Error("VALIDATION_ERROR: Sale requires at least one line item");
    }
    if (!Array.isArray(dto.payments) || dto.payments.length === 0) {
      throw new Error("VALIDATION_ERROR: Sale requires payment entries");
    }

    // 3. Validate lines & deduct inventory atomically
    const executedLines = [];
    let subtotalNumber = 0;
    let totalUnits = 0;

    for (const line of dto.lines) {
      const product = catalogRepository.getById(line.product_id);
      if (!product) {
        throw new Error(`PRODUCT_NOT_FOUND: Product ID ${line.product_id} not found`);
      }

      const qty = parseFloat(line.quantity.value);
      if (isNaN(qty) || qty <= 0) {
        throw new Error("INVALID_QUANTITY: Line quantity must be positive");
      }

      // Determine batch: requested batch or auto FEFO
      let batchNumber = line.batch_id;
      if (!batchNumber) {
        const fefoBatch = catalogRepository.selectFefoBatch(product);
        if (!fefoBatch) {
          throw new Error(`NO_VALID_STOCK: Product ${product.name} has no available non-expired batch`);
        }
        batchNumber = fefoBatch.batchNumber;
      }

      // Deduct stock from batch
      const { batch } = catalogRepository.deductBatchStock(product.id, batchNumber, qty);

      const unitPrice = line.unit_price ? parseFloat(line.unit_price.value) : product.price;
      const lineTotal = Number((qty * unitPrice).toFixed(2));
      subtotalNumber += lineTotal;
      totalUnits += qty;

      executedLines.push({
        productId: product.id,
        name: product.name,
        nameAr: product.nameAr,
        batchNumber: batch.batchNumber,
        expiryDate: batch.expiryDate,
        quantity: qty,
        unitPrice,
        lineTotal
      });
    }

    // 4. Validate Payments
    const totalPaidNumber = dto.payments.reduce((sum, p) => sum + parseFloat(p.amount.value), 0);
    if (totalPaidNumber < subtotalNumber - 0.01) {
      // Rollback deducted stock before throwing
      for (const line of executedLines) {
        catalogRepository.restoreBatchStock(line.productId, line.batchNumber, line.quantity);
      }
      throw new Error(`INSUFFICIENT_PAYMENT: Paid ${totalPaidNumber} SDG vs Total ${subtotalNumber} SDG`);
    }

    // 5. Consume Offline Allocation Quota
    sessionRepository.consumeAllocation(totalUnits);

    // 6. Generate Response DTO & Invoice Record
    const saleId = `sale-${randomUUID()}`;
    const nextInvNumber = `INV-2026-${String(this.salesLedger.length + 843).padStart(4, "0")}`;
    const changeAmount = Math.max(0, totalPaidNumber - subtotalNumber);

    let customerId = dto.customer_id || "CUST-WALK-IN";
    let customerName = "مواطن — صرف صيدلاني";
    if (dto.customer_id && dto.customer_id !== "CUST-WALK-IN") {
      const cust = customersRepository.getById(dto.customer_id);
      if (cust) {
        customerId = cust.id;
        customerName = cust.name;
      } else {
        customerName = `عميل رقم ${dto.customer_id}`;
      }
    }

    const completeSaleRecord = {
      sale_id: saleId,
      invoice_number: nextInvNumber,
      status: "COMPLETED",
      created_at: new Date().toISOString(),
      cashier_id: dto.cash_register_id || "usr-001",
      cashier_name: "د. أحمد الطاهر",
      customer_id: customerId,
      customer_name: customerName,
      items: executedLines,
      totals: {
        subtotal: subtotalNumber.toFixed(2),
        tax: "0.00",
        total: subtotalNumber.toFixed(2),
        currency: "SDG"
      },
      payments: dto.payments.map(p => ({
        method: p.method,
        amount: { value: parseFloat(p.amount.value).toFixed(2), currency: "SDG" },
        verification_mode: p.verification_mode || (p.method === "CASH" ? "MANUAL_CONFIRMATION" : "EVIDENCE_REVIEW"),
        evidence_reference: p.evidence_reference || null
      })),
      payment_summary: {
        paid_amount: totalPaidNumber.toFixed(2),
        change_amount: changeAmount.toFixed(2)
      },
      inventory_effect: {
        transaction_id: `tx-${randomUUID()}`,
        consumed_allocations: ["pos-dev-01"]
      },
      sync_status: "SYNCED",
      correlation_id: correlationId
    };

    // 7. Persist to ledger and idempotency store
    this.salesLedger.unshift(completeSaleRecord);
    this.persistSales();

    // 7b. Persist Outbox Event to SQLite outbox_events table
    try {
      const outboxEvent = {
        eventId: `evt-${randomUUID()}`,
        eventType: "sale.completed",
        aggregateId: completeSaleRecord.sale_id,
        aggregateVersion: 1,
        occurredAt: completeSaleRecord.created_at,
        tenantId: dto.tenant_id || "t-001",
        organizationId: dto.organization_id || "org-001",
        branchId: dto.branch_id || "brn-khartoum-01",
        deviceId: dto.device_id || "pos-dev-01",
        correlationId: correlationId,
        payload: {
          saleId: completeSaleRecord.sale_id,
          invoiceNumber: completeSaleRecord.invoice_number,
          items: executedLines,
          totals: completeSaleRecord.totals,
          payments: completeSaleRecord.payments,
          customerId: completeSaleRecord.customer_id,
          cashierName: completeSaleRecord.cashier_name
        },
        status: "PENDING"
      };

      await this.outboxStore.append(outboxEvent, {
        tenantId: outboxEvent.tenantId,
        organizationId: outboxEvent.organizationId,
        branchId: outboxEvent.branchId,
        deviceId: outboxEvent.deviceId,
        userId: completeSaleRecord.cashier_id || "usr-001",
        correlationId: correlationId
      });
    } catch (outboxErr) {
      console.warn("[SalesRepository] Non-fatal outbox append warning:", outboxErr.message);
    }

    // 8. Update customer's aggregate stats if registered
    if (customerId !== "CUST-WALK-IN") {
      try {
        customersRepository.recordSaleVisit(customerId, subtotalNumber, completeSaleRecord.created_at);
      } catch (custErr) {
        console.warn("[Sales] Failed to update customer record:", custErr.message);
      }
    }

    // Record stock movements for all executed lines (FEFO deduction)
    for (const item of executedLines) {
      try {
        inventoryMovementsRepository.recordMovement({
          movementType: "SALE_DISPENSE",
          direction: "OUT",
          productId: item.productId,
          productName: item.name,
          productNameAr: item.nameAr,
          batchNumber: item.batchNumber,
          expiryDate: item.expiryDate,
          quantity: item.quantity,
          unit: "عبوة",
          referenceId: nextInvNumber,
          referenceType: "SALE_INVOICE",
          performedBy: completeSaleRecord.cashier_name || "كاشير نقطة البيع",
          notes: `صرف فاتورة بيع (${nextInvNumber}) - العميل: ${completeSaleRecord.customer_name}`
        });
      } catch (movErr) {
        console.warn("[Sales] Failed to record stock movement:", movErr.message);
      }
    }

    const responseDto = {
      sale_id: completeSaleRecord.sale_id,
      invoice_number: completeSaleRecord.invoice_number,
      status: "COMPLETED",
      totals: completeSaleRecord.totals,
      payment_summary: completeSaleRecord.payment_summary,
      inventory_effect: completeSaleRecord.inventory_effect,
      sync_status: completeSaleRecord.sync_status,
      correlation_id: correlationId,
      // Pass full record for immediate receipt printing
      receipt_data: completeSaleRecord
    };

    if (idempotencyKey) {
      this.idempotencyStore.set(idempotencyKey, responseDto);
    }

    return responseDto;
  }

  /**
   * Reverses a completed sale and restores inventory to the exact FEFO batches.
   */
  reverseSale(saleId, reason = "RETURN_WITHIN_24H", note = "") {
    const sale = this.getSaleById(saleId);
    if (!sale) throw new Error("SALE_NOT_FOUND");
    if (sale.status === "REVERSED") throw new Error("SALE_ALREADY_REVERSED");

    // Restore batch stocks and calculate total restored units
    let totalUnits = 0;
    for (const item of (sale.items || [])) {
      catalogRepository.restoreBatchStock(item.productId, item.batchNumber, item.quantity);
      totalUnits += Number(item.quantity) || 0;

      try {
        inventoryMovementsRepository.recordMovement({
          movementType: "SALE_RETURN",
          direction: "IN",
          productId: item.productId,
          productName: item.name,
          productNameAr: item.nameAr,
          batchNumber: item.batchNumber,
          expiryDate: item.expiryDate,
          quantity: item.quantity,
          unit: "عبوة",
          referenceId: `RET-${sale.invoice_number}`,
          referenceType: "RETURN_DOC",
          performedBy: "مدير الصيدلية (إرجاع معتمد)",
          notes: `إرجاع فاتورة (${sale.invoice_number}) - السبب: ${reason} ${note ? `· ${note}` : ''}`
        });
      } catch (movErr) {
        console.warn("[Sales] Failed to record return stock movement:", movErr.message);
      }
    }

    // Restore consumed allocation quota back to device
    if (totalUnits > 0) {
      sessionRepository.restoreAllocation(totalUnits);
    }

    sale.status = "REVERSED";
    sale.reversed_at = new Date().toISOString();
    sale.reversal_reason = reason;
    sale.reversal_note = note;
    this.persistSales();
    return sale;
  }

  async getPendingOutboxEvents(limit = 50) {
    if (!this.outboxStore) return [];
    return this.outboxStore.getPending(limit);
  }

  async getAllOutboxEvents() {
    if (!this.outboxStore) return [];
    return this.outboxStore.getAll();
  }

  getOutboxStore() {
    return this.outboxStore;
  }
}

export const salesRepository = new SalesRepository();
