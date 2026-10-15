/**
 * PharmaTech — Medicine & Inventory Domain Service
 * Encapsulates FEFO filtering, inventory validation, CSV export & live backend synchronization
 */

import { appStore } from '../state/store.js';
import { apiClient } from './apiClient.js';

export const MedicineService = {
  rawProducts: [],

  async fetchFromBackend() {
    try {
      const products = await apiClient.get('/api/products');
      this.rawProducts = products;

      const formatted = products.map((p, index) => {
        const fefo = p.fefoBatch || (p.batches && p.batches[0]) || { batchNumber: 'BATCH-GEN-01', expiryDate: '2027-12-31' };
        const totalStock = typeof p.totalStock === 'number' ? p.totalStock : (p.batches || []).reduce((s, b) => s + b.availableQuantity, 0);

        return {
          id: p.id,
          sku: p.sku || `SKU-${p.id}`,
          barcode: p.barcode || '',
          name: p.nameAr || p.name,
          generic: p.name,
          category: p.category || 'عام',
          stock: totalStock,
          maxStock: Math.max(100, totalStock * 2),
          price: Number(p.price),
          expiry: fefo.expiryDate,
          batch: fefo.batchNumber,
          batches: p.batches || [],
          prescriptionRequired: Boolean(p.prescriptionRequired),
          status: p.status || (totalStock === 0 ? 'out_of_stock' : totalStock < 20 ? 'low' : 'available'),
          fefoPriority: index < 4 ? 1 : index < 8 ? 2 : 3
        };
      });

      appStore.setMedicines(formatted);
      return formatted;
    } catch (err) {
      console.warn('[MedicineService] Backend fetch fallback to cached/initial store:', err.message);
      return appStore.medicines;
    }
  },

  getFiltered() {
    const q = appStore.query;
    const filter = appStore.statusFilter;

    return appStore.medicines.filter(m => {
      const matchQuery = !q ||
        m.name.toLowerCase().includes(q) ||
        (m.generic && m.generic.toLowerCase().includes(q)) ||
        (m.category && m.category.toLowerCase().includes(q)) ||
        (m.batch && m.batch.toLowerCase().includes(q)) ||
        (m.barcode && m.barcode.includes(q));

      let matchStatus = true;
      if (filter !== 'all') {
        matchStatus = m.status === filter;
      }

      return matchQuery && matchStatus;
    });
  },

  getById(id) {
    return appStore.medicines.find(m => m.id === id || m.barcode === id) || null;
  },

  async add(data) {
    const payload = {
      name: data.generic || data.name,
      nameAr: data.name,
      category: data.category,
      price: Number(data.price),
      stock: Number(data.stock),
      expiryDate: data.expiry,
      batchNumber: data.batch,
      prescriptionRequired: false
    };

    try {
      await apiClient.post('/api/products', payload);
      await this.fetchFromBackend();
    } catch (err) {
      console.warn('[MedicineService] Falling back to local add:', err.message);
      const newMed = {
        id: `MED-${String(appStore.medicines.length + 1).padStart(3, '0')}`,
        name: data.name,
        generic: data.generic,
        category: data.category,
        stock: Number(data.stock),
        maxStock: Number(data.stock) * 2,
        price: Number(data.price),
        expiry: data.expiry,
        batch: data.batch,
        batches: [{ batchNumber: data.batch, expiryDate: data.expiry, availableQuantity: Number(data.stock) }],
        status: Number(data.stock) < 20 ? 'low' : 'available',
        fefoPriority: 1
      };
      appStore.medicines.unshift(newMed);
      appStore.notify('MEDICINE_ADDED', newMed);
    }
    window.dispatchEvent(new CustomEvent('CATALOG_UPDATED'));
  },

  async delete(id) {
    const med = this.getById(id);
    if (!med) return false;

    try {
      await apiClient.delete(`/api/products/${id}`);
      await this.fetchFromBackend();
    } catch (err) {
      console.warn('[MedicineService] Backend delete fallback:', err.message);
      this.rawProducts = this.rawProducts.filter(m => m.id !== id);
      appStore.medicines = appStore.medicines.filter(m => m.id !== id);
      appStore.notify('MEDICINE_DELETED', med);
    }

    window.dispatchEvent(new CustomEvent('CATALOG_UPDATED'));
    return true;
  },

  async adjustStock(productId, batchNumber, newQuantity, reason = 'PHYSICAL_AUDIT') {
    const payload = {
      productId,
      batchNumber,
      newQuantity: Number(newQuantity),
      reason
    };

    const res = await apiClient.post('/api/products/adjust', payload);
    await this.fetchFromBackend();
    window.dispatchEvent(new CustomEvent('CATALOG_UPDATED'));
    window.dispatchEvent(new CustomEvent('STATS_UPDATED'));
    return res;
  },

  exportCSV() {
    const list = this.getFiltered();
    const csvContent = '\uFEFF' + [
      'الدواء,الاسم العلمي,الفئة,الكمية,السعر_ج_س,تاريخ_الانتهاء,التشغيلة',
      ...list.map(m => `"${m.name}","${m.generic}","${m.category}",${m.stock},${m.price},"${m.expiry}","${m.batch}"`)
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `PharmaTech-Inventory-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    return list.length;
  },

  async fetchStockMovements(filters = {}) {
    try {
      const params = new URLSearchParams();
      if (filters.productId) params.set('productId', filters.productId);
      if (filters.batchNumber) params.set('batchNumber', filters.batchNumber);
      if (filters.type && filters.type !== 'ALL') params.set('type', filters.type);
      if (filters.direction && filters.direction !== 'ALL') params.set('direction', filters.direction);
      if (filters.search) params.set('search', filters.search);
      if (filters.limit) params.set('limit', filters.limit);

      const qs = params.toString() ? `?${params.toString()}` : '';
      return await apiClient.get(`/api/inventory/movements${qs}`);
    } catch (err) {
      console.warn('[MedicineService] fetchStockMovements failed:', err.message);
      return [];
    }
  },

  async fetchStockMovementsStats() {
    try {
      return await apiClient.get('/api/inventory/movements/stats');
    } catch (err) {
      console.warn('[MedicineService] fetchStockMovementsStats failed:', err.message);
      return { totalMovements: 0, totalInUnits: 0, totalOutUnits: 0, netStockChange: 0 };
    }
  }
};
