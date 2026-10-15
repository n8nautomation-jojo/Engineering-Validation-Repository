/**
 * PharmaTech — Stock Transfer Modal Component (Dialog 24)
 * Allows pharmacists and warehouse managers to issue inter-location stock transfer orders.
 */

import { transferService } from '../../services/transferService.js';
import { appStore } from '../../state/store.js';
import { showToast } from '../Toast.js';

export class StockTransferModal {
  constructor(dialogId = 'dialog-stock-transfer-modal') {
    this.dialog = document.getElementById(dialogId);
    this.form = document.getElementById('stock-transfer-form');
    this.items = [];
    this.warehouses = [];

    this.init();
  }

  init() {
    if (!this.dialog) return;

    // Close buttons
    const closeBtnX = document.getElementById('btn-close-transfer-modal-x');
    const closeBtn = document.getElementById('btn-cancel-transfer-modal');

    closeBtnX?.addEventListener('click', () => this.close());
    closeBtn?.addEventListener('click', () => this.close());

    this.dialog.addEventListener('click', (e) => {
      if (e.target === this.dialog) this.close();
    });

    // Medicine dropdown change: update batch options
    const medSelect = document.getElementById('transfer-form-med-select');
    medSelect?.addEventListener('change', (e) => {
      this.handleMedicineChange(e.target.value);
    });

    // Add item button
    const addItemBtn = document.getElementById('btn-transfer-add-item');
    addItemBtn?.addEventListener('click', () => this.handleAddItem());

    // Form submission
    this.form?.addEventListener('submit', (e) => this.handleSubmit(e));
  }

  async open() {
    if (!this.dialog) return;

    this.items = [];
    this.dialog.classList.remove('hidden');

    this.warehouses = await transferService.fetchWarehouses();
    this.populateWarehousesDropdowns();
    this.populateMedicinesDropdown();
    this.renderItemsTable();

    // Reset fields
    const fromSelect = document.getElementById('transfer-form-from-wh');
    const toSelect = document.getElementById('transfer-form-to-wh');
    const notesInput = document.getElementById('transfer-form-notes');
    const prioritySelect = document.getElementById('transfer-form-priority');

    if (fromSelect && this.warehouses.length > 0) fromSelect.value = this.warehouses[0].id;
    if (toSelect && this.warehouses.length > 1) toSelect.value = this.warehouses[1].id;
    if (notesInput) notesInput.value = '';
    if (prioritySelect) prioritySelect.value = 'NORMAL';
  }

  close() {
    this.dialog?.classList.add('hidden');
    this.items = [];
  }

  populateWarehousesDropdowns() {
    const fromSelect = document.getElementById('transfer-form-from-wh');
    const toSelect = document.getElementById('transfer-form-to-wh');
    if (!fromSelect || !toSelect) return;

    const optionsHtml = this.warehouses.map(w => `
      <option value="${w.id}">${w.name} (${w.type === 'CENTRAL' ? 'رئيسي' : 'فرعي'})</option>
    `).join('');

    fromSelect.innerHTML = optionsHtml;
    toSelect.innerHTML = optionsHtml;

    if (this.warehouses.length > 1) {
      fromSelect.selectedIndex = 0;
      toSelect.selectedIndex = 1;
    }
  }

  populateMedicinesDropdown() {
    const medSelect = document.getElementById('transfer-form-med-select');
    if (!medSelect) return;

    const meds = appStore.medicines || [];
    medSelect.innerHTML = `
      <option value="">-- اختر الدواء المراد نقله --</option>
      ${meds.map(m => `
        <option value="${m.id}" data-name="${m.name}" data-namear="${m.nameAr || m.name}">
          ${m.nameAr || m.name} (${m.name}) — الرصيد الكلي: ${m.stock || 0}
        </option>
      `).join('')}
    `;

    this.handleMedicineChange('');
  }

  handleMedicineChange(productId) {
    const batchSelect = document.getElementById('transfer-form-batch-select');
    const qtyInput = document.getElementById('transfer-form-qty');
    if (!batchSelect) return;

    if (!productId) {
      batchSelect.innerHTML = '<option value="">-- اختر الدواء أولاً --</option>';
      batchSelect.disabled = true;
      return;
    }

    const med = appStore.medicines.find(m => m.id === productId);
    if (!med || !Array.isArray(med.batches) || med.batches.length === 0) {
      batchSelect.innerHTML = '<option value="BATCH-DEFAULT">تشغيلة افتراضية (الرصيد متوفر)</option>';
      batchSelect.disabled = false;
      return;
    }

    batchSelect.disabled = false;
    batchSelect.innerHTML = med.batches.map(b => `
      <option value="${b.batchNumber}" data-expiry="${b.expiryDate}" data-avail="${b.availableQuantity}">
        تشغيلة: ${b.batchNumber} (تنتهي: ${b.expiryDate}) — متاح: ${b.availableQuantity} عبوة
      </option>
    `).join('');

    if (qtyInput && med.batches[0]) {
      qtyInput.max = med.batches[0].availableQuantity;
    }
  }

