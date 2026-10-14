/**
 * PharmaTech — Pharmacy Settings & Profile Client Service
 * Multi-layer persistence: Backend API + LocalStorage Durable Cache
 */

import { apiClient } from './apiClient.js';
import { showToast } from '../components/Toast.js';

const STORAGE_KEY = 'PHARMATECH_SETTINGS_CACHE';

const DEFAULT_SETTINGS = {
  pharmacyName: 'صيدلية النيلين النموذجية',
  pharmacyNameEn: 'Al-Neelain Model Pharmacy',
  branchName: 'فرع الخرطوم الرئيسي',
  licenseNumber: 'MOH-SD-KHT-2024-8841',
  taxRegistrationNumber: 'TRN-10294819',
  phone: '+249 183 772 410',
  address: 'الخرطوم — تقاطع شارع الجمهورية مع القصر',
  receiptHeaderNote: 'صيدلية النيلين النموذجية — خدمة على مدار 24 ساعة',
  receiptFooterNote: 'نتمنى لكم الشفاء العاجل · الدواء المسترد خلال 24 ساعة بالفاتورة وبحالة جيدة',
  autoPrintReceipt: true,
  offlineQuotaCapacity: 100,
  fefoStrictEnforcement: true
};

function readLocalSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return { ...DEFAULT_SETTINGS, ...parsed };
      }
    }
  } catch (err) {
    console.warn('[SettingsService] Failed to read from localStorage:', err);
  }
  return { ...DEFAULT_SETTINGS };
}

function writeLocalSettings(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn('[SettingsService] Failed to write to localStorage:', err);
  }
}

export class SettingsService {
  static _cachedSettings = readLocalSettings();

  static async fetchSettings() {
    try {
      const data = await apiClient.get('/api/settings');
      if (data && typeof data === 'object') {
        this._cachedSettings = { ...this._cachedSettings, ...data };
        writeLocalSettings(this._cachedSettings);
      }
      return this._cachedSettings;
    } catch (err) {
      console.warn('[SettingsService] Failed to fetch settings from backend, using local cached settings:', err);
      return this._cachedSettings;
    }
  }

  static getCachedSettings() {
    return this._cachedSettings;
  }

  static async saveSettings(settingsData) {
    try {
      const updated = await apiClient.post('/api/settings', settingsData);
      if (updated && typeof updated === 'object') {
        this._cachedSettings = { ...this._cachedSettings, ...updated };
      } else {
        this._cachedSettings = { ...this._cachedSettings, ...settingsData };
      }
      writeLocalSettings(this._cachedSettings);
      showToast('تم حفظ الإعدادات بنجاح', 'تم تحديث بيانات الصيدلية وإعدادات الفواتير والنظام', 'success');
      window.dispatchEvent(new CustomEvent('SETTINGS_UPDATED', { detail: this._cachedSettings }));
      return this._cachedSettings;
    } catch (err) {
      console.warn('[SettingsService] Network save failed, applying offline fallback:', err);
      // Resilient offline fallback: update local cache and state so user changes are never lost
      if (settingsData && typeof settingsData === 'object') {
        this._cachedSettings = { ...this._cachedSettings, ...settingsData };
        writeLocalSettings(this._cachedSettings);
        showToast('تم الحفظ محلياً (وضع الأوفلاين)', 'تعذر الاتصال بالخادم، تم حفظ الإعدادات على متصفحك بنجاح', 'warning');
        window.dispatchEvent(new CustomEvent('SETTINGS_UPDATED', { detail: this._cachedSettings }));
        return this._cachedSettings;
      }
      showToast('خطأ في حفظ الإعدادات', err.message || 'تعذر تحديث إعدادات النظام', 'error');
      throw err;
    }
  }
}

