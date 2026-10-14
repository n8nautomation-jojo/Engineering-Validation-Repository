/**
 * PharmaTech — Enterprise Purchase Order Generator Dialog
 * Supports pre-selecting suppliers and 1-Click Auto-Import for low stock medicines
 */

import { PurchasingService } from '../../services/purchasingService.js';
import { MedicineService } from '../../services/medicineService.js';
import { showToast } from '../Toast.js';

export class NewOrderDialog {
  constructor() {
    this.dialog = document.getElementById('dialog-new-order');
    this.closeBtn = document.getElementById('btn-close-new-order-dialog');
    this.cancelBtn = document.getElementById('btn-cancel-new-order-dialog');
    this.form = document.getElementById('new-order-form');
    this.supplierSelect = document.getElementById('new-order-supplier-select');
    this.itemsTableBody = document.getElementById('new-order-items-tbody');
    this.addItemBtn = document.getElementById('btn-new-order-add-item');
    this.importLowStockBtn = document.getElementById('btn-new-order-import-low-stock');
    this.orderTotalEl = document.getElementById('new-order-total-amount');

    this.products = [];
    this.suppliers = [];
    this.itemRowsCount = 0;

    this.init();
  }

  init() {
    if (!this.dialog) return;

    this.closeBtn?.addEventListener('click', () => this.close());
    this.cancelBtn?.addEventListener('click', () => this.close());

    this.dialog.addEventListener('click', (e) => {
      if (e.target === this.dialog) this.close();
    });

    this.addItemBtn?.addEventListener('click', () => this.addItemRow());
    this.importLowStockBtn?.addEventListener('click', () => this.autoImportLowStock());

    this.form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleSubmit();
    });
  }

  async open(preselectedSupplierId = null, preselectedProductId = null) {
    try {
      this.suppliers = await PurchasingService.fetchSuppliers();
      this.products = await MedicineService.fetchFromBackend();
      this.populateSuppliers(preselectedSupplierId);

      if (this.itemsTableBody) this.itemsTableBody.innerHTML = '';
      this.itemRowsCount = 0;

      if (preselectedProductId) {
        this.addItemRow(preselectedProductId, 50);
      } else {
        this.addItemRow(); // Start with one initial row
      }
      this.updateTotal();

      const expectedDateInput = document.getElementById('new-order-delivery-date');
      if (expectedDateInput) {
        const d = new Date(Date.now() + 3 * 86400000);
        expectedDateInput.value = d.toISOString().split('T')[0];
      }

      this.dialog?.classList.remove('hidden');
    } catch (err) {
      console.error('Error opening new order dialog:', err);
    }
  }

  close() {
    this.dialog?.classList.add('hidden');
    this.form?.reset();
  }

  populateSuppliers(selectedId = null) {
    if (!this.supplierSelect) return;
    this.supplierSelect.innerHTML = '<option value="">-- اختر المورد المعتمد --</option>';
    this.suppliers.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = `${s.name} (${s.contactPerson || 'مسؤول المبيعات'})`;
      if (selectedId && s.id === selectedId) {
        opt.selected = true;
      }
      this.supplierSelect.appendChild(opt);
    });
  }

  addItemRow(productId = '', quantity = 50, customCost = null) {
    if (!this.itemsTableBody) return;
    const rowIndex = this.itemRowsCount++;

    const tr = document.createElement('tr');
    tr.id = `new-order-row-${rowIndex}`;

    let productOptions = '<option value="">-- اختر الصنف --</option>';
    this.products.forEach(p => {
      const isSelected = p.id === productId ? 'selected' : '';
      productOptions += `<option value="${p.id}" data-price="${p.price}" ${isSelected}>${p.name} · ${p.category} (الرصيد: ${p.totalStock ?? p.stock ?? 0})</option>`;
    });

    const selectedProduct = this.products.find(p => p.id === productId);
    const initialCost = customCost !== null ? customCost : (selectedProduct ? Math.round(selectedProduct.price * 0.75) : 0);
    const subtotal = quantity * initialCost;

    tr.innerHTML = `
      <td>
        <select class="po-item-product" data-row="${rowIndex}" required>
          ${productOptions}
        </select>
      </td>
      <td>
        <input type="number" class="po-item-qty" data-row="${rowIndex}" value="${quantity}" min="1" required style="width:80px;" />
      </td>
      <td>
        <input type="number" class="po-item-cost" data-row="${rowIndex}" value="${initialCost}" min="0" required style="width:110px;" />
      </td>
      <td class="num po-item-subtotal" id="po-item-subtotal-${rowIndex}">${subtotal.toLocaleString('en-US')} ج.س</td>
      <td>
        <button type="button" class="icon-btn btn-remove-po-item" data-row="${rowIndex}" title="حذف الصنف" style="color:var(--destructive);">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </td>
    `;

    this.itemsTableBody.appendChild(tr);

    // Bind inputs
    const prodSelect = tr.querySelector('.po-item-product');
    const qtyInput = tr.querySelector('.po-item-qty');
    const costInput = tr.querySelector('.po-item-cost');
    const removeBtn = tr.querySelector('.btn-remove-po-item');

    prodSelect?.addEventListener('change', () => {
      const selectedOption = prodSelect.options[prodSelect.selectedIndex];
      const retailPrice = Number(selectedOption.dataset.price || 0);
      costInput.value = Math.round(retailPrice * 0.75); // Standard 25% wholesale discount
      this.updateRowSubtotal(rowIndex);
    });

    qtyInput?.addEventListener('input', () => this.updateRowSubtotal(rowIndex));
    costInput?.addEventListener('input', () => this.updateRowSubtotal(rowIndex));

    removeBtn?.addEventListener('click', () => {
      tr.remove();
      this.updateTotal();
    });

    this.updateTotal();
  }

  /**
   * 1-Click High-Level UX: Automatically detect out-of-stock / low-stock medicines
   * and load them into the Purchase Order
   */
  autoImportLowStock() {
    const lowStockItems = this.products.filter(p => {
      const stock = typeof p.totalStock === 'number' ? p.totalStock : (p.stock || 0);
      return stock <= 25;
    });

    if (lowStockItems.length === 0) {
      showToast('المخزون مكتمل ✅', 'لا توجد أدوية تحت حد الأمان في الكتالوج حالياً', 'info');
      return;
    }

    if (this.itemsTableBody) this.itemsTableBody.innerHTML = '';
    this.itemRowsCount = 0;

    lowStockItems.forEach(item => {
      const currentStock = typeof item.totalStock === 'number' ? item.totalStock : (item.stock || 0);
      const suggestedQty = currentStock === 0 ? 100 : 50;
      const unitCost = Math.round(item.price * 0.75);
      this.addItemRow(item.id, suggestedQty, unitCost);
    });

    showToast(
      'تم استيراد النواقص بنجاح 📥',
      `تم إدراج ${lowStockItems.length} أصناف تحت حد الأمان في أمر التوريد بضغطة زر واحدة`,
      'success'
    );
  }

  updateRowSubtotal(rowIndex) {
    const row = document.getElementById(`new-order-row-${rowIndex}`);
    if (!row) return;

    const qty = Number(row.querySelector('.po-item-qty')?.value || 0);
    const cost = Number(row.querySelector('.po-item-cost')?.value || 0);
    const subtotal = qty * cost;

    const subtotalEl = document.getElementById(`po-item-subtotal-${rowIndex}`);
    if (subtotalEl) {
      subtotalEl.textContent = `${subtotal.toLocaleString('en-US')} ج.س`;
    }

    this.updateTotal();
  }

  updateTotal() {
    if (!this.orderTotalEl) return;
    let total = 0;

    const rows = this.itemsTableBody.querySelectorAll('tr');
    rows.forEach(r => {
      const qty = Number(r.querySelector('.po-item-qty')?.value || 0);
      const cost = Number(r.querySelector('.po-item-cost')?.value || 0);
      total += (qty * cost);
    });

    this.orderTotalEl.textContent = `${total.toLocaleString('en-US')} ج.س`;
  }

  async handleSubmit() {
    const supplierId = this.supplierSelect?.value;
    if (!supplierId) {
      showToast('خطأ في البيانات', 'يرجى اختيار المورد المعتمد', 'error');
      return;
    }

    const items = [];
    const rows = this.itemsTableBody.querySelectorAll('tr');
    rows.forEach(r => {
      const prodId = r.querySelector('.po-item-product')?.value;
      const qty = Number(r.querySelector('.po-item-qty')?.value || 0);
      const cost = Number(r.querySelector('.po-item-cost')?.value || 0);

      if (prodId && qty > 0) {
        items.push({
          productId: prodId,
          orderedQuantity: qty,
          unitCost: cost
        });
      }
    });

    if (items.length === 0) {
      showToast('خطأ في البيانات', 'يجب إضافة صنف واحد على الأقل في أمر الشراء', 'error');
      return;
    }

    const expectedDeliveryDate = document.getElementById('new-order-delivery-date')?.value;
    const notes = document.getElementById('new-order-notes')?.value;

    const submitBtn = this.form.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'جاري إصدار أمر الشراء...';
    }

    try {
      await PurchasingService.createOrder({
        supplierId,
        expectedDeliveryDate,
        notes,
        items
      });

      window.dispatchEvent(new CustomEvent('PURCHASING_UPDATED'));
      this.close();
    } catch (err) {
      console.error('Error creating order:', err);
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="m5 12 5 5L20 7"/></svg>
          إصدار أمر الشراء الرسمي
        `;
      }
    }
  }
}
