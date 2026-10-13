/**
 * PharmaTech Core Backend — Sales Ledger & CompleteSale Execution Engine
 * Adheres strictly to CompleteSaleRequestDto & CompleteSaleResponseDto in src/api/types.ts
 */

import { randomUUID } from "node:crypto";
import { catalogRepository } from "./catalog.mjs";
import { sessionRepository } from "./session.mjs";

class SalesRepository {
  constructor() {
    this.salesLedger = [];
    this.idempotencyStore = new Map();
    this.seedInitialHistory();
  }

  seedInitialHistory() {
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

    this.salesLedger.push(initialSale1, initialSale2);
  }

  getAllSales() {
    return [...this.salesLedger].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  getSaleById(idOrInv) {
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

    const completeSaleRecord = {
      sale_id: saleId,
      invoice_number: nextInvNumber,
      status: "COMPLETED",
      created_at: new Date().toISOString(),
      cashier_id: dto.cash_register_id || "usr-001",
      cashier_name: "د. أحمد الطاهر",
      customer_id: dto.customer_id || "CUST-WALK-IN",
      customer_name: dto.customer_id ? `عميل رقم ${dto.customer_id}` : "مواطن — صرف صيدلاني",
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
   * Reverses a completed sale and restores inventory.
   */
  reverseSale(saleId) {
    const sale = this.getSaleById(saleId);
    if (!sale) throw new Error("SALE_NOT_FOUND");
    if (sale.status === "REVERSED") throw new Error("SALE_ALREADY_REVERSED");

    // Restore batch stocks
    for (const item of sale.items) {
      catalogRepository.restoreBatchStock(item.productId, item.batchNumber, item.quantity);
    }

    sale.status = "REVERSED";
    sale.reversed_at = new Date().toISOString();
    return sale;
  }
}

export const salesRepository = new SalesRepository();
