/**
 * PharmaTech — Stock Transfers & Multi-Warehouse Service
 * Coordinates inter-warehouse transfers, batch movement auditing, and location stock balance.
 */

import { apiClient } from './apiClient.js';

class TransferService {
  constructor() {
    this.warehousesCache = [];
    this.transfersCache = [];
    this.stats = {
      totalTransfers: 0,
      pendingCount: 0,
      completedCount: 0,
      cancelledCount: 0,
      totalUnitsTransferred: 0,
      warehousesCount: 0
    };
  }

  async fetchWarehouses() {
    try {
      const data = await apiClient.get('/api/warehouses');
      if (Array.isArray(data)) {
        this.warehousesCache = data;
      }
      return this.warehousesCache;
    } catch (err) {
      console.warn('[TransferService] fetchWarehouses failed:', err.message);
      return this.warehousesCache;
    }
  }

  async fetchTransfers(filters = {}) {
    try {
      const queryParams = new URLSearchParams();
      if (filters.status && filters.status !== 'ALL') queryParams.set('status', filters.status);
      if (filters.fromWarehouseId) queryParams.set('fromWarehouseId', filters.fromWarehouseId);
      if (filters.toWarehouseId) queryParams.set('toWarehouseId', filters.toWarehouseId);
      if (filters.search) queryParams.set('search', filters.search);

      const qs = queryParams.toString();
      const url = `/api/transfers${qs ? `?${qs}` : ''}`;
      const data = await apiClient.get(url);
      if (Array.isArray(data)) {
        this.transfersCache = data;
      }
      return this.transfersCache;
    } catch (err) {
      console.warn('[TransferService] fetchTransfers failed:', err.message);
      return this.transfersCache;
    }
  }

  async fetchStats() {
    try {
      const stats = await apiClient.get('/api/transfers/stats');
      if (stats) {
        this.stats = stats;
      }
      return this.stats;
    } catch (err) {
      console.warn('[TransferService] fetchStats failed:', err.message);
      return this.stats;
    }
  }

  async getTransferById(id) {
    if (!id) return null;
    try {
      return await apiClient.get(`/api/transfers/${encodeURIComponent(id)}`);
    } catch (err) {
      console.warn('[TransferService] getTransferById failed:', err.message);
      return this.transfersCache.find(t => t.id === id || t.transferNumber === id) || null;
    }
  }

  async createTransfer(transferData) {
    const created = await apiClient.post('/api/transfers', transferData);
    this.transfersCache.unshift(created);
    window.dispatchEvent(new CustomEvent('TRANSFERS_UPDATED'));
    window.dispatchEvent(new CustomEvent('STOCK_MOVEMENTS_UPDATED'));
    return created;
  }

  async completeTransfer(id, approvedBy) {
    const completed = await apiClient.post(`/api/transfers/${encodeURIComponent(id)}/complete`, {
      approvedBy
    });
    const idx = this.transfersCache.findIndex(t => t.id === id || t.transferNumber === id);
    if (idx >= 0) {
      this.transfersCache[idx] = completed;
    }
    window.dispatchEvent(new CustomEvent('TRANSFERS_UPDATED'));
    window.dispatchEvent(new CustomEvent('STOCK_MOVEMENTS_UPDATED'));
    window.dispatchEvent(new CustomEvent('CATALOG_UPDATED'));
    return completed;
  }

  async cancelTransfer(id, reason) {
    const cancelled = await apiClient.post(`/api/transfers/${encodeURIComponent(id)}/cancel`, {
      reason
    });
    const idx = this.transfersCache.findIndex(t => t.id === id || t.transferNumber === id);
    if (idx >= 0) {
      this.transfersCache[idx] = cancelled;
    }
    window.dispatchEvent(new CustomEvent('TRANSFERS_UPDATED'));
    return cancelled;
  }

  getPendingTransfersCount() {
    return this.transfersCache.filter(t => t.status === 'PENDING').length;
  }
}

export const transferService = new TransferService();
