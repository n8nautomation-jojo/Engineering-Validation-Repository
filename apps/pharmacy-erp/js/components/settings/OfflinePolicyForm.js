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
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <input type="number" id="setting-offline-quota-input" name="offlineQuotaCapacity" min="10" max="500" value="${quota}" required placeholder="سعة حصة الأوفلاين (وحدة)" />
          </label>
        </div>

        <div style="display:flex; align-items:center; gap:10px; padding:10px 14px; background:var(--muted); border-radius:8px; border:1px solid var(--border);">
          <input type="checkbox" id="setting-fefo-strict-cb" name="fefoStrictEnforcement" ${fefoStrict ? 'checked' : ''} style="width:18px; height:18px; accent-color:var(--primary); cursor:pointer;" />
          <label for="setting-fefo-strict-cb" style="font-size:12.5px; cursor:pointer; font-weight:600;">
            تفعيل الرقابة الدوائية الصارمة لقاعدة FEFO (منع تخطي التشغيلة الأقرب انتهاءً)
          </label>
        </div>

        <!-- Architectural Safety Explanation Card -->
        <div style="background:var(--card); border:1px solid var(--border); border-radius:8px; padding:14px; font-size:12px; line-height:1.6;">
          <strong style="display:flex; align-items:center; gap:6px; color:var(--primary); margin-bottom:6px; font-size:12.5px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            ضوابط السلامة والتشغيل عند انقطاع الإنترنت (Offline-First Safety):
          </strong>
          <div style="color:var(--muted-foreground);">
            • <strong>حصة الأوفلاين:</strong> تمنح الكاشير رصيد صرف محدوداً لمنع أي بيع غير مغطى بالسحابة، ويتم استهلاك الحصة بشكل ذري مشفر.
          </div>
          <div style="color:var(--muted-foreground); margin-top:4px;">
            • <strong>قفل FEFO المحلي:</strong> تضمن المنظومة عدم بيع أي دواء منتهي الصلاحية أو تشغيلة أحدث حتى أثناء انقطاع الاتصال التام.
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
