/**
 * PharmaTech — Purchasing & Goods Receipt Client Service
 * Bridges UI to /api/purchasing/* REST endpoints
 */

import { apiClient } from './apiClient.js';
import { MedicineService } from './medicineService.js';
import { showToast } from '../components/Toast.js';

export class PurchasingService {
  /**
   * Fetches the registered pharmaceutical suppliers list.
   */
  static async fetchSuppliers() {
    try {
      const suppliers = await apiClient.get('/api/purchasing/suppliers');
      return Array.isArray(suppliers) ? suppliers : [];
    } catch (err) {
      console.warn('Failed to fetch suppliers from backend, using fallback:', err);
      return [];
    }
  }

  /**
   * Registers a new supplier.
   */
  static async createSupplier(supplierData) {
    try {
      const created = await apiClient.post('/api/purchasing/suppliers', supplierData);
      showToast('تم تسجيل المورد بنجاح', `تم إضافة ${created.name} إلى دليل الموردين المعتمدين`, 'success');
      return created;
    } catch (err) {
      showToast('خطأ في تسجيل المورد', err.message || 'تعذر حفظ بيانات المورد', 'error');
      throw err;
    }
  }

  /**
   * Fetches all purchase orders and shipment statuses.
   */
  static async fetchOrders() {
    try {
      const orders = await apiClient.get('/api/purchasing/orders');
      return Array.isArray(orders) ? orders : [];
    } catch (err) {
      console.warn('Failed to fetch purchase orders:', err);
      return [];
    }
  }

  /**
   * Creates a new purchase order.
   */
  static async createOrder(orderData) {
    try {
      const order = await apiClient.post('/api/purchasing/orders', orderData);
      showToast('تم إصدار أمر الشراء بنجاح', `رقم الأمر: ${order.poNumber} — بإنتظار استلام الشحنة`, 'success');
      return order;
    } catch (err) {
      showToast('خطأ في إصدار أمر الشراء', err.message || 'تعذر إنشاء أمر التوريد', 'error');
      throw err;
    }
  }

  /**
   * Authoritative Goods Receipt (GRN): Injects new batches into inventory with FEFO.
   */
  static async receiveGoods(orderId, receiptData) {
    try {
      const result = await apiClient.post(`/api/purchasing/orders/${orderId}/receive`, receiptData);
      
      // Authoritative refresh of the active catalog
      await MedicineService.fetchFromBackend();

      // Dispatch global events to inform dashboard, inventory table, and POS
      window.dispatchEvent(new CustomEvent('CATALOG_UPDATED'));
      window.dispatchEvent(new CustomEvent('PURCHASING_UPDATED'));

      showToast(
        'تم توريد واستلام الشحنة بنجاح 📦',
        `إذن استلام رقم ${result.goodsReceipt.grnNumber} — تمت إضافة الأدوية إلى المخزون بنجاح`,
        'success'
      );

      return result;
    } catch (err) {
      showToast('خطأ في إذن الاستلام', err.message || 'فشل استلام الشحنة وتوريد المخزون', 'error');
      throw err;
    }
  }
}
