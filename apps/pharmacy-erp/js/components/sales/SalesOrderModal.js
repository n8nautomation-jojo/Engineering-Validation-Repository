/**
 * PharmaTech — Sales Order & Prescription Reservation Modal (Dialog 23)
 * Allows pharmacists to record advance prescription bookings, chronic monthly refills, and phone pre-orders.
 */

import { salesOrderService } from '../../services/salesOrderService.js';
import { customerService } from '../../services/customerService.js';
import { appStore } from '../../state/store.js';
import { showToast } from '../Toast.js';

export class SalesOrderModal {
  constructor(dialogId = 'dialog-sales-order-modal') {
    this.dialog = document.getElementById(dialogId);
    this.form = document.getElementById('sales-order-form');
    this.items = [];
    this.prefillCustomer = null;

    this.init();
  }

  init() {
    if (!this.dialog) return;

    // Close buttons
    const closeBtnX = document.getElementById('btn-close-sales-order-x');
    const closeBtn = document.getElementById('btn-cancel-sales-order-modal');

    closeBtnX?.addEventListener('click', () => this.close());
    closeBtn?.addEventListener('click', () => this.close());

    this.dialog.addEventListener('click', (e) => {
      if (e.target === this.dialog) this.close();
    });

    // Medicine addition trigger
    const addItemBtn = document.getElementById('btn-order-add-item');
    addItemBtn?.addEventListener('click', () => this.handleAddItem());

    // Patient selector change
    const patientSelect = document.getElementById('order-form-patient-select');
    patientSelect?.addEventListener('change', (e) => {
      this.handlePatientSelectChange(e.target.value);
    });

    // Form submission
    this.form?.addEventListener('submit', (e) => this.handleSubmit(e));
  }

  open(prefill = {}) {
    if (!this.dialog) return;

    this.items = [];
    this.prefillCustomer = prefill.customer || null;
    this.dialog.classList.remove('hidden');

    this.populatePatientsDropdown();
    this.populateMedicinesDropdown();
    this.renderItemsTable();

    // Form fields reset or prefill
    const nameInput = document.getElementById('order-form-customer-name');
    const phoneInput = document.getElementById('order-form-customer-phone');
    const docInput = document.getElementById('order-form-doctor');
    const rxInput = document.getElementById('order-form-rx');
    const prioritySelect = document.getElementById('order-form-priority');
    const notesInput = document.getElementById('order-form-notes');
    const patientSelect = document.getElementById('order-form-patient-select');

    if (this.prefillCustomer) {
      if (patientSelect) patientSelect.value = this.prefillCustomer.id;
      if (nameInput) nameInput.value = this.prefillCustomer.name;
      if (phoneInput) phoneInput.value = this.prefillCustomer.phone || '';
      if (prioritySelect) {
        prioritySelect.value = (Array.isArray(this.prefillCustomer.chronicConditions) && this.prefillCustomer.chronicConditions.length > 0)
          ? 'CHRONIC_REFILL'
          : 'REGULAR';
      }
      this.handlePatientSelectChange(this.prefillCustomer.id);
    } else {
      if (patientSelect) patientSelect.value = '';
      if (nameInput) nameInput.value = '';
      if (phoneInput) phoneInput.value = '';
      if (docInput) docInput.value = '';
      if (rxInput) rxInput.value = '';
      if (prioritySelect) prioritySelect.value = 'REGULAR';
      if (notesInput) notesInput.value = '';
      this.handlePatientSelectChange('');
    }
  }

  close() {
    this.dialog?.classList.add('hidden');
    this.items = [];
    this.prefillCustomer = null;
  }

  populatePatientsDropdown() {
    const patientSelect = document.getElementById('order-form-patient-select');
    if (!patientSelect) return;

    const customers = customerService.customersCache || [];
    patientSelect.innerHTML = `
      <option value="">-- اختيار مريض مسجل (أو كتابة يدوي بالأسفل) --</option>
      ${customers.map(c => `
        <option value="${c.id}">${c.name} (${c.phone || 'بدون هاتف'})${Array.isArray(c.chronicConditions) && c.chronicConditions.length > 0 ? ' - مزمن' : ''}</option>
      `).join('')}
    `;
  }

