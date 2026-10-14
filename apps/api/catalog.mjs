import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, "../data");
const MEDICINES_FILE = path.join(DATA_DIR, "medicines.json");

const INITIAL_CATALOG = [
  {
    id: "MED-001",
    sku: "SKU-PAN-500",
    barcode: "628100100101",
    name: "Panadol Extra 500mg/65mg",
    nameAr: "بنادول إكسترا",
    category: "مسكنات",
    unit: "علبة",
    price: 4500,
    prescriptionRequired: false,
    batches: [
      { batchNumber: "BATCH-2026-A2", expiryDate: "2026-11-30", availableQuantity: 80 },
      { batchNumber: "BATCH-2027-A1", expiryDate: "2027-08-15", availableQuantity: 168 }
    ]
  },
  {
    id: "MED-002",
    sku: "SKU-AUG-1000",
    barcode: "628100100102",
    name: "Augmentin 1g Tablets",
    nameAr: "أوجمنتين 1 جم",
    category: "مضادات حيوية",
    unit: "شريط",
    price: 18500,
    prescriptionRequired: true,
    batches: [
      { batchNumber: "BATCH-AUG-99", expiryDate: "2026-11-10", availableQuantity: 12 },
      { batchNumber: "BATCH-AUG-102", expiryDate: "2027-04-20", availableQuantity: 68 }
    ]
  },
  {
    id: "MED-003",
    sku: "SKU-VTC-1000",
    barcode: "628100100103",
    name: "Vitamin C 1000mg Effervescent",
    nameAr: "فيتامين سي 1000 مجم فوار",
    category: "مكملات",
    unit: "أنبوبة",
    price: 6800,
    prescriptionRequired: false,
    batches: [
      { batchNumber: "BATCH-VTC-44", expiryDate: "2027-11-10", availableQuantity: 156 }
    ]
  },
  {
    id: "MED-004",
    sku: "SKU-GLU-500",
    barcode: "628100100104",
    name: "Glucophage 500mg Metformin",
    nameAr: "جلوكوفاج 500 مجم",
    category: "السكري",
    unit: "علبة",
    price: 8400,
    prescriptionRequired: true,
    batches: [
      { batchNumber: "BATCH-GLU-12", expiryDate: "2026-11-05", availableQuantity: 24 },
      { batchNumber: "BATCH-GLU-15", expiryDate: "2027-03-12", availableQuantity: 60 }
    ]
  },
  {
    id: "MED-005",
    sku: "SKU-ZYR-010",
    barcode: "628100100105",
    name: "Zyrtec 10mg Cetirizine",
    nameAr: "زيرتك 10 مجم",
    category: "الحساسية",
    unit: "شريط",
    price: 3800,
    prescriptionRequired: false,
    batches: [
      { batchNumber: "BATCH-ZYR-08", expiryDate: "2028-01-22", availableQuantity: 120 }
    ]
  },
  {
    id: "MED-006",
    sku: "SKU-BRU-400",
    barcode: "628100100106",
    name: "Brufen 400mg Ibuprofen",
    nameAr: "بروفين 400 مجم",
    category: "مسكنات",
    unit: "علبة",
    price: 5200,
    prescriptionRequired: false,
    batches: [
      { batchNumber: "BATCH-BRU-19", expiryDate: "2027-06-12", availableQuantity: 18 }
    ]
  },
  {
    id: "MED-007",
    sku: "SKU-OME-020",
    barcode: "628100100107",
    name: "Omeprazole 20mg Capsules",
    nameAr: "أوميبرازول 20 مجم",
    category: "المعدة",
    unit: "علبة",
    price: 7100,
    prescriptionRequired: false,
    batches: [
      { batchNumber: "BATCH-OME-31", expiryDate: "2027-09-01", availableQuantity: 92 }
    ]
  },
  {
    id: "MED-008",
    sku: "SKU-VEN-100",
    barcode: "628100100108",
    name: "Ventolin Inhaler 100mcg",
    nameAr: "فنتولين بخاخ 100 ميكروغرام",
    category: "الجهاز التنفسي",
    unit: "عبوة",
    price: 12400,
    prescriptionRequired: true,
    batches: [
      { batchNumber: "BATCH-VEN-04", expiryDate: "2026-12-15", availableQuantity: 34 }
    ]
  },
  {
    id: "MED-009",
    sku: "SKU-LAN-100",
    barcode: "628100100109",
    name: "Lantus SoloStar Insulin Glargine",
    nameAr: "لانتوس سولوستار إنسولين",
    category: "السكري",
    unit: "قلم",
    price: 36000,
    prescriptionRequired: true,
    batches: [
      { batchNumber: "BATCH-LAN-81", expiryDate: "2027-02-28", availableQuantity: 25 }
    ]
  },
  {
    id: "MED-010",
    sku: "SKU-CEF-1000",
    barcode: "628100100110",
    name: "Ceftriaxone 1g Injection Vial",
    nameAr: "سفترياكسون 1 جم حقن",
    category: "مضادات حيوية",
    unit: "فيال",
    price: 9500,
    prescriptionRequired: true,
    batches: [
      { batchNumber: "BATCH-CEF-07", expiryDate: "2027-10-14", availableQuantity: 45 }
    ]
  },
  {
    id: "MED-011",
    sku: "SKU-COA-020",
    barcode: "628100100111",
    name: "Coartem 20/120mg Artemether/Lumefantrine",
    nameAr: "كوارتيم لعلاج الملاريا",
    category: "الملاريا",
    unit: "شريط",
    price: 8900,
    prescriptionRequired: true,
    batches: [
      { batchNumber: "BATCH-COA-52", expiryDate: "2027-05-30", availableQuantity: 70 }
    ]
  },
  {
    id: "MED-012",
    sku: "SKU-AML-005",
    barcode: "628100100112",
    name: "Amlodipine 5mg Tablets",
    nameAr: "أملوديبين 5 مجم للضغط",
    category: "الضغط والقلب",
    unit: "علبة",
    price: 4900,
    prescriptionRequired: true,
    batches: [
      { batchNumber: "BATCH-AML-11", expiryDate: "2028-03-01", availableQuantity: 110 }
    ]
  }
];

