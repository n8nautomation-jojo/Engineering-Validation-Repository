/**
 * PharmaTech — Inventory Table Grid Component
 * Clinical table with FEFO priority badges, stock health meters, and rapid inventory actions
 */

export class InventoryTableGrid {
  constructor(containerId = 'inventory-table-container', { onSelectMedicine, onAdjustStock, onPrintBarcode }) {
    this.containerId = containerId;
    this.onSelectMedicine = onSelectMedicine;
    this.onAdjustStock = onAdjustStock;
    this.onPrintBarcode = onPrintBarcode;
  }

  render(medicines = []) {
    const el = document.getElementById(this.containerId);
    if (!el) return;

    if (medicines.length === 0) {
      el.innerHTML = `
        <div class="table-scroll">
          <table class="medicine-table" style="width:100%;">
            <tbody>
              <tr>
                <td colspan="8" style="text-align:center; padding:48px 20px; color:var(--muted-foreground);">
                  <div style="display:grid; place-items:center; gap:8px;">
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                      <path stroke-linecap="round" stroke-linejoin="round" d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" />
                      <path stroke-linecap="round" stroke-linejoin="round" d="m8.5 8.5 7 7" />
                    </svg>
                    <span style="font-size:14px; font-weight:700; color:var(--foreground);">لا توجد أدوية مطابقة للبحث أو معايير التصفية</span>
                    <small>جرب تغيير مصطلح البحث أو اختيار قسم آخر</small>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      `;
      return;
    }

    el.innerHTML = `
      <div class="table-scroll" style="overflow-x:auto;">
        <table class="medicine-table" id="main-medicines-table" style="width:100%;">
          <thead>
            <tr>
              <th>الدواء والاسم العلمي</th>
              <th>الفئة</th>
              <th>الكمية المتوفرة</th>
              <th>السعر (ج.س)</th>
              <th>تاريخ الانتهاء</th>
              <th>التشغيلة الأقرب انتهاءً</th>
              <th>الحالة</th>
              <th style="text-align:left;">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            ${medicines.map(m => {
              const isOutOfStock = m.stock <= 0;
              const isLowStock = m.stock > 0 && m.stock <= 20;
              const isExpired = m.status === 'expired';
              const isExpiring = m.status === 'expiring';

              return `
                <tr class="medicine-row" data-id="${m.id}">
                  <td data-label="الدواء">
                    <div style="display:flex; flex-direction:column; gap:2px;">
                      <strong style="font-size:13.5px; color:var(--foreground); cursor:pointer;" class="btn-open-med-title" data-id="${m.id}">${m.name}</strong>
                      <small dir="ltr" style="color:var(--muted-foreground); font-size:11px;">${m.generic || m.name}</small>
                    </div>
                  </td>
                  
                  <td data-label="الفئة">
                    <span class="chip" style="font-size:11px; font-weight:600;">${m.category || 'عام'}</span>
                  </td>

                  <td data-label="الكمية المتوفرة">
                    <div style="display:flex; align-items:center; gap:8px;">
                      <strong style="font-size:13px; font-family:var(--font-mono); color:${isOutOfStock ? 'var(--destructive)' : isLowStock ? 'var(--warning)' : 'inherit'};">
                        ${m.stock} عبوة
                      </strong>
                      ${isLowStock ? `
                        <span class="chip chip-warning" style="font-size:9.5px; padding:1px 5px;">منخفض</span>
                      ` : ''}
                    </div>
                  </td>

                  <td data-label="السعر" dir="ltr">
                    <strong style="font-size:13px; font-family:var(--font-mono); color:var(--primary);">
                      ${Number(m.price).toLocaleString()}
                    </strong>
                  </td>

                  <td data-label="تاريخ الانتهاء" dir="ltr">
                    <span style="font-size:12px; font-family:var(--font-mono); color:${isExpired ? 'var(--destructive); font-weight:700;' : isExpiring ? 'var(--warning); font-weight:700;' : 'var(--muted-foreground)'};">
                      ${m.expiry}
                    </span>
                  </td>

                  <td data-label="التشغيلة">
                    <span class="fefo-badge" style="font-size:11px; padding:2px 7px; border-radius:4px; font-family:var(--font-mono); font-weight:700;" title="أسبقية الصرف (الأقرب انتهاءً)">
                      ${m.batch || 'BATCH-01'}
                    </span>
                  </td>

                  <td data-label="الحالة">
                    <span class="chip ${isOutOfStock ? 'chip-danger' : isExpired ? 'chip-danger' : isExpiring ? 'chip-warning' : isLowStock ? 'chip-warning' : 'chip-success'}" style="font-size:11px; font-weight:700;">
                      ${isOutOfStock ? 'نفد المخزون' : isExpired ? 'منتهي الصلاحية' : isExpiring ? 'ينتهي قريباً' : isLowStock ? 'مخزون منخفض' : 'متوفر بالمستودع'}
                    </span>
                  </td>

                  <td data-label="إجراءات" style="text-align:left;">
                    <div style="display:inline-flex; align-items:center; gap:4px;">
                      <!-- Quick Details Trigger -->
                      <button type="button" class="btn-table-action btn-row-details" data-id="${m.id}" title="عرض تفاصيل الصنف والتشغيلات">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                        تفاصيل
                      </button>

                      <!-- Stock Adjustment Trigger -->
                      <button type="button" class="btn-table-action btn-row-adjust" data-id="${m.id}" title="تسوية رصيد التشغيلة (جرد / تلف / تصحيح)">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                        </svg>
                        تسوية
                      </button>

                      <!-- Barcode Shelf Label Trigger -->
                      <button type="button" class="btn-table-action btn-row-barcode" data-id="${m.id}" title="طباعة ملصق الرف والباركود">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M3 5v14M8 5v14M12 5v14M17 5v14M21 5v14" />
                        </svg>
                        باركود
                      </button>
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;

    this.bindEvents(medicines);
  }

  bindEvents(medicines) {
    const el = document.getElementById(this.containerId);
    if (!el) return;

    // Click on drug name or details button
    el.querySelectorAll('.btn-open-med-title, .btn-row-details').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const med = medicines.find(m => m.id === id);
        if (med && this.onSelectMedicine) {
          this.onSelectMedicine(med);
        }
      });
    });

    // Stock adjustment click
    el.querySelectorAll('.btn-row-adjust').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const med = medicines.find(m => m.id === id);
        if (med && this.onAdjustStock) {
          this.onAdjustStock(med);
        }
      });
    });

    // Barcode label print click
    el.querySelectorAll('.btn-row-barcode').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const med = medicines.find(m => m.id === id);
        if (med && this.onPrintBarcode) {
          this.onPrintBarcode(med);
        }
      });
    });
  }
}
