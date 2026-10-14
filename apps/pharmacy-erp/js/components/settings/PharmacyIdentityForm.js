/**
 * PharmaTech — Pharmacy Identity & Profile Form Sub-Component
 * Official legal credentials, Ministry of Health license, TRN, and branch details
 */

export class PharmacyIdentityForm {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
  }

  render(settings = {}) {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="form-grid">
        <label class="field wide">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18M3 7v14M21 7v14M6 11h12M6 15h12M6 19h12"/></svg>
          <input name="pharmacyName" required value="${settings.pharmacyName || ''}" placeholder="اسم الصيدلية الرسمي بالعربية" />
        </label>

        <label class="field wide">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          <input name="pharmacyNameEn" value="${settings.pharmacyNameEn || ''}" placeholder="Pharmacy English Name" dir="ltr" />
        </label>

        <label class="field">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          <input name="branchName" required value="${settings.branchName || ''}" placeholder="اسم الفرع النشط (مثال: فرع الخرطوم الرئيسي)" />
        </label>

        <label class="field">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg>
          <input name="licenseNumber" value="${settings.licenseNumber || ''}" placeholder="رقم ترخيص وزارة الصحة (MOH-...)" dir="ltr" />
        </label>

        <label class="field">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          <input name="taxRegistrationNumber" value="${settings.taxRegistrationNumber || ''}" placeholder="الرقم الضريبي الرسمي (TRN-...)" dir="ltr" />
        </label>

        <label class="field">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
          <input name="phone" value="${settings.phone || ''}" placeholder="هاتف الصيدلية والتواصل" dir="ltr" />
        </label>

        <label class="field wide">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          <input name="address" value="${settings.address || ''}" placeholder="العنوان الجغرافي للفرع (المدينة، الشارع، المعلم البارز)" />
        </label>
      </div>
    `;
  }

  collectData(formData) {
    const getValue = (name) => {
      const formVal = formData ? formData.get(name) : null;
      if (formVal !== null && formVal !== undefined) return String(formVal);
      return this.container?.querySelector(`[name="${name}"]`)?.value ?? '';
    };

    return {
      pharmacyName: getValue('pharmacyName').trim(),
      pharmacyNameEn: getValue('pharmacyNameEn').trim(),
      branchName: getValue('branchName').trim(),
      licenseNumber: getValue('licenseNumber').trim(),
      taxRegistrationNumber: getValue('taxRegistrationNumber').trim(),
      phone: getValue('phone').trim(),
      address: getValue('address').trim()
    };
  }
}
