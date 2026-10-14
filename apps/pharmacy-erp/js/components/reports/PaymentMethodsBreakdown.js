/**
 * PharmaTech — Payment Methods Breakdown Component
 * Visual liquidity and payment channel distribution (Bankak vs Cash vs Card vs Insurance)
 */

export class PaymentMethodsBreakdown {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
  }

  render(paymentBreakdown) {
    if (!this.container) return;

    const p = paymentBreakdown || {
      cash: { amount: 0, percentage: 0 },
      bankak: { amount: 0, percentage: 0 },
      card: { amount: 0, percentage: 0 },
      insurance: { amount: 0, percentage: 0 }
    };

    const channels = [
      {
        id: 'bankak',
        title: '📱 تحويل بنكك (Bankak Transfer)',
        amount: p.bankak.amount,
        percentage: p.bankak.percentage,
        color: '#0052CC',
        desc: 'تسويات فورية برقم إشعار المعاملة (TXN Ref)'
      },
      {
        id: 'cash',
        title: '💵 نقد في الدرج (Cash Drawer)',
        amount: p.cash.amount,
        percentage: p.cash.percentage,
        color: '#00B37E',
        desc: 'مقبوضات الكاش المباشرة الخاضعة لجرد الوردية'
      },
      {
        id: 'card',
        title: '💳 بطاقات مصرفية (POS/ATM Card)',
        amount: p.card.amount,
        percentage: p.card.percentage,
        color: '#F59E0B',
        desc: 'عمليات نقاط البيع المصرفية الإلكترونية'
      },
      {
        id: 'insurance',
        title: '🏥 مطالبات التأمين الصحي والشركات',
        amount: p.insurance.amount,
        percentage: p.insurance.percentage,
        color: '#8B5CF6',
        desc: 'فواتير التحمل الآجل وتأمين شركات الرعاية'
      }
    ];

    this.container.innerHTML = `
      <section class="panel" style="padding:18px; height:100%; display:flex; flex-direction:column; justify-content:space-between;">
        <div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
            <h3 style="font-size:14px; margin:0; display:flex; align-items:center; gap:8px;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/>
                <path d="M12 18V6"/>
              </svg>
              توزيع السيولة وقنوات الدفع
            </h3>
            <span class="chip chip-info" style="font-size:11px;">مبيعات معتمدة</span>
          </div>

          <div style="display:flex; flex-direction:column; gap:14px;">
            ${channels.map(c => `
              <div>
                <div style="display:flex; justify-content:space-between; align-items:center; font-size:12.5px; margin-bottom:4px;">
                  <span><strong>${c.title}</strong></span>
                  <span class="num">
                    <strong>${Number(c.amount).toLocaleString('en-US')} ج.س</strong>
                    <span style="color:var(--muted-foreground); font-size:11px; margin-right:4px;">(${c.percentage}%)</span>
                  </span>
                </div>
                
                <div style="height:8px; border-radius:4px; background:var(--muted); overflow:hidden; margin-bottom:3px;">
                  <div style="height:100%; width:${Math.min(100, Math.max(0, c.percentage))}%; background:${c.color}; border-radius:4px; transition:width 0.3s ease;"></div>
                </div>

                <small style="color:var(--muted-foreground); font-size:11px; display:block;">${c.desc}</small>
              </div>
            `).join('')}
          </div>
        </div>

        <div style="margin-top:14px; padding-top:10px; border-top:1px dashed var(--border); display:flex; justify-content:space-between; align-items:center; font-size:11.5px; color:var(--muted-foreground);">
          <span>🛡️ جميع الإشعارات البنكية تخضع للمطابقة مع الكشف</span>
          <button type="button" class="btn-table-action" id="btn-reports-view-sales" style="color:var(--primary); font-weight:700;">
            سجل الفواتير ←
          </button>
        </div>
      </section>
    `;

    this.container.querySelector('#btn-reports-view-sales')?.addEventListener('click', () => {
      const salesBtn = document.querySelector('.nav-button[data-view="sales"]');
      if (salesBtn) salesBtn.click();
    });
  }
}
