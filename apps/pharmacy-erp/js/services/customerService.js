/**
 * PharmaTech — Customer & Patient Domain Service
 * Manages patient profiles, chronic disease records, allergy safety alerts, and purchasing histories.
 */

import { apiClient } from './apiClient.js';

class CustomerService {
  constructor() {
    this.customersCache = [];
    this.stats = {
      totalCustomers: 0,
      chronicPatients: 0,
      insurancePatients: 0,
      walkInCustomers: 0,
      totalPurchasesAmount: 0
    };
  }

  async fetchFromBackend(filters = {}) {
    try {
      const queryParams = new URLSearchParams();
      if (filters.search) queryParams.set('search', filters.search);
      if (filters.type && filters.type !== 'ALL') queryParams.set('type', filters.type);
      if (filters.status) queryParams.set('status', filters.status);
      if (filters.limit) queryParams.set('limit', filters.limit);

      const qs = queryParams.toString();
      const url = `/api/customers${qs ? `?${qs}` : ''}`;
      const data = await apiClient.get(url);
      if (Array.isArray(data)) {
        this.customersCache = data;
      }
      return this.customersCache;
    } catch (err) {
      console.warn('[CustomerService] Backend fetch failed:', err.message);
      return this.customersCache;
    }
  }

  async fetchStats() {
    try {
      const stats = await apiClient.get('/api/customers/stats');
      if (stats) {
        this.stats = stats;
      }
      return this.stats;
    } catch (err) {
      console.warn('[CustomerService] Stats fetch failed:', err.message);
      return this.stats;
    }
  }

  async getCustomerById(id) {
    if (!id) return null;
    try {
      return await apiClient.get(`/api/customers/${encodeURIComponent(id)}`);
    } catch (err) {
      console.warn('[CustomerService] Get customer failed:', err.message);
      return this.customersCache.find(c => c.id === id) || null;
    }
  }

  async createCustomer(customerData) {
    const created = await apiClient.post('/api/customers', customerData);
    this.customersCache.unshift(created);
    window.dispatchEvent(new CustomEvent('CUSTOMERS_UPDATED'));
    return created;
  }

  async updateCustomer(id, updates) {
    const updated = await apiClient.put(`/api/customers/${encodeURIComponent(id)}`, updates);
    const idx = this.customersCache.findIndex(c => c.id === id);
    if (idx >= 0) {
      this.customersCache[idx] = updated;
    }
    window.dispatchEvent(new CustomEvent('CUSTOMERS_UPDATED'));
    return updated;
  }

  searchLocal(query) {
    if (!query || !query.trim()) return this.customersCache.slice(0, 15);
    const q = query.trim().toLowerCase();
    return this.customersCache.filter(c => 
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.phone && c.phone.includes(q)) ||
      (c.id && c.id.toLowerCase().includes(q)) ||
      (Array.isArray(c.chronicConditions) && c.chronicConditions.some(cond => cond.toLowerCase().includes(q)))
    ).slice(0, 15);
  }
}

export const customerService = new CustomerService();
