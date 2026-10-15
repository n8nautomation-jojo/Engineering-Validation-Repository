/**
 * PharmaTech — Stock Transfers & Multi-Warehouse List Component
 * Renders inter-warehouse routing orders, batch transfer cards, and stock intake approval actions.
 */

import { transferService } from '../../services/transferService.js';
import { showToast } from '../Toast.js';

export class StockTransfersList {
  constructor(containerId, options = {}) {
    this.containerId = containerId;
    this.container = document.getElementById(containerId);
    this.options = options;
    this.transfers = [];
    this.stats = { totalTransfers: 0, pendingCount: 0, completedCount: 0, cancelledCount: 0, totalUnitsTransferred: 0, warehousesCount: 0 };
    this.query = '';
    this.statusFilter = 'ALL';
    this.warehouseFilter = 'ALL';
    this.isLoading = false;
  }

  async loadData() {
    this.isLoading = true;
    try {
      const [transfers, stats] = await Promise.all([
        transferService.fetchTransfers(),
        transferService.fetchStats()
      ]);
      this.transfers = transfers;
      this.stats = stats;
      this.render();
    } catch (err) {
      console.warn('[StockTransfersList] Failed to load data:', err.message);
    } finally {
      this.isLoading = false;
    }
  }

  getFilteredTransfers() {
    const q = this.query.toLowerCase().trim();
    return this.transfers.filter(tr => {
      const matchQuery = !q ||
        tr.transferNumber.toLowerCase().includes(q) ||
        (tr.fromWarehouseName && tr.fromWarehouseName.toLowerCase().includes(q)) ||
        (tr.toWarehouseName && tr.toWarehouseName.toLowerCase().includes(q)) ||
        (tr.requestedBy && tr.requestedBy.toLowerCase().includes(q)) ||
        (Array.isArray(tr.items) && tr.items.some(i => (i.name && i.name.toLowerCase().includes(q)) || (i.nameAr && i.nameAr.toLowerCase().includes(q)) || (i.batchNumber && i.batchNumber.toLowerCase().includes(q))));

      const matchStatus = this.statusFilter === 'ALL' || tr.status === this.statusFilter;
      const matchWh = this.warehouseFilter === 'ALL' || tr.fromWarehouseId === this.warehouseFilter || tr.toWarehouseId === this.warehouseFilter;

      return matchQuery && matchStatus && matchWh;
    });
  }

