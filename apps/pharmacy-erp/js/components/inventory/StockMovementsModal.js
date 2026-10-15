/**
 * PharmaTech — Stock Movements & Inventory Regulatory Audit Modal Component
 * Displays an immutable audit trail of all physical stock additions (GRN), POS FEFO dispensations,
 * customer returns, and inventory adjustments with timestamps, users, references, and running quantities.
 */

import { MedicineService } from '../../services/medicineService.js';
import { showToast } from '../Toast.js';

export class StockMovementsModal {
  constructor(dialogId = 'dialog-stock-movements') {
    this.dialog = document.getElementById(dialogId);
    this.currentMedicineFilter = null;
    this.movements = [];
    this.stats = null;
    this.activeTypeFilter = 'ALL';
    this.searchQuery = '';

    this.init();
  }

  init() {
    if (!this.dialog) return;

    this.dialog.querySelector('.dialog-close')?.addEventListener('click', () => this.close());
    this.dialog.querySelector('#btn-close-movements-modal')?.addEventListener('click', () => this.close());

    this.dialog.addEventListener('click', (e) => {
      if (e.target === this.dialog) this.close();
    });

    // Search filter
    const searchInput = this.dialog.querySelector('#movements-search-input');
    searchInput?.addEventListener('input', (e) => {
      this.searchQuery = e.target.value.trim();
      this.applyLocalFilters();
    });

    // Movement type filter
    const typeSelect = this.dialog.querySelector('#movements-type-filter');
    typeSelect?.addEventListener('change', (e) => {
      this.activeTypeFilter = e.target.value;
      this.applyLocalFilters();
    });

    // Print button
    this.dialog.querySelector('#btn-print-movements')?.addEventListener('click', () => {
      this.printMovements();
    });

    // Export CSV button
    this.dialog.querySelector('#btn-export-movements-csv')?.addEventListener('click', () => {
      this.exportCSV();
    });

    // Listen for live movements or catalog updates
    window.addEventListener('CATALOG_UPDATED', () => {
      if (!this.dialog.classList.contains('hidden')) {
        this.loadData();
      }
    });
  }

  async open(medicine = null) {
    if (!this.dialog) return;
    this.currentMedicineFilter = medicine;

    const titleEl = this.dialog.querySelector('#movements-modal-title');
    const descEl = this.dialog.querySelector('#movements-modal-desc');

    if (medicine) {
      if (titleEl) titleEl.textContent = `سجل حركات دواء: ${medicine.name}`;
      if (descEl) descEl.textContent = `تتبع الوارد والمنصرف والتسويات للتشغيلات الخاصة بالصنف (${medicine.sku || medicine.id})`;
    } else {
      if (titleEl) titleEl.textContent = 'سجل حركات المخزون والتسويات الرقابي العام';
      if (descEl) descEl.textContent = 'سجل غير قابل للتعديل يوثق جميع التوريدات، مبيعات الصيدلية FEFO، المردودات، وفروقات الجرد';
    }

    this.dialog.classList.remove('hidden');
    await this.loadData();
  }

  close() {
    this.dialog?.classList.add('hidden');
    this.currentMedicineFilter = null;
    this.searchQuery = '';
    const searchInput = this.dialog?.querySelector('#movements-search-input');
    if (searchInput) searchInput.value = '';
    const typeSelect = this.dialog?.querySelector('#movements-type-filter');
    if (typeSelect) typeSelect.value = 'ALL';
    this.activeTypeFilter = 'ALL';
  }

