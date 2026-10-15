/**
 * PharmaTech — Sales Orders & Prescription Reservations Domain Service
 * Manages advance reservations, chronic patient refills, and POS fulfillment lifecycle.
 */

import { apiClient } from './apiClient.js';

class SalesOrderService {
  constructor() {
    this.ordersCache = [];
    this.stats = {
      totalOrders: 0,
      confirmedCount: 0,
      fulfilledCount: 0,
      cancelledCount: 0,
      pendingRevenue: 0
    };
  }

  async fetchOrders(filters = {}) {
    try {
      const queryParams = new URLSearchParams();
      if (filters.status && filters.status !== 'ALL') queryParams.set('status', filters.status);
      if (filters.customerId) queryParams.set('customerId', filters.customerId);
      if (filters.search) queryParams.set('search', filters.search);

      const qs = queryParams.toString();
      const url = `/api/sales-orders${qs ? `?${qs}` : ''}`;
      const data = await apiClient.get(url);
      if (Array.isArray(data)) {
        this.ordersCache = data;
      }
      return this.ordersCache;
    } catch (err) {
      console.warn('[SalesOrderService] fetchOrders failed:', err.message);
      return this.ordersCache;
    }
  }

  async fetchStats() {
    try {
      const stats = await apiClient.get('/api/sales-orders/stats');
      if (stats) {
        this.stats = stats;
      }
      return this.stats;
    } catch (err) {
      console.warn('[SalesOrderService] fetchStats failed:', err.message);
      return this.stats;
    }
  }

  async getOrderById(id) {
    if (!id) return null;
    try {
      return await apiClient.get(`/api/sales-orders/${encodeURIComponent(id)}`);
    } catch (err) {
      console.warn('[SalesOrderService] getOrderById failed:', err.message);
      return this.ordersCache.find(o => o.id === id || o.orderNumber === id) || null;
    }
  }

  async createOrder(orderData) {
    const created = await apiClient.post('/api/sales-orders', orderData);
    this.ordersCache.unshift(created);
    window.dispatchEvent(new CustomEvent('SALES_ORDERS_UPDATED'));
    return created;
  }

  async fulfillOrder(id, invoiceNumber) {
    const fulfilled = await apiClient.post(`/api/sales-orders/${encodeURIComponent(id)}/fulfill`, {
      invoiceNumber
    });
    const idx = this.ordersCache.findIndex(o => o.id === id || o.orderNumber === id);
    if (idx >= 0) {
      this.ordersCache[idx] = fulfilled;
    }
    window.dispatchEvent(new CustomEvent('SALES_ORDERS_UPDATED'));
    return fulfilled;
  }

  async cancelOrder(id, reason) {
    const cancelled = await apiClient.post(`/api/sales-orders/${encodeURIComponent(id)}/cancel`, {
      reason
    });
    const idx = this.ordersCache.findIndex(o => o.id === id || o.orderNumber === id);
    if (idx >= 0) {
      this.ordersCache[idx] = cancelled;
    }
    window.dispatchEvent(new CustomEvent('SALES_ORDERS_UPDATED'));
    return cancelled;
  }

  getPendingOrdersCount() {
    return this.ordersCache.filter(o => o.status === 'CONFIRMED').length;
  }
}

export const salesOrderService = new SalesOrderService();
