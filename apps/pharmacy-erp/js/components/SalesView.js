/**
 * PharmaTech — Official Sales & Invoices Ledger Component
 * Fetches, filters and displays completed sales from the Core Backend API
 * Allows viewing invoice details and reprinting 80mm thermal receipts
 */

import { apiClient } from '../services/apiClient.js';
import { showToast } from './Toast.js';

export class SalesView {
  constructor() {
    this.container = document.getElementById('sales-history-view');
    this.sales = [];
    this.query = '';
    this.filterMethod = 'ALL';
    this.isLoading = false;

    this.init();
  }

  init() {
    if (!this.container) return;

    // Listen to refresh triggers
    window.addEventListener('SALES_UPDATED', () => this.loadSales());

    // Initial load
    this.loadSales();
  }

  async loadSales() {
    this.isLoading = true;
    try {
      this.sales = await apiClient.get('/api/sales');
      this.render();
    } catch (err) {
      console.warn('[SalesView] Failed to load sales from backend:', err.message);
      this.sales = [];
      this.render();
    } finally {
      this.isLoading = false;
    }
  }

  getFilteredSales() {
    const q = this.query.toLowerCase().trim();
    return this.sales.filter(s => {
      const matchQuery = !q ||
        s.invoice_number.toLowerCase().includes(q) ||
        (s.customer_name && s.customer_name.toLowerCase().includes(q)) ||
        (s.cashier_name && s.cashier_name.toLowerCase().includes(q)) ||
        (s.items && s.items.some(i => (i.name && i.name.toLowerCase().includes(q)) || (i.nameAr && i.nameAr.toLowerCase().includes(q))));

      let matchMethod = true;
      if (this.filterMethod !== 'ALL') {
        matchMethod = s.payments && s.payments.some(p => {
          if (this.filterMethod === 'BANKAK') return p.method === 'BANK_TRANSFER' || p.method === 'BANKAK';
          if (this.filterMethod === 'CASH') return p.method === 'CASH';
          return true;
        });
      }

      return matchQuery && matchMethod;
    });
  }