  async loadData() {
    const tableBody = this.dialog?.querySelector('#movements-table-body');
    if (tableBody) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align:center; padding:24px; color:var(--muted-foreground);">
            <div style="display:inline-flex; align-items:center; gap:8px;">
              <span class="loading-spinner"></span>
              جاري استدعاء سجل الحركات الرقابي من السيرفر...
            </div>
          </td>
        </tr>
      `;
    }

    try {
      const filters = {};
      if (this.currentMedicineFilter) {
        filters.productId = this.currentMedicineFilter.id;
      }

      const [movements, stats] = await Promise.all([
        MedicineService.fetchStockMovements(filters),
        MedicineService.fetchStockMovementsStats()
      ]);

      this.movements = movements || [];
      this.stats = stats || null;

      this.renderStats(this.stats);
      this.applyLocalFilters();
    } catch (err) {
      console.error('[StockMovementsModal] Load error:', err);
      if (tableBody) {
        tableBody.innerHTML = `
          <tr>
            <td colspan="7" style="text-align:center; padding:20px; color:var(--destructive);">
              تعذر تحميل سجل الحركات: ${err.message}
            </td>
          </tr>
        `;
      }
    }
  }

  renderStats(stats) {
    if (!stats) return;

    const totalEl = this.dialog?.querySelector('#stat-movements-total');
    const inEl = this.dialog?.querySelector('#stat-movements-in');
    const outEl = this.dialog?.querySelector('#stat-movements-out');
    const netEl = this.dialog?.querySelector('#stat-movements-net');

    if (totalEl) totalEl.textContent = stats.totalMovements || this.movements.length;
    if (inEl) inEl.textContent = `+${stats.totalInUnits || 0} عبوة`;
    if (outEl) outEl.textContent = `-${stats.totalOutUnits || 0} عبوة`;
    
    if (netEl) {
      const net = (stats.totalInUnits || 0) - (stats.totalOutUnits || 0);
      netEl.textContent = `${net >= 0 ? '+' : ''}${net} عبوة`;
      netEl.style.color = net >= 0 ? '#00B37E' : '#E11D48';
    }
  }

  applyLocalFilters() {
    let filtered = [...this.movements];

    if (this.activeTypeFilter !== 'ALL') {
      filtered = filtered.filter(m => m.movementType === this.activeTypeFilter);
    }

    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      filtered = filtered.filter(m =>
        m.productName.toLowerCase().includes(q) ||
        (m.productNameAr && m.productNameAr.toLowerCase().includes(q)) ||
        m.batchNumber.toLowerCase().includes(q) ||
        m.referenceId.toLowerCase().includes(q) ||
        (m.performedBy && m.performedBy.toLowerCase().includes(q)) ||
        (m.notes && m.notes.toLowerCase().includes(q))
      );
    }

    this.renderTable(filtered);
  }

  renderTable(list) {
    const tableBody = this.dialog?.querySelector('#movements-table-body');
    const countBadge = this.dialog?.querySelector('#movements-filtered-count');

    if (countBadge) {
      countBadge.textContent = `${list.length} حركة مسجلة`;
    }

    if (!tableBody) return;

    if (list.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align:center; padding:32px 16px; color:var(--muted-foreground);">
            <div style="font-size:14px; font-weight:600; margin-bottom:4px;">لا توجد حركات مخزون مطابقة للبحث المحدد</div>
            <div style="font-size:12px;">تأكد من شروط الفلترة أو رقم التشغيلة المدخل</div>
          </td>
        </tr>
      `;
      return;
    }

    const typeConfigs = {
      GOODS_RECEIPT: {
        label: 'توريد مشتريات',
        chipClass: 'chip-success',
        icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />'
      },
      SALE_DISPENSE: {
        label: 'صرف مبيعات (FEFO)',
        chipClass: 'chip-info',
        icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M19.5 12h-15" />'
      },
      SALE_RETURN: {
        label: 'مردودات مبيعات',
        chipClass: 'chip-warning',
        icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />'
      },
      STOCK_ADJUSTMENT: {
        label: 'تسوية جردية',
        chipClass: 'chip-primary',
        icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />'
      },
      DAMAGE_DISPOSAL: {
        label: 'استبعاد وتالف',
        chipClass: 'chip-danger',
        icon: '<path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />'
      }
    };