  render() {
    this.container = document.getElementById(this.containerId);
    if (!this.container) return;

    const filtered = this.getFilteredTransfers();
    const pendingCount = this.transfers.filter(t => t.status === 'PENDING').length;
    const completedCount = this.transfers.filter(t => t.status === 'COMPLETED').length;
    const cancelledCount = this.transfers.filter(t => t.status === 'CANCELLED').length;

    this.container.innerHTML = `
      <!-- Stock Transfers KPI Grid -->
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:12px; margin-bottom:20px;">
        <div style="background:var(--card-bg, #ffffff); border:1px solid var(--border); border-radius:12px; padding:14px 16px; box-shadow:0 1px 3px rgba(0,0,0,0.04);">
          <div style="font-size:12px; font-weight:600; color:var(--muted-foreground); margin-bottom:6px;">إجمالي أوامر التحويل</div>
          <div style="font-size:22px; font-weight:800; color:var(--foreground);">${this.transfers.length} <span style="font-size:13px; font-weight:600; color:var(--muted-foreground);">أمر</span></div>
        </div>

        <div style="background:var(--card-bg, #ffffff); border:1px solid #FDE68A; border-radius:12px; padding:14px 16px; box-shadow:0 1px 3px rgba(0,0,0,0.04); background:rgba(245,158,11,0.05);">
          <div style="font-size:12px; font-weight:700; color:#B45309; margin-bottom:6px;">بانتظار الاعتماد والاستلام</div>
          <div style="font-size:22px; font-weight:800; color:#D97706;">${pendingCount} <span style="font-size:13px; font-weight:600; color:#B45309;">قيد النقل</span></div>
        </div>

        <div style="background:var(--card-bg, #ffffff); border:1px solid #A7F3D0; border-radius:12px; padding:14px 16px; box-shadow:0 1px 3px rgba(0,0,0,0.04); background:rgba(16,185,129,0.05);">
          <div style="font-size:12px; font-weight:700; color:#047857; margin-bottom:6px;">التحويلات المكتملة والمستلمة</div>
          <div style="font-size:22px; font-weight:800; color:#059669;">${completedCount} <span style="font-size:13px; font-weight:600; color:#047857;">مكتمل</span></div>
        </div>

        <div style="background:var(--card-bg, #ffffff); border:1px solid #BFDBFE; border-radius:12px; padding:14px 16px; box-shadow:0 1px 3px rgba(0,0,0,0.04); background:rgba(59,130,246,0.05);">
          <div style="font-size:12px; font-weight:700; color:#1D4ED8; margin-bottom:6px;">إجمالي العبوات المنقولة</div>
          <div style="font-size:22px; font-weight:800; color:#2563EB;">${(this.stats.totalUnitsTransferred || 0).toLocaleString()} <span style="font-size:12px; font-weight:600; color:var(--muted-foreground);">عبوة</span></div>
        </div>
      </div>

      <!-- Action & Filter Bar -->
      <div style="background:var(--card-bg, #ffffff); border:1px solid var(--border); border-radius:12px; padding:14px 16px; margin-bottom:16px; display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:12px;">
        <div style="display:flex; flex-wrap:wrap; align-items:center; gap:10px; flex:1; min-width:280px;">
          <div style="position:relative; flex:1; min-width:180px; max-width:320px;">
            <input type="text" id="stock-transfers-search" placeholder="بحث برقم التحويل، المستودع، الدواء..." value="${this.query}"
              style="width:100%; padding:8px 34px 8px 12px; border:1px solid var(--border); border-radius:8px; background:var(--background); color:var(--foreground); font-size:13px;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" 
              style="position:absolute; right:10px; top:50%; transform:translateY(-50%); color:var(--muted-foreground); pointer-events:none;">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </div>

          <div style="display:flex; gap:6px;">
            <button type="button" class="transfer-filter-chip ${this.statusFilter === 'ALL' ? 'active' : ''}" data-status="ALL"
              style="padding:6px 12px; border-radius:20px; font-size:12px; font-weight:600; border:1px solid ${this.statusFilter === 'ALL' ? 'var(--primary)' : 'var(--border)'}; background:${this.statusFilter === 'ALL' ? 'var(--primary)' : 'transparent'}; color:${this.statusFilter === 'ALL' ? '#fff' : 'var(--foreground)'}; cursor:pointer;">
              الكل (${this.transfers.length})
            </button>
            <button type="button" class="transfer-filter-chip ${this.statusFilter === 'PENDING' ? 'active' : ''}" data-status="PENDING"
              style="padding:6px 12px; border-radius:20px; font-size:12px; font-weight:600; border:1px solid ${this.statusFilter === 'PENDING' ? '#D97706' : 'var(--border)'}; background:${this.statusFilter === 'PENDING' ? '#D97706' : 'transparent'}; color:${this.statusFilter === 'PENDING' ? '#fff' : 'var(--foreground)'}; cursor:pointer;">
              قيد النقل (${pendingCount})
            </button>
            <button type="button" class="transfer-filter-chip ${this.statusFilter === 'COMPLETED' ? 'active' : ''}" data-status="COMPLETED"
              style="padding:6px 12px; border-radius:20px; font-size:12px; font-weight:600; border:1px solid ${this.statusFilter === 'COMPLETED' ? '#10B981' : 'var(--border)'}; background:${this.statusFilter === 'COMPLETED' ? '#10B981' : 'transparent'}; color:${this.statusFilter === 'COMPLETED' ? '#fff' : 'var(--foreground)'}; cursor:pointer;">
              مكتمل (${completedCount})
            </button>
            <button type="button" class="transfer-filter-chip ${this.statusFilter === 'CANCELLED' ? 'active' : ''}" data-status="CANCELLED"
              style="padding:6px 12px; border-radius:20px; font-size:12px; font-weight:600; border:1px solid ${this.statusFilter === 'CANCELLED' ? '#EF4444' : 'var(--border)'}; background:${this.statusFilter === 'CANCELLED' ? '#EF4444' : 'transparent'}; color:${this.statusFilter === 'CANCELLED' ? '#fff' : 'var(--foreground)'}; cursor:pointer;">
              ملغي (${cancelledCount})
            </button>
          </div>
        </div>

        <button type="button" id="btn-open-create-transfer-modal" class="btn-primary" 
          style="padding:8px 16px; font-size:13px; font-weight:700; display:inline-flex; align-items:center; gap:6px; cursor:pointer;">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m16 3 4 4-4 4"/><path d="M20 7H4"/><path d="m8 21-4-4 4-4"/><path d="M4 17h16"/></svg>
          + أمر تحويل مخزني جديد
        </button>
      </div>

      <!-- Transfers List -->
      <div style="display:flex; flex-direction:column; gap:12px;">
        ${filtered.length === 0 ? `
          <div style="text-align:center; padding:48px 16px; background:var(--card-bg, #ffffff); border:1px dashed var(--border); border-radius:12px;">
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="var(--muted-foreground)" stroke-width="1.5" style="margin:0 auto 12px; opacity:0.6;">
              <path stroke-linecap="round" stroke-linejoin="round" d="m16 3 4 4-4 4M20 7H4m4 14-4-4 4-4m-4 4h16"/>
            </svg>
            <div style="font-size:15px; font-weight:700; color:var(--foreground); margin-bottom:4px;">لا توجد أوامر تحويل مخزني مطابقة</div>
            <div style="font-size:12.5px; color:var(--muted-foreground);">يمكنك إنشاء أمر تحويل جديد لنقل الأدوية بين المستودعات والصالات</div>
          </div>
        ` : filtered.map(tr => this.renderTransferCard(tr)).join('')}
      </div>
    `;

    this.bindEvents();
  }

