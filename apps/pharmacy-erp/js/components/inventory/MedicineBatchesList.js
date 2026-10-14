/**
 * PharmaTech — Medicine Batches Breakdown Component (FEFO Clinical Engine)
 * Renders individual stock batches, calculating days until expiry and highlighting FEFO priority
 */

export class MedicineBatchesList {
  constructor(containerId = 'detail-medicine-batches-list') {
    this.container = document.getElementById(containerId);
  }

  render(medicine) {
    if (!this.container) return;

    let batches = medicine.batches || [];
    if (batches.length === 0) {
      if (medicine.batch && medicine.expiry) {
        batches = [{
          batchNumber: medicine.batch,
          expiryDate: medicine.expiry,
          availableQuantity: medicine.stock || 0
        }];
      }
    }

    if (batches.length === 0) {
      this.container.innerHTML = `
        <div style="text-align:center; padding:12px; color:var(--muted-foreground); font-size:12px;">
          لا توجد تشغيلات مسجلة حالياً لهذا الصنف
        </div>
      `;
      return;
    }

    // Sort strictly by expiry date (FEFO rule)
    const sortedBatches = [...batches].sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));
    const today = new Date().toISOString().split('T')[0];

    // Find the first valid batch with stock > 0
    let activeFefoAssigned = false;

    this.container.innerHTML = sortedBatches.map(batch => {
      const isExpired = batch.expiryDate < today;
      const daysLeft = Math.ceil((new Date(batch.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
      
      const isActiveFefo = !activeFefoAssigned && !isExpired && batch.availableQuantity > 0;
      if (isActiveFefo) {
        activeFefoAssigned = true;
      }

      let expiryLabel = '';
      let expiryColor = '#00B37E';
      let expiryBg = '#ECFDF5';

      if (isExpired) {
        expiryLabel = 'منتهية الصلاحية';
        expiryColor = '#E11D48';
        expiryBg = '#FFF1F2';
      } else if (daysLeft <= 30) {
        expiryLabel = `حرجة (${daysLeft} يوم)`;
        expiryColor = '#E11D48';
        expiryBg = '#FFF1F2';
      } else if (daysLeft <= 90) {
        expiryLabel = `تنتهي قريباً (${daysLeft} يوم)`;
        expiryColor = '#D97706';
        expiryBg = '#FEF3C7';
      } else {
        const months = Math.floor(daysLeft / 30);
        expiryLabel = months >= 12 ? `صالحة (${(months / 12).toFixed(1)} سنة)` : `صالحة (${months} شهر)`;
        expiryColor = '#00B37E';
        expiryBg = '#ECFDF5';
      }

      return `
        <div style="display:flex; justify-content:space-between; align-items:center; background:var(--card); border:1px solid ${isActiveFefo ? 'var(--primary)' : 'var(--border)'}; border-radius:6px; padding:7px 10px; font-size:12px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <strong style="font-family:var(--font-mono); font-size:12px;" dir="ltr">${batch.batchNumber}</strong>
            ${isActiveFefo ? `
              <span class="chip chip-success" style="font-size:10px; padding:1px 6px;">
                أولوية الصرف (الأقرب انتهاءً) 🥇
              </span>
            ` : ''}
          </div>

          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:11px; color:${expiryColor}; background:${expiryBg}; padding:2px 6px; border-radius:4px; font-weight:600;">
              ${expiryLabel} · <span dir="ltr">${batch.expiryDate}</span>
            </span>
            <strong style="font-size:12px; min-width:60px; text-align:left;" dir="ltr">
              ${batch.availableQuantity} عبوة
            </strong>
          </div>
        </div>
      `;
    }).join('');
  }
}
