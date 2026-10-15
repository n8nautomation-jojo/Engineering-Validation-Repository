/**
 * PharmaTech — Customers & Patients Management View Component
 * Enterprise Patient Directory with Clinical Profiles, Chronic Disease Monitoring, and POS Integration
 */

import { customerService } from '../services/customerService.js';
import { CustomerModal } from './customers/CustomerModal.js';
import { CustomerDetailModal } from './customers/CustomerDetailModal.js';
import { appStore } from '../state/store.js';
import { showToast } from './Toast.js';

export class CustomersView {
  constructor() {
    this.container = document.getElementById('customers-view');
    this.searchQuery = '';
    this.selectedType = 'ALL';

    this.formModal = new CustomerModal('dialog-customer-form');
    this.detailModal = new CustomerDetailModal('dialog-customer-detail', {
      onEdit: (cust) => this.formModal.open(cust),
      onSelectForPos: (cust) => this.selectCustomerForPos(cust)
    });

    this.init();
  }

  init() {
    if (!this.container) return;

    window.addEventListener('CUSTOMERS_UPDATED', () => {
      this.refreshData();
    });

    window.addEventListener('SALES_UPDATED', () => {
      this.refreshData();
    });

    // Expose global bridge for table inline buttons
    window.openCustomerDetail = (id) => this.detailModal.open(id);
    window.openCustomerEdit = async (id) => {
      const cust = await customerService.getCustomerById(id);
      if (cust) this.formModal.open(cust);
    };
    window.posDispenseCustomer = async (id) => {
      const cust = await customerService.getCustomerById(id);
      if (cust) this.selectCustomerForPos(cust);
    };

    this.render();
    this.refreshData();
  }

  async refreshData() {
    await Promise.all([
      customerService.fetchFromBackend({
        search: this.searchQuery,
        type: this.selectedType
      }),
      customerService.fetchStats()
    ]);
    this.renderKPIs();
    this.renderTable();
  }

  selectCustomerForPos(customer) {
    // Dispatch event to POS View to set active customer
    window.dispatchEvent(new CustomEvent('POS_SET_CUSTOMER', { detail: customer }));

    // Switch view to POS
    const posNavBtn = document.querySelector('.nav-button[data-view="pos"]');
    if (posNavBtn) {
      posNavBtn.click();
    }

    showToast('تم ربط المريض بنقطة البيع', `تم اختيار (${customer.name}) لإصدار فاتورة صرف دوائي له`, 'info');
  }

  render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <!-- KPI Stats Summary Cards -->
      <div class="stats-grid" id="customers-kpi-grid" style="margin-bottom:20px; display:grid; grid-template-columns:repeat(auto-fit, minmax(210px, 1fr)); gap:14px;">
        <!-- Populated via renderKPIs -->
      </div>

      <!-- Main Panel / Table -->
      <div class="panel" style="background:var(--card); border:1px solid var(--border); border-radius:12px; padding:20px;">
        <!-- Actions & Filter Toolbar -->
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:16px;">
          <!-- Search & Filters -->
          <div style="display:flex; align-items:center; gap:10px; flex:1; min-width:280px; max-width:600px;">
            <div style="position:relative; flex:1;">
              <input type="text" id="customers-search-input" placeholder="بحث باسم المريض، رقم الهاتف، أو المرض المزمن..." 
                style="width:100%; padding:9px 36px 9px 12px; border:1px solid var(--border); border-radius:8px; background:var(--background); color:var(--foreground); font-size:13px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" 
                style="position:absolute; right:12px; top:50%; transform:translateY(-50%); color:var(--muted-foreground); pointer-events:none;">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </div>

            <div style="display:flex; gap:4px;" id="customers-type-chips">
              <button type="button" class="btn-table-action active" data-type="ALL" style="padding:6px 12px; font-size:12px; border-radius:6px;">الكل</button>
              <button type="button" class="btn-table-action" data-type="CHRONIC" style="padding:6px 12px; font-size:12px; border-radius:6px;">أمراض مزمنة</button>
              <button type="button" class="btn-table-action" data-type="INSURANCE" style="padding:6px 12px; font-size:12px; border-radius:6px;">تأمين صحي</button>
              <button type="button" class="btn-table-action" data-type="WALK_IN" style="padding:6px 12px; font-size:12px; border-radius:6px;">نقدي</button>
            </div>
          </div>

          <!-- Action Buttons -->
          <div style="display:flex; align-items:center; gap:8px;">
            <button type="button" class="btn-table-action" id="btn-export-customers-csv" style="padding:8px 14px; font-size:12.5px; display:inline-flex; align-items:center; gap:6px;">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
              تصدير الدليل CSV
            </button>

