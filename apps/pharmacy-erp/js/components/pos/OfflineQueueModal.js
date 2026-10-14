/**
 * PharmaTech — Offline Sync Queue Inspector Modal
 *
 * Dedicated modal component allowing cashiers and managers to inspect,
 * manually trigger, and audit pending offline sales in the durable outbox.
 * Conforms to ADR-011 and R1-A1 Clinical Enterprise UX standards.
 */

import { offlineSyncService } from '../../services/offlineSyncService.js';
import { AuthService } from '../../services/authService.js';
import { showToast } from '../Toast.js';

export class OfflineQueueModal {
  constructor() {
    this.modalEl = null;
    this.isOpen = false;
    this.unsubscribe = null;

    this.init();
  }

  init() {
    // Create modal container if not exists
    let existing = document.getElementById('offline-queue-modal');
    if (!existing) {
      existing = document.createElement('div');
      existing.id = 'offline-queue-modal';
      existing.className = 'modal-backdrop';
      existing.style.display = 'none';
      document.body.appendChild(existing);
    }
    this.modalEl = existing;

    // Listen to queue changes to re-render in real-time
    window.addEventListener('OFFLINE_QUEUE_UPDATED', () => {
      if (this.isOpen) {
        this.renderContent();
      }
    });

    // Close on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });
  }

  open() {
    this.isOpen = true;
    this.modalEl.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    this.renderContent();
  }

  close() {
    this.isOpen = false;
    this.modalEl.style.display = 'none';
    document.body.style.overflow = '';
  }

