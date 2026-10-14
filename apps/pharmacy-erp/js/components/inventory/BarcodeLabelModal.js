/**
 * PharmaTech — Shelf Barcode Label Modal Component
 * Renders clinical 50x30mm shelf price tags with barcode, FEFO batch, and pharmacy branding
 */

import { showToast } from '../Toast.js';
import { SettingsService } from '../../services/settingsService.js';

export class BarcodeLabelModal {
  constructor(dialogId = 'dialog-barcode-label') {
    this.dialog = document.getElementById(dialogId);
    this.init();
  }

  init() {
    if (!this.dialog) return;

    this.dialog.querySelector('.dialog-close')?.addEventListener('click', () => this.close());
    this.dialog.querySelector('#btn-close-barcode-label')?.addEventListener('click', () => this.close());

    this.dialog.addEventListener('click', (e) => {
      if (e.target === this.dialog) this.close();
    });

    this.dialog.querySelector('#btn-print-shelf-label')?.addEventListener('click', () => {
      showToast('طباعة ملصق الرف', 'تم إرسال ملصق الباركود إلى طابعة الملصقات الحرارية', 'success');
      this.close();
    });
  }

  open(medicine) {
    if (!this.dialog || !medicine) return;

    const settings = SettingsService.getCachedSettings() || {
      pharmacyName: 'صيدلية النيلين النموذجية',
      branchName: 'فرع الخرطوم الرئيسي'
    };

    const previewContainer = this.dialog.querySelector('#shelf-label-preview-content');
    if (!previewContainer) return;

    const barcode = medicine.barcode || '628100100101';
    const batch = medicine.batch || (medicine.batches && medicine.batches[0]?.batchNumber) || 'BATCH-01';
    const expiry = medicine.expiry || (medicine.batches && medicine.batches[0]?.expiryDate) || '2027-12-31';

    previewContainer.innerHTML = `
      <div class="shelf-label-card" style="width:100%; max-width:360px; margin:0 auto; background:#FFFFFF; color:#0F172A; border:2px dashed #94A3B8; border-radius:10px; padding:16px; box-shadow:0 4px 14px rgba(0,0,0,0.06); font-family:var(--font-sans);">
        
        <!-- Pharmacy Header -->
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1.5px solid #0F172A; padding-bottom:6px; margin-bottom:8px;">
          <span style="font-size:12px; font-weight:800; color:#0F172A;">${settings.pharmacyName}</span>
          <span style="font-size:10px; color:#64748B;">${settings.branchName}</span>
        </div>

        <!-- Drug Title & Generic -->
        <div style="margin-bottom:8px;">
          <h3 style="margin:0; font-size:16px; font-weight:800; color:#0F172A; line-height:1.2;">${medicine.name}</h3>
          <small dir="ltr" style="display:block; font-size:11px; color:#475569; margin-top:2px;">${medicine.generic || medicine.name}</small>
        </div>

        <!-- Price in SDG -->
        <div style="display:flex; justify-content:space-between; align-items:flex-end; background:#F8FAFC; border-radius:6px; padding:6px 10px; margin-bottom:10px; border:1px solid #E2E8F0;">
          <span style="font-size:11px; font-weight:700; color:#64748B;">سعر البيع للجمهور:</span>
          <span dir="ltr" style="font-size:20px; font-weight:900; color:#0052CC; font-family:var(--font-mono); line-height:1;">
            ${Number(medicine.price).toLocaleString()} <small style="font-size:12px; font-weight:700;">ج.س</small>
          </span>
        </div>

        <!-- FEFO Batch & Expiry -->
        <div style="display:flex; justify-content:space-between; font-size:11px; margin-bottom:10px; color:#334155;">
          <span>التشغيلة: <strong dir="ltr" style="font-family:var(--font-mono);">${batch}</strong></span>
          <span>الصلاحية: <strong dir="ltr" style="font-family:var(--font-mono);">${expiry}</strong></span>
        </div>

        <!-- Realistic Vector Barcode Graphic -->
        <div style="text-align:center; padding-top:6px; border-top:1px dashed #CBD5E1;">
          <svg width="220" height="46" viewBox="0 0 220 46" style="margin:0 auto; display:block;">
            <rect x="0" y="0" width="3" height="38" fill="#0F172A" />
            <rect x="5" y="0" width="1.5" height="38" fill="#0F172A" />
            <rect x="9" y="0" width="4" height="38" fill="#0F172A" />
            <rect x="16" y="0" width="2" height="38" fill="#0F172A" />
            <rect x="21" y="0" width="5" height="38" fill="#0F172A" />
            <rect x="29" y="0" width="1.5" height="38" fill="#0F172A" />
            <rect x="33" y="0" width="3.5" height="38" fill="#0F172A" />
            <rect x="39" y="0" width="2" height="38" fill="#0F172A" />
            <rect x="44" y="0" width="4" height="38" fill="#0F172A" />
            <rect x="51" y="0" width="1.5" height="38" fill="#0F172A" />
            <rect x="56" y="0" width="3" height="38" fill="#0F172A" />
            <rect x="62" y="0" width="5" height="38" fill="#0F172A" />
            <rect x="70" y="0" width="2" height="38" fill="#0F172A" />
            <rect x="75" y="0" width="4" height="38" fill="#0F172A" />
            <rect x="82" y="0" width="1.5" height="38" fill="#0F172A" />
            <rect x="86" y="0" width="3" height="38" fill="#0F172A" />
            <rect x="92" y="0" width="5" height="38" fill="#0F172A" />
            <rect x="100" y="0" width="2" height="38" fill="#0F172A" />
            <rect x="105" y="0" width="3.5" height="38" fill="#0F172A" />
            <rect x="111" y="0" width="1.5" height="38" fill="#0F172A" />
            <rect x="115" y="0" width="4" height="38" fill="#0F172A" />
            <rect x="122" y="0" width="2" height="38" fill="#0F172A" />
            <rect x="127" y="0" width="4.5" height="38" fill="#0F172A" />
            <rect x="134" y="0" width="1.5" height="38" fill="#0F172A" />
            <rect x="138" y="0" width="3" height="38" fill="#0F172A" />
            <rect x="144" y="0" width="5" height="38" fill="#0F172A" />
            <rect x="152" y="0" width="2" height="38" fill="#0F172A" />
            <rect x="157" y="0" width="4" height="38" fill="#0F172A" />
            <rect x="164" y="0" width="1.5" height="38" fill="#0F172A" />
            <rect x="168" y="0" width="3.5" height="38" fill="#0F172A" />
            <rect x="174" y="0" width="2" height="38" fill="#0F172A" />
            <rect x="179" y="0" width="4" height="38" fill="#0F172A" />
            <rect x="186" y="0" width="1.5" height="38" fill="#0F172A" />
            <rect x="190" y="0" width="3" height="38" fill="#0F172A" />
            <rect x="196" y="0" width="5" height="38" fill="#0F172A" />
            <rect x="204" y="0" width="2" height="38" fill="#0F172A" />
            <rect x="209" y="0" width="4" height="38" fill="#0F172A" />
            <rect x="216" y="0" width="2" height="38" fill="#0F172A" />
          </svg>
          <div dir="ltr" style="font-family:var(--font-mono); font-size:12px; font-weight:700; letter-spacing:2px; color:#0F172A; margin-top:3px;">
            ${barcode}
          </div>
        </div>

      </div>
    `;

    this.dialog.classList.remove('hidden');
  }

  close() {
    this.dialog?.classList.add('hidden');
  }
}