  renderTransferCard(tr) {
    const isPending = tr.status === 'PENDING';
    const isCompleted = tr.status === 'COMPLETED';
    const isCancelled = tr.status === 'CANCELLED';

    const priorityBadge = tr.priority === 'URGENT'
      ? `<span style="background:rgba(225,29,72,0.1); color:#BE123C; border:1px solid #FDA4AF; padding:2px 8px; border-radius:6px; font-size:11px; font-weight:700;">عاجل</span>`
      : tr.priority === 'HIGH'
      ? `<span style="background:rgba(245,158,11,0.1); color:#B45309; border:1px solid #FDE68A; padding:2px 8px; border-radius:6px; font-size:11px; font-weight:700;">أولوية عالية</span>`
      : `<span style="background:rgba(100,116,139,0.1); color:var(--foreground); border:1px solid var(--border); padding:2px 8px; border-radius:6px; font-size:11px; font-weight:600;">عادي</span>`;

    const statusBadge = isPending
      ? `<span style="background:#FFFBEB; color:#D97706; border:1px solid #FDE68A; padding:4px 10px; border-radius:20px; font-size:12px; font-weight:700; display:inline-flex; align-items:center; gap:4px;"><span style="width:7px; height:7px; border-radius:50%; background:#D97706; animation:pulse 1.5s infinite;"></span> بانتظار الاعتماد والاستلام</span>`
      : isCompleted
      ? `<span style="background:#E6F8F2; color:#00B37E; border:1px solid #A7F3D0; padding:4px 10px; border-radius:20px; font-size:12px; font-weight:700; display:inline-flex; align-items:center; gap:4px;">✔️ مكتمل ومستلم</span>`
      : `<span style="background:#F3F4F6; color:#6B7280; border:1px solid #E5E7EB; padding:4px 10px; border-radius:20px; font-size:12px; font-weight:600;">ملغي</span>`;

    const dateStr = tr.createdAt ? new Date(tr.createdAt).toLocaleDateString('ar-SD', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    }) : '—';