  render() {
    if (!this.container) return;

    const filtered = this.getFilteredSales();

    // Calculate metrics
    const totalRevenue = this.sales.reduce((sum, s) => sum + (s.status === 'COMPLETED' ? parseFloat(s.totals.total || 0) : 0), 0);
    const bankakTotal = this.sales.reduce((sum, s) => {
      if (s.status !== 'COMPLETED') return sum;
      const bankakPay = (s.payments || []).find(p => p.method === 'BANK_TRANSFER' || p.method === 'BANKAK');
      return sum + (bankakPay ? parseFloat(bankakPay.amount.value || 0) : 0);
    }, 0);
    const cashTotal = this.sales.reduce((sum, s) => {
      if (s.status !== 'COMPLETED') return sum;
      const cashPay = (s.payments || []).find(p => p.method === 'CASH');
      return sum + (cashPay ? parseFloat(cashPay.amount.value || 0) : 0);
    }, 0);

    this.container.innerHTML = `
      <!-- Sales Summary Top Cards -->
      <div class="stats-grid" style="margin-bottom: 20px;">
        <div class="stat-card featured">
          <div class="stat-top">
            <span class="stat-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
              </svg>
            </span>
            <span class="chip chip-success">مكتملة رسمياً</span>
          </div>
          <div class="stat-value num" dir="ltr">${Number(totalRevenue).toLocaleString()} <small>ج.س</small></div>
          <div class="stat-label">إجمالي إيراد المبيعات المسجلة</div>
        </div>

        <div class="stat-card">
          <div class="stat-top">
            <span class="stat-icon info">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1Z" />
              </svg>
            </span>
            <span class="chip chip-success">${this.sales.length} فواتير</span>
          </div>
          <div class="stat-value num">${this.sales.length} <small>فاتورة</small></div>
          <div class="stat-label">إجمالي الفواتير الصادرة بالوردية</div>
        </div>

        <div class="stat-card">
          <div class="stat-top">
            <span class="stat-icon" style="background:#EBF5FF; color:#0052CC;">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect width="20" height="14" x="2" y="5" rx="2" />
                <line x1="2" x2="22" y1="10" y2="10" />
              </svg>
            </span>
            <span class="chip" style="background:#EBF5FF; color:#0052CC; font-weight:700;">Bankak</span>
          </div>
          <div class="stat-value num" dir="ltr" style="color:#0052CC;">${Number(bankakTotal).toLocaleString()} <small>ج.س</small></div>
          <div class="stat-label">مبيعات تطبيق بنكك المؤكدة</div>
        </div>

        <div class="stat-card">
          <div class="stat-top">
            <span class="stat-icon" style="background:#ECFDF5; color:#00B37E;">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
                <path d="M12 18V6" />
              </svg>
            </span>
            <span class="chip chip-success">Cash</span>
          </div>
          <div class="stat-value num" dir="ltr" style="color:#00B37E;">${Number(cashTotal).toLocaleString()} <small>ج.س</small></div>
          <div class="stat-label">المقبوضات النقدية المباشرة</div>
        </div>
      </div>

      <!-- Table Panel -->
      <div class="panel-head wrap">
        <div class="panel-title">
          <span class="title-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1Z" />
            </svg>
          </span>
          <h2>سجل الفواتير والمبيعات المعتمدة</h2>
          <span class="chip">${filtered.length} فاتورة</span>
        </div>

        <div class="inventory-controls">
          <label class="table-search">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" x2="16.65" y1="21" y2="16.65" />
            </svg>
            <input id="sales-search-input" value="${this.query}" placeholder="بحث برقم الفاتورة أو العميل..." />
          </label>

          <div class="segmented" id="sales-filter-segmented">
            <button data-method="ALL" class="${this.filterMethod === 'ALL' ? 'active' : ''}">الكل</button>
            <button data-method="BANKAK" class="${this.filterMethod === 'BANKAK' ? 'active' : ''}">بنكك</button>
            <button data-method="CASH" class="${this.filterMethod === 'CASH' ? 'active' : ''}">نقداً</button>
          </div>

          <button class="btn-secondary" id="btn-sales-refresh" title="تحديث السجل">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 2v6h-6" />
              <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
              <path d="M3 22v-6h6" />
              <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
            </svg>
            تحديث
          </button>
        </div>
      </div>

      <!-- Sales Table -->
      <div class="table-scroll">
        <table class="data-table">
          <thead>
            <tr>
              <th>رقم الفاتورة</th>
              <th>التاريخ والوقت</th>
              <th>الصيدلي / الكاشير</th>
              <th>الأصناف والتشغيلات</th>
              <th>طريقة السداد</th>
              <th>الإجمالي الصافي</th>
              <th>الحالة</th>
              <th style="text-align:left;">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.length === 0 ? `
              <tr>
                <td colspan="8" style="text-align:center; padding: 40px; color:var(--muted-foreground);">
                  لا توجد فواتير مطابقة للبحث
                </td>
              </tr>
            ` : filtered.map(s => {
              const isBankak = s.payments && s.payments.some(p => p.method === 'BANK_TRANSFER' || p.method === 'BANKAK');
              const bankakRef = isBankak ? s.payments.find(p => p.method === 'BANK_TRANSFER' || p.method === 'BANKAK')?.evidence_reference : '';
              const dateFormatted = new Date(s.created_at).toLocaleString('ar-SD', { dateStyle: 'short', timeStyle: 'short' });
              const itemsCount = (s.items || []).length;
              const itemsPreview = (s.items || []).map(i => `${i.nameAr || i.name} (${i.quantity})`).slice(0, 2).join('، ') + (itemsCount > 2 ? ` +${itemsCount - 2}` : '');

              return `
                <tr>
                  <td>
                    <strong style="color:var(--primary); font-family:var(--font-mono); font-size:13px;" dir="ltr">${s.invoice_number}</strong>
                  </td>
                  <td>
                    <span style="font-size:12px; color:var(--muted-foreground);">${dateFormatted}</span>
                  </td>
                  <td>
                    <span style="font-size:12.5px; font-weight:600;">${s.cashier_name || 'د. أحمد الطاهر'}</span>
                  </td>
                  <td>
                    <div style="font-size:12px;">
                      <span>${itemsPreview || `${itemsCount} صنف`}</span>
                    </div>
                  </td>
                  <td>
                    ${isBankak ? `
                      <span class="chip" style="background:#EBF5FF; color:#0052CC; font-weight:700; font-size:11px;" title="${bankakRef || 'بنكك'}">
                        بنكك ${bankakRef ? `· ${bankakRef}` : ''}
                      </span>
                    ` : `
                      <span class="chip" style="background:#ECFDF5; color:#00B37E; font-weight:700; font-size:11px;">
                        نقداً
                      </span>
                    `}
                  </td>
                  <td>
                    <strong style="font-size:13px;" dir="ltr">${Number(s.totals.total).toLocaleString()} ج.س</strong>
                  </td>
                  <td>
                    <span class="chip ${s.status === 'COMPLETED' ? 'chip-success' : 'chip-warning'}">
                      ${s.status === 'COMPLETED' ? 'مكتملة' : 'ملغاة'}
                    </span>
                  </td>
                  <td style="text-align:left;">
                    <button class="btn-table-action" onclick="window.salesReprintReceipt('${s.invoice_number}')" title="طباعة الإيصال الحراري 80mm">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="6 9 6 2 18 2 18 9" />
                        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                        <rect width="12" height="8" x="6" y="14" />
                      </svg>
                      طباعة الإيصال
                    </button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    const searchInput = document.getElementById('sales-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.query = e.target.value;
        this.render();
        // Restore focus
        const nextInput = document.getElementById('sales-search-input');
        if (nextInput) {
          nextInput.focus();
          nextInput.selectionStart = nextInput.selectionEnd = nextInput.value.length;
        }
      });
    }

    const segmented = document.getElementById('sales-filter-segmented');
    if (segmented) {
      segmented.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => {
          this.filterMethod = btn.dataset.method;
          this.render();
        });
      });
    }

    const refreshBtn = document.getElementById('btn-sales-refresh');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        this.loadSales();
        showToast('تم التحديث', 'تم جلب أحدث الفواتير من الباك إند', 'info');
      });
    }

    // Global bridge for reprint action
    window.salesReprintReceipt = (invNo) => {
      const sale = this.sales.find(s => s.invoice_number === invNo);
      window.dispatchEvent(new CustomEvent('OPEN_RECEIPT_MODAL', { detail: sale || invNo }));
    };
  }
}
