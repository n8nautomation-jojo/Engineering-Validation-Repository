/**
 * PharmaTech Core Backend — Multi-Warehouse & Stock Transfers Repository
 * Manages storage locations, warehouse routing, batch-level inter-location transfers, and inventory audit logs.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { catalogRepository } from "./catalog.mjs";
import { inventoryMovementsRepository } from "./inventoryMovements.mjs";

const resolveDataDir = () => {
  try {
    if (typeof import.meta !== "undefined" && import.meta.url && typeof import.meta.url === "string" && import.meta.url.startsWith("file:")) {
      return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../data");
    }
  } catch {}
  return "";
};

const DATA_DIR = resolveDataDir();
const WAREHOUSES_FILE = DATA_DIR ? path.join(DATA_DIR, "warehouses.json") : "";
const TRANSFERS_FILE = DATA_DIR ? path.join(DATA_DIR, "stock-transfers.json") : "";

const randomTransferId = (existingCount = 0) => `TR-2026-${String(existingCount + 104).padStart(4, "0")}`;

class TransfersRepository {
  constructor() {
    this.warehouses = this.loadWarehouses();
    this.transfers = this.loadTransfers();
  }

  loadWarehouses() {
    try {
      if (WAREHOUSES_FILE && fs && typeof fs.existsSync === "function" && fs.existsSync(WAREHOUSES_FILE)) {
        const raw = fs.readFileSync(WAREHOUSES_FILE, "utf-8");
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.warehouses = parsed;
          return parsed;
        }
      }
    } catch (err) {
      console.warn("[TransfersRepository] Failed to read warehouses from disk:", err.message);
    }
    return [
      { id: "WH-01", code: "WH-CENTRAL", name: "المستودع المركزي الرئيسي", type: "CENTRAL", isDefault: false },
      { id: "WH-02", code: "WH-DISPENSARY", name: "صيدلية البيع بالتجزئة (صالة الصرف المباشر)", type: "RETAIL_DISPENSARY", isDefault: true },
      { id: "WH-03", code: "WH-COLD-CHAIN", name: "وحدة التبريد وسلسلة الأنسولين والمطاعيم (2-8°C)", type: "COLD_CHAIN", isDefault: false },
      { id: "WH-04", code: "WH-EMERGENCY", name: "مخزن الطوارئ والاحتياط الاستراتيجي", type: "RESERVE", isDefault: false }
    ];
  }

  loadTransfers() {
    try {
      if (TRANSFERS_FILE && fs && typeof fs.existsSync === "function" && fs.existsSync(TRANSFERS_FILE)) {
        const raw = fs.readFileSync(TRANSFERS_FILE, "utf-8");
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.transfers = parsed;
          return parsed;
        }
      }
    } catch (err) {
      console.warn("[TransfersRepository] Failed to read transfers from disk:", err.message);
    }
    const initial = this.getInitialTransfersSeed();
    this.persistTransfers(initial);
    this.transfers = initial;
    return initial;
  }

  persistTransfers(list = this.transfers) {
    if (!TRANSFERS_FILE || !DATA_DIR || !fs || typeof fs.writeFileSync !== "function") return;
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(TRANSFERS_FILE, JSON.stringify(list, null, 2), "utf-8");
    } catch (err) {
      console.warn("[TransfersRepository] Failed to write transfers to disk:", err.message);
    }
  }

  getInitialTransfersSeed() {
    return [
      {
        id: "TR-2026-0001",
        transferNumber: "TR-2026-0001",
        fromWarehouseId: "WH-01",
        fromWarehouseName: "المستودع المركزي الرئيسي",
        toWarehouseId: "WH-02",
        toWarehouseName: "صيدلية البيع بالتجزئة (صالة الصرف المباشر)",
        status: "COMPLETED",
        priority: "HIGH",
        items: [
          {
            productId: "MED-001",
            name: "Panadol Extra 500mg/65mg",
            nameAr: "بنادول إكسترا",
            batchNumber: "BATCH-2026-A2",
            expiryDate: "2026-11-30",
            quantity: 30,
            unit: "علبة"
          }
        ],
        totalUnits: 30,
        requestedBy: "د. سارة الكباشي",
        approvedBy: "د. أحمد الطاهر",
        notes: "تعزيز رصيد الصالة بعد استلام توريد جديد",
        createdAt: "2026-10-13T09:30:00.000Z",
        completedAt: "2026-10-13T11:00:00.000Z"
      }
    ];
  }

  getWarehouses() {
    this.loadWarehouses();
    return this.warehouses;
  }

  getWarehouseById(id) {
    return this.getWarehouses().find(w => w.id === id || w.code === id) || null;
  }

  getAll(filters = {}) {
    this.loadTransfers();
    let result = [...this.transfers];

    if (filters.status && filters.status !== "ALL") {
      result = result.filter(t => t.status === filters.status);
    }

    if (filters.fromWarehouseId) {
      result = result.filter(t => t.fromWarehouseId === filters.fromWarehouseId);
    }

    if (filters.toWarehouseId) {
      result = result.filter(t => t.toWarehouseId === filters.toWarehouseId);
    }

    if (filters.search) {
      const q = filters.search.trim().toLowerCase();
      result = result.filter(t =>
        t.transferNumber.toLowerCase().includes(q) ||
        (t.fromWarehouseName && t.fromWarehouseName.toLowerCase().includes(q)) ||
        (t.toWarehouseName && t.toWarehouseName.toLowerCase().includes(q)) ||
        (t.requestedBy && t.requestedBy.toLowerCase().includes(q)) ||
        (Array.isArray(t.items) && t.items.some(i => (i.name && i.name.toLowerCase().includes(q)) || (i.nameAr && i.nameAr.toLowerCase().includes(q))))
      );
    }

    if (filters.limit) {
      result = result.slice(0, parseInt(filters.limit, 10));
    }

    return result;
  }

  getById(id) {
    this.loadTransfers();
    return this.transfers.find(t => t.id === id || t.transferNumber === id) || null;
  }

  create(data) {
    if (!data.fromWarehouseId || !data.toWarehouseId) {
      throw new Error("MISSING_WAREHOUSE: يجب تحديد مستودع المصدر ومستودع الوجهة");
    }

    if (data.fromWarehouseId === data.toWarehouseId) {
      throw new Error("SAME_WAREHOUSE_TRANSFER: لا يمكن التحويل لنفس المستودع، يجب اختيار مستودعين مختلفين");
    }

    const fromWh = this.getWarehouseById(data.fromWarehouseId);
    const toWh = this.getWarehouseById(data.toWarehouseId);

    if (!fromWh) throw new Error(`INVALID_SOURCE_WAREHOUSE: مستودع المصدر (${data.fromWarehouseId}) غير معرف`);
    if (!toWh) throw new Error(`INVALID_DESTINATION_WAREHOUSE: مستودع الوجهة (${data.toWarehouseId}) غير معرف`);

    if (!Array.isArray(data.items) || data.items.length === 0) {
      throw new Error("EMPTY_TRANSFER_ITEMS: يجب إضافة صنف واحد على الأقل للتحويل المخزني");
    }

    const executedItems = [];
    let totalUnits = 0;

    for (const item of data.items) {
      const product = catalogRepository.getById(item.productId);
      if (!product) {
        throw new Error(`PRODUCT_NOT_FOUND: الصنف ${item.productId} غير موجود في الكتالوج`);
      }

      const qty = parseInt(item.quantity, 10);
      if (isNaN(qty) || qty <= 0) {
        throw new Error(`INVALID_QUANTITY: كمية التحويل للصنف ${product.name} يجب أن تكون رقماً موجباً`);
      }

      let batch = null;
      if (item.batchNumber) {
        batch = product.batches?.find(b => b.batchNumber === item.batchNumber) || null;
      }
      if (!batch && product.batches && product.batches.length > 0) {
        batch = product.batches[0];
      }

      const batchNumber = batch ? batch.batchNumber : (item.batchNumber || "BATCH-GEN");
      const expiryDate = batch ? batch.expiryDate : (item.expiryDate || "2027-12-31");

      totalUnits += qty;
      executedItems.push({
        productId: product.id,
        name: product.name,
        nameAr: product.nameAr || product.name,
        batchNumber,
        expiryDate,
        quantity: qty,
        unit: product.unit || "علبة"
      });
    }

    const transferId = randomTransferId(this.transfers.length);
    const isInstantComplete = data.status === "COMPLETED";

    const newTransfer = {
      id: transferId,
      transferNumber: transferId,
      fromWarehouseId: fromWh.id,
      fromWarehouseName: fromWh.name,
      toWarehouseId: toWh.id,
      toWarehouseName: toWh.name,
      status: isInstantComplete ? "COMPLETED" : "PENDING",
      priority: ["URGENT", "HIGH", "NORMAL"].includes(data.priority) ? data.priority : "NORMAL",
      items: executedItems,
      totalUnits,
      requestedBy: data.requestedBy ? data.requestedBy.trim() : "د. سارة الكباشي",
      approvedBy: isInstantComplete ? (data.approvedBy || "د. أحمد الطاهر") : null,
      notes: data.notes ? data.notes.trim() : "",
      createdAt: new Date().toISOString(),
      completedAt: isInstantComplete ? new Date().toISOString() : null
    };

    if (isInstantComplete) {
      this.recordTransferMovements(newTransfer);
    }

    this.transfers.unshift(newTransfer);
    this.persistTransfers();
    return newTransfer;
  }

  complete(transferId, approvedBy = "د. أحمد الطاهر") {
    const transfer = this.getById(transferId);
    if (!transfer) {
      throw new Error(`TRANSFER_NOT_FOUND: أمر التحويل ${transferId} غير موجود`);
    }

    if (transfer.status === "COMPLETED") {
      return transfer; // Idempotent
    }

    if (transfer.status === "CANCELLED") {
      throw new Error(`TRANSFER_CANCELLED: لا يمكن اعتماد أو استلام أمر تحويل ملغي مسبقاً (${transferId})`);
    }

    transfer.status = "COMPLETED";
    transfer.approvedBy = approvedBy;
    transfer.completedAt = new Date().toISOString();

    this.recordTransferMovements(transfer);
    this.persistTransfers();
    return transfer;
  }

  cancel(transferId, reason = "") {
    const transfer = this.getById(transferId);
    if (!transfer) {
      throw new Error(`TRANSFER_NOT_FOUND: أمر التحويل ${transferId} غير موجود`);
    }

    if (transfer.status === "COMPLETED") {
      throw new Error("TRANSFER_ALREADY_COMPLETED: تم استلام أمر التحويل ونقل المخزون مسبقاً، لا يمكن إلغاؤه (قم بعمل تحويل عكسي)");
    }

    transfer.status = "CANCELLED";
    transfer.cancellationReason = reason;
    transfer.cancelReason = reason;
    transfer.cancelledAt = new Date().toISOString();

    this.persistTransfers();
    return transfer;
  }

  recordTransferMovements(transfer) {
    for (const item of transfer.items) {
      try {
        // Movement 1: OUT from source warehouse
        inventoryMovementsRepository.recordMovement({
          movementType: "STOCK_TRANSFER",
          direction: "OUT",
          productId: item.productId,
          productName: item.name,
          productNameAr: item.nameAr,
          batchNumber: item.batchNumber,
          expiryDate: item.expiryDate,
          quantity: item.quantity,
          unit: item.unit || "علبة",
          referenceId: transfer.transferNumber,
          referenceType: "STOCK_TRANSFER_DOC",
          performedBy: transfer.approvedBy || transfer.requestedBy,
          notes: `تحويل مخزني صادر (${transfer.transferNumber}) من [${transfer.fromWarehouseName}] إلى [${transfer.toWarehouseName}]`
        });

        // Movement 2: IN into destination warehouse
        inventoryMovementsRepository.recordMovement({
          movementType: "STOCK_TRANSFER",
          direction: "IN",
          productId: item.productId,
          productName: item.name,
          productNameAr: item.nameAr,
          batchNumber: item.batchNumber,
          expiryDate: item.expiryDate,
          quantity: item.quantity,
          unit: item.unit || "علبة",
          referenceId: transfer.transferNumber,
          referenceType: "STOCK_TRANSFER_DOC",
          performedBy: transfer.approvedBy || transfer.requestedBy,
          notes: `تحويل مخزني وارد (${transfer.transferNumber}) استلام في [${transfer.toWarehouseName}]`
        });
      } catch (movErr) {
        console.warn("[TransfersRepository] Failed to record stock movement:", movErr.message);
      }
    }
  }

  getStats() {
    this.loadTransfers();
    const pending = this.transfers.filter(t => t.status === "PENDING");
    const completed = this.transfers.filter(t => t.status === "COMPLETED");
    const cancelled = this.transfers.filter(t => t.status === "CANCELLED");
    const totalUnitsTransferred = completed.reduce((sum, t) => sum + (t.totalUnits || 0), 0);

    return {
      totalTransfers: this.transfers.length,
      pendingCount: pending.length,
      completedCount: completed.length,
      cancelledCount: cancelled.length,
      totalUnitsTransferred,
      warehousesCount: this.getWarehouses().length
    };
  }
}

export const transfersRepository = new TransfersRepository();