    tableBody.innerHTML = list.map(m => {
      const cfg = typeConfigs[m.movementType] || { label: m.movementTypeAr || m.movementType, chipClass: 'chip-muted', icon: '' };
      const isIncoming = m.direction === 'IN';
      const dateFormatted = new Date(m.timestamp).toLocaleDateString('ar-SD', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      return `
        <tr style="border-bottom:1px solid var(--border); font-size:12.5px;">
          <!-- 1. Timestamp -->
          <td style="padding:10px 12px; white-space:nowrap; color:var(--muted-foreground);" dir="ltr">
            ${dateFormatted}
          </td>

          <!-- 2. Type & Direction -->
          <td style="padding:10px 12px; white-space:nowrap;">
            <span class="chip ${cfg.chipClass}" style="display:inline-flex; align-items:center; gap:5px; font-size:11px; font-weight:700; padding:2px 8px;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                ${cfg.icon}
              </svg>
              ${cfg.label}
            </span>
          </td>

          <!-- 3. Medicine Details -->
          <td style="padding:10px 12px;">
            <div style="font-weight:700; color:var(--foreground);">${m.productNameAr || m.productName}</div>
            <small style="color:var(--muted-foreground); font-size:11px;">${m.productName} · كود: ${m.productId}</small>
          </td>

          <!-- 4. Batch & Expiry -->
          <td style="padding:10px 12px; white-space:nowrap;">
            <div style="font-family:var(--font-mono); font-weight:700;" dir="ltr">${m.batchNumber}</div>
            <small style="color:var(--muted-foreground); font-size:11px;">تنتهي: <span dir="ltr">${m.expiryDate || '-'}</span></small>
          </td>

          <!-- 5. Quantity & Impact -->
          <td style="padding:10px 12px; white-space:nowrap;">
            <strong style="color:${isIncoming ? '#00B37E' : '#E11D48'}; font-size:13px;" dir="ltr">
              ${isIncoming ? '+' : '-'}${m.quantity} ${m.unit || 'عبوة'}
            </strong>
          </td>

          <!-- 6. Reference Number -->
          <td style="padding:10px 12px; white-space:nowrap;">
            <span class="badge" style="font-family:var(--font-mono); font-size:11.5px; background:var(--muted); padding:3px 7px; border-radius:4px;" dir="ltr">
              ${m.referenceId}
            </span>
          </td>

          <!-- 7. Performed By & Notes -->
          <td style="padding:10px 12px; max-width:200px;">
            <div style="font-weight:600; color:var(--foreground); font-size:11.5px;">${m.performedBy}</div>
            ${m.notes ? `<div style="color:var(--muted-foreground); font-size:11px; text-overflow:ellipsis; overflow:hidden; white-space:nowrap;" title="${m.notes}">${m.notes}</div>` : ''}
          </td>
        </tr>
      `;
    }).join('');
  }

  printMovements() {
    document.body.classList.add('printing-movements');
    this.dialog?.classList.add('is-printing');
    window.print();
    setTimeout(() => {
      document.body.classList.remove('printing-movements');
      this.dialog?.classList.remove('is-printing');
    }, 500);
  }

  exportCSV() {
    if (this.movements.length === 0) {
      showToast('لا توجد بيانات', 'لا توجد حركات مخزون لتصديرها', 'warning');
      return;
    }

    const csvContent = '\uFEFF' + [
      'المعرف,التاريخ_والوقت,نوع_الحركة,الاتجاه,الدواء,رقم_التشغيلة,تاريخ_الانتهاء,الكمية,الرقم_المرجعي,المسؤول,البيان',
      ...this.movements.map(m => `"${m.id}","${m.timestamp}","${m.movementTypeAr}","${m.direction}","${m.productNameAr || m.productName}","${m.batchNumber}","${m.expiryDate}",${m.quantity},"${m.referenceId}","${m.performedBy}","${(m.notes || '').replace(/"/g, '""')}"`)
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `PharmaTech-Stock-Movements-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    showToast('تم التصدير بنجاح', `تم تنزيل كشف الحركات (${this.movements.length} حركة)`, 'success');
  }
}
