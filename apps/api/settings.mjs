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
const SETTINGS_FILE = DATA_DIR ? path.join(DATA_DIR, "settings.json") : "";

const DEFAULT_SETTINGS = {
  pharmacyName: "صيدلية النيلين النموذجية",
  pharmacyNameEn: "Al-Neelain Model Pharmacy",
  branchId: "brn-khartoum-01",
  branchName: "فرع الخرطوم الرئيسي",
  licenseNumber: "MOH-SD-KHT-2024-8841",
  taxRegistrationNumber: "TRN-10294819",
  phone: "+249 183 772 410",
  mobile: "+249 912 345 678",
  email: "info@alneelain-pharma.sd",
  address: "الخرطوم — تقاطع شارع الجمهورية مع القصر",
  currency: "SDG",
  currencySymbol: "ج.س",
  taxRate: 0,
  taxExempt: true,
  receiptHeaderNote: "صيدلية النيلين النموذجية — خدمة على مدار 24 ساعة",
  receiptFooterNote: "نتمنى لكم الشفاء العاجل · الدواء المسترد خلال 24 ساعة بالفاتورة وبحالة جيدة",
  printerType: "THERMAL_80MM",
  autoPrintReceipt: true,
  offlineQuotaCapacity: 100,
  fefoStrictEnforcement: true,
  updatedAt: new Date().toISOString()
};

class SettingsRepository {
  constructor() {
    this.settings = this.loadSettings();
  }

  loadSettings() {
    try {
      if (SETTINGS_FILE && fs && typeof fs.existsSync === "function" && fs.existsSync(SETTINGS_FILE)) {
        const raw = fs.readFileSync(SETTINGS_FILE, "utf-8");
        const parsed = JSON.parse(raw);
        return { ...DEFAULT_SETTINGS, ...parsed };
      }
    } catch (err) {
      console.warn("[SettingsRepository] Failed to read persistent settings:", err.message);
    }
    return { ...DEFAULT_SETTINGS };
  }

  persistSettings() {
    if (!SETTINGS_FILE || !DATA_DIR || !fs || typeof fs.writeFileSync !== "function") return;
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(this.settings, null, 2), "utf-8");
    } catch (err) {
      console.warn("[SettingsRepository] Failed to write persistent settings:", err.message);
    }
  }

  getSettings() {
    return this.settings;
  }

  updateSettings(updates) {
    if (!updates || typeof updates !== "object") {
      throw new Error("INVALID_SETTINGS_DATA");
    }

    this.settings = {
      ...this.settings,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.persistSettings();

    return this.settings;
  }
}

export const settingsRepository = new SettingsRepository();
