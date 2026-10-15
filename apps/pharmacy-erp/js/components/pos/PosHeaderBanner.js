/**
 * PharmaTech — POS Header Banner Component (POS 2.0 UX Overhaul)
 * Clean, human-centered top bar:
 * - Cashier & Active Session info
 * - Clear, comforting Cloud / Offline status
 * - Fast Fullscreen / Kiosk Focus Mode Toggle
 * - End-of-Shift Handover trigger
 * - Quick Keyboard Cheat-sheet Trigger
 * - Background Outbox Queue status
 */

import { offlineSyncService } from '../../services/offlineSyncService.js';

export class PosHeaderBanner {
  constructor(containerId = 'pos-header-banner-container', { onToggleOffline, onOpenQueue, onToggleFocusMode }) {
    this.containerId = containerId;
    this.onToggleOffline = onToggleOffline;
    this.onOpenQueue = onOpenQueue;
    this.onToggleFocusMode = onToggleFocusMode;
    this.isFocusMode = false;
  }

  render(posService) {
    const el = document.getElementById(this.containerId);
    if (!el) return;

    const isOffline = posService.isOffline;
    const remaining = posService.allocationRemaining;
    const total = posService.allocation.totalCapacity;
    const pendingCount = offlineSyncService.getPendingCount();
    const isSyncing = offlineSyncService.isSyncing;

    el.innerHTML = `
      <div class="pos-top-banner-v2" style="background:var(--card); border:1px solid var(--border); border-radius:12px; padding:10px 16px; display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
        
        <!-- Right: Cashier Identity & Station -->
        <div style="display:flex; align-items:center; gap:10px;">
          <div style="width:36px; height:36px; border-radius:50%; background:linear-gradient(135deg, #059669, #10b981); color:#fff; display:grid; place-items:center; font-weight:800; font-size:14px; box-shadow:0 2px 6px rgba(16,185,129,0.3);">
            ${(posService.session.cashierName || 'ك').slice(0, 2)}
          </div>
          <div>
            <div style="font-weight:800; font-size:13.5px; color:var(--foreground); display:flex; align-items:center; gap:6px;">
              <span>${posService.session.cashierName || 'كاشير نقطة البيع'}</span>
              <span class="badge" style="font-size:10px; padding:1px 6px; background:rgba(16,185,129,0.12); color:#059669; border:1px solid rgba(16,185,129,0.25);">
                الوردية الأولى
              </span>
            </div>
            <div style="font-size:11px; color:var(--muted-foreground); margin-top:1px;">
              نقطة البيع الرئيسية #1 · صيدلية النيلين النموذجية
            </div>
          </div>
        </div>

        <!-- Center: Connection State & Outbox Sync Indicator -->
        <div style="display:flex; align-items:center; gap:8px;">
          <!-- Network Pill -->
          <div style="display:inline-flex; align-items:center; gap:6px; padding:4px 10px; border-radius:20px; font-size:11.5px; font-weight:700; background:${isOffline ? '#fffbeb' : '#ecfdf5'}; color:${isOffline ? '#b45309' : '#047857'}; border:1px solid ${isOffline ? '#fde68a' : '#a7f3d0'};">
            <span style="width:7px; height:7px; border-radius:50%; background:${isOffline ? '#f59e0b' : '#10b981'}; box-shadow:0 0 0 2px ${isOffline ? 'rgba(245,158,11,0.25)' : 'rgba(16,185,129,0.25)'};"></span>
            <span>${isOffline ? 'وضع الحفظ المحلي (أوفلاين)' : 'متصل بالسحابة آمن'}</span>
          </div>

          <!-- Pending Invoices Pill (if any) -->
          ${pendingCount > 0 ? `
            <button type="button" id="btn-open-offline-queue" style="cursor:pointer; border:1px solid #fed7aa; background:#fff7ed; color:#c2410c; padding:4px 10px; border-radius:20px; font-size:11.5px; font-weight:700; display:inline-flex; align-items:center; gap:6px;" title="عرض الفواتير المحفوظة محلياً بانتظار الإرسال">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" /></svg>
              <span>${pendingCount} فواتير قيد الإرسال</span>
            </button>
            <button type="button" id="btn-quick-sync-header" ${isSyncing ? 'disabled' : ''} style="cursor:pointer; background:var(--primary); color:#fff; border:none; padding:4px 10px; border-radius:8px; font-size:11px; font-weight:700; display:inline-flex; align-items:center; gap:4px;">
              ${isSyncing ? 'جاري المزامنة...' : 'إرسال الآن ☁️'}
            </button>
          ` : `
            <span style="font-size:11px; color:#10b981; display:inline-flex; align-items:center; gap:4px; font-weight:600;" title="كافة العمليات متزامنة">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5"/></svg>
              <span>متزامن 100%</span>
            </span>
          `}
        </div>

        <!-- Left: Quick Operational Tools -->
        <div style="display:flex; align-items:center; gap:8px;">
          <!-- Keyboard Cheat-Sheet Button -->
          <button type="button" id="btn-pos-keyboard-help" class="btn-table-action" style="font-size:11.5px; padding:5px 10px; border-radius:8px; border:1px solid var(--border); display:inline-flex; align-items:center; gap:5px;" title="عرض اختصارات لوحة المفاتيح">
            <span>⌨️</span>
            <span>اختصارات البيع</span>
          </button>

          <!-- Close Shift / Handover -->
          <button type="button" id="btn-pos-close-shift" class="btn-table-action" style="font-size:11.5px; padding:5px 10px; border-radius:8px; border:1px solid var(--border); color:#b45309; background:#fffbeb; display:inline-flex; align-items:center; gap:5px;" title="تسليم الوردية ومطابقة النقدية">
            <span>🔒</span>
            <span>تسليم الوردية</span>
          </button>

          <!-- Kiosk Fullscreen Focus Mode Toggle -->
          <button type="button" id="btn-pos-focus-mode" style="cursor:pointer; background:${this.isFocusMode ? '#0284c7' : 'var(--muted)'}; color:${this.isFocusMode ? '#fff' : 'var(--foreground)'}; border:1px solid var(--border); padding:5px 12px; border-radius:8px; font-size:11.5px; font-weight:700; display:inline-flex; align-items:center; gap:6px;" title="تكبير الشاشة وإخفاء القوائم غير الضرورية">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"/></svg>
            <span>${this.isFocusMode ? 'الوضع العادي' : 'شاشة كاملة'}</span>
          </button>

          <!-- Subtle Dev Offline Simulation (Kept for ADR-011 testing, styled discreetly) -->
          <button type="button" id="btn-toggle-pos-offline" style="cursor:pointer; background:transparent; border:none; color:var(--muted-foreground); font-size:11px; padding:2px 4px;" title="محاكاة انقطاع الإنترنت (للاختبار)">
            ${isOffline ? '🔌(أوفلاين)' : '🔌'}
          </button>
        </div>

      </div>
    `;

    this.bindEvents(posService);
  }