    return `
      <div class="stock-transfer-card" data-transfer-id="${tr.id}" style="background:var(--card-bg, #ffffff); border:1px solid var(--border); border-radius:12px; padding:16px; box-shadow:0 1px 3px rgba(0,0,0,0.03); transition:all 0.2s ease;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px; flex-wrap:wrap; gap:10px;">
          <div>
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
              <span style="font-family:var(--font-mono); font-size:14px; font-weight:800; color:var(--primary);">${tr.transferNumber}</span>
              ${priorityBadge}
              ${statusBadge}
            </div>
            <div style="font-size:12px; color:var(--muted-foreground);">تاريخ الطلب: ${dateStr} — بواسطة: <strong>${tr.requestedBy || 'صيدلي'}</strong></div>
          </div>

          <div style="text-align:left;">
            <div style="font-size:11.5px; color:var(--muted-foreground); margin-bottom:2px;">إجمالي الكمية المنقولة</div>
            <div style="font-size:18px; font-weight:800; color:var(--foreground);">${Number(tr.totalUnits || 0).toLocaleString()} <span style="font-size:12px; font-weight:600; color:var(--muted-foreground);">عبوة</span></div>
          </div>
        </div>

        <!-- Route Visualization (From Wh -> To Wh) -->
        <div style="display:flex; align-items:center; gap:10px; background:var(--background); border-radius:8px; padding:10px 14px; margin-bottom:12px; font-size:12.5px; flex-wrap:wrap;">
          <div style="display:flex; align-items:center; gap:6px;">
            <span style="color:var(--muted-foreground); font-size:11px;">من:</span>
            <strong style="color:#B45309; background:#FEF3C7; padding:2px 8px; border-radius:6px; border:1px solid #FDE68A;">🏢 ${tr.fromWarehouseName}</strong>
          </div>
          
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2.5" style="transform:rotate(180deg);">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>

          <div style="display:flex; align-items:center; gap:6px;">
            <span style="color:var(--muted-foreground); font-size:11px;">إلى:</span>
            <strong style="color:#047857; background:#D1FAE5; padding:2px 8px; border-radius:6px; border:1px solid #A7F3D0;">🏥 ${tr.toWarehouseName}</strong>
          </div>

          ${tr.notes ? `
          <div style="margin-right:auto; font-size:12px; color:var(--muted-foreground); font-style:italic;">
            "${tr.notes}"
          </div>` : ''}
        </div>

        <!-- Transferred Items Table -->
        <div style="border:1px solid var(--border); border-radius:8px; overflow:hidden; margin-bottom:12px;">
          <table style="width:100%; border-collapse:collapse; font-size:12px; text-align:right;">
            <thead>
              <tr style="background:var(--background); border-bottom:1px solid var(--border); color:var(--muted-foreground);">
                <th style="padding:6px 10px; font-weight:700;">الدواء / الصنف</th>
                <th style="padding:6px 10px; font-weight:700; width:130px;">رقم التشغيلة</th>
                <th style="padding:6px 10px; font-weight:700; width:110px;">الصلاحية</th>
                <th style="padding:6px 10px; font-weight:700; width:90px; text-align:center;">الكمية المنقولة</th>
              </tr>
            </thead>
            <tbody>
              ${(tr.items || []).map(item => `
                <tr style="border-bottom:1px solid var(--border);">
                  <td style="padding:7px 10px;">
                    <strong>${item.nameAr || item.name}</strong>
                    ${item.nameAr && item.name ? `<span style="font-size:11px; color:var(--muted-foreground); display:block;">${item.name}</span>` : ''}
                  </td>
                  <td style="padding:7px 10px; font-family:var(--font-mono); color:var(--primary); font-weight:700;">${item.batchNumber || '—'}</td>
                  <td style="padding:7px 10px; font-family:var(--font-mono);">${item.expiryDate || '—'}</td>
                  <td style="padding:7px 10px; text-align:center; font-family:var(--font-mono); font-weight:800; color:var(--foreground);">${item.quantity} ${item.unit || 'عبوة'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <!-- Footer & Actions -->
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
          <div>
            ${isCompleted ? `
              <span style="font-size:12px; color:#047857; font-weight:600; display:inline-flex; align-items:center; gap:4px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                تم الاستلام والاعتماد بواسطة: <strong>${tr.approvedBy || 'إدارة الصيدلية'}</strong> (${tr.completedAt ? new Date(tr.completedAt).toLocaleDateString('ar-SD') : ''})
              </span>
            ` : isCancelled ? `
              <span style="font-size:12px; color:#EF4444;">تم إلغاء الأمر: ${tr.cancelReason || tr.cancellationReason || 'بدون سبب'}</span>
            ` : ''}
          </div>

          <div style="display:flex; gap:8px;">
            ${isPending ? `
              <button type="button" class="btn-cancel-transfer btn-table-action" data-transfer-id="${tr.id}" 
                style="padding:6px 12px; font-size:12px; color:#EF4444; border-color:#FCA5A5;">
                إلغاء الأمر
              </button>
              <button type="button" class="btn-complete-transfer btn-primary" data-transfer-id="${tr.id}" 
                style="padding:6px 16px; font-size:12.5px; font-weight:700; background:#00B37E; border-color:#00B37E; display:inline-flex; align-items:center; gap:6px;">
                ✔️ اعتماد واستلام المخزون
              </button>
            ` : isCompleted ? `
              <button type="button" class="btn-table-action btn-print-transfer-waybill" data-transfer-id="${tr.id}" style="padding:6px 12px; font-size:12px;">
                🖨️ طباعة إذن التحويل
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }

  bindEvents() {
    // Search input
    const searchInput = document.getElementById('stock-transfers-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.query = e.target.value;
        this.render();
      });
    }

    // Filter chips
    const chips = this.container.querySelectorAll('.transfer-filter-chip');
    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        this.statusFilter = chip.getAttribute('data-status');
        this.render();
      });
    });

    // Create modal open button
    const createBtn = document.getElementById('btn-open-create-transfer-modal');
    if (createBtn) {
      createBtn.addEventListener('click', () => {
        if (this.options.onOpenCreateModal) {
          this.options.onOpenCreateModal();
        } else {
          window.dispatchEvent(new CustomEvent('OPEN_STOCK_TRANSFER_MODAL'));
        }
      });
    }

    // Complete / Receive transfer button
    const completeBtns = this.container.querySelectorAll('.btn-complete-transfer');
    completeBtns.forEach(btn => {
      btn.addEventListener('click', async () => {
        const trId = btn.getAttribute('data-transfer-id');
        btn.disabled = true;
        btn.textContent = 'جاري تأكيد الاستلام...';
        try {
          await transferService.completeTransfer(trId, 'د. سارة الكباشي (صيدلي مسؤول)');
          showToast('تم اعتماد التحويل المخزني', `تم استلام البضاعة وتوثيق الحركة بنجاح لأمر التحويل ${trId}`, 'success');
          this.loadData();
        } catch (err) {
          showToast('تعذر اعتماد التحويل', err.message, 'danger');
          btn.disabled = false;
        }
      });
    });

    // Cancel transfer button
    const cancelBtns = this.container.querySelectorAll('.btn-cancel-transfer');
    cancelBtns.forEach(btn => {
      btn.addEventListener('click', async () => {
        const trId = btn.getAttribute('data-transfer-id');
        const reason = prompt('يرجى كتابة سبب إلغاء التحويل المخزني:', 'إلغاء بناء على تعديل جدول التوزيع');
        if (reason !== null) {
          try {
            await transferService.cancelTransfer(trId, reason);
            showToast('تم إلغاء التحويل', `تم إلغاء أمر التحويل ${trId}`, 'info');
            this.loadData();
          } catch (err) {
            showToast('تعذر الإلغاء', err.message, 'danger');
          }
        }
      });
    });

    // Print waybill button
    const printBtns = this.container.querySelectorAll('.btn-print-transfer-waybill');
    printBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const trId = btn.getAttribute('data-transfer-id');
        showToast('إذن التحويل المخزني', `جاري إرسال إذن التحويل ${trId} للطباعة...`, 'info');
      });
    });
  }
}
