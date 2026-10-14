/**
 * PharmaTech — POS Payment Selector & Checkout Component
 * Supports Single Payment (Cash, Bankak, Card, Insurance) AND Split Payment (Cash + Bankak) with live balance validation
 */

export class PosPaymentSelector {
  constructor(containerId = 'pos-payment-selector-container', { onMethodChange, onSplitChange, onCheckout }) {
    this.containerId = containerId;
    this.onMethodChange = onMethodChange;
    this.onSplitChange = onSplitChange;
    this.onCheckout = onCheckout;
  }

  render(posService) {
    const el = document.getElementById(this.containerId);
    if (!el) return;

    const isSplit = posService.isSplitMode;
    const activeMethod = posService.activePaymentMethod;
    const grandTotal = posService.grandTotal;
    const isCartEmpty = posService.cart.length === 0;

    const cashAmount = posService.splitCashAmount;
    const bankakAmount = posService.splitBankakAmount;
    const totalSplitPaid = Number((cashAmount + bankakAmount).toFixed(2));
    const splitDiff = Number((grandTotal - totalSplitPaid).toFixed(2));

    const isSplitValid = Math.abs(splitDiff) <= 0.01;
    const canCheckout = !isCartEmpty && (!isSplit || isSplitValid);

    el.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:10px;">
        <!-- Payment Mode Selector Header -->
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <label style="font-size:12px; font-weight:700; color:var(--muted-foreground); margin:0;">
            طريقة السداد:
          </label>
          <button 
            type="button" 
            id="btn-toggle-split-payment" 
            class="btn-table-action" 
            style="font-size:11.5px; padding:3px 10px; border-radius:6px; font-weight:700; ${isSplit ? 'background:rgba(0,179,126,0.15); color:var(--primary); border:1px solid var(--primary);' : 'border:1px solid var(--border);'}"
          >
            ${isSplit ? '✓ تفعيل السداد العادي' : '⚡ سداد مجزأ (نقداً + بنكك)'}
          </button>
        </div>

        <!-- 1. Single Payment Methods (when NOT in split mode) -->
        ${!isSplit ? `
          <div class="pos-payment-selector" style="display:grid; grid-template-columns:repeat(4, 1fr); gap:6px;">
            <button type="button" class="pay-method-btn ${activeMethod === 'CASH' ? 'selected' : ''}" data-method="CASH" style="padding:8px 4px; font-size:12px; font-weight:700; border-radius:6px; border:1px solid var(--border); cursor:pointer;">
              نقداً
            </button>
            <button type="button" class="pay-method-btn ${activeMethod === 'BANKAK' ? 'selected' : ''}" data-method="BANKAK" style="padding:8px 4px; font-size:12px; font-weight:700; border-radius:6px; border:1px solid var(--border); cursor:pointer;">
              بنكك
            </button>
            <button type="button" class="pay-method-btn ${activeMethod === 'CARD' ? 'selected' : ''}" data-method="CARD" style="padding:8px 4px; font-size:12px; font-weight:700; border-radius:6px; border:1px solid var(--border); cursor:pointer;">
              بطاقة
            </button>
            <button type="button" class="pay-method-btn ${activeMethod === 'INSURANCE' ? 'selected' : ''}" data-method="INSURANCE" style="padding:8px 4px; font-size:12px; font-weight:700; border-radius:6px; border:1px solid var(--border); cursor:pointer;">
              تأمين
            </button>
          </div>

          <!-- Bankak Single TXN Reference Input -->
          <div id="pos-single-bankak-wrap" style="display:${activeMethod === 'BANKAK' ? 'block' : 'none'}; margin-top:2px;">
            <label style="font-size:11px; font-weight:700; color:var(--muted-foreground); display:block; margin-bottom:3px;">
              رقم إشعار التحويل (Bankak TXN Ref):
            </label>
            <input 
              id="pos-bankak-ref-input" 
              value="${posService.bankakReference || ''}"
              placeholder="مثال: TXN-BOK-94821038" 
              dir="ltr" 
              style="width:100%; font-size:12px; padding:7px 10px; border:1px solid var(--border); border-radius:6px; background:var(--background); color:var(--foreground); font-family:var(--font-mono);" 
            />
          </div>
        ` : `
          <!-- 2. Split Payment Mode (Cash + Bankak) -->
          <div class="split-payment-box" style="background:var(--muted); border:1px solid var(--border); border-radius:8px; padding:10px 12px; display:flex; flex-direction:column; gap:8px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <strong style="font-size:12px; color:var(--primary);">توزيع المبلغ (Split Payment):</strong>
              <button type="button" id="btn-split-5050" class="btn-table-action" style="font-size:11px; padding:2px 8px; border-radius:4px;">
                مناصفة 50/50
              </button>
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
              <div>
                <label style="font-size:11px; color:var(--muted-foreground); display:block; margin-bottom:2px;">
                  المبلغ نقداً (Cash):
                </label>
                <input 
                  type="number" 
                  id="split-cash-input" 
                  value="${cashAmount}" 
                  min="0" 
                  step="50"
                  style="width:100%; font-size:13px; font-weight:700; padding:6px 8px; border:1px solid var(--border); border-radius:6px; background:var(--background); color:var(--foreground); font-family:var(--font-mono);" 
                />
              </div>

              <div>
                <label style="font-size:11px; color:var(--muted-foreground); display:block; margin-bottom:2px;">
                  المبلغ عبر بنكك:
                </label>
                <input 
                  type="number" 
                  id="split-bankak-input" 
                  value="${bankakAmount}" 
                  min="0" 
                  step="50"
                  style="width:100%; font-size:13px; font-weight:700; padding:6px 8px; border:1px solid var(--border); border-radius:6px; background:var(--background); color:#0052CC; font-family:var(--font-mono);" 
                />
              </div>
            </div>

            <div>
              <label style="font-size:11px; color:var(--muted-foreground); display:block; margin-bottom:2px;">
                رقم إشعار تحويل بنكك (TXN Ref):
              </label>
              <input 
                id="split-bankak-ref-input" 
                value="${posService.splitBankakRef || ''}"
                placeholder="مثال: TXN-BOK-849201" 
                dir="ltr" 
                style="width:100%; font-size:12px; padding:6px 8px; border:1px solid var(--border); border-radius:6px; background:var(--background); color:var(--foreground); font-family:var(--font-mono);" 
              />
            </div>

            <!-- Live Validation Balance Box -->
            <div style="display:flex; justify-content:space-between; align-items:center; background:var(--card); border:1px solid ${isSplitValid ? '#A7F3D0' : '#FECDD3'}; border-radius:6px; padding:6px 10px; font-size:12px;">
              <span>المجموع المسدد:</span>
              <strong dir="ltr" style="font-family:var(--font-mono); color:${isSplitValid ? '#00B37E' : '#E11D48'};">
                ${totalSplitPaid.toLocaleString()} / ${grandTotal.toLocaleString()} ج.س
              </strong>
            </div>
            ${!isSplitValid ? `
              <small style="color:#E11D48; font-size:11px; font-weight:600;">
                ${splitDiff > 0 ? `* متبقي ${splitDiff.toLocaleString()} ج.س لاكتمال الفاتورة` : `* يوجد زيادة ${Math.abs(splitDiff).toLocaleString()} ج.س عن الإجمالي`}
              </small>
            ` : ''}
          </div>
        `}

        <!-- Complete Sale Action Button -->
        <button 
          type="button" 
          class="btn-checkout-sale" 
          id="btn-pos-checkout" 
          ${canCheckout ? '' : 'disabled'}
          style="width:100%; height:48px; font-size:14px; font-weight:800; border-radius:8px; display:flex; align-items:center; justify-content:center; gap:8px; cursor:${canCheckout ? 'pointer' : 'not-allowed'}; margin-top:4px;"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          صرف وإصدار الفاتورة الفورية (F4)
        </button>
      </div>
    `;

    this.bindEvents(posService);
  }

  bindEvents(posService) {
    const el = document.getElementById(this.containerId);
    if (!el) return;

    // Toggle Split Payment Mode
    el.querySelector('#btn-toggle-split-payment')?.addEventListener('click', () => {
      posService.setSplitMode(!posService.isSplitMode);
      this.render(posService);
      if (this.onSplitChange) this.onSplitChange();
    });

    // 50/50 Split Button
    el.querySelector('#btn-split-5050')?.addEventListener('click', () => {
      posService.splitHalfAndHalf();
      this.render(posService);
      if (this.onSplitChange) this.onSplitChange();
    });

    // Single Payment Method buttons
    el.querySelectorAll('.pay-method-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        el.querySelectorAll('.pay-method-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        posService.activePaymentMethod = btn.dataset.method;

        const wrap = el.querySelector('#pos-single-bankak-wrap');
        if (wrap) {
          wrap.style.display = posService.activePaymentMethod === 'BANKAK' ? 'block' : 'none';
        }

        if (this.onMethodChange) this.onMethodChange(posService.activePaymentMethod);
      });
    });

    // Single Bankak Ref
    const singleRef = el.querySelector('#pos-bankak-ref-input');
    if (singleRef) {
      singleRef.addEventListener('input', (e) => {
        posService.bankakReference = e.target.value.trim();
      });
    }

    // Split Inputs
    const cashInput = el.querySelector('#split-cash-input');
    const bankakInput = el.querySelector('#split-bankak-input');
    const splitRefInput = el.querySelector('#split-bankak-ref-input');

    const handleSplitInput = () => {
      const cash = parseFloat(cashInput?.value) || 0;
      const bankak = parseFloat(bankakInput?.value) || 0;
      const ref = splitRefInput?.value.trim() || '';
      posService.setSplitAmounts(cash, bankak, ref);
      this.render(posService);
    };

    cashInput?.addEventListener('input', handleSplitInput);
    bankakInput?.addEventListener('input', handleSplitInput);
    splitRefInput?.addEventListener('input', (e) => {
      posService.splitBankakRef = e.target.value.trim();
    });

    // Checkout Button
    el.querySelector('#btn-pos-checkout')?.addEventListener('click', () => {
      if (this.onCheckout) this.onCheckout();
    });
  }
}
