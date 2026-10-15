/**
 * PharmaTech Core Backend — Sales Orders & Prescription Reservations Repository
 * Manages advance booking of prescriptions, chronic patient refill orders, and POS fulfillment lifecycle.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { catalogRepository } from "./catalog.mjs";
import { customersRepository } from "./customers.mjs";

const resolveDataDir = () => {
  try {
    if (typeof import.meta !== "undefined" && import.meta.url && typeof import.meta.url === "string" && import.meta.url.startsWith("file:")) {
      return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../data");
    }
  } catch {}
  return "";
};

const DATA_DIR = resolveDataDir();
const SALES_ORDERS_FILE = DATA_DIR ? path.join(DATA_DIR, "sales-orders.json") : "";

const randomOrderId = (existingCount = 0) => `SO-2026-${String(existingCount + 103).padStart(4, "0")}`;

class SalesOrdersRepository {
  constructor() {
    this.orders = this.loadOrders();
  }

  loadOrders() {
    try {
      if (SALES_ORDERS_FILE && fs && typeof fs.existsSync === "function" && fs.existsSync(SALES_ORDERS_FILE)) {
        const raw = fs.readFileSync(SALES_ORDERS_FILE, "utf-8");
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.orders = parsed;
          return parsed;
        }
      }
    } catch (err) {
      console.warn("[SalesOrdersRepository] Failed to read sales orders from disk:", err.message);
    }
    const initial = this.getInitialSeed();
    this.persistOrders(initial);
    this.orders = initial;
    return initial;
  }

  persistOrders(list = this.orders) {
    if (!SALES_ORDERS_FILE || !DATA_DIR || !fs || typeof fs.writeFileSync !== "function") return;
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(SALES_ORDERS_FILE, JSON.stringify(list, null, 2), "utf-8");
    } catch (err) {
      console.warn("[SalesOrdersRepository] Failed to write sales orders to disk:", err.message);
    }
  }

  getInitialSeed() {
    return [
      {
        id: "SO-2026-0101",
        orderNumber: "SO-2026-0101",
        customerId: "CUST-088",
        customerName: "عثمان الفاضل كباشي",
        customerPhone: "0998765432",
        doctorName: "د. عبد المنعم الشيخ",
        prescriptionNumber: "RX-2026-8812",
        status: "CONFIRMED",
        priority: "CHRONIC_REFILL",
        items: [
          {
            productId: "MED-004",
            name: "Glucophage 500mg Metformin",
            nameAr: "جلوكوفاج 500 مجم",
            quantity: 2,
            unitPrice: 8400,
            lineTotal: 16800
          }
        ],
        totalAmount: 16800,
        notes: "صرف شهري منتظم - حجز مسبق للاستلام مساء اليوم",
        createdAt: "2026-10-14T10:00:00.000Z",
        fulfilledInvoiceNumber: null,
        fulfilledAt: null
      },
      {
        id: "SO-2026-0102",
        orderNumber: "SO-2026-0102",
        customerId: "CUST-012",
        customerName: "محمد عبد الرحمن علي",
        customerPhone: "0912345678",
        doctorName: "د. سامي المهدي (أخصائي الباطنية)",
        prescriptionNumber: "RX-2026-9041",
        status: "CONFIRMED",
        priority: "REGULAR",
        items: [
          {
            productId: "MED-012",
            name: "Amlodipine 5mg Tablets",
            nameAr: "أملوديبين 5 مجم",
            quantity: 1,
            unitPrice: 6200,
            lineTotal: 6200
          },
          {
            productId: "MED-001",
            name: "Panadol Extra 500mg/65mg",
            nameAr: "بنادول إكسترا",
            quantity: 1,
            unitPrice: 4500,
            lineTotal: 4500
          }
        ],
        totalAmount: 10700,
        notes: "حجز هاتفي - سيتم الدفع عبر بنكك عند الاستلام",
        createdAt: "2026-10-15T08:30:00.000Z",
        fulfilledInvoiceNumber: null,
        fulfilledAt: null
      }
    ];
  }

  getAll(filters = {}) {
    this.loadOrders();
    let result = [...this.orders];

    if (filters.status && filters.status !== "ALL") {
      result = result.filter(o => o.status === filters.status);
    }

    if (filters.customerId) {
      result = result.filter(o => o.customerId === filters.customerId);
    }

    if (filters.search) {
      const q = filters.search.trim().toLowerCase();
      result = result.filter(o =>
        (o.orderNumber && o.orderNumber.toLowerCase().includes(q)) ||
        (o.customerName && o.customerName.toLowerCase().includes(q)) ||
        (o.customerPhone && o.customerPhone.includes(q)) ||
        (o.prescriptionNumber && o.prescriptionNumber.toLowerCase().includes(q)) ||
        (o.doctorName && o.doctorName.toLowerCase().includes(q)) ||
        (o.notes && o.notes.toLowerCase().includes(q)) ||
        (Array.isArray(o.items) && o.items.some(i => (i.name && i.name.toLowerCase().includes(q)) || (i.nameAr && i.nameAr.includes(q))))
      );
    }

    result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (filters.limit) {
      const lim = parseInt(filters.limit, 10);
      if (!isNaN(lim) && lim > 0) {
        result = result.slice(0, lim);
      }
    }

    return result;
  }

  getById(id) {
    if (!id) return null;
    this.loadOrders();
    return this.orders.find(o => o.id === id || o.orderNumber === id) || null;
  }

  create(data) {
    if (!Array.isArray(data.items) || data.items.length === 0) {
      throw new Error("VALIDATION_ERROR: أمر البيع أو الحجز يتطلب صنفاً دوائياً واحداً على الأقل");
    }

    let customerId = data.customerId || null;
    let customerName = data.customerName ? data.customerName.trim() : "";
    let customerPhone = data.customerPhone ? data.customerPhone.trim() : "";

    if (customerId) {
      const cust = customersRepository.getById(customerId);
      if (cust) {
        customerName = cust.name;
        customerPhone = cust.phone || customerPhone;
      }
    }

    if (!customerName) {
      throw new Error("VALIDATION_ERROR: اسم المريض أو العميل مطلوب لتسجيل أمر الحجز");
    }

    // Validate and enrich items
    const executedItems = [];
    let totalAmount = 0;

    for (const item of data.items) {
      const product = catalogRepository.getById(item.productId);
      if (!product) {
        throw new Error(`PRODUCT_NOT_FOUND: الصنف ${item.productId} غير موجود في الكتالوج`);
      }

      const qty = parseFloat(item.quantity);
      if (isNaN(qty) || qty <= 0) {
        throw new Error("INVALID_QUANTITY: كمية الصنف يجب أن تكون موجبة");
      }

      const unitPrice = item.unitPrice ? parseFloat(item.unitPrice) : product.price;
      const lineTotal = Number((qty * unitPrice).toFixed(2));
      totalAmount += lineTotal;

      executedItems.push({
        productId: product.id,
        name: product.name,
        nameAr: product.nameAr || product.name,
        quantity: qty,
        unitPrice,
        lineTotal
      });
    }

    const orderId = randomOrderId(this.orders.length);
    const newOrder = {
      id: orderId,
      orderNumber: orderId,
      customerId,
      customerName,
      customerPhone,
      doctorName: data.doctorName ? data.doctorName.trim() : "",
      prescriptionNumber: data.prescriptionNumber ? data.prescriptionNumber.trim() : "",
      status: "CONFIRMED",
      priority: ["URGENT", "CHRONIC_REFILL", "REGULAR"].includes(data.priority) ? data.priority : "REGULAR",
      items: executedItems,
      totalAmount: Number(totalAmount.toFixed(2)),
      notes: data.notes ? data.notes.trim() : "",
      createdAt: new Date().toISOString(),
      fulfilledInvoiceNumber: null,
      fulfilledAt: null
    };

    this.orders.unshift(newOrder);
    this.persistOrders();
    return newOrder;
  }

  fulfill(orderId, invoiceNumber) {
    const order = this.getById(orderId);
    if (!order) {
      throw new Error(`ORDER_NOT_FOUND: أمر البيع ${orderId} غير موجود`);
    }

    if (order.status === "FULFILLED") {
      return order; // Idempotent
    }

    if (order.status === "CANCELLED") {
      throw new Error(`ORDER_CANCELLED: لا يمكن صرف أمر بيع ملغي مسبقاً (${orderId})`);
    }

    order.status = "FULFILLED";
    order.fulfilledInvoiceNumber = invoiceNumber || "INV-POS";
    order.fulfilledAt = new Date().toISOString();
    this.persistOrders();
    return order;
  }

  cancel(orderId, reason = "") {
    const order = this.getById(orderId);
    if (!order) {
      throw new Error(`ORDER_NOT_FOUND: أمر البيع ${orderId} غير موجود`);
    }

    if (order.status === "FULFILLED") {
      throw new Error("ORDER_ALREADY_FULFILLED: تم صرف أمر البيع مسبقاً ولا يمكن إلغاؤه كأمر بيع (استخدم إرجاع الفاتورة)");
    }

    order.status = "CANCELLED";
    order.cancellationReason = reason;
    order.cancelReason = reason;
    order.cancelledAt = new Date().toISOString();
    this.persistOrders();
    return order;
  }

  getStats() {
    this.loadOrders();
    const confirmed = this.orders.filter(o => o.status === "CONFIRMED");
    const fulfilled = this.orders.filter(o => o.status === "FULFILLED");
    const cancelled = this.orders.filter(o => o.status === "CANCELLED");
    const pendingRevenue = confirmed.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    return {
      totalOrders: this.orders.length,
      confirmedCount: confirmed.length,
      fulfilledCount: fulfilled.length,
      cancelledCount: cancelled.length,
      pendingRevenue: Number(pendingRevenue.toFixed(2))
    };
  }
}

export const salesOrdersRepository = new SalesOrdersRepository();
