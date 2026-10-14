/**
 * PharmaTech — Inventory Risk & FEFO Expiry Panel Component
 * Clinical safety audit for near-expiry batches and critical stock replenishment
 */

export class InventoryRiskPanel {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
  }

  render(inventoryHealth) {
    if (!this.container) return;

    const summary = inventoryHealth?.summary || {
      totalProducts: 0,
      totalStockUnits: 0,
      totalStockValue: 0,
      lowStockCount: 0,
      expiringCount: 0,
      expiredCount: 0
    };

    const expiringItems = inventoryHealth?.expiringSoonItems || [];
    const lowStockItems = inventoryHealth?.lowStockItems || [];

    this.container.innerHTML = `
      <section class="panel" style="padding:18px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <h3 style="font-size:14px; margin:0; display:flex; align-items:center; gap:8px; color:var(--warning);">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
              <line x1="12" x2="12" y1="9" y2="13"/>
              <line x1="12" x2="12.01" y1="17" y2="17"/>
            </svg>
            متابعة صلاحيات الأدوية وحماية المخزون
          </h3>
          <span class="chip ${summary.expiringCount > 0 ? 'chip-warning' : 'chip-success'}" style="font-size:11px;">
            ${summary.expiringCount} تشغيلات تحت المراقبة
          </span>
        </div>

        <!-- Inventory Summary Badges -->
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:14px;">
          <div style="background:var(--card); border:1px solid var(--border); border-radius:8px; padding:8px 10px;">
            <small style="color:var(--muted-foreground); font-size:11px; display:block;">قيمة المخزون الإجمالية بسعر البيع:</small>
            <strong class="num" style="font-size:13.5px; color:var(--primary);">${Number(summary.totalStockValue).toLocaleString('en-US')} ج.س</strong>
          </div>
          <div style="background:var(--card); border:1px solid var(--border); border-radius:8px; padding:8px 10px;">
            <small style="color:var(--muted-foreground); font-size:11px; display:block;">إجمالي الوحدات بالمستودع:</small>
            <strong class="num" style="font-size:13.5px; color:var(--foreground);">${Number(summary.totalStockUnits).toLocaleString('en-US')} عبوة</strong>
          </div>
        </div>

        <!-- Expiring Soon Items List -->
        <div style="display:flex; flex-direction:column; gap:8px; max-height:200px; overflow-y:auto; padding-left:4px;">
          ${expiringItems.length === 0 ? `
            <div style="text-align:center; padding:20px; color:var(--muted-foreground); font-size:12px;">
              ✓ لا توجد تشغيلات مهددة بالانتهاء خلال 90 يوماً
            </div>
          ` : expiringItems.map(item => `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 10px; background:var(--card); border:1px solid var(--border); border-radius:6px;">
              <div>
                <strong style="font-size:12.5px;">${item.name}</strong>
                <small style="display:block; color:var(--muted-foreground); font-size:11px;">
                  تشغيلة: <span dir="ltr" style="font-family:var(--font-mono);">${item.batchNumber}</span> · تنتهي: ${item.expiryDate}
                </small>
              </div>
              <div style="text-align:left;">
                <span class="chip ${item.urgency === 'CRITICAL_30' ? 'chip-danger' : item.urgency === 'WARNING_60' ? 'chip-warning' : 'chip-info'}" style="font-size:11px;">
                  باقي ${item.daysLeft} يوم
                </span>
                <div style="font-size:11px; color:var(--muted-foreground); margin-top:3px;">الرصيد: ${item.quantity} وحدة</div>
              </div>
            </div>
          `).join('')}
        </div>

        <!-- Action Links -->
        <div style="margin-top:14px; padding-top:10px; border-top:1px dashed var(--border); display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size:11.5px; color:var(--muted-foreground);">
            النواقص الحرجة: <strong>${summary.lowStockCount}</strong> صنفاً
          </span>
          <div style="display:flex; gap:8px;">
            <button type="button" class="btn-table-action" id="btn-reports-go-inventory" style="font-weight:600;">
              المخزون
            </button>
            <button type="button" class="btn-primary" id="btn-reports-order-po" style="font-size:11.5px; padding:4px 10px;">
              + طلب توريد
            </button>
          </div>
        </div>
      </section>
    `;

    this.container.querySelector('#btn-reports-go-inventory')?.addEventListener('click', () => {
      const invBtn = document.querySelector('.nav-button[data-view="inventory"]');
      if (invBtn) invBtn.click();
    });

    this.container.querySelector('#btn-reports-order-po')?.addEventListener('click', () => {
      const purchBtn = document.querySelector('.nav-button[data-view="purchasing"]');
      if (purchBtn) purchBtn.click();
    });
  }
}
