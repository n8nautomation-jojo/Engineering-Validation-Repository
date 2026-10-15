/**
 * PharmaTech — Add Medicine Dialog Component (Ergonomic UX 2.0)
 * Ultra-fast 3-field entry with smart presets, auto-generated batches, and 1-tap expiry buttons
 */

import { MedicineService } from '../services/medicineService.js';
import { showToast } from './Toast.js';
import { AuthService } from '../services/authService.js';

export class AddMedicineDialog {
  constructor() {
    this.dialog = document.getElementById('dialog-add-medicine');
    this.openBtn = document.getElementById('btn-open-add-dialog');
    this.closeBtn = document.getElementById('btn-close-add-dialog');
    this.cancelBtn = document.getElementById('btn-cancel-add-dialog');
    this.form = document.getElementById('add-medicine-dialog-form');
    this.advancedSection = document.getElementById('add-med-advanced-section');
    this.toggleAdvancedBtn = document.getElementById('btn-toggle-add-med-advanced');
    this.arrowIcon = document.getElementById('add-med-arrow');

    this.init();
  }

  init() {
    this.openBtn?.addEventListener('click', () => this.open());
    this.closeBtn?.addEventListener('click', () => this.close());
    this.cancelBtn?.addEventListener('click', () => this.close());

    // Toggle advanced section
    this.toggleAdvancedBtn?.addEventListener('click', () => {
      if (!this.advancedSection) return;
      const isVisible = this.advancedSection.style.display === 'flex';
      this.advancedSection.style.display = isVisible ? 'none' : 'flex';
      if (this.arrowIcon) this.arrowIcon.textContent = isVisible ? '▾' : '▴';
    });

    // Quick Expiry Presets (+6m, +1y, +2y)
    this.dialog?.querySelectorAll('.btn-quick-expiry').forEach(btn => {
      btn.addEventListener('click', () => {
        const months = parseInt(btn.dataset.months || '24', 10);
        this.setExpiryPreset(months);
      });
    });

    // Form submission with smart fallback defaults
    this.form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);

      const name = (fd.get('name') || '').trim();
      let generic = (fd.get('generic') || '').trim();
      let category = (fd.get('category') || '').trim();
      let batch = (fd.get('batch') || '').trim();
      let expiry = (fd.get('expiry') || '').trim();
      const stock = parseInt(fd.get('stock'), 10) || 1;
      const price = parseFloat(fd.get('price')) || 100;

      // Smart Defaults for zero-training speed
      if (!generic) generic = name;
      if (!category) category = 'أدوية عامة';
      if (!batch) {
        const rnd = Math.floor(1000 + Math.random() * 9000);
        batch = `BATCH-${new Date().getFullYear()}-A${rnd}`;
      }
      if (!expiry) {
        const d = new Date();
        d.setFullYear(d.getFullYear() + 2);
        expiry = d.toISOString().split('T')[0];
      }

      try {
        const payload = {
          name,
          generic,
          category,
          stock,
          price,
          expiry,
          batch
        };

        await MedicineService.add(payload);

        this.close();
        this.form.reset();
        showToast('تم حفظ الدواء بنجاح', `${payload.name} · السعر: ${Number(price).toLocaleString()} ج.س · الرصيد: ${stock}`, 'success');
      } catch (err) {
        showToast('خطأ في إضافة الدواء', err.message, 'danger');
      }
    });
  }

  setExpiryPreset(monthsToAdd) {
    const expiryInput = document.getElementById('add-med-expiry-input');
    if (!expiryInput) return;

    const d = new Date();
    d.setMonth(d.getMonth() + monthsToAdd);
    expiryInput.value = d.toISOString().split('T')[0];

    // Highlight selected preset
    this.dialog?.querySelectorAll('.btn-quick-expiry').forEach(b => {
      const m = parseInt(b.dataset.months, 10);
      b.style.borderColor = (m === monthsToAdd) ? 'var(--primary)' : 'var(--border)';
      b.style.color = (m === monthsToAdd) ? 'var(--primary)' : 'inherit';
    });
  }

  open() {
    if (!AuthService.isManager()) {
      showToast('صلاحية غير متوفرة', 'إضافة أصناف جديدة للدليل الدوائي مخصصة لمدير الصيدلية ومسؤول المخزون فقط', 'warning');
      return;
    }

    this.dialog?.classList.remove('hidden');

    // Default 2 years expiry preset
    this.setExpiryPreset(24);

    // Auto-focus on name field
    setTimeout(() => {
      document.getElementById('add-med-name-input')?.focus();
    }, 100);
  }

  close() {
    this.dialog?.classList.add('hidden');
    if (this.advancedSection) this.advancedSection.style.display = 'none';
    if (this.arrowIcon) this.arrowIcon.textContent = '▾';
  }
}
