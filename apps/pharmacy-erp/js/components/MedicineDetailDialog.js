/**
 * PharmaTech — Medicine Detail Dialog Component
 * Displays batch details, FEFO priority, stock adjustments & reorder actions
 */

import { appStore } from '../state/store.js';
import { MedicineService } from '../services/medicineService.js';
import { showToast } from './Toast.js';

export class MedicineDetailDialog {
  constructor() {
    this.dialog = document.getElementById('dialog-medicine-detail');
    this.closeBtn = document.getElementById('btn-close-detail-dialog');
    this.deleteBtn = document.getElementById('btn-delete-medicine');
    this.reorderBtn = document.getElementById('btn-reorder-medicine');

    this.init();
  }

  init() {
    this.closeBtn?.addEventListener('click', () => this.close());

    this.deleteBtn?.addEventListener('click', () => {
      if (!appStore.selectedMedicine) return;
      const med = appStore.selectedMedicine;
      MedicineService.delete(med.id);
      this.close();
      showToast('تم حذف الصنف', med.name, 'danger');
    });

    this.reorderBtn?.addEventListener('click', () => {
      if (!appStore.selectedMedicine) return;
      const med = appStore.selectedMedicine;
      this.close();
      showToast('تم إنشاء طلب توريد', `${med.name} من شركة التوريد المعتمدة`, 'success');
    });

    // Make global trigger available for row clicks
    window.openMedicineDetail = (id) => this.showMedicine(id);
  }

  showMedicine(id) {
    const med = MedicineService.getById(id);
    if (!med) return;

    appStore.setSelectedMedicine(med);

    document.getElementById('detail-medicine-name').textContent = med.name;
    document.getElementById('detail-medicine-generic').textContent = med.generic;
    document.getElementById('detail-medicine-category').textContent = med.category;
    document.getElementById('detail-medicine-stock').textContent = `${med.stock} عبوة`;
    document.getElementById('detail-medicine-price').textContent = `${Number(med.price).toLocaleString()} ج.س`;
    document.getElementById('detail-medicine-expiry').textContent = med.expiry;

    this.dialog?.classList.remove('hidden');
  }

  close() {
    this.dialog?.classList.add('hidden');
  }
}
