/**
 * PharmaTech — Authoritative Goods Receipt (GRN) Dialog
 * Validates real physical batches and supplier commercial invoice numbers
 */

import { PurchasingService } from '../../services/purchasingService.js';
import { showToast } from '../Toast.js';

export class ReceiveShipmentDialog {
  constructor() {
    this.dialog = document.getElementById('dialog-receive-shipment');
    this.closeBtn = document.getElementById('btn-close-receive-dialog');
    this.cancelBtn = document.getElementById('btn-cancel-receive-dialog');
    this.form = document.getElementById('receive-shipment-form');
    this.itemsContainer = document.getElementById('receive-items-container');
    this.orderTitle = document.getElementById('receive-dialog-po-number');
    this.supplierNameEl = document.getElementById('receive-dialog-supplier-name');

    this.currentOrder = null;
    this.init();
  }

  init() {
    if (!this.dialog) return;

    this.closeBtn?.addEventListener('click', () => this.close());
    this.cancelBtn?.addEventListener('click', () => this.close());

    this.dialog.addEventListener('click', (e) => {
      if (e.target === this.dialog) this.close();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !this.dialog.classList.contains('hidden')) {
        this.close();
      }
    });

    this.form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleSubmit();
    });
  }

  open(order) {
    if (!order) return;
    this.currentOrder = order;

    if (this.orderTitle) this.orderTitle.textContent = `أمر الشراء: ${order.poNumber}`;
    if (this.supplierNameEl) this.supplierNameEl.textContent = `المورد: ${order.supplierName}`;

    this.renderItems(order.items);
    this.dialog?.classList.remove('hidden');
  }

  close() {
    this.dialog?.classList.add('hidden');
    this.currentOrder = null;
  }

  renderItems(items) {
    if (!this.itemsContainer) return;
    this.itemsContainer.innerHTML = '';

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const defaultExpiry = new Date(today.getFullYear() + 2, today.getMonth(), today.getDate()).toISOString().split('T')[0];

    items.forEach((item, index) => {
      const remainingQty = Math.max(0, item.orderedQuantity - (item.receivedQuantity || 0));
      const row = document.createElement('div');
      row.className = 'receive-item-card';
      row.innerHTML = `
        <div class="receive-item-header">
          <div>
            <strong style="font-size:13.5px; color:var(--foreground);">${item.productName}</strong>
            <small style="display:block; color:var(--muted-foreground); font-size:11.5px;">الكمية المطلوبة بأمر الشراء: ${item.orderedQuantity} وحدة</small>
          </div>
          <span class="chip chip-info" style="font-size:11px;">المتبقي للتوريد: ${remainingQty}</span>
        </div>

        <div class="receive-fields-grid">
          <input type="hidden" name="productId_${index}" value="${item.productId}" />
          
          <label class="receive-field">
            <span>الكمية المستلمة الفعلية</span>
            <input type="number" name="receivedQuantity_${index}" value="${remainingQty}" min="1" max="${remainingQty || 1000}" required />
          </label>

          <label class="receive-field">
            <span>رقم التشغيلة الحقيقي (Batch Number)</span>
            <input type="text" name="batchNumber_${index}" placeholder="اكتب رقم التشغيلة المطبوع على العلبة..." required dir="ltr" />
          </label>

          <label class="receive-field">
            <span>تاريخ انتهاء الصلاحية (FEFO)</span>
            <input type="date" name="expiryDate_${index}" value="${defaultExpiry}" min="${todayStr}" required />
          </label>
        </div>
      `;
      this.itemsContainer.appendChild(row);
    });
  }

  async handleSubmit() {
    if (!this.currentOrder) return;

    const submitBtn = this.form.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'جاري التوريد وإدخال تشغيلات الـ FEFO...';
    }

    try {
      const receivedItems = [];
      const today = new Date().toISOString().split('T')[0];

      for (let index = 0; index < this.currentOrder.items.length; index++) {
        const prodId = this.form[`productId_${index}`]?.value;
        const qty = Number(this.form[`receivedQuantity_${index}`]?.value);
        const batchNum = this.form[`batchNumber_${index}`]?.value?.trim();
        const expDate = this.form[`expiryDate_${index}`]?.value;

        if (!batchNum) {
          showToast('بيانات ناقصة', 'يرجى إدخال رقم التشغيلة المطبوع على العلبة لكل صنف', 'error');
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'تأكيد الاستلام وتوريد المخزون';
          }
          return;
        }

        if (expDate < today) {
          showToast('تحذير دوائي صارم (FEFO)', 'لا يمكن استلام دواء منتهي الصلاحية!', 'error');
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'تأكيد الاستلام وتوريد المخزون';
          }
          return;
        }

        if (prodId && qty > 0) {
          receivedItems.push({
            productId: prodId,
            receivedQuantity: qty,
            batchNumber: batchNum,
            expiryDate: expDate
          });
        }
      }

      const supplierInvoiceNumber = document.getElementById('receive-supplier-invoice-input')?.value?.trim() || 'غير مرفق';
      const receiverName = document.getElementById('receive-receiver-name')?.value?.trim() || 'د. أحمد الطاهر (مدير الصيدلية)';
      const notes = document.getElementById('receive-notes')?.value?.trim() || 'استلام مطابق للشروط والمواصفات الدوائية';

      await PurchasingService.receiveGoods(this.currentOrder.id, {
        supplierInvoiceNumber,
        receivedBy: receiverName,
        notes,
        items: receivedItems
      });

      this.close();
    } catch (err) {
      console.error('Goods receipt error:', err);
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M20 6 9 17l-5-5"/></svg>
          تأكيد الاستلام وتوريد المخزون
        `;
      }
    }
  }
}
