/**
 * PharmaTech — Design System Showcase View
 * Comprehensive documentation of brand identity, design tokens, typography, and reusable components
 */

export class DesignSystemView {
  constructor() {
    this.container = document.getElementById('design-system-view');
    this.init();
  }

  init() {
    if (!this.container) return;
    this.render();
  }

  render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="panel-head wrap">
        <div class="panel-title">
          <span class="title-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
              <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
              <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
              <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
              <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.563-2.512 5.563-5.563C22 6.5 17.5 2 12 2Z" />
            </svg>
          </span>
          <div>
            <h2>دليل الهوية ونظام المكونات (PharmaTech Design System)</h2>
            <p class="heading-meta" style="margin:0; font-size:12px;">نظام بصري متكامل مبني على رموز الألوان السريرية، الطباعة المتوازنة، ومكونات الـ SaaS المتجاوبة</p>
          </div>
        </div>
      </div>

      <!-- Color Palette Showcase -->
      <section class="panel" style="padding:20px; margin-bottom:20px;">
        <h3 style="font-size:14px; margin-bottom:12px;">1. لوحة الألوان الأساسية (Core Color Palette)</h3>
        <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(200px, 1fr)); gap:14px;">
          <div style="background:var(--card); border:1px solid var(--border); border-radius:8px; overflow:hidden;">
            <div style="height:55px; background:#00B37E;"></div>
            <div style="padding:10px; font-size:12px;">
              <strong>Primary Emerald</strong>
              <div style="color:var(--muted-foreground); font-family:var(--font-mono);">#00B37E · var(--primary)</div>
            </div>
          </div>

          <div style="background:var(--card); border:1px solid var(--border); border-radius:8px; overflow:hidden;">
            <div style="height:55px; background:#0052CC;"></div>
            <div style="padding:10px; font-size:12px;">
              <strong>Clinical Navy Blue</strong>
              <div style="color:var(--muted-foreground); font-family:var(--font-mono);">#0052CC · Hero Accent</div>
            </div>
          </div>

          <div style="background:var(--card); border:1px solid var(--border); border-radius:8px; overflow:hidden;">
            <div style="height:55px; background:#F59E0B;"></div>
            <div style="padding:10px; font-size:12px;">
              <strong>Warning Amber</strong>
              <div style="color:var(--muted-foreground); font-family:var(--font-mono);">#F59E0B · FEFO Expiry Alert</div>
            </div>
          </div>

          <div style="background:var(--card); border:1px solid var(--border); border-radius:8px; overflow:hidden;">
            <div style="height:55px; background:#EF4444;"></div>
            <div style="padding:10px; font-size:12px;">
              <strong>Destructive Red</strong>
              <div style="color:var(--muted-foreground); font-family:var(--font-mono);">#EF4444 · Critical Alert</div>
            </div>
          </div>

          <div style="background:var(--card); border:1px solid var(--border); border-radius:8px; overflow:hidden;">
            <div style="height:55px; background:#8B5CF6;"></div>
            <div style="padding:10px; font-size:12px;">
              <strong>Insurance Violet</strong>
              <div style="color:var(--muted-foreground); font-family:var(--font-mono);">#8B5CF6 · Medical Insurance</div>
            </div>
          </div>
        </div>
      </section>

      <!-- UI Components Showcase -->
      <section class="panel" style="padding:20px; margin-bottom:20px;">
        <h3 style="font-size:14px; margin-bottom:12px;">2. عناصر التحكم والأزرار (Buttons & Interactive Elements)</h3>
        <div style="display:flex; flex-wrap:wrap; gap:12px; align-items:center;">
          <button class="btn-primary">زر رئيسي (Primary)</button>
          <button class="icon-btn outlined" title="زر ثانوي"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg></button>
          <button class="btn-table-action" style="color:var(--primary);">إجراء جدول (Action)</button>
          <button class="btn-table-action" style="color:var(--destructive);">حذف / إلغاء (Destructive)</button>
        </div>
      </section>

      <!-- Chips & Badges Showcase -->
      <section class="panel" style="padding:20px; margin-bottom:20px;">
        <h3 style="font-size:14px; margin-bottom:12px;">3. شارات الحالة والـ Chips (Status Badges)</h3>
        <div style="display:flex; flex-wrap:wrap; gap:10px; align-items:center;">
          <span class="chip chip-success">✓ مكتمل / معتمد</span>
          <span class="chip chip-info">ℹ معلومة / قيد المزامنة</span>
          <span class="chip chip-warning">⏳ تنبيه صلاحية FEFO</span>
          <span class="chip chip-danger">✕ ملغي / حرج</span>
          <span class="chip">افتراضي</span>
        </div>
      </section>

      <!-- Typography Showcase -->
      <section class="panel" style="padding:20px;">
        <h3 style="font-size:14px; margin-bottom:12px;">4. مقاييس الخطوط والطباعة (Typography Scale)</h3>
        <div style="display:flex; flex-direction:column; gap:8px;">
          <h1 style="margin:0; font-size:24px;">عنوان H1 — صيدلية النيلين النموذجية (24px)</h1>
          <h2 style="margin:0; font-size:18px;">عنوان H2 — تقارير أداء الصيدلية السريرية (18px)</h2>
          <h3 style="margin:0; font-size:15px;">عنوان H3 — بيانات الدواء وتشغيلة FEFO (15px)</h3>
          <p style="margin:0; font-size:13px; color:var(--muted-foreground);">نص عادي Body Text — جميع العمليات الصيدلانية مشفرة ومؤمنة بحصص الأوفلاين (13px)</p>
          <small style="font-family:var(--font-mono); font-size:11.5px; color:var(--muted-foreground);">أرقام ورموز Monospace: TXN-BOK-94821038 · SDG 15,800.00 (11.5px)</small>
        </div>
      </section>
    `;
  }
}
