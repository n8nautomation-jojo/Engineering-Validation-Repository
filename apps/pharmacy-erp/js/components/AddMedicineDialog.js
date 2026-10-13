/**
 * PharmaTech — Add Medicine Dialog Component
 * Handles modal open, close, and form submission with domain validation
 */

import { MedicineService } from '../services/medicineService.js';
import { showToast } from './Toast.js';

export class AddMedicineDialog {
  constructor() {
    this.dialog = document.getElementById('dialog-add-medicine');
    this.openBtn = document.getElementById('btn-open-add-dialog');
    this.closeBtn = document.getElementById('btn-close-add-dialog');
    this.cancelBtn = document.getElementById('btn-cancel-add-dialog');
    this.form = document.getElementById('add-medicine-dialog-form');

    this.init();
  }

  init() {
    this.openBtn?.addEventListener('click', () => this.open());
    this.closeBtn?.addEventListener('click', () => this.close());
    this.cancelBtn?.addEventListener('click', () => this.close());

    this.form?.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);

      const added = MedicineService.add({
        name: fd.get('name'),
        generic: fd.get('generic'),
        category: fd.get('category'),
        stock: fd.get('stock'),
        price: fd.get('price'),
        expiry: fd.get('expiry'),
        batch: fd.get('batch')
      });

      this.close();
      this.form.reset();
      showToast('تمت إضافة الدواء بنجاح', `${added.name} · تشغيلة ${added.batch}`, 'success');
    });
  }

  open() {
    this.dialog?.classList.remove('hidden');
  }

  close() {
    this.dialog?.classList.add('hidden');
  }
}
