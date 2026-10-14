/**
 * PharmaTech — Medicine Detail Dialog Component
 * Displays batch details, FEFO priority, stock adjustments & reorder actions
 */

import { appStore } from '../state/store.js';
import { MedicineService } from '../services/medicineService.js';
import { MedicineBatchesList } from './inventory/MedicineBatchesList.js';
import { showToast } from './Toast.js';

export class MedicineDetailDialog {
  constructor() {
    this.dialog = document.getElementById('dialog-medicine-detail');
    this.closeBtn = document.getElementById('btn-close-detail-dialog');
    this.deleteBtn = document.getElementById('btn-delete-medicine');
    this.reorderBtn = document.getElementById('btn-reorder-medicine');
    this.batchesList = new MedicineBatchesList('detail-medicine-batches-list');

    this.init();
  }

  init() {
    this.closeBtn?.addEventListener('click', () => this.close());

    this.deleteBtn?.addEventListener('click', async () => {
      if (!appStore.selectedMedicine) return;
      const med = appStore.selectedMedicine;

      const confirmed = window.confirm(`هل أنت متأكد من حذف الصنف "${med.name}" نهائياً من سجل الكتالوج وقاعدة البيانات؟`);
      if (!confirmed) return;

      try {
        await MedicineService.delete(med.id);
        this.close();
        showToast('تم حذف الصنف', `تم حذف ${med.name} من الكتالوج بنجاح`, 'danger');
      } catch (err) {
        showToast('فشل حذف الصنف', err.message, 'danger');
      }
    });

    this.reorderBtn?.addEventListener('click', () => {
      if (!appStore.selectedMedicine) return;
      const med = appStore.selectedMedicine;
      this.close();

      // Switch to purchasing view and trigger new order dialog pre-populated with this medicine
      const purchasingNavBtn = document.querySelector('.nav-button[data-view="purchasing"]');
      if (purchasingNavBtn) {
        purchasingNavBtn.click();
      }
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('OPEN_NEW_PURCHASE_ORDER', { detail: { productId: med.id } }));
      }, 50);

      showToast('طلب توريد للصنف', `تم فتح مسودة أمر الشراء للدواء ${med.name}`, 'info');
    });

    // Make global trigger available for row clicks
    window.openMedicineDetail = (id) => this.showMedicine(id);
  }

  showMedicine(id) {
    const med = MedicineService.getById(id);
    if (!med) return;

    appStore.setSelectedMedicine(med);

    const nameEl = document.getElementById('detail-medicine-name');
    const genericEl = document.getElementById('detail-medicine-generic');
    const categoryEl = document.getElementById('detail-medicine-category');
    const stockEl = document.getElementById('detail-medicine-stock');
    const priceEl = document.getElementById('detail-medicine-price');
    const expiryEl = document.getElementById('detail-medicine-expiry');

    if (nameEl) nameEl.textContent = med.name;
    if (genericEl) genericEl.textContent = med.generic || '';
    if (categoryEl) categoryEl.textContent = med.category || 'عام';
    if (stockEl) stockEl.textContent = `${med.stock} عبوة`;
    if (priceEl) priceEl.textContent = `${Number(med.price).toLocaleString()} ج.س`;
    if (expiryEl) expiryEl.textContent = med.expiry;

    // Render clinical FEFO batch breakdown
    this.batchesList.render(med);

    this.dialog?.classList.remove('hidden');
  }

  close() {
    this.dialog?.classList.add('hidden');
  }
}
