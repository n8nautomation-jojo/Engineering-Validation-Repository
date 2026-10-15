/**
 * PharmaTech — POS Payment Selector & Fast Checkout Engine (POS 2.0 UX Overhaul)
 * Supports:
 * - Unmistakable Grand Total Typography
 * - 1-Tap Cash Calculator with Change Due (الباقي للعميل)
 * - 1-Tap Bankak with branch account instructions
 * - Split Payment with live balance validation
 * - Giant 52px Checkout Button with F4 / Enter binding
 */

export class PosPaymentSelector {
  constructor(containerId = 'pos-payment-selector-container', { onMethodChange, onSplitChange, onCheckout }) {
    this.containerId = containerId;
    this.onMethodChange = onMethodChange;
    this.onSplitChange = onSplitChange;
    this.onCheckout = onCheckout;
    this.tenderedCash = null; // Amount given by customer
  }

  render(posService) {
    const el = document.getElementById(this.containerId);
    if (!el) return;

    const isSplit = posService.isSplitMode;
    const activeMethod = posService.activePaymentMethod || 'CASH';
    const grandTotal = posService.grandTotal;
    const isCartEmpty = posService.cart.length === 0;

    const cashAmount = posService.splitCashAmount;
    const bankakAmount = posService.splitBankakAmount;
    const totalSplitPaid = Number((cashAmount + bankakAmount).toFixed(2));
    const splitDiff = Number((grandTotal - totalSplitPaid).toFixed(2));
    const isSplitValid = Math.abs(splitDiff) <= 0.01;

    const canCheckout = !isCartEmpty && (!isSplit || isSplitValid);

    // Calculate smart cash quick options
    const tender = this.tenderedCash !== null ? this.tenderedCash : grandTotal;
    const changeDue = Math.max(0, tender - grandTotal);
    const isUnderpaid = tender < grandTotal;

    const quickCashOptions = this.generateQuickCashOptions(grandTotal);

    el.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:12px; margin-top:4px;">
        
        <!-- Grand Total Hero Box -->
        <div style="background:linear-gradient(135deg, #0f172a, #1e293b); color:#fff; border-radius:12px; padding:14px 18px; display:flex; justify-content:space-between; align-items:center; box-shadow:0 4px 14px rgba(0,0,0,0.12);">
          <div>
            <span style="font-size:12px; color:#94a3b8; font-weight:700; display:block;">المبلغ الإجمالي المطلوب:</span>
            <span style="font-size:11px; color:#64748b;">(معفي من ضريبة القيمة المضافة)</span>
          </div>
          <div style="text-align:left;">
            <strong style="font-size:26px; font-weight:900; font-family:var(--font-latin); color:#38bdf8; letter-spacing:-0.5px;">
              ${Number(grandTotal).toLocaleString()}
            </strong>
            <span style="font-size:13px; font-weight:700; color:#e2e8f0; margin-right:4px;">ج.س</span>
          </div>
        </div>

        <!-- Payment Method Selector Tabs -->
        <div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <label style="font-size:12px; font-weight:800; color:var(--foreground); margin:0;">
              طريقة الدفع:
            </label>
            <button 
              type="button" 
              id="btn-toggle-split-payment" 
              style="cursor:pointer; font-size:11px; font-weight:700; padding:2px 8px; border-radius:6px; border:1px solid ${isSplit ? '#0284c7' : 'var(--border)'}; background:${isSplit ? 'rgba(2,132,199,0.1)' : 'transparent'}; color:${isSplit ? '#0284c7' : 'var(--muted-foreground)'};"
            >
              ${isSplit ? '✓ إلغاء التجزئة' : '⚡ سداد مجزأ (نقد + بنكك)'}
            </button>
          </div>

          <!-- Single Mode Buttons -->
          ${!isSplit ? `
            <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:6px;">
              <button 
                type="button" 
                class="btn-pay-tab ${activeMethod === 'CASH' ? 'active-cash' : ''}" 
                data-method="CASH"
                style="cursor:pointer; padding:9px 4px; border-radius:8px; font-size:12.5px; font-weight:800; border:2px solid ${activeMethod === 'CASH' ? '#10b981' : 'var(--border)'}; background:${activeMethod === 'CASH' ? '#ecfdf5' : 'var(--card)'}; color:${activeMethod === 'CASH' ? '#047857' : 'var(--foreground)'}; transition:all 0.15s ease;"
              >
                💵 نقداً (F9)
              </button>

              <button 
                type="button" 
                class="btn-pay-tab ${activeMethod === 'BANKAK' ? 'active-bankak' : ''}" 
                data-method="BANKAK"
                style="cursor:pointer; padding:9px 4px; border-radius:8px; font-size:12.5px; font-weight:800; border:2px solid ${activeMethod === 'BANKAK' ? '#0284c7' : 'var(--border)'}; background:${activeMethod === 'BANKAK' ? '#f0f9ff' : 'var(--card)'}; color:${activeMethod === 'BANKAK' ? '#0284c7' : 'var(--foreground)'}; transition:all 0.15s ease;"
              >
                📱 بنكك (F10)
              </button>

              <button 
                type="button" 
                class="btn-pay-tab ${activeMethod === 'CARD' ? 'active-other' : ''}" 
                data-method="CARD"
                style="cursor:pointer; padding:9px 4px; border-radius:8px; font-size:12px; font-weight:700; border:1px solid ${activeMethod === 'CARD' ? 'var(--primary)' : 'var(--border)'}; background:${activeMethod === 'CARD' ? 'var(--muted)' : 'var(--card)'}; color:var(--foreground);"
              >
                💳 بطاقة
              </button>

              <button 
                type="button" 
                class="btn-pay-tab ${activeMethod === 'INSURANCE' ? 'active-other' : ''}" 
                data-method="INSURANCE"
                style="cursor:pointer; padding:9px 4px; border-radius:8px; font-size:12px; font-weight:700; border:1px solid ${activeMethod === 'INSURANCE' ? 'var(--primary)' : 'var(--border)'}; background:${activeMethod === 'INSURANCE' ? 'var(--muted)' : 'var(--card)'}; color:var(--foreground);"
              >
                🏥 تأمين/آجل
              </button>
            </div>
          ` : ''}
        </div>

        <!-- Mode 1: CASH Smart Tender Calculator -->
        ${!isSplit && activeMethod === 'CASH' && grandTotal > 0 ? `
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:12px; display:flex; flex-direction:column; gap:8px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="font-size:11.5px; font-weight:700; color:#475569;">المبلغ المستلم من العميل:</span>
              <div style="display:flex; align-items:center; gap:6px;">
                <input 
                  type="number" 
                  id="input-cash-tender" 
                  value="${tender}" 
                  step="50"
                  style="width:110px; font-size:14px; font-weight:900; font-family:var(--font-mono); padding:4px 8px; border-radius:6px; border:1px solid var(--border); text-align:left; background:#fff;" 
                />
                <span style="font-size:11px; font-weight:700; color:#64748b;">ج.س</span>
              </div>
            </div>

            <!-- Quick Cash Denomination Buttons -->
            <div style="display:flex; gap:6px; flex-wrap:wrap;">
              ${quickCashOptions.map(opt => `
                <button 
                  type="button" 
                  class="btn-quick-tender ${tender === opt.val ? 'active-tender' : ''}" 
                  data-val="${opt.val}"
                  style="cursor:pointer; flex:1; min-width:65px; padding:4px 6px; font-size:11px; font-weight:700; border-radius:6px; border:1px solid ${tender === opt.val ? '#10b981' : '#cbd5e1'}; background:${tender === opt.val ? '#10b981' : '#ffffff'}; color:${tender === opt.val ? '#ffffff' : '#1e293b'}; text-align:center;"
                >
                  ${opt.label}
                </button>
              `).join('')}
            </div>

            <!-- Change Due Output Banner (الباقي للعميل) -->
            <div style="background:${isUnderpaid ? '#fef2f2' : '#ecfdf5'}; border:1px solid ${isUnderpaid ? '#fecaca' : '#a7f3d0'}; border-radius:8px; padding:8px 12px; display:flex; justify-content:space-between; align-items:center; margin-top:2px;">
              <span style="font-size:12px; font-weight:800; color:${isUnderpaid ? '#dc2626' : '#047857'};">
                ${isUnderpaid ? '⚠️ المبلغ أقل من الإجمالي:' : '💰 الباقي للعميل (المتبقي):'}
              </span>
              <strong style="font-size:18px; font-weight:900; font-family:var(--font-latin); color:${isUnderpaid ? '#dc2626' : '#059669'};">
                ${isUnderpaid ? (grandTotal - tender).toLocaleString() : changeDue.toLocaleString()} ج.س
              </strong>
            </div>
          </div>
        ` : ''}

        <!-- Mode 2: BANKAK Flow -->
        ${!isSplit && activeMethod === 'BANKAK' ? `
          <div style="background:#f0f9ff; border:1px solid #bae6fd; border-radius:10px; padding:12px; display:flex; flex-direction:column; gap:8px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <div>
                <strong style="font-size:12.5px; color:#0369a1; display:block;">حساب بنكك المعتمد للصيدلية:</strong>
                <span style="font-family:var(--font-mono); font-size:15px; font-weight:900; color:#0284c7; letter-spacing:1px;">2948102</span>
                <span style="font-size:11px; color:#0369a1; margin-right:4px;">(صيدلية النيلين النموذجية)</span>
              </div>
              <span style="font-size:24px;">📱</span>
            </div>

            <div>
              <label style="font-size:11px; font-weight:700; color:#0369a1; display:block; margin-bottom:3px;">
                رقم إشعار التحويل (اختياري للسرعة):
              </label>
              <input 
                id="pos-bankak-ref-input" 
                value="${posService.bankakReference || ''}"
                placeholder="مثال: TXN-BOK-94821038" 
                dir="ltr" 
                style="width:100%; box-sizing:border-box; font-size:12px; padding:7px 10px; border:1px solid #bae6fd; border-radius:6px; background:#ffffff; color:#0f172a; font-family:var(--font-mono);" 
              />
            </div>
          </div>
        ` : ''}

        <!-- Mode 3: Split Payment (Cash + Bankak) -->
        ${isSplit ? `
          <div style="background:var(--muted); border:1px solid var(--border); border-radius:10px; padding:12px; display:flex; flex-direction:column; gap:10px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <strong style="font-size:12.5px; color:var(--primary);">توزيع المبلغ (Split Payment):</strong>
              <button type="button" id="btn-split-5050" style="cursor:pointer; font-size:11px; font-weight:700; padding:2px 8px; border-radius:4px; border:1px solid var(--border); background:var(--card);">
                مناصفة 50/50
              </button>
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
              <div>
                <label style="font-size:11px; font-weight:700; color:var(--muted-foreground); display:block; margin-bottom:2px;">
                  المبلغ نقداً:
                </label>
                <input 
                  type="number" 
                  id="split-cash-input" 
                  value="${cashAmount}" 
                  step="50"
                  style="width:100%; box-sizing:border-box; font-size:13.5px; font-weight:800; padding:6px 8px; border:1px solid var(--border); border-radius:6px; background:var(--background); color:var(--foreground); font-family:var(--font-mono);" 
                />
              </div>

              <div>
                <label style="font-size:11px; font-weight:700; color:var(--muted-foreground); display:block; margin-bottom:2px;">
                  المبلغ عبر بنكك:
                </label>
                <input 
                  type="number" 
                  id="split-bankak-input" 
                  value="${bankakAmount}" 
                  step="50"
                  style="width:100%; box-sizing:border-box; font-size:13.5px; font-weight:800; padding:6px 8px; border:1px solid var(--border); border-radius:6px; background:var(--background); color:#0284c7; font-family:var(--font-mono);" 
                />
              </div>
            </div>

            <div>
              <label style="font-size:11px; color:var(--muted-foreground); display:block; margin-bottom:2px;">
                رقم إشعار بنكك (TXN Ref):
              </label>
              <input 
                id="split-bankak-ref-input" 
                value="${posService.splitBankakRef || ''}"
                placeholder="مثال: TXN-BOK-849201" 
                dir="ltr" 
                style="width:100%; box-sizing:border-box; font-size:12px; padding:6px 8px; border:1px solid var(--border); border-radius:6px; background:var(--background); color:var(--foreground); font-family:var(--font-mono);" 
              />
            </div>

            <!-- Validation Balance Box -->
            <div style="display:flex; justify-content:space-between; align-items:center; background:var(--card); border:1px solid ${isSplitValid ? '#a7f3d0' : '#fecdd3'}; border-radius:6px; padding:6px 10px; font-size:12px;">
              <span>المجموع المسدد:</span>
              <strong dir="ltr" style="font-family:var(--font-mono); color:${isSplitValid ? '#059669' : '#e11d48'};">
                ${totalSplitPaid.toLocaleString()} / ${grandTotal.toLocaleString()} ج.س
              </strong>
            </div>
            ${!isSplitValid ? `
              <small style="color:#e11d48; font-size:11px; font-weight:700;">
                ${splitDiff > 0 ? `* متبقي ${splitDiff.toLocaleString()} ج.س لاكتمال الفاتورة` : `* يوجد زيادة ${Math.abs(splitDiff).toLocaleString()} ج.س عن الإجمالي`}
              </small>
            ` : ''}
          </div>
        ` : ''}

        <!-- Giant 1-Click Complete Sale Action Button -->
        <button 
          type="button" 
          class="btn-checkout-sale-v2" 
          id="btn-pos-checkout" 
          ${canCheckout ? '' : 'disabled'}
          style="width:100%; height:52px; font-size:15px; font-weight:900; border-radius:10px; border:none; display:flex; align-items:center; justify-content:center; gap:8px; cursor:${canCheckout ? 'pointer' : 'not-allowed'}; margin-top:4px; background:${canCheckout ? 'linear-gradient(135deg, #059669, #10b981)' : '#94a3b8'}; color:#ffffff; box-shadow:${canCheckout ? '0 4px 14px rgba(16,185,129,0.4)' : 'none'}; transition:all 0.2s ease;"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          <span>صرف الفاتورة وطباعة الإيصال (F4 أو Enter)</span>
        </button>

      </div>
    `;

    this.bindEvents(posService);
  }

  generateQuickCashOptions(grandTotal) {
    if (grandTotal <= 0) return [];

    const options = [
      { label: 'المبلغ بالتمام', val: grandTotal }
    ];

    // Find next round increments
    const roundNext = (step) => Math.ceil(grandTotal / step) * step;

    const round500 = roundNext(500);
    if (round500 > grandTotal && !options.some(o => o.val === round500)) {
      options.push({ label: `${round500.toLocaleString()} ج.س`, val: round500 });
    }

    const round1000 = roundNext(1000);
    if (round1000 > grandTotal && !options.some(o => o.val === round1000)) {
      options.push({ label: `${round1000.toLocaleString()} ج.س`, val: round1000 });
    }

    const round5000 = roundNext(5000);
    if (round5000 > grandTotal && !options.some(o => o.val === round5000)) {
      options.push({ label: `${round5000.toLocaleString()} ج.س`, val: round5000 });
    }

    return options.slice(0, 4);
  }

  bindEvents(posService) {
    const el = document.getElementById(this.containerId);
    if (!el) return;

    // Toggle Split Mode
    el.querySelector('#btn-toggle-split-payment')?.addEventListener('click', () => {
      posService.setSplitMode(!posService.isSplitMode);
      this.render(posService);
      if (this.onSplitChange) this.onSplitChange();
    });

    // 50/50 Split
    el.querySelector('#btn-split-5050')?.addEventListener('click', () => {
      posService.splitHalfAndHalf();
      this.render(posService);
      if (this.onSplitChange) this.onSplitChange();
    });

    // Single Payment Method Buttons
    el.querySelectorAll('.btn-pay-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        const method = btn.dataset.method;
        posService.activePaymentMethod = method;
        this.tenderedCash = posService.grandTotal;
        this.render(posService);
        if (this.onMethodChange) this.onMethodChange(method);
      });
    });

    // Cash Tender Buttons
    el.querySelectorAll('.btn-quick-tender').forEach(btn => {
      btn.addEventListener('click', () => {
        this.tenderedCash = parseFloat(btn.dataset.val) || posService.grandTotal;
        this.render(posService);
      });
    });

    // Custom Cash Tender Input
    const tenderInput = el.querySelector('#input-cash-tender');
    if (tenderInput) {
      tenderInput.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        this.tenderedCash = isNaN(val) ? 0 : val;
        // Don't re-render full component while typing to keep input focused
        const changeDue = Math.max(0, this.tenderedCash - posService.grandTotal);
        const changeDisplay = el.querySelector('#change-display-val');
        if (changeDisplay) changeDisplay.textContent = `${changeDue.toLocaleString()} ج.س`;
      });
    }

    // Bankak TXN Ref
    const bankakInput = el.querySelector('#pos-bankak-ref-input');
    if (bankakInput) {
      bankakInput.addEventListener('input', (e) => {
        posService.bankakReference = e.target.value.trim();
      });
    }

    // Split Inputs
    const cashInput = el.querySelector('#split-cash-input');
    const splitBankakInput = el.querySelector('#split-bankak-input');
    const splitRefInput = el.querySelector('#split-bankak-ref-input');

    const handleSplitInput = () => {
      const cash = parseFloat(cashInput?.value) || 0;
      const bankak = parseFloat(splitBankakInput?.value) || 0;
      const ref = splitRefInput?.value.trim() || '';
      posService.setSplitAmounts(cash, bankak, ref);
      this.render(posService);
    };

    cashInput?.addEventListener('input', handleSplitInput);
    splitBankakInput?.addEventListener('input', handleSplitInput);
    splitRefInput?.addEventListener('input', (e) => {
      posService.splitBankakRef = e.target.value.trim();
    });

    // Complete Checkout Action
    el.querySelector('#btn-pos-checkout')?.addEventListener('click', () => {
      if (this.onCheckout) this.onCheckout();
    });
  }
}
