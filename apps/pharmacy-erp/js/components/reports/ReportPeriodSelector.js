/**
 * PharmaTech — Report Period & Date Range Filter Component
 * Enables quick fiscal cycle selection or custom date ranges
 */

export class ReportPeriodSelector {
  constructor(containerId, onRangeChange) {
    this.container = document.getElementById(containerId);
    this.onRangeChange = onRangeChange;
    this.currentPreset = 'today';
    this.startDate = null;
    this.endDate = null;
    this.initDates();
  }

  initDates() {
    const today = new Date();
    this.todayStr = today.toISOString().split('T')[0];

    // Default: Today
    this.startDate = this.todayStr;
    this.endDate = this.todayStr;
  }

  render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div style="background:var(--card); border:1px solid var(--border); border-radius:12px; padding:12px 16px; margin-bottom:20px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
        <!-- Preset Segmented Buttons -->
        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
          <span style="font-size:12.5px; font-weight:700; color:var(--muted-foreground);">الفترة المالية:</span>
          <div class="segmented" id="report-period-presets">
            <button type="button" class="report-preset-btn" data-preset="today" data-active="${this.currentPreset === 'today'}">
              اليوم (الوردية)
            </button>
            <button type="button" class="report-preset-btn" data-preset="week" data-active="${this.currentPreset === 'week'}">
              آخر 7 أيام
            </button>
            <button type="button" class="report-preset-btn" data-preset="month" data-active="${this.currentPreset === 'month'}">
              هذا الشهر
            </button>
            <button type="button" class="report-preset-btn" data-preset="all" data-active="${this.currentPreset === 'all'}">
              كامل السجل
            </button>
          </div>
        </div>

        <!-- Custom Date Range Inputs -->
        <div style="display:flex; align-items:center; gap:8px;">
          <div style="display:flex; align-items:center; gap:6px;">
            <label style="font-size:11.5px; color:var(--muted-foreground);">من:</label>
            <input type="date" id="report-date-start" value="${this.startDate || ''}" style="height:32px; padding:0 8px; border-radius:6px; border:1px solid var(--border); background:var(--background); color:var(--foreground); font-size:12px;" />
          </div>
          <div style="display:flex; align-items:center; gap:6px;">
            <label style="font-size:11.5px; color:var(--muted-foreground);">إلى:</label>
            <input type="date" id="report-date-end" value="${this.endDate || ''}" style="height:32px; padding:0 8px; border-radius:6px; border:1px solid var(--border); background:var(--background); color:var(--foreground); font-size:12px;" />
          </div>
          <button type="button" class="btn-primary" id="btn-apply-custom-date" style="height:32px; padding:0 12px; font-size:12px;">
            تطبيق
          </button>
        </div>
      </div>
    `;

    this.attachEvents();
  }

  attachEvents() {
    const buttons = this.container.querySelectorAll('.report-preset-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        const preset = btn.dataset.preset;
        this.selectPreset(preset);
      });
    });

    const applyBtn = this.container.querySelector('#btn-apply-custom-date');
    applyBtn?.addEventListener('click', () => {
      const s = this.container.querySelector('#report-date-start')?.value || null;
      const e = this.container.querySelector('#report-date-end')?.value || null;
      this.currentPreset = 'custom';
      this.container.querySelectorAll('.report-preset-btn').forEach(b => b.dataset.active = 'false');
      this.startDate = s;
      this.endDate = e;
      if (typeof this.onRangeChange === 'function') {
        this.onRangeChange(this.startDate, this.endDate, 'فترة مخصصة');
      }
    });
  }

  selectPreset(preset) {
    this.currentPreset = preset;
    const now = new Date();

    if (preset === 'today') {
      this.startDate = this.todayStr;
      this.endDate = this.todayStr;
    } else if (preset === 'week') {
      const pastWeek = new Date(now.getTime() - 7 * 86400000);
      this.startDate = pastWeek.toISOString().split('T')[0];
      this.endDate = this.todayStr;
    } else if (preset === 'month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      this.startDate = firstDay.toISOString().split('T')[0];
      this.endDate = this.todayStr;
    } else if (preset === 'all') {
      this.startDate = null;
      this.endDate = null;
    }

    // Update input display
    const startInput = this.container.querySelector('#report-date-start');
    const endInput = this.container.querySelector('#report-date-end');
    if (startInput) startInput.value = this.startDate || '';
    if (endInput) endInput.value = this.endDate || '';

    // Update preset buttons visual active state
    this.container.querySelectorAll('.report-preset-btn').forEach(b => {
      b.dataset.active = (b.dataset.preset === preset).toString();
    });

    const labels = {
      today: 'اليوم (الوردية)',
      week: 'آخر 7 أيام',
      month: 'هذا الشهر',
      all: 'كامل السجل'
    };

    if (typeof this.onRangeChange === 'function') {
      this.onRangeChange(this.startDate, this.endDate, labels[preset] || 'مخصص');
    }
  }
}