  renderContent() {
    const queue = offlineSyncService.getQueue();
    const pendingCount = offlineSyncService.getPendingCount();
    const isSyncing = offlineSyncService.isSyncing;
    const isManager = AuthService.isManager();

    const totalQueuedAmount = queue.reduce((sum, item) => {
      const val = parseFloat(item.totals?.total || item.totals?.subtotal || 0);
      return sum + (isNaN(val) ? 0 : val);
    }, 0);

    this.modalEl.innerHTML = `
      <div class="modal-dialog modal-dialog-lg" style="max-width:820px; width:95%; max-height:90vh; display:flex; flex-direction:column; overflow:hidden;">
        
        <!-- Modal Header -->
        <div class="modal-header" style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border); padding:16px 20px;">
          <div style="display:flex; align-items:center; gap:12px;">
            <div style="width:40px; height:40px; border-radius:10px; background:linear-gradient(135deg, rgba(0, 82, 204, 0.1), rgba(0, 179, 126, 0.15)); display:flex; align-items:center; justify-content:center; color:var(--primary);">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
              </svg>
            </div>
            <div>
              <h3 style="margin:0; font-size:17px; font-weight:800; display:flex; align-items:center; gap:8px;">
                <span>طابور مزامنة مبيعات الأوفلاين (Durable Outbox)</span>
                <span class="chip ${pendingCount > 0 ? 'chip-warning' : 'chip-success'}" style="font-size:11px; padding:2px 8px;">
                  ${pendingCount > 0 ? `${pendingCount} معلقة` : 'متزامن بالكامل ☁️'}
                </span>
              </h3>
              <p style="margin:2px 0 0; font-size:12px; color:var(--text-secondary);">
                الفواتير المسجلة محلياً أثناء انقطاع الشبكة والمحفوظة للتوريد الآمن مع السحابة
              </p>
            </div>
          </div>

          <button type="button" class="icon-btn" id="btn-close-offline-queue-modal" style="width:32px; height:32px;" title="إغلاق النافذة">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <!-- Metric KPI Highlights Bar -->
        <div style="background:var(--bg-secondary); padding:12px 20px; border-bottom:1px solid var(--border); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
          <div style="display:flex; align-items:center; gap:20px; flex-wrap:wrap;">
            <div>
              <span style="font-size:11px; color:var(--text-secondary); display:block;">إجمالي العمليات المعلقة</span>
              <strong style="font-size:15px; color:var(--text-primary); font-family:var(--font-latin);">${pendingCount} فواتير</strong>
            </div>
            <div style="border-right:1px solid var(--border); padding-right:20px;">
              <span style="font-size:11px; color:var(--text-secondary); display:block;">إجمالي القيمة المالية النقدية</span>
              <strong style="font-size:15px; color:var(--primary); font-family:var(--font-latin);">${totalQueuedAmount.toLocaleString()} ج.س</strong>
            </div>
          </div>

          <div style="display:flex; align-items:center; gap:8px;">
            <button type="button" class="btn btn-primary btn-sm" id="btn-sync-all-offline" ${isSyncing || pendingCount === 0 ? 'disabled' : ''} style="display:inline-flex; align-items:center; gap:6px; font-weight:700;">
              ${isSyncing ? `
                <span class="spinner" style="width:12px; height:12px; border:2px solid #fff; border-top-color:transparent; border-radius:50%; animation:spin 0.6s linear infinite;"></span>
                <span>جاري المزامنة مع السحابة...</span>
              ` : `
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>
                <span>مزامنة جميع الفواتير الآن</span>
              `}
            </button>
          </div>
        </div>

        <!-- Outbox Items List / Table -->
        <div style="padding:16px 20px; overflow-y:auto; flex:1;">
          ${queue.length === 0 ? `
            <div style="text-align:center; padding:48px 20px; color:var(--text-secondary);">
              <div style="width:56px; height:56px; margin:0 auto 14px; border-radius:50%; background:rgba(0, 179, 126, 0.1); color:#00B37E; display:flex; align-items:center; justify-content:center;">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <h4 style="margin:0 0 6px; font-size:16px; font-weight:800; color:var(--text-primary);">طابور المزامنة خالٍ تماماً ☁️</h4>
              <p style="margin:0; font-size:13px; max-width:440px; margin:0 auto; line-height:1.6;">
                جميع المبيعات وحركات المخزون متزامنة ومسجلة في السحابة المركزية بنسبة 100%. عند انقطاع الإنترنت، ستظهر الفواتير هنا تلقائياً.
              </p>
            </div>
          ` : `
            <div style="display:flex; flex-direction:column; gap:10px;">
              ${queue.map((item, idx) => {
                const isConflict = item.status === 'CONFLICT';
                const isItemSyncing = item.status === 'SYNCING';
                const dateStr = new Date(item.createdAt).toLocaleTimeString('ar-SD', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                const fullDate = new Date(item.createdAt).toLocaleDateString('ar-SD', { month: 'short', day: 'numeric' });
                const itemsCount = (item.itemsSummary || []).reduce((acc, i) => acc + (i.quantity || 1), 0);

                return `
                  <div class="card" style="padding:12px 16px; border:1px solid ${isConflict ? '#FCA5A5' : 'var(--border)'}; background:${isConflict ? 'rgba(239, 68, 68, 0.04)' : 'var(--bg-surface)'}; border-radius:10px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
                    
                    <!-- Left: Metadata -->
                    <div style="display:flex; align-items:center; gap:14px; min-width:240px;">
                      <div style="width:36px; height:36px; border-radius:8px; background:${isConflict ? 'rgba(239, 68, 68, 0.15)' : 'var(--bg-secondary)'}; display:flex; align-items:center; justify-content:center; font-weight:800; font-family:var(--font-latin); color:${isConflict ? 'var(--destructive)' : 'var(--text-secondary)'};">
                        #${idx + 1}
                      </div>
                      <div>
                        <div style="display:flex; align-items:center; gap:8px;">
                          <strong style="font-family:var(--font-latin); font-size:14px; color:var(--text-primary);">${item.offlineInvoiceNumber}</strong>
                          <span class="chip ${isConflict ? 'chip-danger' : (isItemSyncing ? 'chip-info' : 'chip-warning')}" style="font-size:10px; padding:1px 6px;">
                            ${isItemSyncing ? 'جاري المزامنة...' : (isConflict ? 'تعارض صيدلاني' : 'بانتظار الرفع')}
                          </span>
                        </div>
                        <span style="font-size:11px; color:var(--text-secondary); display:block; margin-top:2px;">
                          ${fullDate} · ${dateStr} · بواسطة: ${item.cashierName || 'كاشير'}
                        </span>
                      </div>
                    </div>

                    <!-- Center: Items & Amount Summary -->
                    <div style="min-width:180px;">
                      <div style="font-size:13px; font-weight:700; color:var(--text-primary);">
                        ${(item.itemsSummary || []).map(i => i.nameAr || i.name).slice(0, 2).join(' + ')}
                        ${(item.itemsSummary || []).length > 2 ? ` (+${(item.itemsSummary || []).length - 2} أخرى)` : ''}
                      </div>
                      <div style="font-size:11px; color:var(--text-secondary); margin-top:2px; display:flex; gap:10px;">
                        <span>عدد الوحدات: <strong>${itemsCount}</strong></span>
                        <span>·</span>
                        <span>المبلغ: <strong style="color:var(--primary); font-family:var(--font-latin);">${Number(item.totals?.total || 0).toLocaleString()} ج.س</strong></span>
                      </div>
                      ${isConflict && item.errorMessage ? `
                        <div style="margin-top:4px; font-size:11px; color:var(--destructive); background:rgba(239, 68, 68, 0.1); padding:2px 8px; border-radius:4px;">
                          ⚠️ ${item.errorMessage}
                        </div>
                      ` : ''}
                    </div>

                    <!-- Right: Actions -->
                    <div style="display:flex; align-items:center; gap:8px;">
                      <button type="button" class="btn btn-secondary btn-sm btn-sync-single" data-id="${item.id}" ${isSyncing || isItemSyncing ? 'disabled' : ''} style="font-size:11px; padding:4px 10px;">
                        ${isItemSyncing ? 'جاري...' : 'مزامنة الآن'}
                      </button>

                      ${isManager || isConflict ? `
                        <button type="button" class="btn-table-action btn-discard-single" data-id="${item.id}" title="حذف الفاتورة من الطابور (إلغاء)" style="color:var(--destructive); font-size:11px; padding:4px 8px;">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </button>
                      ` : ''}
                    </div>

                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>

        <!-- Modal Footer -->
        <div class="modal-footer" style="border-top:1px solid var(--border); padding:12px 20px; display:flex; justify-content:space-between; align-items:center; background:var(--bg-secondary);">
          <div style="font-size:11px; color:var(--text-secondary); display:flex; align-items:center; gap:6px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            <span>المزامنة تستخدم مفاتيح تطابق (Idempotency) مشفرة تمنع تكرار القيد نهائياً عند ضعف الشبكة.</span>
          </div>

          <button type="button" class="btn btn-secondary btn-sm" id="btn-close-offline-queue-bottom">
            إغلاق
          </button>
        </div>

      </div>
    `;

    // Bind event handlers
    document.getElementById('btn-close-offline-queue-modal')?.addEventListener('click', () => this.close());
    document.getElementById('btn-close-offline-queue-bottom')?.addEventListener('click', () => this.close());

    document.getElementById('btn-sync-all-offline')?.addEventListener('click', async () => {
      await offlineSyncService.syncQueue({ silent: false });
    });

    this.modalEl.querySelectorAll('.btn-sync-single').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.dataset.id;
        if (id) {
          await offlineSyncService.syncSingleItem(id);
        }
      });
    });

    this.modalEl.querySelectorAll('.btn-discard-single').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        if (id && confirm('هل أنت متأكد من رغبتك في حذف هذه الفاتورة من طابور المزامنة؟')) {
          offlineSyncService.discardItem(id);
        }
      });
    });
  }
}
