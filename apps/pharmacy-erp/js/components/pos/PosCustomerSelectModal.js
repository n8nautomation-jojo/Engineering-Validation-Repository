/**
 * PharmaTech — Fast Customer Selector Modal for POS Terminal
 * Optimized for rapid phone number lookup (Bankak matching) and 1-click patient linking
 */

import { customerService } from '../../services/customerService.js';
import { showToast } from '../Toast.js';

export class PosCustomerSelectModal {
  constructor(modalId = 'dialog-pos-customer-select', { onSelectCustomer, onRegisterNew } = {}) {
    this.modalId = modalId;
    this.onSelectCustomer = onSelectCustomer;
    this.onRegisterNew = onRegisterNew;
    this.searchQuery = '';
    this.init();
  }

  init() {
    const modal = document.getElementById(this.modalId);
    if (!modal) return;

    modal.querySelector('.modal-backdrop')?.addEventListener('click', () => this.close());
    modal.querySelector('.btn-modal-close')?.addEventListener('click', () => this.close());
    modal.querySelector('#btn-close-pos-customer')?.addEventListener('click', () => this.close());

    const searchInput = modal.querySelector('#pos-customer-search-input');
    searchInput?.addEventListener('input', (e) => {
      this.searchQuery = e.target.value.trim();
      this.renderList();
    });

    searchInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const topResultBtn = modal.querySelector('.btn-select-customer-item');
        if (topResultBtn) {
          topResultBtn.click();
        }
      }
    });

    modal.querySelector('#btn-pos-quick-add-customer')?.addEventListener('click', () => {
      this.close();
      if (this.onRegisterNew) this.onRegisterNew(this.searchQuery);
    });

    modal.querySelector('#btn-pos-walkin-mode')?.addEventListener('click', () => {
      this.close();
      if (this.onSelectCustomer) this.onSelectCustomer(null);
    });
  }

  async open() {
    const modal = document.getElementById(this.modalId);
    if (!modal) return;

    this.searchQuery = '';
    const searchInput = modal.querySelector('#pos-customer-search-input');
    if (searchInput) searchInput.value = '';

    modal.classList.add('is-open');

    // Ensure cache is populated
    await customerService.fetchFromBackend();
    this.renderList();

    setTimeout(() => {
      searchInput?.focus();
    }, 100);
  }

  close() {
    const modal = document.getElementById(this.modalId);
    if (modal) {
      modal.classList.remove('is-open');
    }
  }

  renderList() {
    const listContainer = document.getElementById('pos-customer-results-list');
    if (!listContainer) return;

    const matches = customerService.searchLocal(this.searchQuery);

    if (matches.length === 0) {
      listContainer.innerHTML = `
        <div style="text-align:center; padding:24px 16px; color:var(--muted-foreground);">
          <p style="margin:0 0 6px; font-weight:700; font-size:13px;">لا يوجد مريض مسجل بهذا الرقم أو الاسم</p>
          <small style="font-size:11.5px; display:block; margin-bottom:12px;">يمكنك تسجيله مباشرة الآن بنقرة واحدة</small>
          <button type="button" class="btn-primary" id="btn-pos-inline-register" style="padding:6px 14px; font-size:12px;">
            + تسجيل (${this.searchQuery || 'مريض جديد'}) الآن
          </button>
        </div>
      `;

      listContainer.querySelector('#btn-pos-inline-register')?.addEventListener('click', () => {
        this.close();
        if (this.onRegisterNew) this.onRegisterNew(this.searchQuery);
      });
      return;
    }

    listContainer.innerHTML = matches.map((cust, idx) => {
      const hasAllergies = cust.allergies && cust.allergies.length > 0;
      const typeBadge = {
        CHRONIC: '<span class="badge" style="background:#FEF3C7; color:#B45309; font-size:10px;">مزمن</span>',
        INSURANCE: '<span class="badge" style="background:#E0E7FF; color:#4338CA; font-size:10px;">تأمين</span>',
        WALK_IN: '<span class="badge" style="background:var(--muted); color:var(--muted-foreground); font-size:10px;">نقدي</span>'
      }[cust.type] || '';

      return `
        <div class="pos-customer-card" style="display:flex; justify-content:space-between; align-items:center; background:var(--background); border:1px solid var(--border); border-radius:8px; padding:10px 12px; margin-bottom:8px; transition:border-color 0.15s ease;">
          <div style="flex:1; min-width:0;">
            <div style="display:flex; align-items:center; gap:8px;">
              <strong style="font-size:13px; color:var(--foreground);">${cust.name}</strong>
              ${typeBadge}
              <span dir="ltr" style="font-size:11.5px; font-family:var(--font-mono); color:var(--primary); font-weight:700;">${cust.id}</span>
            </div>
            
            <div style="display:flex; align-items:center; gap:12px; margin-top:3px; font-size:11.5px; color:var(--muted-foreground);">
              <span dir="ltr" style="font-family:var(--font-mono);">${cust.phone || 'بدون هاتف'}</span>
              <span>مشتريات: <strong dir="ltr">${Number(cust.totalPurchases || 0).toLocaleString()} ج.س</strong></span>
            </div>

            ${hasAllergies ? `
              <div style="margin-top:4px; font-size:10.5px; font-weight:700; color:#BE123C;">
                ⚠️ حساسية: ${cust.allergies.join('، ')}
              </div>
            ` : ''}
          </div>

          <button type="button" class="btn-primary btn-select-customer-item" data-id="${cust.id}" style="padding:6px 14px; font-size:12px; font-weight:700; background:var(--primary); white-space:nowrap;">
            اختيار للصرف
          </button>
        </div>
      `;
    }).join('');

    listContainer.querySelectorAll('.btn-select-customer-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const cust = matches.find(m => m.id === id);
        if (cust && this.onSelectCustomer) {
          this.close();
          this.onSelectCustomer(cust);
        }
      });
    });
  }
}