  handleAddItem() {
    const medSelect = document.getElementById('transfer-form-med-select');
    const batchSelect = document.getElementById('transfer-form-batch-select');
    const qtyInput = document.getElementById('transfer-form-qty');

    if (!medSelect || !medSelect.value) {
      showToast('يرجى اختيار الدواء', 'حدد الصنف المراد تحويله من القائمة', 'warning');
      return;
    }

    const productId = medSelect.value;
    const selectedMedOpt = medSelect.options[medSelect.selectedIndex];
    const name = selectedMedOpt.getAttribute('data-name');
    const nameAr = selectedMedOpt.getAttribute('data-namear');

    const selectedBatchOpt = batchSelect?.options[batchSelect.selectedIndex];
    const batchNumber = batchSelect?.value || 'BATCH-GEN';
    const expiryDate = selectedBatchOpt?.getAttribute('data-expiry') || '2027-12-31';
    const maxAvailable = parseInt(selectedBatchOpt?.getAttribute('data-avail') || '999', 10);

    const qty = Math.max(1, parseInt(qtyInput?.value || '1', 10));

    if (qty > maxAvailable) {
      showToast('تجاوز الرصيد المتاح', `الكمية المتوفرة في التشغيلة ${batchNumber} هي ${maxAvailable} عبوة فقط`, 'warning');
      return;
    }

    const existingIdx = this.items.findIndex(i => i.productId === productId && i.batchNumber === batchNumber);
    if (existingIdx >= 0) {
      this.items[existingIdx].quantity += qty;
    } else {
      this.items.push({
        productId,
        name,
        nameAr,
        batchNumber,
        expiryDate,
        quantity: qty,
        unit: 'علبة'
      });
    }

    // Reset picker inputs
    medSelect.value = '';
    this.handleMedicineChange('');
    if (qtyInput) qtyInput.value = '1';

    this.renderItemsTable();
  }

  removeItem(index) {
    if (index >= 0 && index < this.items.length) {
      this.items.splice(index, 1);
      this.renderItemsTable();
    }
  }

  renderItemsTable() {
    const tbody = document.getElementById('transfer-items-tbody');
    const totalUnitsEl = document.getElementById('transfer-form-total-units');
    if (!tbody) return;

    if (this.items.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align:center; padding:18px; color:var(--muted-foreground); font-size:12px;">
            لم يتم إضافة أدوية لأمر التحويل بعد. استخدم أداة اختيار الأصناف أعلاه.
          </td>
        </tr>
      `;
      if (totalUnitsEl) totalUnitsEl.textContent = '0 عبوة';
      return;
    }

    const totalUnits = this.items.reduce((sum, item) => sum + item.quantity, 0);
    if (totalUnitsEl) totalUnitsEl.textContent = `${totalUnits.toLocaleString()} عبوة`;

    tbody.innerHTML = this.items.map((item, idx) => `
      <tr style="border-bottom:1px solid var(--border);">
        <td style="padding:6px 10px;">
          <strong>${item.nameAr || item.name}</strong>
          <span style="font-size:11px; color:var(--muted-foreground); display:block;">${item.name}</span>
        </td>
        <td style="padding:6px 10px; font-family:var(--font-mono); font-weight:700; color:var(--primary); font-size:12px;">
          ${item.batchNumber}
        </td>
        <td style="padding:6px 10px; font-family:var(--font-mono); font-size:12px;">
          ${item.expiryDate}
        </td>
        <td style="padding:6px 10px; font-family:var(--font-mono); font-size:12px; font-weight:800; text-align:center;">
          ${item.quantity} ${item.unit || 'علبة'}
        </td>
        <td style="padding:6px 10px; text-align:center; width:40px;">
          <button type="button" class="btn-remove-transfer-item" data-index="${idx}" 
            style="background:none; border:none; color:#EF4444; font-size:15px; cursor:pointer; padding:2px;">
            &times;
          </button>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('.btn-remove-transfer-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-index'), 10);
        this.removeItem(idx);
      });
    });
  }

  async handleSubmit(e) {
    e.preventDefault();

    if (this.items.length === 0) {
      showToast('قائمة التحويل فارغة', 'يرجى إضافة دواء وتشغيلة واحدة على الأقل', 'warning');
      return;
    }

    const fromSelect = document.getElementById('transfer-form-from-wh');
    const toSelect = document.getElementById('transfer-form-to-wh');
    const prioritySelect = document.getElementById('transfer-form-priority');
    const notesInput = document.getElementById('transfer-form-notes');
    const instantCheck = document.getElementById('transfer-form-instant-complete');

    const fromWhId = fromSelect?.value;
    const toWhId = toSelect?.value;

    if (fromWhId === toWhId) {
      showToast('تنبيه المستودعات', 'لا يمكن التحويل لنفس المستودع، اختر مستودعين مختلفين', 'warning');
      return;
    }

    const payload = {
      fromWarehouseId: fromWhId,
      toWarehouseId: toWhId,
      priority: prioritySelect?.value || 'NORMAL',
      notes: notesInput?.value.trim() || undefined,
      status: instantCheck?.checked ? 'COMPLETED' : 'PENDING',
      requestedBy: 'د. سارة الكباشي',
      items: this.items
    };

    const submitBtn = document.getElementById('btn-save-stock-transfer');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'جاري إصدار أمر التحويل...';
    }

    try {
      const created = await transferService.createTransfer(payload);
      showToast(
        'تم إصدار أمر التحويل المخزني',
        `أمر رقم ${created.transferNumber} بنقل ${created.totalUnits} عبوة (${created.status === 'COMPLETED' ? 'مكتمل ومستلم' : 'قيد النقل'})`,
        'success'
      );
      this.close();
    } catch (err) {
      showToast('تعذر إصدار التحويل', err.message || 'حدث خطأ غير متوقع', 'danger');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'تأكيد وإصدار أمر التحويل';
      }
    }
  }
}
