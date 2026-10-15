/**
 * PharmaTech Core Backend — Immutable Stock Movements & Inventory Audit Ledger
 * Conforms strictly to Domain P0-7 Invariants (src/domain/inventory/inventory-transaction.ts)
 * Tracks all authoritative physical stock additions, FEFO dispensations, returns, and audit adjustments.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const resolveDataDir = () => {
  try {
    if (typeof import.meta !== "undefined" && import.meta.url && typeof import.meta.url === "string" && import.meta.url.startsWith("file:")) {
      return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../data");
    }
  } catch {}
  return "";
};

const DATA_DIR = resolveDataDir();
const MOVEMENTS_FILE = DATA_DIR ? path.join(DATA_DIR, "inventory-movements.json") : "";

const randomUUID = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `mov-${Math.random().toString(16).slice(2, 10)}`);

const MOVEMENT_LABELS_AR = {
  GOODS_RECEIPT: "توريد مشتريات (إذن استلام)",
  SALE_DISPENSE: "صرف مبيعات (نقطة البيع)",
  SALE_RETURN: "إرجاع مبيعات (سند مردودات)",
  STOCK_ADJUSTMENT: "تسوية جردية (فروقات جرد)",
  DAMAGE_DISPOSAL: "استبعاد تالف / منتهي"
};

class InventoryMovementsRepository {
  constructor() {
    this.movements = this.loadMovements();
  }

  loadMovements() {
    try {
      if (MOVEMENTS_FILE && fs && typeof fs.existsSync === "function" && fs.existsSync(MOVEMENTS_FILE)) {
        const raw = fs.readFileSync(MOVEMENTS_FILE, "utf-8");
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (err) {
      console.warn("[InventoryMovements] Failed to read movements from disk:", err.message);
    }
    const initial = this.getInitialSeedMovements();
    this.persistMovements(initial);
    return initial;
  }

  persistMovements(movementsList = this.movements) {
    if (!MOVEMENTS_FILE || !DATA_DIR || !fs || typeof fs.writeFileSync !== "function") return;
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(MOVEMENTS_FILE, JSON.stringify(movementsList, null, 2), "utf-8");
    } catch (err) {
      console.warn("[InventoryMovements] Failed to write movements to disk:", err.message);
    }
  }

  getInitialSeedMovements() {
    return [
      {
        id: "mov-018f-a101-7000-8000-000000000001",
        timestamp: "2026-10-12T08:30:00.000Z",
        movementType: "GOODS_RECEIPT",
        movementTypeAr: MOVEMENT_LABELS_AR.GOODS_RECEIPT,
        direction: "IN",
        productId: "MED-001",
        productName: "Panadol Extra 500mg/65mg",
        productNameAr: "بنادول إكسترا",
        batchNumber: "BATCH-2026-A2",
        expiryDate: "2026-11-30",
        quantity: 100,
        unit: "علبة",
        referenceId: "PO-2026-0041",
        referenceType: "PURCHASE_ORDER",
        performedBy: "د. طارق المشرف (أمين المستودع)",
        notes: "استلام معتمد من شركة الحكمة للصناعات الدوائية"
      },
      {
        id: "mov-018f-a101-7000-8000-000000000002",
        timestamp: "2026-10-12T08:35:00.000Z",
        movementType: "GOODS_RECEIPT",
        movementTypeAr: MOVEMENT_LABELS_AR.GOODS_RECEIPT,
        direction: "IN",
        productId: "MED-002",
        productName: "Augmentin 1g Tablets",
        productNameAr: "أوجمنتين 1 جم",
        batchNumber: "BATCH-AUG-99",
        expiryDate: "2026-11-10",
        quantity: 50,
        unit: "شريط",
        referenceId: "PO-2026-0041",
        referenceType: "PURCHASE_ORDER",
        performedBy: "د. طارق المشرف (أمين المستودع)",
        notes: "شحنة توريد عاجل - مطابقة للاشتراطات الصيدلانية"
      },
      {
        id: "mov-018f-a101-7000-8000-000000000003",
        timestamp: "2026-10-13T07:30:00.000Z",
        movementType: "SALE_DISPENSE",
        movementTypeAr: MOVEMENT_LABELS_AR.SALE_DISPENSE,
        direction: "OUT",
        productId: "MED-004",
        productName: "Glucophage 500mg Metformin",
        productNameAr: "جلوكوفاج 500 مجم",
        batchNumber: "BATCH-GLU-12",
        expiryDate: "2026-11-05",
        quantity: 2,
        unit: "علبة",
        referenceId: "INV-2026-0839",
        referenceType: "SALE_INVOICE",
        performedBy: "د. أحمد الطاهر",
        notes: "صرف نقطة البيع للمريض عثمان الفاضل"
      },
      {
        id: "mov-018f-a101-7000-8000-000000000004",
        timestamp: "2026-10-13T07:30:00.000Z",
        movementType: "SALE_DISPENSE",
        movementTypeAr: MOVEMENT_LABELS_AR.SALE_DISPENSE,
        direction: "OUT",
        productId: "MED-001",
        productName: "Panadol Extra 500mg/65mg",
        productNameAr: "بنادول إكسترا",
        batchNumber: "BATCH-2026-A2",
        expiryDate: "2026-11-30",
        quantity: 2,
        unit: "علبة",
        referenceId: "INV-2026-0839",
        referenceType: "SALE_INVOICE",
        performedBy: "د. أحمد الطاهر",
        notes: "صرف نقطة البيع للمريض عثمان الفاضل"
      },
      {
        id: "mov-018f-a101-7000-8000-000000000005",
        timestamp: "2026-10-13T08:42:00.000Z",
        movementType: "SALE_DISPENSE",
        movementTypeAr: MOVEMENT_LABELS_AR.SALE_DISPENSE,
        direction: "OUT",
        productId: "MED-002",
        productName: "Augmentin 1g Tablets",
        productNameAr: "أوجمنتين 1 جم",
        batchNumber: "BATCH-AUG-99",
        expiryDate: "2026-11-10",
        quantity: 1,
        unit: "شريط",
        referenceId: "INV-2026-0840",
        referenceType: "SALE_INVOICE",
        performedBy: "د. سارة الكباشي",
        notes: "صرف روشتة علاجية - دفع تحويل بنكك"
      },
      {
        id: "mov-018f-a101-7000-8000-000000000006",
        timestamp: "2026-10-13T09:15:00.000Z",
        movementType: "SALE_DISPENSE",
        movementTypeAr: MOVEMENT_LABELS_AR.SALE_DISPENSE,
        direction: "OUT",
        productId: "MED-001",
        productName: "Panadol Extra 500mg/65mg",
        productNameAr: "بنادول إكسترا",
        batchNumber: "BATCH-2026-A2",
        expiryDate: "2026-11-30",
        quantity: 2,
        unit: "علبة",
        referenceId: "INV-2026-0841",
        referenceType: "SALE_INVOICE",
        performedBy: "د. أحمد الطاهر",
        notes: "صرف صيدلاني نقدي مباشر"
      },
      {
        id: "mov-018f-a101-7000-8000-000000000007",
        timestamp: "2026-10-13T09:15:00.000Z",
        movementType: "SALE_DISPENSE",
        movementTypeAr: MOVEMENT_LABELS_AR.SALE_DISPENSE,
        direction: "OUT",
        productId: "MED-003",
        productName: "Vitamin C 1000mg Effervescent",
        productNameAr: "فيتامين سي 1000 مجم فوار",
        batchNumber: "BATCH-VTC-44",
        expiryDate: "2027-11-10",
        quantity: 1,
        unit: "أنبوبة",
        referenceId: "INV-2026-0841",
        referenceType: "SALE_INVOICE",
        performedBy: "د. أحمد الطاهر",
        notes: "صرف صيدلاني نقدي مباشر"
      }
    ];
  }

  /**
   * Records an immutable stock movement.
   */
  recordMovement(input) {
    if (!input.productId) throw new Error("VALIDATION_ERROR: productId is required");
    if (!input.batchNumber) throw new Error("VALIDATION_ERROR: batchNumber is required");
    if (!input.quantity || Number(input.quantity) <= 0) throw new Error("VALIDATION_ERROR: quantity must be positive");

    const movementType = input.movementType || "STOCK_ADJUSTMENT";
    const movementTypeAr = MOVEMENT_LABELS_AR[movementType] || input.movementTypeAr || "حركة مخزون";

    const record = {
      id: input.id || `mov-${randomUUID()}`,
      timestamp: input.timestamp || new Date().toISOString(),
      movementType,
      movementTypeAr,
      direction: input.direction === "OUT" ? "OUT" : "IN",
      productId: input.productId,
      productName: input.productName || input.productId,
      productNameAr: input.productNameAr || input.productName || input.productId,
      batchNumber: String(input.batchNumber).trim(),
      expiryDate: input.expiryDate ? String(input.expiryDate).trim() : "",
      quantity: Number(input.quantity),
      unit: input.unit || "عبوة",
      referenceId: input.referenceId || "REF-MANUAL",
      referenceType: input.referenceType || "ADJUSTMENT_DOC",
      performedBy: input.performedBy || "النظام الصيدلاني الآلي",
      notes: input.notes || ""
    };

    this.movements.unshift(record);
    this.persistMovements();
    return record;
  }

  /**
   * Retrieves movements with flexible filtering.
   */
  getAllMovements(filters = {}) {
    let result = [...this.movements];

    if (filters.productId) {
      const p = String(filters.productId).toLowerCase();
      result = result.filter(m => m.productId.toLowerCase() === p);
    }

    if (filters.batchNumber) {
      const b = String(filters.batchNumber).toLowerCase();
      result = result.filter(m => m.batchNumber.toLowerCase() === b);
    }

    if (filters.type && filters.type !== "ALL") {
      result = result.filter(m => m.movementType === filters.type);
    }

    if (filters.direction && filters.direction !== "ALL") {
      result = result.filter(m => m.direction === filters.direction);
    }

    if (filters.search) {
      const q = String(filters.search).toLowerCase().trim();
      result = result.filter(m =>
        m.productName.toLowerCase().includes(q) ||
        (m.productNameAr && m.productNameAr.toLowerCase().includes(q)) ||
        m.batchNumber.toLowerCase().includes(q) ||
        m.referenceId.toLowerCase().includes(q) ||
        (m.performedBy && m.performedBy.toLowerCase().includes(q))
      );
    }

    if (filters.dateFrom) {
      result = result.filter(m => m.timestamp >= filters.dateFrom);
    }

    if (filters.dateTo) {
      result = result.filter(m => m.timestamp <= filters.dateTo);
    }

    // Sort newest first
    result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const limit = Number(filters.limit);
    if (!isNaN(limit) && limit > 0) {
      result = result.slice(0, limit);
    }

    return result;
  }

  /**
   * Aggregated statistics for inventory health and operational reporting.
   */
  getMovementsStats() {
    let totalInUnits = 0;
    let totalOutUnits = 0;
    let receiptsCount = 0;
    let salesCount = 0;
    let returnsCount = 0;
    let adjustmentsCount = 0;

    for (const m of this.movements) {
      if (m.direction === "IN") {
        totalInUnits += m.quantity;
      } else {
        totalOutUnits += m.quantity;
      }

      if (m.movementType === "GOODS_RECEIPT") receiptsCount++;
      else if (m.movementType === "SALE_DISPENSE") salesCount++;
      else if (m.movementType === "SALE_RETURN") returnsCount++;
      else if (m.movementType === "STOCK_ADJUSTMENT" || m.movementType === "DAMAGE_DISPOSAL") adjustmentsCount++;
    }

    return {
      totalMovements: this.movements.length,
      totalInUnits,
      totalOutUnits,
      netStockChange: totalInUnits - totalOutUnits,
      receiptsCount,
      salesCount,
      returnsCount,
      adjustmentsCount,
      lastMovementAt: this.movements.length > 0 ? this.movements[0].timestamp : null
    };
  }
}

export const inventoryMovementsRepository = new InventoryMovementsRepository();