            <button type="button" class="btn-primary" id="btn-open-add-customer" style="padding:8px 16px; font-size:13px; font-weight:700; display:inline-flex; align-items:center; gap:6px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              تسجيل مريض جديد
            </button>
          </div>
        </div>

        <!-- Patients Table -->
        <div style="overflow-x:auto; border:1px solid var(--border); border-radius:8px;">
          <table style="width:100%; border-collapse:collapse; text-align:right;">
            <thead style="background:var(--muted); border-bottom:1px solid var(--border); font-size:12.5px; color:var(--muted-foreground);">
              <tr>
                <th style="padding:10px 14px;">كود الملف</th>
                <th style="padding:10px 14px;">اسم المريض / العميل</th>
                <th style="padding:10px 14px;">رقم الهاتف</th>
                <th style="padding:10px 14px;">التصنيف</th>
                <th style="padding:10px 14px;">الأمراض المزمنة والحساسية</th>
                <th style="padding:10px 14px;">إجمالي المشتريات</th>
                <th style="padding:10px 14px;">آخر صرف</th>
                <th style="padding:10px 14px; text-align:center;">إجراءات سريعة</th>
              </tr>
            </thead>
            <tbody id="customers-table-body">
              <!-- Populated via renderTable -->
            </tbody>
          </table>
        </div>
      </div>
    `;

    this.bindEvents();
    this.renderKPIs();
    this.renderTable();
  }

  bindEvents() {
    const searchInput = document.getElementById('customers-search-input');
    let debounceTimer;
    searchInput?.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        this.searchQuery = e.target.value.trim();
        this.refreshData();
      }, 250);
    });

    const chips = document.querySelectorAll('#customers-type-chips .btn-table-action');
    chips.forEach(btn => {
      btn.addEventListener('click', () => {
        chips.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.selectedType = btn.dataset.type;
        this.refreshData();
      });
    });

    document.getElementById('btn-open-add-customer')?.addEventListener('click', () => {
      this.formModal.open(null);
    });

    document.getElementById('btn-export-customers-csv')?.addEventListener('click', () => {
      this.exportCsv();
    });
  }

  renderKPIs() {
    const grid = document.getElementById('customers-kpi-grid');
    if (!grid) return;

    const stats = customerService.stats;

    grid.innerHTML = `
      <div class="stat-card" style="background:var(--card); border:1px solid var(--border); border-radius:10px; padding:14px 16px;">
        <div style="font-size:12px; color:var(--muted-foreground); margin-bottom:4px;">إجمالي المرضى المسجلين</div>
        <div style="display:flex; justify-content:space-between; align-items:baseline;">
          <strong style="font-size:22px; color:var(--foreground);">${stats.totalCustomers || 0}</strong>
          <span class="badge" style="background:var(--muted); color:var(--muted-foreground); font-size:11px;">ملف نشط</span>
        </div>
      </div>

      <div class="stat-card" style="background:var(--card); border:1px solid var(--border); border-radius:10px; padding:14px 16px;">
        <div style="font-size:12px; color:var(--muted-foreground); margin-bottom:4px;">مرضى الأمراض المزمنة</div>
        <div style="display:flex; justify-content:space-between; align-items:baseline;">
          <strong style="font-size:22px; color:#B45309;">${stats.chronicPatients || 0}</strong>
          <span class="badge" style="background:#FEF3C7; color:#B45309; font-size:11px;">متابعة دورية</span>
        </div>
      </div>

      <div class="stat-card" style="background:var(--card); border:1px solid var(--border); border-radius:10px; padding:14px 16px;">
        <div style="font-size:12px; color:var(--muted-foreground); margin-bottom:4px;">عملاء التأمين الصحي</div>
        <div style="display:flex; justify-content:space-between; align-items:baseline;">
          <strong style="font-size:22px; color:#4338CA;">${stats.insurancePatients || 0}</strong>
          <span class="badge" style="background:#E0E7FF; color:#4338CA; font-size:11px;">شيكان والوطنية</span>
        </div>
      </div>

