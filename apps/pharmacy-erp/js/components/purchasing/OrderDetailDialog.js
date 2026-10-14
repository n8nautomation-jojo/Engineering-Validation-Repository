/**
 * PharmaTech — Enterprise Purchase Order Detail Modal
 * High-End clinical UI replacing legacy alert() with full printable PO document & GRN audit trail
 */

export class OrderDetailDialog {
  constructor(onReceiveShipment) {
    this.dialog = document.getElementById('dialog-order-detail');
    this.closeBtn = document.getElementById('btn-close-order-detail-dialog');
    this.printBtn = document.getElementById('btn-print-po-sheet');
    this.receiveBtn = document.getElementById('btn-po-detail-receive');
    this.contentEl = document.getElementById('order-detail-modal-content');
    this.currentOrder = null;
    this.onReceiveShipment = onReceiveShipment;

    this.init();
  }

  init() {
    if (!this.dialog) return;

    this.closeBtn?.addEventListener('click', () => this.close());
    this.dialog.addEventListener('click', (e) => {
      if (e.target === this.dialog) this.close();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !this.dialog.classList.contains('hidden')) {
        this.close();
      }
    });

    this.printBtn?.addEventListener('click', () => {
      window.print();
    });

    this.receiveBtn?.addEventListener('click', () => {
      if (this.currentOrder && typeof this.onReceiveShipment === 'function') {
        const order = this.currentOrder;
        this.close();
        this.onReceiveShipment(order);
      }
    });
  }

  open(order) {
    if (!order) return;
    this.currentOrder = order;
    this.render();
    this.dialog?.classList.remove('hidden');
  }

  close() {
    this.dialog?.classList.add('hidden');
    this.currentOrder = null;
  }

  render() {
    if (!this.contentEl || !this.currentOrder) return;
    const o = this.currentOrder;
    const isPending = o.status === 'PENDING_RECEIPT';
    const isDelivered = o.status === 'DELIVERED';

    if (this.receiveBtn) {
      this.receiveBtn.style.display = isPending ? 'inline-flex' : 'none';
    }

    this.contentEl.innerHTML = `
      <!-- PO Official Header -->
      <div style="border-bottom:2px solid var(--border); padding-bottom:14px; margin-bottom:14px; display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:10px;">
        <div>
          <span style="font-size:11px; font-weight:700; color:var(--muted-foreground); text-transform:uppercase;">أمر توريد رسمي</span>
          <h2 style="margin:2px 0 6px; font-family:var(--font-mono); font-size:20px; color:var(--primary);">${o.poNumber}</h2>
          <div style="font-size:13px; color:var(--foreground);">المورد: <strong>${o.supplierName}</strong></div>
        </div>
        <div style="text-align:left;">
          ${isPending ? '<span class="chip chip-warning" style="font-size:12px; padding:4px 10px;">⏳ بانتظار استلام الشحنة</span>' : ''}
          ${isDelivered ? '<span class="chip chip-success" style="font-size:12px; padding:4px 10px;">✓ تم الاستلام وتوريد المخزون</span>' : ''}
          <div style="font-size:11.5px; color:var(--muted-foreground); margin-top:6px;">تاريخ الطلب: <strong class="num">${o.issueDate}</strong></div>
          <div style="font-size:11.5px; color:var(--muted-foreground);">موعد التوريد المتوقع: <strong class="num">${o.expectedDeliveryDate || '—'}</strong></div>
        </div>
      </div>

      <!-- PO Notes -->
      ${o.notes ? `
        <div style="background:var(--muted); border-radius:8px; padding:8px 12px; font-size:12px; margin-bottom:14px; color:var(--foreground);">
          <strong>ملاحظات الطلب:</strong> ${o.notes}
        </div>
      ` : ''}

      <!-- Items Table -->
      <h4 style="font-size:13px; margin:0 0 8px;">الأصناف والكميات المطلوبة:</h4>
      <div class="table-scroll" style="margin-bottom:16px; border:1px solid var(--border); border-radius:8px;">
        <table class="medicine-table" style="font-size:12px;">
          <thead>
            <tr>
              <th>الدواء</th>
              <th>الكمية المطلوبة</th>
              <th>الكمية المستلمة</th>
              <th>سعر الشراء الوحدة</th>
              <th>الإجمالي (ج.س)</th>
            </tr>
          </thead>
          <tbody>
            ${(o.items || []).map(item => `
              <tr>
                <td><strong>${item.productName}</strong></td>
                <td class="num">${item.orderedQuantity} وحدة</td>
                <td class="num">${item.receivedQuantity || 0} وحدة</td>
                <td class="num">${(item.unitCost || 0).toLocaleString('en-US')} ج.س</td>
                <td class="num" style="font-weight:700;">${((item.orderedQuantity || 0) * (item.unitCost || 0)).toLocaleString('en-US')} ج.س</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr style="background:var(--card); font-weight:700;">
              <td colspan="4" style="text-align:right;">إجمالي قيمة أمر الشراء:</td>
              <td class="num" style="font-size:14px; color:var(--primary);">${(o.totals?.totalCost || 0).toLocaleString('en-US')} ج.س</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- Goods Receipt Notes (GRN) Audit Trail -->
      ${o.goodsReceipts && o.goodsReceipts.length > 0 ? `
        <div style="border-top:1px dashed var(--border); padding-top:14px;">
          <h4 style="font-size:13px; margin:0 0 8px; color:var(--primary); display:flex; align-items:center; gap:6px;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6 9 17l-5-5"/></svg>
            سجل أذونات الاستلام والمطابقة الدوائية (GRN Audit Trail):
          </h4>
          <div style="display:flex; flex-direction:column; gap:8px;">
            ${o.goodsReceipts.map(grn => `
              <div style="background:var(--card); border:1px solid var(--border); border-radius:8px; padding:10px 12px; font-size:12px;">
                <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                  <strong style="font-family:var(--font-mono);">${grn.grnNumber}</strong>
                  <span class="chip chip-info" style="font-size:10.5px;">فاتورة المورد: ${grn.supplierInvoiceNumber || 'غير مرفق'}</span>
                </div>
                <div style="color:var(--muted-foreground); margin-bottom:4px;">
                  المستلم: <strong style="color:var(--foreground);">${grn.receivedBy}</strong> · التاريخ: <span class="num" style="color:var(--foreground);">${new Date(grn.receivedAt).toLocaleDateString('ar-SD')}</span>
                </div>
                <div style="font-size:11.5px; background:var(--muted); border-radius:6px; padding:6px 8px;">
                  <strong>التشغيلات الموردة:</strong>
                  ${grn.items.map(gi => `${gi.productName} (تشغيلة: <span dir="ltr" style="font-family:var(--font-mono); font-weight:700;">${gi.batchNumber}</span> · تنتهي: ${gi.expiryDate} · الكمية: ${gi.quantity})`).join(' · ')}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    `;
  }
}