  populateMedicinesDropdown() {
    const medSelect = document.getElementById('order-form-med-select');
    if (!medSelect) return;

    const meds = appStore.medicines || [];
    medSelect.innerHTML = `
      <option value="">-- اختر الدواء المطلوب حجزه --</option>
      ${meds.map(m => `
        <option value="${m.id}" data-price="${m.price}" data-name="${m.name}" data-namear="${m.nameAr || m.name}">
          ${m.nameAr || m.name} (${m.name}) — ${Number(m.price).toLocaleString()} ج.س
        </option>
      `).join('')}
    `;
  }

  handlePatientSelectChange(customerId) {
    const alertBox = document.getElementById('order-patient-clinical-alert');
    const nameInput = document.getElementById('order-form-customer-name');
    const phoneInput = document.getElementById('order-form-customer-phone');

    if (!customerId) {
      if (alertBox) alertBox.style.display = 'none';
      return;
    }

    const cust = customerService.customersCache.find(c => c.id === customerId);
    if (!cust) {
      if (alertBox) alertBox.style.display = 'none';
      return;
    }

    if (nameInput) nameInput.value = cust.name;
    if (phoneInput) phoneInput.value = cust.phone || '';

    if (alertBox) {
      const hasAllergies = Array.isArray(cust.allergies) && cust.allergies.length > 0;
      const hasChronic = Array.isArray(cust.chronicConditions) && cust.chronicConditions.length > 0;

      if (hasAllergies || hasChronic) {
        alertBox.style.display = 'block';
        alertBox.innerHTML = `
          <div style="font-size:12px; font-weight:700; color:#BE123C; margin-bottom:4px;">
            ⚠️ تنبيه سريري للمريض: ${cust.name}
          </div>
          ${hasAllergies ? `
            <div style="font-size:11.5px; color:#9F1239; margin-bottom:2px;">
              <strong>حساسية دوائية مسجلة:</strong> ${cust.allergies.join('، ')}
            </div>
          ` : ''}
          ${hasChronic ? `
            <div style="font-size:11.5px; color:#1D4ED8;">
              <strong>أمراض مزمنة:</strong> ${cust.chronicConditions.join('، ')}
            </div>
          ` : ''}
        `;
      } else {
        alertBox.style.display = 'none';
      }
    }
  }

  handleAddItem() {
    const medSelect = document.getElementById('order-form-med-select');
    const qtyInput = document.getElementById('order-form-med-qty');

    if (!medSelect || !medSelect.value) {
      showToast('يرجى اختيار الدواء', 'اختر الصنف من القائمة المنسدلة أولاً', 'warning');
      return;
    }

    const selectedOption = medSelect.options[medSelect.selectedIndex];
    const productId = medSelect.value;
    const name = selectedOption.getAttribute('data-name');
    const nameAr = selectedOption.getAttribute('data-namear');
    const unitPrice = Number(selectedOption.getAttribute('data-price') || 0);
    const quantity = Math.max(1, parseInt(qtyInput?.value || '1', 10));

    // Check allergy contraindication if patient has allergies
    const patientSelect = document.getElementById('order-form-patient-select');
    const custId = patientSelect?.value;
    if (custId) {
      const cust = customerService.customersCache.find(c => c.id === custId);
      if (cust && Array.isArray(cust.allergies) && cust.allergies.length > 0) {
        const fullText = `${name} ${nameAr}`.toLowerCase();
        const hasPenicillin = cust.allergies.some(a => a.includes('بنسلين') || a.toLowerCase().includes('penicillin'));
        if (hasPenicillin && (fullText.includes('augmentin') || fullText.includes('أوجمنتين') || fullText.includes('amoxicillin'))) {
          showToast('تحذير حساسية البنسلين!', `المريض مسجل بحساسية البنسلين والصنف (${nameAr}) يتعارض طبياً معه!`, 'danger');
        }
      }
    }

    const existingIdx = this.items.findIndex(i => i.productId === productId);
    if (existingIdx >= 0) {
      this.items[existingIdx].quantity += quantity;
      this.items[existingIdx].lineTotal = Number((this.items[existingIdx].quantity * unitPrice).toFixed(2));
    } else {
      this.items.push({
        productId,
        name,
        nameAr,
        quantity,
        unitPrice,
        lineTotal: Number((quantity * unitPrice).toFixed(2))
      });
    }

    // Reset picker
    medSelect.value = '';
    if (qtyInput) qtyInput.value = '1';

    this.renderItemsTable();
  }

  removeItem(index) {
    if (index >= 0 && index < this.items.length) {
      this.items.splice(index, 1);
      this.renderItemsTable();
    }
  }

