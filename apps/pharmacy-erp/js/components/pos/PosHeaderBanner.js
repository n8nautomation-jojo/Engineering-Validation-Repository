/**
 * PharmaTech — POS Header Banner Component
 * Displays Cashier & Register Session, Online/Offline sync status with toggle, and Offline Allocation Capacity
 */

export class PosHeaderBanner {
  constructor(containerId = 'pos-header-banner-container', { onToggleOffline }) {
    this.containerId = containerId;
    this.onToggleOffline = onToggleOffline;
  }

  render(posService) {
    const el = document.getElementById(this.containerId);
    if (!el) return;

    const isOffline = posService.isOffline;
    const remaining = posService.allocationRemaining;
    const total = posService.allocation.totalCapacity;
    const pct = Math.max(0, Math.min(100, Math.round((remaining / total) * 100)));
    const isLowAllocation = remaining <= 20;

    el.innerHTML = `
      <div class="pos-top-banner">
        <!-- Cashier Session & Cloud Status -->
        <div class="pos-session-info" style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
          <span class="session-badge">
            <span class="session-dot"></span>
            <span>خزينة: REG-01 · الكاشير: ${posService.session.cashierName || 'الكاشير'}</span>
          </span>

          <span class="chip ${isOffline ? 'chip-warning' : 'chip-success'}" style="font-family:var(--font-latin); display:inline-flex; align-items:center; gap:6px;">
            <i class="dot" style="background:${isOffline ? 'var(--warning)' : '#00B37E'};"></i>
            ${isOffline ? 'OFFLINE وضع أوفلاين آمن' : 'ONLINE متصل بالسحابة'}
          </span>

          <!-- Offline Simulation Toggle Button -->
          <button type="button" class="btn-table-action" id="btn-toggle-pos-offline" style="font-size:11px; padding:4px 10px; border-radius:6px; border:1px solid var(--border);" title="تبديل وضع الاتصال لفحص أمان الأوفلاين">
            ${isOffline ? '🔄 إعادة الاتصال بالسحابة' : '🔌 محاكاة انقطاع الإنترنت'}
          </button>
        </div>

        <!-- Offline Safety Allocation Capacity Meter -->
        <div class="allocation-meter-widget" id="allocation-meter" title="الحصة المحجوزة للمزامنة الآمنة في وضع عدم الاتصال لمنع تجاوز الرصيد">
          <span class="allocation-meter-label">حصة الأوفلاين (Quota):</span>
          <div class="allocation-meter-bar" style="width:110px; height:8px; background:var(--border); border-radius:99px; overflow:hidden;">
            <div id="allocation-meter-bar-fill" style="height:100%; width:${pct}%; background:${isLowAllocation ? 'var(--destructive)' : 'var(--gradient-primary)'}; transition:width 0.3s ease;"></div>
          </div>
          <span class="allocation-meter-value" id="allocation-meter-val" style="color:${isLowAllocation ? 'var(--destructive)' : 'inherit'}; font-weight:700;">
            ${remaining} / ${total} وحدة
          </span>
          ${isLowAllocation ? `<span class="chip chip-warning" style="font-size:10px; padding:1px 5px;">منخفضة</span>` : ''}
        </div>
      </div>
    `;

    document.getElementById('btn-toggle-pos-offline')?.addEventListener('click', () => {
      if (this.onToggleOffline) this.onToggleOffline();
    });
  }
}
