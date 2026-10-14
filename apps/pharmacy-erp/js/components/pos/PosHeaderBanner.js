/**
 * PharmaTech — POS Header Banner Component
 * Displays Cashier & Register Session, Online/Offline sync status with toggle,
 * Offline Outbox pending count badge, Quick Sync trigger, and Offline Allocation Meter (ADR-011).
 */

import { offlineSyncService } from '../../services/offlineSyncService.js';

export class PosHeaderBanner {
  constructor(containerId = 'pos-header-banner-container', { onToggleOffline, onOpenQueue }) {
    this.containerId = containerId;
    this.onToggleOffline = onToggleOffline;
    this.onOpenQueue = onOpenQueue;
  }

  render(posService) {
    const el = document.getElementById(this.containerId);
    if (!el) return;

    const isOffline = posService.isOffline;
    const remaining = posService.allocationRemaining;
    const total = posService.allocation.totalCapacity;
    const pct = Math.max(0, Math.min(100, Math.round((remaining / total) * 100)));
    const isLowAllocation = remaining <= 20;

    const pendingCount = offlineSyncService.getPendingCount();
    const isSyncing = offlineSyncService.isSyncing;

    el.innerHTML = `
      <div class="pos-top-banner">
        <!-- Cashier Session & Cloud Status -->
        <div class="pos-session-info" style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
          <span class="session-badge">
            <span class="session-dot"></span>
            <span>نقطة البيع: رقم 1 · الكاشير: ${posService.session.cashierName || 'الكاشير'}</span>
          </span>

          <!-- Cloud Connection State Badge -->
          <span class="chip ${isOffline ? 'chip-warning' : 'chip-success'}" style="font-family:var(--font-latin); display:inline-flex; align-items:center; gap:6px;">
            <i class="dot" style="background:${isOffline ? 'var(--warning)' : '#00B37E'};"></i>
            ${isOffline ? 'العمل بدون إنترنت (نشط)' : 'متصل بالإنترنت'}
          </span>

          <!-- Outbox Queue Badge (Clickable to open inspector) -->
          <button type="button" class="chip ${pendingCount > 0 ? 'chip-warning' : 'chip-info'}" id="btn-open-offline-queue" style="cursor:pointer; border:none; font-family:var(--font-latin); display:inline-flex; align-items:center; gap:6px; font-weight:700;" title="عرض الفواتير المحفوظة بانتظار الإرسال">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
            </svg>
            <span>${pendingCount > 0 ? `${pendingCount} فواتير غير مرسلة` : 'كل الفواتير مرسلة ☁️'}</span>
          </button>

          <!-- Quick Sync Trigger Button (visible when pending items exist) -->
          ${pendingCount > 0 ? `
            <button type="button" class="btn btn-primary btn-sm" id="btn-quick-sync-header" ${isSyncing ? 'disabled' : ''} style="font-size:11px; padding:3px 10px; border-radius:6px; display:inline-flex; align-items:center; gap:5px; font-weight:700;" title="إرسال الفواتير الآن للنظام">
              ${isSyncing ? `
                <span class="spinner" style="width:10px; height:10px; border:2px solid #fff; border-top-color:transparent; border-radius:50%; animation:spin 0.6s linear infinite;"></span>
                <span>جاري الإرسال...</span>
              ` : `
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>
                <span>إرسال الفواتير</span>
              `}
            </button>
          ` : ''}

          <!-- Offline Simulation Toggle Button -->
          <button type="button" class="btn-table-action" id="btn-toggle-pos-offline" style="font-size:11px; padding:4px 10px; border-radius:6px; border:1px solid var(--border);" title="تجربة واستعراض البيع عند انقطاع الإنترنت">
            ${isOffline ? '🔄 عودة للوضع المتصل' : '🔌 تجربة العمل بدون إنترنت'}
          </button>
        </div>

        <!-- Offline Safety Allocation Capacity Meter -->
        <div class="allocation-meter-widget" id="allocation-meter" title="الكمية المسموح ببيعها أثناء انقطاع الإنترنت لحماية دقة المخزون">
          <span class="allocation-meter-label">رصيد البيع الاحتياطي:</span>
          <div class="allocation-meter-bar" style="width:100px; height:8px; background:var(--border); border-radius:99px; overflow:hidden;">
            <div id="allocation-meter-bar-fill" style="height:100%; width:${pct}%; background:${isLowAllocation ? 'var(--destructive)' : 'var(--gradient-primary)'}; transition:width 0.3s ease;"></div>
          </div>
          <span class="allocation-meter-value" id="allocation-meter-val" style="color:${isLowAllocation ? 'var(--destructive)' : 'inherit'}; font-weight:700;">
            ${remaining} / ${total} علبة
          </span>
          ${isLowAllocation ? `<span class="chip chip-warning" style="font-size:10px; padding:1px 5px;">قارب على النفاد</span>` : ''}
        </div>
      </div>
    `;

    document.getElementById('btn-toggle-pos-offline')?.addEventListener('click', () => {
      if (this.onToggleOffline) this.onToggleOffline();
    });

    document.getElementById('btn-open-offline-queue')?.addEventListener('click', () => {
      if (this.onOpenQueue) {
        this.onOpenQueue();
      } else {
        window.dispatchEvent(new CustomEvent('OPEN_OFFLINE_QUEUE_MODAL'));
      }
    });

    document.getElementById('btn-quick-sync-header')?.addEventListener('click', async () => {
      await offlineSyncService.syncQueue({ silent: false });
    });
  }
}
