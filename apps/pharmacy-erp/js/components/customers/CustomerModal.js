/**
 * PharmaTech — Customer / Patient Add & Edit Modal Component
 * Supports clinical conditions, allergy tags, insurance policies, and phone validation
 */

import { customerService } from '../../services/customerService.js';
import { showToast } from '../Toast.js';

export class CustomerModal {
  constructor(modalId = 'dialog-customer-form') {
    this.modalId = modalId;
    this.editingCustomerId = null;
    this.selectedConditions = new Set();
    this.selectedAllergies = new Set();
    this.init();
  }

  init() {
    // Backdrop close
    const modal = document.getElementById(this.modalId);
    if (!modal) return;

    modal.querySelector('.modal-backdrop')?.addEventListener('click', () => this.close());
    modal.querySelector('.btn-modal-close')?.addEventListener('click', () => this.close());
    modal.querySelector('#btn-cancel-customer')?.addEventListener('click', () => this.close());

    // Type change toggle for insurance section
    const typeSelect = modal.querySelector('#customer-form-type');
    const insuranceSec = modal.querySelector('#customer-insurance-section');
    typeSelect?.addEventListener('change', () => {
      if (insuranceSec) {
        insuranceSec.style.display = typeSelect.value === 'INSURANCE' ? 'block' : 'none';
      }
    });

    // Form submission
    const form = modal.querySelector('#customer-edit-form');
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleSubmit();
    });
  }

  open(customer = null) {
    const modal = document.getElementById(this.modalId);
    if (!modal) return;

    this.editingCustomerId = customer ? customer.id : null;
    this.selectedConditions.clear();
    this.selectedAllergies.clear();

    const titleEl = modal.querySelector('#customer-modal-title');
    if (titleEl) {
      titleEl.textContent = customer ? `تعديل ملف: ${customer.name}` : 'تسجيل مريض / عميل جديد';
    }

    const nameInput = modal.querySelector('#customer-form-name');
    const phoneInput = modal.querySelector('#customer-form-phone');
    const typeSelect = modal.querySelector('#customer-form-type');
    const notesInput = modal.querySelector('#customer-form-notes');
    const insSec = modal.querySelector('#customer-insurance-section');
    const insProvider = modal.querySelector('#customer-form-ins-provider');
    const insPolicy = modal.querySelector('#customer-form-ins-policy');
    const insCopay = modal.querySelector('#customer-form-ins-copay');

    if (nameInput) nameInput.value = customer ? customer.name : '';
    if (phoneInput) phoneInput.value = customer ? (customer.phone || '') : '';
    if (typeSelect) typeSelect.value = customer ? customer.type : 'WALK_IN';
    if (notesInput) notesInput.value = customer ? (customer.notes || '') : '';

    if (insSec) {
      insSec.style.display = customer?.type === 'INSURANCE' ? 'block' : 'none';
      if (insProvider) insProvider.value = customer?.insuranceDetails?.provider || '';
      if (insPolicy) insPolicy.value = customer?.insuranceDetails?.policyNumber || '';
      if (insCopay) insCopay.value = customer?.insuranceDetails?.copayPercent || 0;
    }

    if (customer?.chronicConditions) {
      customer.chronicConditions.forEach(c => this.selectedConditions.add(c));
    }
    if (customer?.allergies) {
      customer.allergies.forEach(a => this.selectedAllergies.add(a));
    }

    this.renderConditionChips();
    this.renderAllergyChips();

    modal.classList.add('is-open');
    nameInput?.focus();
  }

  close() {
    const modal = document.getElementById(this.modalId);
    if (modal) {
      modal.classList.remove('is-open');
    }
    this.editingCustomerId = null;
  }

  renderConditionChips() {
    const container = document.getElementById('customer-chronic-chips-container');
    if (!container) return;

    const available = [
      'داء السكري النوع الثاني (Type 2 Diabetes)',
      'ارتفاع ضغط الدم (Hypertension)',
      'الربو الشعبي (Bronchial Asthma)',
      'أمراض الشرايين والقلب (Cardiovascular)',
      'قصور وظائف الكلى (Renal Impairment)'
    ];

    container.innerHTML = available.map(cond => {
      const active = this.selectedConditions.has(cond);
      return `
        <button type="button" class="btn-chip-condition" data-cond="${cond}" style="padding:4px 10px; font-size:11.5px; border-radius:16px; border:1px solid ${active ? 'var(--primary)' : 'var(--border)'}; background:${active ? 'var(--primary-subtle, rgba(0,82,204,0.12))' : 'var(--background)'}; color:${active ? 'var(--primary)' : 'var(--foreground)'}; font-weight:${active ? '700' : '500'}; cursor:pointer; transition:all 0.15s ease;">
          ${active ? '✓ ' : '+ '}${cond}
        </button>
      `;
    }).join('');

    container.querySelectorAll('.btn-chip-condition').forEach(btn => {
      btn.addEventListener('click', () => {
        const cond = btn.dataset.cond;
        if (this.selectedConditions.has(cond)) {
          this.selectedConditions.delete(cond);
        } else {
          this.selectedConditions.add(cond);
        }
        this.renderConditionChips();
      });
    });
  }

  renderAllergyChips() {
    const container = document.getElementById('customer-allergy-chips-container');
    if (!container) return;

    const available = [
      'حساسية بنسلين (Penicillin Allergy)',
      'حساسية أسبرين ومسكنات NSAIDs',
      'حساسية مركبات السلفا (Sulfa Drugs)'
    ];

    container.innerHTML = available.map(alg => {
      const active = this.selectedAllergies.has(alg);
      return `
        <button type="button" class="btn-chip-allergy" data-alg="${alg}" style="padding:4px 10px; font-size:11.5px; border-radius:16px; border:1px solid ${active ? 'var(--destructive, #e11d48)' : 'var(--border)'}; background:${active ? 'rgba(225, 29, 72, 0.1)' : 'var(--background)'}; color:${active ? 'var(--destructive, #e11d48)' : 'var(--foreground)'}; font-weight:${active ? '700' : '500'}; cursor:pointer; transition:all 0.15s ease;">
          ${active ? '⚠️ ' : '+ '}${alg}
        </button>
      `;
    }).join('');

    container.querySelectorAll('.btn-chip-allergy').forEach(btn => {
      btn.addEventListener('click', () => {
        const alg = btn.dataset.alg;
        if (this.selectedAllergies.has(alg)) {
          this.selectedAllergies.delete(alg);
        } else {
          this.selectedAllergies.add(alg);
        }
        this.renderAllergyChips();
      });
    });
  }

  async handleSubmit() {
    const modal = document.getElementById(this.modalId);
    if (!modal) return;

    const name = modal.querySelector('#customer-form-name')?.value?.trim();
    const phone = modal.querySelector('#customer-form-phone')?.value?.trim();
    const type = modal.querySelector('#customer-form-type')?.value;
    const notes = modal.querySelector('#customer-form-notes')?.value?.trim();

    if (!name) {
      showToast('خطأ في البيانات', 'يرجى إدخال اسم المريض أو العميل', 'warning');
      return;
    }

    let insuranceDetails = null;
    if (type === 'INSURANCE') {
      const provider = modal.querySelector('#customer-form-ins-provider')?.value?.trim() || '';
      const policyNumber = modal.querySelector('#customer-form-ins-policy')?.value?.trim() || '';
      const copayPercent = Number(modal.querySelector('#customer-form-ins-copay')?.value) || 0;
      insuranceDetails = { provider, policyNumber, copayPercent };
    }

    const payload = {
      name,
      phone,
      type,
      chronicConditions: Array.from(this.selectedConditions),
      allergies: Array.from(this.selectedAllergies),
      insuranceDetails,
      notes
    };

    const submitBtn = modal.querySelector('#btn-save-customer');
    if (submitBtn) submitBtn.disabled = true;

    try {
      if (this.editingCustomerId) {
        await customerService.updateCustomer(this.editingCustomerId, payload);
        showToast('تم تحديث الملف بنجاح', `تم حفظ بيانات المريض ${name}`, 'success');
      } else {
        const created = await customerService.createCustomer(payload);
        showToast('تم تسجيل المريض بنجاح', `تم إنشاء ملف المريض بكود (${created.id})`, 'success');
      }
      this.close();
    } catch (err) {
      showToast('تعذر حفظ البيانات', err.message || 'حدث خطأ أثناء الاتصال بالخادم', 'danger');
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  }
}
