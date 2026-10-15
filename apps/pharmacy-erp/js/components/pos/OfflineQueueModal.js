/**
 * PharmaTech — Offline Sync Queue & Conflict Resolution Center Modal
 *
 * Dedicated modal component allowing cashiers and managers to inspect,
 * manually trigger, and audit pending offline sales in the durable outbox,
 * as well as resolve quarantined sync conflicts per ADR-011 and Phase 2.2.
 */

import { offlineSyncService } from '../../services/offlineSyncService.js';
import { AuthService } from '../../services/authService.js';
import { showToast } from '../Toast.js';

export class OfflineQueueModal {
  constructor() {
    this.modalEl = null;
    this.isOpen = false;
    this.activeTab = 'outbox'; // 'outbox' | 'conflicts'
    this.conflicts = [];

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

  async open() {
    this.isOpen = true;
    this.modalEl.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    try {
      this.conflicts = await offlineSyncService.fetchConflicts();
    } catch {
      this.conflicts = [];
    }

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
    const quarantinedConflicts = this.conflicts.filter(c => c.state === 'QUARANTINED');

    const totalQueuedAmount = queue.reduce((sum, item) => {
      const val = parseFloat(item.totals?.total || item.totals?.subtotal || 0);
      return sum + (isNaN(val) ? 0 : val);
    }, 0);

    this.modalEl.innerHTML = `
      <div class="modal-dialog modal-dialog-lg" style="max-width:860px; width:95%; max-height:90vh; display:flex; flex-direction:column; overflow:hidden;">
        
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
                <span>مركز المزامنة الذكية والأوفلاين</span>
                <span class="chip ${pendingCount > 0 ? 'chip-warning' : 'chip-success'}" style="font-size:11px; padding:2px 8px;">
                  ${pendingCount > 0 ? `${pendingCount} بانتظار الإرسال` : 'جميع الفواتير مرسلة ☁️'}
                </span>
                ${quarantinedConflicts.length > 0 ? `
                  <span class="chip chip-danger" style="font-size:11px; padding:2px 8px;">
                    ${quarantinedConflicts.length} تعارض محجوز
                  </span>
                ` : ''}
              </h3>
              <p style="margin:2px 0 0; font-size:12px; color:var(--text-secondary);">
                إدارة طابور الفواتير المحلية، ومراجعة ومعالجة تعارضات المخزون المحجوزة بالسحابة
              </p>
            </div>
          </div>

          <button type="button" class="icon-btn" id="btn-close-offline-queue-modal" style="width:32px; height:32px;" title="إغلاق النافذة">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <!-- Metric Highlights & Tab Toggle -->
        <div style="background:var(--bg-secondary); padding:12px 20px; border-bottom:1px solid var(--border); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
          <div class="segmented" id="sync-modal-segmented">
            <button type="button" id="tab-btn-outbox" data-active="${this.activeTab === 'outbox'}" style="font-size:12px;">
              📦 طابور الفواتير المحلية (${queue.length})
            </button>
            <button type="button" id="tab-btn-conflicts" data-active="${this.activeTab === 'conflicts'}" style="font-size:12px; position:relative;">
              ⚠️ تعارضات المخزون المحجوزة (${quarantinedConflicts.length})
            </button>
          </div>

          ${this.activeTab === 'outbox' ? `
            <div style="display:flex; align-items:center; gap:12px;">
              <span style="font-size:12px; color:var(--text-secondary);">
                القيمة: <strong style="color:var(--primary); font-family:var(--font-latin);">${totalQueuedAmount.toLocaleString()} ج.س</strong>
              </span>
              <button type="button" class="btn btn-primary btn-sm" id="btn-sync-all-offline" ${isSyncing || pendingCount === 0 ? 'disabled' : ''} style="display:inline-flex; align-items:center; gap:6px; font-weight:700;">
                ${isSyncing ? `
                  <span class="spinner" style="width:12px; height:12px; border:2px solid #fff; border-top-color:transparent; border-radius:50%; animation:spin 0.6s linear infinite;"></span>
                  <span>جاري المزامنة...</span>
                ` : `
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>
                  <span>مزامنة الدفعة الآن</span>
                `}
              </button>
            </div>
          ` : `
            <button type="button" class="btn btn-secondary btn-sm" id="btn-refresh-conflicts" style="display:inline-flex; align-items:center; gap:6px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
              <span>تحديث السجل</span>
            </button>
          `}
        </div>

        <!-- Main Content Area -->
        <div style="padding:16px 20px; overflow-y:auto; flex:1;">
          
          <!-- TAB 1: Outbox Queue -->
          ${this.activeTab === 'outbox' ? `
            ${queue.length === 0 ? `
              <div style="text-align:center; padding:48px 20px; color:var(--text-secondary);">
                <div style="width:56px; height:56px; margin:0 auto 14px; border-radius:50%; background:rgba(0, 179, 126, 0.1); color:#00B37E; display:flex; align-items:center; justify-content:center;">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <h4 style="margin:0 0 6px; font-size:16px; font-weight:800; color:var(--text-primary);">لا توجد فواتير معلقة ☁️</h4>
                <p style="margin:0; font-size:13px; max-width:440px; margin:0 auto; line-height:1.6;">
                  جميع المبيعات تم حفظها وترحيلها بالسحابة بنجاح. عند انقطاع الإنترنت، سيتم حفظ أي فاتورة هنا تلقائياً دون توقف البيع.
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
                      
                      <div style="display:flex; align-items:center; gap:14px; min-width:240px;">
                        <div style="width:36px; height:36px; border-radius:8px; background:${isConflict ? 'rgba(239, 68, 68, 0.15)' : 'var(--bg-secondary)'}; display:flex; align-items:center; justify-content:center; font-weight:800; font-family:var(--font-latin); color:${isConflict ? 'var(--destructive)' : 'var(--text-secondary)'};">
                          #${idx + 1}
                        </div>
                        <div>
                          <div style="display:flex; align-items:center; gap:8px;">
                            <strong style="font-family:var(--font-latin); font-size:14px; color:var(--text-primary);">${item.offlineInvoiceNumber}</strong>
                            <span class="chip ${isConflict ? 'chip-danger' : (isItemSyncing ? 'chip-info' : 'chip-warning')}" style="font-size:10px; padding:1px 6px;">
                              ${isItemSyncing ? 'جاري الإرسال...' : (isConflict ? 'تنبيه للمراجعة' : 'بانتظار الإرسال')}
                            </span>
                          </div>
                          <span style="font-size:11px; color:var(--text-secondary); display:block; margin-top:2px;">
                            ${fullDate} · ${dateStr} · بواسطة: ${item.cashierName || 'كاشير'}
                          </span>
                        </div>
                      </div>

                      <div style="min-width:180px;">
                        <div style="font-size:13px; font-weight:700; color:var(--text-primary);">
                          ${(item.itemsSummary || []).map(i => i.nameAr || i.name).slice(0, 2).join(' + ')}
                          ${(item.itemsSummary || []).length > 2 ? ` (+${(item.itemsSummary || []).length - 2} أخرى)` : ''}
                        </div>
                        <div style="font-size:11px; color:var(--text-secondary); margin-top:2px; display:flex; gap:10px;">
                          <span>العبوات: <strong>${itemsCount}</strong></span>
                          <span>·</span>
                          <span>المبلغ: <strong style="color:var(--primary); font-family:var(--font-latin);">${Number(item.totals?.total || 0).toLocaleString()} ج.س</strong></span>
                        </div>
                        ${isConflict && item.errorMessage ? `
                          <div style="margin-top:4px; font-size:11px; color:var(--destructive); background:rgba(239, 68, 68, 0.1); padding:2px 8px; border-radius:4px;">
                            ⚠️ ${item.errorMessage}
                          </div>
                        ` : ''}
                      </div>

                      <div style="display:flex; align-items:center; gap:8px;">
                        <button type="button" class="btn btn-secondary btn-sm btn-sync-single" data-id="${item.id}" ${isSyncing || isItemSyncing ? 'disabled' : ''} style="font-size:11px; padding:4px 10px;">
                          ${isItemSyncing ? 'جاري...' : 'إرسال'}
                        </button>

                        ${isManager || isConflict ? `
                          <button type="button" class="btn-table-action btn-discard-single" data-id="${item.id}" title="حذف الفاتورة من القائمة" style="color:var(--destructive); font-size:11px; padding:4px 8px;">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                          </button>
                        ` : ''}
                      </div>

                    </div>
                  `;
                }).join('')}
              </div>
            `}
          ` : `
            <!-- TAB 2: Quarantined Conflicts (ADR-011) -->
            ${this.conflicts.length === 0 ? `
              <div style="text-align:center; padding:48px 20px; color:var(--text-secondary);">
                <div style="width:56px; height:56px; margin:0 auto 14px; border-radius:50%; background:rgba(0, 179, 126, 0.1); color:#00B37E; display:flex; align-items:center; justify-content:center;">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <h4 style="margin:0 0 6px; font-size:16px; font-weight:800; color:var(--text-primary);">سجل التعارضات سليم 100%</h4>
                <p style="margin:0; font-size:13px; max-width:440px; margin:0 auto; line-height:1.6;">
                  لا توجد أية تعارضات محجوزة أو تشوهات مخزنية غير مسواة بين الأجهزة السحابية والمحلية.
                </p>
              </div>
            ` : `
              <div style="display:flex; flex-direction:column; gap:12px;">
                ${this.conflicts.map(conf => {
                  const isResolved = conf.state === 'RESOLVED';
                  const dateStr = new Date(conf.detectedAt).toLocaleString('ar-SD');

                  return `
                    <div style="border:1px solid ${isResolved ? 'var(--border)' : '#FCA5A5'}; background:${isResolved ? 'var(--bg-secondary)' : '#FEF2F2'}; border-radius:10px; padding:14px;">
                      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                        <div style="display:flex; align-items:center; gap:8px;">
                          <strong style="font-family:var(--font-latin); font-size:14px; color:${isResolved ? 'var(--text-primary)' : '#DC2626'};">${conf.id}</strong>
                          <span class="chip ${isResolved ? 'chip-success' : 'chip-danger'}" style="font-size:11px; padding:2px 8px;">
                            ${isResolved ? 'تمت التسوية ✓' : 'محجوز للمراجعة (Quarantined)'}
                          </span>
                          <span style="font-size:11px; color:var(--text-secondary); font-family:var(--font-latin);">جهاز: ${conf.originatingDeviceId}</span>
                        </div>
                        <span style="font-size:11px; color:var(--text-secondary);">${dateStr}</span>
                      </div>

                      <div style="font-size:12.5px; margin-bottom:10px; color:var(--text-primary);">
                        <strong>تفاصيل التعارض:</strong>
                        <span style="display:block; color:#991B1B; margin-top:2px;">${conf.details?.message || conf.details?.errorMessage || 'تعارض في رصيد التشغيلة أو قواعد الصرف أثناء انقطاع الاتصال'}</span>
                      </div>

                      ${isResolved ? `
                        <div style="background:rgba(0,179,126,0.08); border:1px solid #A7F3D0; border-radius:6px; padding:8px 12px; font-size:12px; color:#065F46;">
                          <strong>تمت التسوية بواسطة:</strong> ${conf.resolution?.resolvedBy || 'مدير الصيدلية'} —
                          <strong>الإجراء:</strong> ${conf.resolution?.action === 'ADJUST_STOCK' ? 'إذن تعديل مخزني' : conf.resolution?.action} —
                          <span>${conf.resolution?.notes || ''}</span>
                        </div>
                      ` : `
                        <div style="display:flex; justify-content:flex-end; gap:8px; border-top:1px dashed #FCA5A5; padding-top:10px;">
                          <button type="button" class="btn btn-secondary btn-sm btn-resolve-stock" data-id="${conf.id}" style="font-size:11.5px; font-weight:700; color:#059669; border-color:#A7F3D0; background:#ECFDF5;">
                            ✓ إذن تسوية جردية (Adjust Stock)
                          </button>
                          <button type="button" class="btn btn-secondary btn-sm btn-resolve-dismiss" data-id="${conf.id}" style="font-size:11.5px;">
                            تجاوز مع توثيق السبب
                          </button>
                        </div>
                      `}
                    </div>
                  `;
                }).join('')}
              </div>
            `}
          `}

        </div>

        <!-- Modal Footer -->
        <div class="modal-footer" style="border-top:1px solid var(--border); padding:12px 20px; display:flex; justify-content:space-between; align-items:center; background:var(--bg-secondary);">
          <div style="font-size:11px; color:var(--text-secondary); display:flex; align-items:center; gap:6px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            <span>نظام المزامنة يتبع معيار ADR-011 لحجز وحماية حركات البيع، ومنع الحذف الصامت لأي عملية.</span>
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

    // Tab buttons
    document.getElementById('tab-btn-outbox')?.addEventListener('click', () => {
      this.activeTab = 'outbox';
      this.renderContent();
    });

    document.getElementById('tab-btn-conflicts')?.addEventListener('click', () => {
      this.activeTab = 'conflicts';
      this.renderContent();
    });

    document.getElementById('btn-refresh-conflicts')?.addEventListener('click', async () => {
      try {
        this.conflicts = await offlineSyncService.fetchConflicts();
        this.renderContent();
        showToast('تم التحديث', 'تم تحديث سجل التعارضات المحجوزة', 'info');
      } catch {}
    });

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

    // Conflict resolution handlers
    this.modalEl.querySelectorAll('.btn-resolve-stock').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.dataset.id;
        if (!id) return;
        try {
          await offlineSyncService.resolveConflict(id, {
            action: 'ADJUST_STOCK',
            notes: 'تسوية رصيد التشغيلة عبر إذن تعديل مخزني معتمد من الصيدلي المسؤول'
          });
          this.conflicts = await offlineSyncService.fetchConflicts();
          this.renderContent();
        } catch {}
      });
    });

    this.modalEl.querySelectorAll('.btn-resolve-dismiss').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.dataset.id;
        if (!id) return;
        const reason = prompt('أدخل سبب التجاوز الإداري المعتمد:');
        if (!reason) return;
        try {
          await offlineSyncService.resolveConflict(id, {
            action: 'DISMISS_WITH_REASON',
            notes: reason
          });
          this.conflicts = await offlineSyncService.fetchConflicts();
          this.renderContent();
        } catch {}
      });
    });
  }
}
