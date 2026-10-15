/**
 * PharmaTech Core Backend — Customer & Patient Directory Repository
 * Manages patient profiles, chronic medical conditions, allergy alerts, and purchasing histories.
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
const CUSTOMERS_FILE = DATA_DIR ? path.join(DATA_DIR, "customers.json") : "";

const randomId = (existingCount = 0) => `CUST-${String(existingCount + 101).padStart(3, "0")}`;

class CustomersRepository {
  constructor() {
    this.customers = this.loadCustomers();
  }

  loadCustomers() {
    try {
      if (CUSTOMERS_FILE && fs && typeof fs.existsSync === "function" && fs.existsSync(CUSTOMERS_FILE)) {
        const raw = fs.readFileSync(CUSTOMERS_FILE, "utf-8");
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.customers = parsed;
          return parsed;
        }
      }
    } catch (err) {
      console.warn("[CustomersRepository] Failed to read customers from disk:", err.message);
    }
    const initial = this.getInitialSeed();
    this.persistCustomers(initial);
    this.customers = initial;
    return initial;
  }

  persistCustomers(list = this.customers) {
    if (!CUSTOMERS_FILE || !DATA_DIR || !fs || typeof fs.writeFileSync !== "function") return;
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(CUSTOMERS_FILE, JSON.stringify(list, null, 2), "utf-8");
    } catch (err) {
      console.warn("[CustomersRepository] Failed to write customers to disk:", err.message);
    }
  }

  getInitialSeed() {
    return [
      {
        id: "CUST-012",
        name: "محمد عبد الرحمن علي",
        phone: "0912345678",
        type: "CHRONIC",
        chronicConditions: [
          "ارتفاع ضغط الدم (Hypertension)",
          "داء السكري النوع الثاني (Type 2 Diabetes)"
        ],
        allergies: [
          "حساسية بنسلين (Penicillin Allergy)"
        ],
        insuranceDetails: null,
        notes: "يحتاج مراجعة دورية للضغط وفحص السكر التراكمي",
        totalPurchases: 18500,
        visitsCount: 1,
        lastVisitAt: "2026-10-13T08:45:12.000Z",
        createdAt: "2026-09-01T10:00:00.000Z",
        status: "ACTIVE"
      },
      {
        id: "CUST-088",
        name: "عثمان الفاضل كباشي",
        phone: "0998765432",
        type: "CHRONIC",
        chronicConditions: [
          "داء السكري النوع الثاني (Type 2 Diabetes)"
        ],
        allergies: [],
        insuranceDetails: null,
        notes: "صرف شهري لجلوكوفاج 500 مجم",
        totalPurchases: 25800,
        visitsCount: 1,
        lastVisitAt: "2026-10-13T07:30:00.000Z",
        createdAt: "2026-09-10T11:30:00.000Z",
        status: "ACTIVE"
      },
      {
        id: "CUST-049",
        name: "فاطمة إدريس حسن",
        phone: "0123456789",
        type: "INSURANCE",
        chronicConditions: [
          "الربو الشعبي (Bronchial Asthma)"
        ],
        allergies: [
          "حساسية أسبرين ومسكنات NSAIDs"
        ],
        insuranceDetails: {
          provider: "شركة شيكان للتأمين",
          policyNumber: "SHK-2026-99120",
          copayPercent: 15
        },
        notes: "بطاقة تأمين سارية حتى نهاية 2026",
        totalPurchases: 15800,
        visitsCount: 1,
        lastVisitAt: "2026-10-13T09:15:30.000Z",
        createdAt: "2026-08-15T09:00:00.000Z",
        status: "ACTIVE"
      },
      {
        id: "CUST-104",
        name: "د. نزار مصطفى عوض",
        phone: "0911223344",
        type: "WALK_IN",
        chronicConditions: [],
        allergies: [],
        insuranceDetails: null,
        notes: "عميل منتظم للحي",
        totalPurchases: 0,
        visitsCount: 0,
        lastVisitAt: null,
        createdAt: "2026-10-01T12:00:00.000Z",
        status: "ACTIVE"
      }
    ];
  }

  getAll(filters = {}) {
    this.loadCustomers();
    let result = [...this.customers];

    if (filters.status) {
      result = result.filter(c => c.status === filters.status);
    } else {
      // By default return ACTIVE unless requested
      result = result.filter(c => c.status !== "ARCHIVED");
    }

    if (filters.type && filters.type !== "ALL") {
      result = result.filter(c => c.type === filters.type);
    }

    if (filters.search) {
      const q = filters.search.trim().toLowerCase();
      result = result.filter(c => 
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.phone && c.phone.includes(q)) ||
        (c.id && c.id.toLowerCase().includes(q)) ||
        (c.notes && c.notes.toLowerCase().includes(q)) ||
        (Array.isArray(c.chronicConditions) && c.chronicConditions.some(cond => cond.toLowerCase().includes(q))) ||
        (Array.isArray(c.allergies) && c.allergies.some(alg => alg.toLowerCase().includes(q)))
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
    this.loadCustomers();
    return this.customers.find(c => c.id === id) || null;
  }

  getByPhone(phone) {
    if (!phone) return null;
    this.loadCustomers();
    const clean = phone.replace(/[^0-9]/g, "");
    return this.customers.find(c => {
      const custClean = (c.phone || "").replace(/[^0-9]/g, "");
      return custClean.endsWith(clean) || clean.endsWith(custClean);
    }) || null;
  }

  create(data) {
    if (!data.name || typeof data.name !== "string" || !data.name.trim()) {
      throw new Error("VALIDATION_ERROR: اسم العميل/المريض مطلوب");
    }

    const trimmedPhone = data.phone ? data.phone.trim() : "";
    if (trimmedPhone) {
      const existing = this.getByPhone(trimmedPhone);
      if (existing) {
        throw new Error(`DUPLICATE_PHONE: رقم الهاتف مسجل مسبقاً باسم (${existing.name})`);
      }
    }

    const id = data.id || randomId(this.customers.length);
    const newCustomer = {
      id,
      name: data.name.trim(),
      phone: trimmedPhone,
      type: ["WALK_IN", "CHRONIC", "INSURANCE"].includes(data.type) ? data.type : "WALK_IN",
      chronicConditions: Array.isArray(data.chronicConditions) ? data.chronicConditions : [],
      allergies: Array.isArray(data.allergies) ? data.allergies : [],
      insuranceDetails: data.insuranceDetails && typeof data.insuranceDetails === "object" ? {
        provider: data.insuranceDetails.provider || "",
        policyNumber: data.insuranceDetails.policyNumber || "",
        copayPercent: Number(data.insuranceDetails.copayPercent) || 0
      } : null,
      notes: data.notes ? data.notes.trim() : "",
      totalPurchases: 0,
      visitsCount: 0,
      lastVisitAt: null,
      createdAt: new Date().toISOString(),
      status: "ACTIVE"
    };

    this.customers.unshift(newCustomer);
    this.persistCustomers();
    return newCustomer;
  }

  update(id, updates) {
    const customer = this.getById(id);
    if (!customer) {
      throw new Error(`CUSTOMER_NOT_FOUND: المريض ${id} غير مسجل`);
    }

    if (updates.name !== undefined) {
      if (!updates.name || !updates.name.trim()) {
        throw new Error("VALIDATION_ERROR: اسم العميل لا يمكن أن يكون فارغاً");
      }
      customer.name = updates.name.trim();
    }

    if (updates.phone !== undefined) {
      const trimmedPhone = updates.phone.trim();
      if (trimmedPhone && trimmedPhone !== customer.phone) {
        const existing = this.getByPhone(trimmedPhone);
        if (existing && existing.id !== customer.id) {
          throw new Error(`DUPLICATE_PHONE: رقم الهاتف مسجل مسبقاً باسم (${existing.name})`);
        }
      }
      customer.phone = trimmedPhone;
    }

    if (updates.type && ["WALK_IN", "CHRONIC", "INSURANCE"].includes(updates.type)) {
      customer.type = updates.type;
    }

    if (Array.isArray(updates.chronicConditions)) {
      customer.chronicConditions = updates.chronicConditions;
    }

    if (Array.isArray(updates.allergies)) {
      customer.allergies = updates.allergies;
    }

    if (updates.insuranceDetails !== undefined) {
      customer.insuranceDetails = updates.insuranceDetails;
    }

    if (updates.notes !== undefined) {
      customer.notes = updates.notes ? updates.notes.trim() : "";
    }

    if (updates.status && ["ACTIVE", "ARCHIVED"].includes(updates.status)) {
      customer.status = updates.status;
    }

    customer.updatedAt = new Date().toISOString();
    this.persistCustomers();
    return customer;
  }

  recordSaleVisit(customerId, saleAmount, saleDate = new Date().toISOString()) {
    if (!customerId || customerId === "CUST-WALK-IN") return null;

    const customer = this.getById(customerId);
    if (!customer) return null;

    const amt = Number(saleAmount) || 0;
    customer.totalPurchases = Number(((customer.totalPurchases || 0) + amt).toFixed(2));
    customer.visitsCount = (customer.visitsCount || 0) + 1;
    customer.lastVisitAt = saleDate;
    this.persistCustomers();
    return customer;
  }

  getStats() {
    this.loadCustomers();
    const active = this.customers.filter(c => c.status !== "ARCHIVED");
    const chronic = active.filter(c => c.type === "CHRONIC" || (c.chronicConditions && c.chronicConditions.length > 0));
    const insurance = active.filter(c => c.type === "INSURANCE" || c.insuranceDetails);
    const totalSpent = active.reduce((sum, c) => sum + (c.totalPurchases || 0), 0);

    return {
      totalCustomers: active.length,
      chronicPatients: chronic.length,
      insurancePatients: insurance.length,
      walkInCustomers: active.length - chronic.length - insurance.length,
      totalPurchasesAmount: Number(totalSpent.toFixed(2))
    };
  }
}

export const customersRepository = new CustomersRepository();
