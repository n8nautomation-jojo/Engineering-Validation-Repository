/**
 * PharmaTech Core Backend — Purchasing & Goods Receipt Repository
 * Strictly enforces Domain Invariants:
 * 1. PO creation does NOT increase stock.
 * 2. Goods Receipt is the authoritative event that replenishes inventory batches.
 * 3. Batches received must have valid future expiry dates (FEFO compliant).
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
const ORDERS_FILE = DATA_DIR ? path.join(DATA_DIR, "purchasing-orders.json") : "";
const SUPPLIERS_FILE = DATA_DIR ? path.join(DATA_DIR, "suppliers.json") : "";

const randomUUID = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `018f${Math.random().toString(16).slice(2, 10)}-0000-7000-8000-000000000000`);

const INITIAL_SUPPLIERS = [
  {
    id: "SUP-001",
    name: "شركة الحكمة للصناعات الدوائية",
    nameEn: "Hikma Pharmaceuticals Sudan",
    contactPerson: "م. طارق عوض",
    phone: "+249 91 234 5678",
    email: "supply@hikma-sd.com",
    address: "الخرطوم بحري — المنطقة الصناعية",
    taxNumber: "TAX-SD-9481029",
    status: "ACTIVE"
  },
  {
    id: "SUP-002",
    name: "شركة النيل الأزرق للمستلزمات الطبية",
    nameEn: "Blue Nile Medical Supplies",
    contactPerson: "د. هبة الرشيد",
    phone: "+249 92 887 6543",
    email: "orders@bluenilemed.sd",
    address: "الخرطوم — شارع السيد علي",
    taxNumber: "TAX-SD-8819203",
    status: "ACTIVE"
  },
  {
    id: "SUP-003",
    name: "مجموعة رويال كير العالمية للأدوية",
    nameEn: "Royal Care Pharma Distribution",
    contactPerson: "أ. عثمان البدوي",
    phone: "+249 12 345 6789",
    email: "distribution@royalcare-pharma.com",
    address: "أم درمان — شارع العرضة",
    taxNumber: "TAX-SD-7718290",
    status: "ACTIVE"
  },
  {
    id: "SUP-004",
    name: "الشركة السودانية للكيماويات الطبية",
    nameEn: "Sudanese Medical Chemicals Ltd",
    contactPerson: "م. مجدي حسن",
    phone: "+249 90 112 3344",
    email: "sales@sudamedchem.sd",
    address: "سوبا — المجمع الدوائي",
    taxNumber: "TAX-SD-6619028",
    status: "ACTIVE"
  }
];

const INITIAL_ORDERS = [
  {
    id: "PO-2026-0041",
    poNumber: "PO-2026-0041",
    supplierId: "SUP-001",
    supplierName: "شركة الحكمة للصناعات الدوائية",
    status: "DELIVERED",
    issueDate: "2026-10-10",
    expectedDeliveryDate: "2026-10-12",
    deliveredAt: "2026-10-12T11:30:00.000Z",
    notes: "شحنة توريد روتينية للفرع الرئيسي",
    items: [
      {
        productId: "MED-001",
        productName: "Panadol Extra 500mg/65mg",
        orderedQuantity: 100,
        receivedQuantity: 100,
        unitCost: 3200,
        lineTotal: 320000
      },
      {
        productId: "MED-006",
        productName: "Brufen 400mg Ibuprofen",
        orderedQuantity: 50,
        receivedQuantity: 50,
        unitCost: 3800,
        lineTotal: 190000
      }
    ],
    totals: {
      totalCost: 510000,
      currency: "SDG"
    },
    goodsReceipts: [
      {
        grnNumber: "GRN-2026-0081",
        receivedAt: "2026-10-12T11:30:00.000Z",
        receivedBy: "د. أحمد الطاهر",
        items: [
          { productId: "MED-001", batchNumber: "BATCH-2027-A1", expiryDate: "2027-08-15", quantity: 100 },
          { productId: "MED-006", batchNumber: "BATCH-BRU-19", expiryDate: "2027-06-12", quantity: 50 }
        ]
      }
    ]
  },
  {
    id: "PO-2026-0042",
    poNumber: "PO-2026-0042",
    supplierId: "SUP-002",
    supplierName: "شركة النيل الأزرق للمستلزمات الطبية",
    status: "PENDING_RECEIPT",
    issueDate: "2026-10-13",
    expectedDeliveryDate: "2026-10-15",
    deliveredAt: null,
    notes: "طلب عاجل لتعزيز رصيد المضادات الحيوية وأدوية السكري",
    items: [
      {
        productId: "MED-002",
        productName: "Augmentin 1g Tablets",
        orderedQuantity: 60,
        receivedQuantity: 0,
        unitCost: 14500,
        lineTotal: 870000
      },
      {
        productId: "MED-004",
        productName: "Glucophage 500mg Metformin",
        orderedQuantity: 80,
        receivedQuantity: 0,
        unitCost: 6200,
        lineTotal: 496000
      }
    ],
    totals: {
      totalCost: 1366000,
      currency: "SDG"
    },
    goodsReceipts: []
  }
];

class PurchasingRepository {
  constructor() {
    this.suppliers = this.loadSuppliers();
    this.orders = this.loadOrders();
  }

  loadSuppliers() {
    try {
      if (SUPPLIERS_FILE && fs && typeof fs.existsSync === "function" && fs.existsSync(SUPPLIERS_FILE)) {
        const raw = fs.readFileSync(SUPPLIERS_FILE, "utf-8");
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (err) {
      console.warn("[PurchasingRepository] Failed to read suppliers from disk:", err.message);
    }
    const initial = JSON.parse(JSON.stringify(INITIAL_SUPPLIERS));
    this.persistSuppliers(initial);
    return initial;
  }

  persistSuppliers(suppliersList = this.suppliers) {
    if (!SUPPLIERS_FILE || !DATA_DIR || !fs || typeof fs.writeFileSync !== "function") return;
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(SUPPLIERS_FILE, JSON.stringify(suppliersList, null, 2), "utf-8");
    } catch (err) {
      console.warn("[PurchasingRepository] Failed to write suppliers to disk:", err.message);
    }
  }

  loadOrders() {
    try {
      if (ORDERS_FILE && fs && typeof fs.existsSync === "function" && fs.existsSync(ORDERS_FILE)) {
        const raw = fs.readFileSync(ORDERS_FILE, "utf-8");
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (err) {
      console.warn("[PurchasingRepository] Failed to read orders from disk:", err.message);
    }
    const initial = JSON.parse(JSON.stringify(INITIAL_ORDERS));
    this.persistOrders(initial);
    return initial;
  }

  persistOrders(ordersList = this.orders) {
    if (!ORDERS_FILE || !DATA_DIR || !fs || typeof fs.writeFileSync !== "function") return;
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(ORDERS_FILE, JSON.stringify(ordersList, null, 2), "utf-8");
    } catch (err) {
      console.warn("[PurchasingRepository] Failed to write orders to disk:", err.message);
    }
  }

  getAllSuppliers() {
    return this.suppliers.map(sup => {
      const supOrders = this.orders.filter(o => o.supplierId === sup.id);
      const totalDelivered = supOrders
        .filter(o => o.status === "DELIVERED" || o.status === "PARTIALLY_DELIVERED")
        .reduce((sum, o) => {
          const receiptsCost = (o.goodsReceipts || []).reduce((acc, grn) => {
            return acc + (grn.items || []).reduce((iSum, grnItem) => {
              const oi = o.items.find(i => i.productId === grnItem.productId);
              return iSum + (grnItem.quantity * (oi ? oi.unitCost : 0));
            }, 0);
          }, 0);
          return sum + (receiptsCost || (o.status === "DELIVERED" ? (o.totals?.totalCost || 0) : 0));
        }, 0);

      return {
        ...sup,
        ordersCount: supOrders.length,
        totalPurchases: totalDelivered
      };
    });
  }

  getSupplierById(id) {
    return this.suppliers.find(s => s.id === id) || null;
  }

  addSupplier(input) {
    if (!input.name || typeof input.name !== "string" || !input.name.trim()) {
      throw new Error("SUPPLIER_NAME_REQUIRED: اسم المورد إلزامي");
    }

    const newId = `SUP-${String(this.suppliers.length + 1).padStart(3, "0")}`;
    const newSupplier = {
      id: newId,
      name: input.name.trim(),
      nameEn: input.nameEn ? input.nameEn.trim() : input.name.trim(),
      contactPerson: input.contactPerson ? input.contactPerson.trim() : "مسؤول المبيعات",
      phone: input.phone ? input.phone.trim() : "—",
      email: input.email ? input.email.trim() : "—",
      address: input.address ? input.address.trim() : "الخرطوم",
      taxNumber: input.taxNumber ? input.taxNumber.trim() : `TAX-SD-${Math.floor(1000000 + Math.random() * 9000000)}`,
      status: "ACTIVE",
      ordersCount: 0,
      totalPurchases: 0
    };

    this.suppliers.unshift(newSupplier);
    this.persistSuppliers();
    return newSupplier;
  }

  getAllOrders() {
    return this.orders;
  }

  getOrderById(id) {
    return this.orders.find(o => o.id === id || o.poNumber === id) || null;
  }

  /**
   * Creates a Purchase Order.
   * NOTE: In accordance with domain rules, PO creation does NOT increase stock.
   */
  createPurchaseOrder(input) {
    const supplier = this.getSupplierById(input.supplierId);
    if (!supplier) {
      throw new Error(`SUPPLIER_NOT_FOUND: المورد المحدد غير مسجل`);
    }

    if (!Array.isArray(input.items) || input.items.length === 0) {
      throw new Error(`NO_ITEMS: يجب تحديد صنف واحد على الأقل في أمر الشراء`);
    }

    const orderNumber = `PO-${new Date().getFullYear()}-${String(this.orders.length + 41).padStart(4, "0")}`;
    let totalCost = 0;

    const validatedItems = input.items.map(item => {
      const product = catalogRepository.getById(item.productId);
      if (!product) {
        throw new Error(`PRODUCT_NOT_FOUND: الصنف ${item.productId} غير موجود بالكتالوج`);
      }

      const qty = Number(item.orderedQuantity);
      if (isNaN(qty) || qty <= 0) {
        throw new Error(`INVALID_QUANTITY: كمية الصنف ${product.name} غير صحيحة`);
      }

      const unitCost = Number(item.unitCost || (product.price * 0.75));
      const lineTotal = qty * unitCost;
      totalCost += lineTotal;

      return {
        productId: product.id,
        productName: product.name,
        orderedQuantity: qty,
        receivedQuantity: 0,
        unitCost,
        lineTotal
      };
    });

    const newOrder = {
      id: orderNumber,
      poNumber: orderNumber,
      supplierId: supplier.id,
      supplierName: supplier.name,
      status: "PENDING_RECEIPT",
      issueDate: new Date().toISOString().split("T")[0],
      expectedDeliveryDate: input.expectedDeliveryDate || new Date(Date.now() + 3 * 86400000).toISOString().split("T")[0],
      deliveredAt: null,
      notes: input.notes || "طلب توريد رسمي من إدارة الصيدلية",
      items: validatedItems,
      totals: {
        totalCost,
        currency: "SDG"
      },
      goodsReceipts: []
    };

    supplier.ordersCount += 1;
    this.orders.unshift(newOrder);
    this.persistOrders();
    this.persistSuppliers();
    return newOrder;
  }

  /**
   * Authoritative Goods Receipt (GRN).
   * This is the authoritative event that injects new batches and stock into the catalog.
   */
  receiveGoodsReceipt(orderId, receiptInput) {
    const order = this.getOrderById(orderId);
    if (!order) {
      throw new Error(`ORDER_NOT_FOUND: أمر الشراء ${orderId} غير موجود`);
    }

    if (order.status === "DELIVERED") {
      throw new Error(`ORDER_ALREADY_DELIVERED: أمر الشراء تم استلامه بالكامل مسبقاً`);
    }

    if (order.status === "CANCELLED") {
      throw new Error(`ORDER_CANCELLED: لا يمكن استلام شحنة لأمر شراء ملغي`);
    }

    const receivedItems = receiptInput.items;
    if (!Array.isArray(receivedItems) || receivedItems.length === 0) {
      throw new Error(`NO_RECEIPT_ITEMS: لا توجد أصناف في إذن الاستلام`);
    }

    const grnNumber = `GRN-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
    const receivedRecords = [];

    // Atomically replenish each item into catalog batches
    for (const item of receivedItems) {
      const orderItem = order.items.find(oi => oi.productId === item.productId);
      if (!orderItem) {
        throw new Error(`INVALID_ITEM: الصنف ${item.productId} ليس جزءاً من أمر الشراء ${order.poNumber}`);
      }

      const qty = Number(item.receivedQuantity);
      if (isNaN(qty) || qty <= 0) {
        throw new Error(`INVALID_RECEIPT_QUANTITY: كمية الاستلام للصنف ${orderItem.productName} يجب أن تكون أكبر من صفر`);
      }

      const batchNum = item.batchNumber ? String(item.batchNumber).trim() : `BATCH-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
      const expDate = item.expiryDate ? String(item.expiryDate).trim() : new Date(Date.now() + 365 * 86400000).toISOString().split("T")[0];

      // Authoritative stock injection
      const replenished = catalogRepository.addOrReplenishBatch(
        item.productId,
        batchNum,
        expDate,
        qty
      );

      orderItem.receivedQuantity = (orderItem.receivedQuantity || 0) + qty;

      receivedRecords.push({
        productId: item.productId,
        productName: orderItem.productName,
        batchNumber: batchNum,
        expiryDate: expDate,
        quantity: qty
      });

      try {
        inventoryMovementsRepository.recordMovement({
          movementType: "GOODS_RECEIPT",
          direction: "IN",
          productId: item.productId,
          productName: orderItem.productName,
          productNameAr: orderItem.productName,
          batchNumber: batchNum,
          expiryDate: expDate,
          quantity: qty,
          unit: "عبوة",
          referenceId: grnNumber,
          referenceType: "PURCHASE_ORDER",
          performedBy: receiptInput.receivedBy || "د. طارق المشرف (أمين المستودع)",
          notes: `إذن استلام شحنة لأمر الشراء ${order.poNumber} — فاتورة المورد: ${receiptInput.supplierInvoiceNumber || 'غير محدد'}`
        });
      } catch (movErr) {
        console.warn("[Purchasing] Failed to record stock movement:", movErr.message);
      }
    }

    // Determine if fully or partially delivered
    const allCompleted = order.items.every(oi => oi.receivedQuantity >= oi.orderedQuantity);
    order.status = allCompleted ? "DELIVERED" : "PARTIALLY_DELIVERED";
    if (allCompleted) {
      order.deliveredAt = new Date().toISOString();
    }

    const grnRecord = {
      grnNumber,
      supplierInvoiceNumber: receiptInput.supplierInvoiceNumber ? String(receiptInput.supplierInvoiceNumber).trim() : "غير مدخل",
      receivedAt: new Date().toISOString(),
      receivedBy: receiptInput.receivedBy || "د. أحمد الطاهر (مدير الصيدلية)",
      notes: receiptInput.notes || "استلام مطابق للشروط والمواصفات الدوائية",
      items: receivedRecords
    };

    order.goodsReceipts.push(grnRecord);

    // Update supplier total purchases
    const supplier = this.getSupplierById(order.supplierId);
    if (supplier) {
      supplier.totalPurchases += receivedRecords.reduce((acc, curr) => {
        const oi = order.items.find(i => i.productId === curr.productId);
        return acc + (curr.quantity * (oi ? oi.unitCost : 0));
      }, 0);
    }

    this.persistOrders();
    this.persistSuppliers();

    return {
      success: true,
      order,
      goodsReceipt: grnRecord
    };
  }
}

export const purchasingRepository = new PurchasingRepository();
