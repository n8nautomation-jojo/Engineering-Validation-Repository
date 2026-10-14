/**
 * PharmaTech — Financial & Operational Reports Service
 * Bridges UI to /api/reports/* endpoints
 */

import { apiClient } from './apiClient.js';

export class ReportsService {
  static _buildQuery(startDate, endDate) {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    const qs = params.toString();
    return qs ? `?${qs}` : '';
  }

  static async fetchFinancialSummary(startDate = null, endDate = null) {
    try {
      const q = this._buildQuery(startDate, endDate);
      return await apiClient.get(`/api/reports/summary${q}`);
    } catch (err) {
      console.warn('Failed to fetch financial summary:', err);
      return null;
    }
  }

  static async fetchCategoryAnalytics(startDate = null, endDate = null) {
    try {
      const q = this._buildQuery(startDate, endDate);
      return await apiClient.get(`/api/reports/categories${q}`);
    } catch (err) {
      console.warn('Failed to fetch category analytics:', err);
      return null;
    }
  }

  static async fetchInventoryHealth() {
    try {
      return await apiClient.get('/api/reports/inventory');
    } catch (err) {
      console.warn('Failed to fetch inventory health report:', err);
      return null;
    }
  }

  static async fetchTopSellingProducts(startDate = null, endDate = null) {
    try {
      const q = this._buildQuery(startDate, endDate);
      return await apiClient.get(`/api/reports/top-products${q}`);
    } catch (err) {
      console.warn('Failed to fetch top selling products:', err);
      return [];
    }
  }
}