  bindEvents(posService) {
    // Focus Mode
    document.getElementById('btn-pos-focus-mode')?.addEventListener('click', () => {
      this.isFocusMode = !this.isFocusMode;
      document.body.classList.toggle('pos-kiosk-mode', this.isFocusMode);
      this.render(posService);
      if (this.onToggleFocusMode) this.onToggleFocusMode(this.isFocusMode);
    });

    // Close Shift Handover Modal
    document.getElementById('btn-pos-close-shift')?.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('OPEN_CLOSE_SESSION_DIALOG'));
    });

    // Keyboard Shortcuts Dialog
    document.getElementById('btn-pos-keyboard-help')?.addEventListener('click', () => {
      this.showKeyboardHelpModal();
    });

    // Offline Simulation Toggle
    document.getElementById('btn-toggle-pos-offline')?.addEventListener('click', () => {
      if (this.onToggleOffline) this.onToggleOffline();
    });

    // Open Queue
    document.getElementById('btn-open-offline-queue')?.addEventListener('click', () => {
      if (this.onOpenQueue) {
        this.onOpenQueue();
      } else {
        window.dispatchEvent(new CustomEvent('OPEN_OFFLINE_QUEUE_MODAL'));
      }
    });

    // Quick Sync
    document.getElementById('btn-quick-sync-header')?.addEventListener('click', async () => {
      await offlineSyncService.syncQueue({ silent: false });
    });
  }

  showKeyboardHelpModal() {
    const existing = document.getElementById('dialog-pos-keyboard-help');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'dialog-pos-keyboard-help';
    modal.className = 'dialog-backdrop';
    modal.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.5); z-index:9999; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(3px);';
    modal.innerHTML = `
      <div style="background:var(--card, #fff); border-radius:14px; width:92%; max-width:440px; padding:20px; box-shadow:0 20px 40px rgba(0,0,0,0.2); border:1px solid var(--border);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; border-bottom:1px solid var(--border); padding-bottom:10px;">
          <h3 style="margin:0; font-size:16px; font-weight:800; display:flex; align-items:center; gap:8px;">
            <span>⌨️</span>
            <span>اختصارات لوحة المفاتيح السريعة للكاشير</span>
          </h3>
          <button type="button" id="btn-close-kb-help" style="border:none; background:none; font-size:20px; cursor:pointer; color:var(--muted-foreground);">&times;</button>
        </div>
        <div style="display:flex; flex-direction:column; gap:10px; font-size:13px;">
          <div style="display:flex; justify-content:space-between; align-items:center; padding:6px 10px; background:var(--muted); border-radius:6px;">
            <span>البحث الفوري أو مسح الباركود</span>
            <kbd style="padding:2px 8px; background:var(--card); border:1px solid var(--border); border-radius:4px; font-weight:700; font-family:monospace;">F2</kbd>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; padding:6px 10px; background:var(--muted); border-radius:6px;">
            <span>صرف الفاتورة وإتمام البيع</span>
            <kbd style="padding:2px 8px; background:#10b981; color:#fff; border-radius:4px; font-weight:700; font-family:monospace;">F4 أو Enter</kbd>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; padding:6px 10px; background:var(--muted); border-radius:6px;">
            <span>الدفع نقداً (كاش)</span>
            <kbd style="padding:2px 8px; background:var(--card); border:1px solid var(--border); border-radius:4px; font-weight:700; font-family:monospace;">F9</kbd>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; padding:6px 10px; background:var(--muted); border-radius:6px;">
            <span>الدفع عبر تطبيق بنكك</span>
            <kbd style="padding:2px 8px; background:var(--card); border:1px solid var(--border); border-radius:4px; font-weight:700; font-family:monospace;">F10</kbd>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; padding:6px 10px; background:var(--muted); border-radius:6px;">
            <span>إفراغ السلة وبدء عملية جديدة</span>
            <kbd style="padding:2px 8px; background:var(--card); border:1px solid var(--border); border-radius:4px; font-weight:700; font-family:monospace;">F8</kbd>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; padding:6px 10px; background:var(--muted); border-radius:6px;">
            <span>إلغاء النافذة / خروج</span>
            <kbd style="padding:2px 8px; background:var(--card); border:1px solid var(--border); border-radius:4px; font-weight:700; font-family:monospace;">Esc</kbd>
          </div>
        </div>
        <button type="button" id="btn-ok-kb-help" style="width:100%; margin-top:16px; padding:8px; background:var(--primary); color:#fff; border:none; border-radius:8px; font-weight:700; cursor:pointer;">
          فهمت، عودة للبيع
        </button>
      </div>
    `;

    document.body.appendChild(modal);

    const closeModal = () => modal.remove();
    modal.querySelector('#btn-close-kb-help')?.addEventListener('click', closeModal);
    modal.querySelector('#btn-ok-kb-help')?.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }
}
