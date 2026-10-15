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

  /**
   * Fetches supplier commercial invoices and accounts payable records.
   */
  static async fetchInvoices(filters = {}) {
    try {
      const params = new URLSearchParams();
      if (filters.supplierId) params.append('supplierId', filters.supplierId);
      if (filters.status) params.append('status', filters.status);
      if (filters.search) params.append('search', filters.search);
      const queryString = params.toString() ? `?${params.toString()}` : '';
      const invoices = await apiClient.get(`/api/purchasing/invoices${queryString}`);
      return Array.isArray(invoices) ? invoices : [];
    } catch (err) {
      console.warn('Failed to fetch supplier invoices:', err);
      return [];
    }
  }

  /**
   * Fetches a single supplier invoice by ID.
   */
  static async fetchInvoiceById(id) {
    try {
      return await apiClient.get(`/api/purchasing/invoices/${id}`);
    } catch (err) {
      console.warn(`Failed to fetch supplier invoice ${id}:`, err);
      return null;
    }
  }

  /**
   * Fetches KPI summary for accounts payable and invoices.
   */
  static async fetchInvoicesStats() {
    try {
      return await apiClient.get('/api/purchasing/invoices/stats');
    } catch (err) {
      console.warn('Failed to fetch invoices stats:', err);
      return {
        totalInvoicesCount: 0,
        unpaidCount: 0,
        partiallyPaidCount: 0,
        paidCount: 0,
        totalInvoicedAmount: 0,
        totalPaidAmount: 0,
        totalOutstandingBalance: 0,
        currency: 'SDG'
      };
    }
  }

  /**
   * Records a new supplier commercial invoice.
   */
  static async createInvoice(invoiceData) {
    try {
      const invoice = await apiClient.post('/api/purchasing/invoices', invoiceData);
      window.dispatchEvent(new CustomEvent('PURCHASING_UPDATED'));
      showToast('تم تسجيل فاتورة المورد بنجاح', `فاتورة رقم: ${invoice.invoiceNumber} — المورد: ${invoice.supplierName}`, 'success');
      return invoice;
    } catch (err) {
      showToast('خطأ في تسجيل الفاتورة', err.message || 'تعذر حفظ بيانات فاتورة المورد', 'error');
      throw err;
    }
  }

  /**
   * Records a payment against an invoice (Accounts Payable settlement).
   */
  static async payInvoice(id, paymentData) {
    try {
      const updated = await apiClient.post(`/api/purchasing/invoices/${id}/pay`, paymentData);
      window.dispatchEvent(new CustomEvent('PURCHASING_UPDATED'));
      showToast(
        'تم تسجيل دفعة السداد بنجاح 💳',
        `فاتورة ${updated.invoiceNumber} — الرصيد المتبقي: ${Number(updated.remainingBalance).toLocaleString()} ج.س (${updated.status === 'PAID' ? 'تم السداد بالكامل' : 'سداد جزئي'})`,
        'success'
      );
      return updated;
    } catch (err) {
      showToast('خطأ في سداد الفاتورة', err.message || 'تعذر تسجيل حركة السداد للمورد', 'error');
      throw err;
    }
  }
}

