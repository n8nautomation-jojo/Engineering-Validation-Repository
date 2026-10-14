/**
 * PharmaTech — Stock & Batch Inventory Adjustment Modal Component
 * Clinical stock reconciliation: Physical audit, damage/breakage, and data corrections
 */

import { MedicineService } from '../../services/medicineService.js';
import { showToast } from '../Toast.js';

export class StockAdjustmentModal {
  constructor(dialogId = 'dialog-stock-adjustment') {
    this.dialog = document.getElementById(dialogId);
    this.currentMedicine = null;
    this.selectedBatch = null;

    this.init();
  }

  init() {
    if (!this.dialog) return;

    this.dialog.querySelector('.dialog-close')?.addEventListener('click', () => this.close());
    this.dialog.querySelector('#btn-cancel-stock-adjustment')?.addEventListener('click', () => this.close());

    this.dialog.addEventListener('click', (e) => {
      if (e.target === this.dialog) this.close();
    });

    const form = this.dialog.querySelector('#stock-adjustment-form');
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleSubmit();
    });
  }

  open(medicine) {
    if (!this.dialog || !medicine) return;
    this.currentMedicine = medicine;

    const batches = medicine.batches || [];
    this.selectedBatch = batches[0] || { batchNumber: medicine.batch || 'BATCH-01', availableQuantity: medicine.stock, expiryDate: medicine.expiry };

    const titleEl = this.dialog.querySelector('#adjust-medicine-title');
    const genericEl = this.dialog.querySelector('#adjust-medicine-generic');
    const batchSelect = this.dialog.querySelector('#adjust-batch-select');
    const currentQtyEl = this.dialog.querySelector('#adjust-current-quantity');
    const newQtyInput = this.dialog.querySelector('#adjust-new-quantity');
    const diffEl = this.dialog.querySelector('#adjust-diff-indicator');

    if (titleEl) titleEl.textContent = medicine.name;
    if (genericEl) genericEl.textContent = `${medicine.generic || medicine.name} · SKU: ${medicine.sku || medicine.id}`;

    // Populate batches dropdown
    if (batchSelect) {
      if (batches.length === 0) {
        batchSelect.innerHTML = `<option value="${this.selectedBatch.batchNumber}">${this.selectedBatch.batchNumber} (المتوفر: ${this.selectedBatch.availableQuantity})</option>`;
      } else {
        batchSelect.innerHTML = batches.map(b => `
          <option value="${b.batchNumber}" data-qty="${b.availableQuantity}" data-expiry="${b.expiryDate}">
            تشغيلة: ${b.batchNumber} · تنتهي: ${b.expiryDate} (الرصيد: ${b.availableQuantity} عبوة)
          </option>
        `).join('');
      }

      batchSelect.onchange = () => {
        const chosen = batches.find(b => b.batchNumber === batchSelect.value) || this.selectedBatch;
        this.selectedBatch = chosen;
        if (currentQtyEl) currentQtyEl.textContent = `${chosen.availableQuantity} عبوة`;
        if (newQtyInput) {
          newQtyInput.value = chosen.availableQuantity;
          this.updateDifference(chosen.availableQuantity, chosen.availableQuantity);
        }
      };
    }

    if (currentQtyEl) currentQtyEl.textContent = `${this.selectedBatch.availableQuantity} عبوة`;
    if (newQtyInput) {
      newQtyInput.value = this.selectedBatch.availableQuantity;
      newQtyInput.oninput = () => {
        const val = parseInt(newQtyInput.value) || 0;
        this.updateDifference(this.selectedBatch.availableQuantity, val);
      };
    }

    this.updateDifference(this.selectedBatch.availableQuantity, this.selectedBatch.availableQuantity);

    this.dialog.classList.remove('hidden');
  }

  updateDifference(current, target) {
    const diffEl = this.dialog?.querySelector('#adjust-diff-indicator');
    if (!diffEl) return;

    const diff = target - current;
    if (diff === 0) {
      diffEl.innerHTML = `<span style="color:var(--muted-foreground);">لا يوجد فرق في الرصيد (مطابق)</span>`;
    } else if (diff > 0) {
      diffEl.innerHTML = `<span style="color:#00B37E; font-weight:700;">+${diff} عبوة (زيادة في الجرد)</span>`;
    } else {
      diffEl.innerHTML = `<span style="color:#E11D48; font-weight:700;">${diff} عبوة (عجز / استبعاد تالف)</span>`;
    }
  }

  close() {
    this.dialog?.classList.add('hidden');
    this.currentMedicine = null;
  }

  async handleSubmit() {
    if (!this.currentMedicine || !this.selectedBatch) return;

    const newQtyInput = this.dialog?.querySelector('#adjust-new-quantity');
    const reasonSelect = this.dialog?.querySelector('#adjust-reason-select');
    const notesInput = this.dialog?.querySelector('#adjust-notes-input');
    const submitBtn = this.dialog?.querySelector('#btn-submit-stock-adjustment');

    const newQty = parseInt(newQtyInput?.value);
    if (isNaN(newQty) || newQty < 0) {
      showToast('خطأ في الإدخال', 'يرجى إدخال كمية صحيحة موجبة', 'warning');
      return;
    }

    const reason = reasonSelect?.value || 'PHYSICAL_AUDIT';
    const originalText = submitBtn ? submitBtn.innerHTML : '';

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `جاري حفظ التسوية في السجل...`;
    }

    try {
      await MedicineService.adjustStock(
        this.currentMedicine.id,
        this.selectedBatch.batchNumber,
        newQty,
        reason
      );

      this.close();
      showToast(
        'تمت التسوية الجردية بنجاح',
        `تم تعديل رصيد التشغيلة ${this.selectedBatch.batchNumber} لدواء ${this.currentMedicine.name} إلى ${newQty} عبوة`,
        'success'
      );
    } catch (err) {
      console.error('[StockAdjustment Error]:', err);
      showToast('فشل حفظ التسوية', err.message || 'تعذر الاتصال بقاعدة البيانات، يرجى المحاولة لاحقاً', 'danger');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
      }
    }
  }
}