      <div class="stat-card" style="background:var(--card); border:1px solid var(--border); border-radius:10px; padding:14px 16px;">
        <div style="font-size:12px; color:var(--muted-foreground); margin-bottom:4px;">إجمالي المشتريات التراكمية</div>
        <div style="display:flex; justify-content:space-between; align-items:baseline;">
          <strong dir="ltr" style="font-size:20px; color:var(--primary);">${Number(stats.totalPurchasesAmount || 0).toLocaleString()} ج.س</strong>
          <span class="badge" style="background:#E6F8F2; color:#00B37E; font-size:11px;">مبيعات دورية</span>
        </div>
      </div>
    `;
  }

  renderTable() {
    const tbody = document.getElementById('customers-table-body');
    if (!tbody) return;

    const customers = customerService.customersCache;

    if (customers.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align:center; padding:32px 16px; color:var(--muted-foreground);">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom:8px; opacity:0.5;">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <p style="margin:0; font-size:13px; font-weight:700;">لا توجد سجلات مطابقة للبحث</p>
            <small style="font-size:11.5px;">تأكد من كتابة الاسم أو رقم الهاتف بشكل صحيح، أو اضغط على "تسجيل مريض جديد"</small>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = customers.map(cust => {
      const typeBadge = {
        CHRONIC: '<span class="badge" style="background:#FEF3C7; color:#B45309; font-size:11px;">مريض مزمن</span>',
        INSURANCE: `<span class="badge" style="background:#E0E7FF; color:#4338CA; font-size:11px;">تأمين (${cust.insuranceDetails?.provider || 'معتمد'})</span>`,
        WALK_IN: '<span class="badge" style="background:var(--muted); color:var(--muted-foreground); font-size:11px;">نقدي عابر</span>'
      }[cust.type] || '<span class="badge">عام</span>';

      const conditionsHtml = (cust.chronicConditions || []).slice(0, 2).map(c => `
        <span style="display:inline-block; background:rgba(245,158,11,0.1); color:#B45309; border-radius:4px; font-size:11px; padding:1px 6px; margin:2px;">
          ${c.split('(')[0].trim()}
        </span>
      `).join('');

      const allergiesHtml = (cust.allergies || []).map(a => `
        <span style="display:inline-block; background:rgba(225,29,72,0.1); color:#BE123C; border-radius:4px; font-size:11px; font-weight:700; padding:1px 6px; margin:2px;">
          ⚠️ ${a.split('(')[0].trim()}
        </span>
      `).join('');

      const lastVisit = cust.lastVisitAt ? new Date(cust.lastVisitAt).toLocaleDateString('ar-SD') : '—';

      return `
        <tr style="border-bottom:1px solid var(--border); transition:background 0.15s ease;">
          <td style="padding:10px 14px; font-family:var(--font-mono); font-weight:700; color:var(--primary);">${cust.id}</td>
          <td style="padding:10px 14px; font-weight:700;">${cust.name}</td>
          <td style="padding:10px 14px; font-family:var(--font-mono);" dir="ltr">${cust.phone || '—'}</td>
          <td style="padding:10px 14px;">${typeBadge}</td>
          <td style="padding:10px 14px; max-width:240px;">
            ${conditionsHtml || ''}
            ${allergiesHtml || ''}
            ${(!conditionsHtml && !allergiesHtml) ? '<span style="color:var(--muted-foreground); font-size:11.5px;">سليم / لا توجد موانع</span>' : ''}
          </td>
          <td style="padding:10px 14px; font-weight:700;" dir="ltr">${Number(cust.totalPurchases || 0).toLocaleString()} ج.س</td>
          <td style="padding:10px 14px; font-size:11.5px; color:var(--muted-foreground);">${lastVisit}</td>
          <td style="padding:10px 14px; text-align:center;">
            <div style="display:inline-flex; align-items:center; gap:6px;">
              <button type="button" class="btn-table-action" onclick="openCustomerDetail('${cust.id}')" title="عرض السجل الطبي وتاريخ المبيعات" style="padding:4px 8px; font-size:11.5px;">
                الملف الكامل
              </button>
              <button type="button" class="btn-table-action" onclick="openCustomerEdit('${cust.id}')" title="تعديل بيانات المريض" style="padding:4px 8px; font-size:11.5px;">
                تعديل
              </button>
              <button type="button" class="btn-primary" onclick="posDispenseCustomer('${cust.id}')" title="بدء صرف في شاشة الكاشير" style="padding:4px 10px; font-size:11.5px; font-weight:700; background:#00B37E; border-color:#00B37E;">
                صرف POS
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  exportCsv() {
    const customers = customerService.customersCache;
    if (customers.length === 0) {
      showToast('تنبيه', 'لا توجد بيانات مرضى لتصديرها', 'warning');
      return;
    }

    const headers = ['كود الملف', 'الاسم', 'الهاتف', 'النوع', 'الأمراض المزمنة', 'الحساسية', 'إجمالي المشتريات (ج.س)', 'عدد الزيارات', 'آخر زيارة'];
    const rows = customers.map(c => [
      c.id,
      `"${c.name.replace(/"/g, '""')}"`,
      c.phone || '',
      c.type,
      `"${(c.chronicConditions || []).join('; ').replace(/"/g, '""')}"`,
      `"${(c.allergies || []).join('; ').replace(/"/g, '""')}"`,
      c.totalPurchases || 0,
      c.visitsCount || 0,
      c.lastVisitAt || ''
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pharmatech_patients_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('تم التصدير بنجاح', `تم تنزيل ملف CSV يحتوي على ${customers.length} مريض`, 'success');
  }
}
