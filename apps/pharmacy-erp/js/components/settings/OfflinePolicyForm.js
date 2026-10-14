/**
 * PharmaTech — Offline Safety Quota & FEFO Policy Configuration Sub-Component
 * Controls offline allocation limits and clinical FEFO strict enforcement rules
 */

export class OfflinePolicyForm {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
  }

  render(settings = {}) {
    if (!this.container) return;

    const quota = settings.offlineQuotaCapacity || 100;
    const fefoStrict = settings.fefoStrictEnforcement !== false;

    this.container.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:16px;">
        <div class="form-grid">
          <label class="field wide">
            <span style="font-size:12.5px; font-weight:700; color:var(--text-primary); margin-bottom:6px; display:block;">
              الحد الأقصى للبيع بدون إنترنت (عدد العلب المسموح بصرفها عند انقطاع الشبكة):
            </span>
            <div style="display:flex; align-items:center; gap:8px;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              <input type="number" id="setting-offline-quota-input" name="offlineQuotaCapacity" min="10" max="500" value="${quota}" required placeholder="مثال: 100 علبة" style="flex:1;" />
              <span style="font-size:12px; color:var(--text-secondary);">علبة دواء</span>
            </div>
          </label>
        </div>

        <div style="display:flex; align-items:center; gap:10px; padding:12px 14px; background:var(--muted); border-radius:8px; border:1px solid var(--border);">
          <input type="checkbox" id="setting-fefo-strict-cb" name="fefoStrictEnforcement" ${fefoStrict ? 'checked' : ''} style="width:18px; height:18px; accent-color:var(--primary); cursor:pointer;" />
          <label for="setting-fefo-strict-cb" style="font-size:13px; cursor:pointer; font-weight:700;">
            صرف الأدوية الأقرب انتهاءً أولاً تلقائياً (لحماية الصيدلية من تلف الأدوية)
          </label>
        </div>

        <!-- Practical Explanation Card -->
        <div style="background:var(--card); border:1px solid var(--border); border-radius:8px; padding:14px; font-size:12px; line-height:1.6;">
          <strong style="display:flex; align-items:center; gap:6px; color:var(--primary); margin-bottom:6px; font-size:13px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            كيف يحمي النظام صيدليتك عند انقطاع الإنترنت؟
          </strong>
          <div style="color:var(--muted-foreground);">
            • <strong>سقف البيع الاحتياطي:</strong> يتيح للكاشير مواصلة صرف الأدوية وخدمة المرضى حتى في حال انقطاع النت حتى سقف محدد يحمي دقة الجرد.
          </div>
          <div style="color:var(--muted-foreground); margin-top:4px;">
            • <strong>حماية تواريخ الصلاحية:</strong> يمنع النظام بشكل قاطع صرف أي دواء منتهي الصلاحية، ويوجه الكاشير دائماً للدفعة الأقرب انتهاءً.
          </div>
        </div>
      </div>
    `;
  }

  collectData(formData) {
    const getValue = (name) => {
      const formVal = formData ? formData.get(name) : null;
      if (formVal !== null && formVal !== undefined) return String(formVal);
      return this.container?.querySelector(`[name="${name}"]`)?.value ?? '';
    };

    const quotaVal = Number(getValue('offlineQuotaCapacity') || 100);

    return {
      offlineQuotaCapacity: Number.isFinite(quotaVal) && quotaVal > 0 ? quotaVal : 100,
      fefoStrictEnforcement: this.container?.querySelector('#setting-fefo-strict-cb')?.checked ?? true
    };
  }
}