class CatalogRepository {
  constructor() {
    this.products = this.loadProducts();
  }

  loadProducts() {
    try {
      if (fs.existsSync(MEDICINES_FILE)) {
        const raw = fs.readFileSync(MEDICINES_FILE, "utf-8");
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (err) {
      console.warn("[CatalogRepository] Failed to read medicines from disk:", err.message);
    }
    const initial = JSON.parse(JSON.stringify(INITIAL_CATALOG));
    this.persistProducts(initial);
    return initial;
  }

  persistProducts(productsList = this.products) {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(MEDICINES_FILE, JSON.stringify(productsList, null, 2), "utf-8");
    } catch (err) {
      console.warn("[CatalogRepository] Failed to write medicines to disk:", err.message);
    }
  }

  getAll() {
    const today = new Date().toISOString().split("T")[0];
    return this.products.map(p => {
      const totalStock = p.batches.reduce((sum, b) => sum + b.availableQuantity, 0);
      const validBatches = p.batches
        .filter(b => b.availableQuantity > 0 && b.expiryDate >= today)
        .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));
      
      const fefoBatch = validBatches[0] || null;
      let status = "available";
      if (totalStock === 0) status = "out_of_stock";
      else if (totalStock < 20) status = "low";
      else if (fefoBatch && fefoBatch.expiryDate < "2026-12-01") status = "expiring";

      return {
        ...p,
        totalStock,
        fefoBatch,
        status
      };
    });
  }

  getById(id) {
    return this.products.find(p => p.id === id || p.sku === id || p.barcode === id) || null;
  }

  /**
   * Strictly resolves the FEFO batch for a product according to domain rules.
   */
  selectFefoBatch(product) {
    if (!product.batches || product.batches.length === 0) return null;
    const today = new Date().toISOString().split("T")[0];
    const validBatches = product.batches
      .filter(b => b.availableQuantity > 0 && b.expiryDate >= today)
      .slice()
      .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));
    return validBatches[0] || null;
  }

  /**
   * Atomically deducts quantity from a specific batch.
   */
  deductBatchStock(productId, batchNumber, quantity) {
    const product = this.getById(productId);
    if (!product) throw new Error(`PRODUCT_NOT_FOUND: ${productId}`);

    const batch = product.batches.find(b => b.batchNumber === batchNumber);
    if (!batch) throw new Error(`BATCH_NOT_FOUND: Batch ${batchNumber} not found for product ${product.name}`);

    const today = new Date().toISOString().split("T")[0];
    if (batch.expiryDate < today) {
      throw new Error(`BATCH_EXPIRED: Batch ${batchNumber} expired on ${batch.expiryDate}`);
    }

    if (batch.availableQuantity < quantity) {
      throw new Error(`INSUFFICIENT_BATCH_STOCK: Batch ${batchNumber} only has ${batch.availableQuantity} units`);
    }

    batch.availableQuantity -= quantity;
    this.persistProducts();
    return { product, batch, remainingQuantity: batch.availableQuantity };
  }

  /**
   * Restores quantity to a batch (used during sale reversal / refund).
   */
  restoreBatchStock(productId, batchNumber, quantity) {
    const product = this.getById(productId);
    if (!product) return;
    const batch = product.batches.find(b => b.batchNumber === batchNumber);
    if (batch) {
      batch.availableQuantity += quantity;
      this.persistProducts();
    }
  }

  /**
   * Adjusts batch stock (Physical Inventory Audit, Damage, Waste, Correction).
   */
  adjustBatchStock(productId, batchNumber, newQuantity, reason = "PHYSICAL_AUDIT") {
    const product = this.getById(productId);
    if (!product) throw new Error(`PRODUCT_NOT_FOUND: Product ${productId} not found`);

    const batch = product.batches.find(b => b.batchNumber === batchNumber);
    if (!batch) throw new Error(`BATCH_NOT_FOUND: Batch ${batchNumber} not found for product ${product.name}`);

    const qty = Number(newQuantity);
    if (isNaN(qty) || qty < 0) {
      throw new Error("INVALID_QUANTITY: Stock quantity cannot be negative");
    }

    const previousQuantity = batch.availableQuantity;
    batch.availableQuantity = qty;
    this.persistProducts();

    return {
      productId: product.id,
      productName: product.name,
      nameAr: product.nameAr,
      batchNumber: batch.batchNumber,
      previousQuantity,
      newQuantity: qty,
      difference: qty - previousQuantity,
      reason,
      adjustedAt: new Date().toISOString()
    };
  }

  /**
   * Replenishes an existing batch or registers a new FEFO batch (used during Goods Receipt).
   */
  addOrReplenishBatch(productId, batchNumber, expiryDate, quantity) {
    const product = this.getById(productId);
    if (!product) throw new Error(`PRODUCT_NOT_FOUND: Product ${productId} not found`);

    const qty = Number(quantity);
    if (isNaN(qty) || qty <= 0) {
      throw new Error("INVALID_QUANTITY: Replenishment quantity must be greater than zero");
    }

    if (!batchNumber || typeof batchNumber !== "string") {
      throw new Error("INVALID_BATCH_NUMBER: Batch number is required");
    }

    if (!expiryDate || typeof expiryDate !== "string") {
      throw new Error("INVALID_EXPIRY_DATE: Expiry date is required");
    }

    const today = new Date().toISOString().split("T")[0];
    if (expiryDate < today) {
      throw new Error(`BATCH_EXPIRED: Cannot receive expired batch (${expiryDate})`);
    }

    let batch = product.batches.find(b => b.batchNumber === batchNumber);
    if (batch) {
      batch.availableQuantity += qty;
      batch.expiryDate = expiryDate; // sync expiry date if updated
    } else {
      batch = {
        batchNumber: batchNumber.trim(),
        expiryDate: expiryDate.trim(),
        availableQuantity: qty
      };
      product.batches.push(batch);
    }

    // Sort batches by expiry date for FEFO consistency
    product.batches.sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));
    this.persistProducts();

    return { product, batch, addedQuantity: qty };
  }

  /**
   * Adds a new product or batch.
   */
  addProduct(input) {
    const existing = this.getById(input.id || input.barcode);
    if (existing) {
      throw new Error("PRODUCT_ALREADY_EXISTS");
    }

    const newId = input.id || `MED-${String(this.products.length + 1).padStart(3, "0")}`;
    const newProduct = {
      id: newId,
      sku: input.sku || `SKU-${newId}`,
      barcode: input.barcode || String(628100100000 + this.products.length + 1),
      name: input.name,
      nameAr: input.nameAr || input.name,
      category: input.category || "عام",
      unit: input.unit || "علبة",
      price: Number(input.price),
      prescriptionRequired: Boolean(input.prescriptionRequired),
      batches: [
        {
          batchNumber: input.batchNumber || `BATCH-${Date.now().toString().slice(-4)}`,
          expiryDate: input.expiryDate || "2027-12-31",
          availableQuantity: Number(input.stock || 100)
        }
      ]
    };

    this.products.unshift(newProduct);
    this.persistProducts();
    return newProduct;
  }

  deleteProduct(id) {
    const index = this.products.findIndex(p => p.id === id || p.barcode === id || p.sku === id);
    if (index === -1) return false;
    this.products.splice(index, 1);
    this.persistProducts();
    return true;
  }
}

export const catalogRepository = new CatalogRepository();
