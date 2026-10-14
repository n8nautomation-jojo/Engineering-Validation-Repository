/**
 * PharmaTech — Add New Supplier Dialog
 * Registers a new pharmaceutical manufacturer or distributor
 */

import { PurchasingService } from '../../services/purchasingService.js';
import { showToast } from '../Toast.js';

export class AddSupplierDialog {
  constructor() {
    this.dialog = document.getElementById('dialog-add-supplier');
    this.closeBtn = document.getElementById('btn-close-add-supplier-dialog');
    this.cancelBtn = document.getElementById('btn-cancel-add-supplier-dialog');
    this.form = document.getElementById('add-supplier-form');

    this.init();
  }

  init() {
    if (!this.dialog) return;

    this.closeBtn?.addEventListener('click', () => this.close());
    this.cancelBtn?.addEventListener('click', () => this.close());

    this.dialog.addEventListener('click', (e) => {
      if (e.target === this.dialog) this.close();
    });

    this.form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleSubmit();
    });
  }

  open() {
    this.dialog?.classList.remove('hidden');
    setTimeout(() => {
      this.form?.querySelector('input[name="name"]')?.focus();
    }, 100);
  }

  close() {
    this.dialog?.classList.add('hidden');
    this.form?.reset();
  }

  async handleSubmit() {
    const formData = new FormData(this.form);
    const data = {
      name: formData.get('name'),
      nameEn: formData.get('nameEn'),
      contactPerson: formData.get('contactPerson'),
      phone: formData.get('phone'),
      email: formData.get('email'),
      address: formData.get('address'),
      taxNumber: formData.get('taxNumber')
    };

    const submitBtn = this.form.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'جاري الحفظ...';
    }

    try {
      await PurchasingService.createSupplier(data);
      window.dispatchEvent(new CustomEvent('PURCHASING_UPDATED'));
      this.close();
    } catch (err) {
      console.error('Error adding supplier:', err);
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="m5 12 5 5L20 7"/></svg>
          تسجيل المورد
        `;
      }
    }
  }
}