  updateItemQty(index, newQty) {
    if (index >= 0 && index < this.items.length) {
      const qty = Math.max(1, parseInt(newQty, 10));
      this.items[index].quantity = qty;
      this.items[index].lineTotal = Number((qty * this.items[index].unitPrice).toFixed(2));
      this.renderItemsTable();
    }
  }

  renderItemsTable() {
    const tbody = document.getElementById('order-items-tbody');
    const totalEl = document.getElementById('order-form-total-val');
    if (!tbody) return;

    if (this.items.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align:center; padding:18px; color:var(--muted-foreground); font-size:12px;">
            لم يتم إضافة أدوية للروشتة بعد. استخدم محدد الأدوية أعلاه.
          </td>
        </tr>
      `;
      if (totalEl) totalEl.textContent = '0 ج.س';
      return;
    }

    const total = this.items.reduce((sum, item) => sum + item.lineTotal, 0);
    if (totalEl) totalEl.textContent = `${total.toLocaleString()} ج.س`;

    tbody.innerHTML = this.items.map((item, idx) => `
      <tr style="border-bottom:1px solid var(--border);">
        <td style="padding:6px 10px;">
          <strong>${item.nameAr || item.name}</strong>
          <span style="font-size:11px; color:var(--muted-foreground); display:block;">${item.name}</span>
        </td>
        <td style="padding:6px 10px; width:80px;">
          <input type="number" min="1" value="${item.quantity}" class="order-item-qty-input" data-index="${idx}"
            style="width:60px; padding:4px 6px; border:1px solid var(--border); border-radius:6px; font-size:12px; font-family:var(--font-mono); text-align:center;">
        </td>
        <td style="padding:6px 10px; font-family:var(--font-mono); font-size:12px; text-align:left;">
          ${item.unitPrice.toLocaleString()} ج.س
        </td>
        <td style="padding:6px 10px; font-family:var(--font-mono); font-size:12px; font-weight:700; color:var(--primary); text-align:left;">
          ${item.lineTotal.toLocaleString()} ج.س
        </td>
        <td style="padding:6px 10px; text-align:center; width:40px;">
          <button type="button" class="btn-remove-order-item" data-index="${idx}" 
            style="background:none; border:none; color:#EF4444; font-size:15px; cursor:pointer; padding:2px;">
            &times;
          </button>
        </td>
      </tr>
    `).join('');

    // Bind item table inputs
    tbody.querySelectorAll('.order-item-qty-input').forEach(input => {
      input.addEventListener('change', (e) => {
        const idx = parseInt(e.target.getAttribute('data-index'), 10);
        this.updateItemQty(idx, e.target.value);
      });
    });

    tbody.querySelectorAll('.btn-remove-order-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-index'), 10);
        this.removeItem(idx);
      });
    });
  }

  async handleSubmit(e) {
    e.preventDefault();

    if (this.items.length === 0) {
      showToast('قائمة الأدوية فارغة', 'يرجى إضافة دواء واحد على الأقل للروشتة', 'warning');
      return;
    }

    const patientSelect = document.getElementById('order-form-patient-select');
    const nameInput = document.getElementById('order-form-customer-name');
    const phoneInput = document.getElementById('order-form-customer-phone');
    const docInput = document.getElementById('order-form-doctor');
    const rxInput = document.getElementById('order-form-rx');
    const prioritySelect = document.getElementById('order-form-priority');
    const notesInput = document.getElementById('order-form-notes');

    const customerId = patientSelect?.value || undefined;
    const customerName = nameInput?.value.trim() || 'عميل حجز مسبق';
    const customerPhone = phoneInput?.value.trim() || undefined;
    const doctorName = docInput?.value.trim() || undefined;
    const prescriptionNumber = rxInput?.value.trim() || undefined;
    const priority = prioritySelect?.value || 'REGULAR';
    const notes = notesInput?.value.trim() || undefined;

    const payload = {
      customerId,
      customerName,
      customerPhone,
      doctorName,
      prescriptionNumber,
      priority,
      items: this.items,
      notes
    };

    const submitBtn = document.getElementById('btn-save-sales-order');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'جاري تسجيل الحجز...';
    }

    try {
      const created = await salesOrderService.createOrder(payload);
      showToast('تم تسجيل أمر الحجز', `تم حجز الروشتة برقم ${created.orderNumber} للمريض ${created.customerName}`, 'success');
      this.close();
    } catch (err) {
      showToast('تعذر تسجيل الحجز', err.message || 'حدث خطأ غير متوقع', 'danger');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'تأكيد وحفظ أمر الحجز';
      }
    }
  }
}
