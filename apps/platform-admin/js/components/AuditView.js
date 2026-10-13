/**
 * [Feature / Domain]: Platform Administration — Security Audit View Component
 * [Multi-Tenancy Context]: Immutable Audit Log Inspection
 * [Security / Entitlement]: Security Compliance Inspector
 */

import { adminStore } from '../state/adminStore.js';
import { auditService } from '../services/auditService.js';

export class AuditView {
  constructor() {
    this.tbody = document.getElementById('audit-log-body') || document.getElementById('audit-table-tbody');
    this.searchInput = document.getElementById('audit-search-input');
    this.countBadge = document.getElementById('audit-count-badge');

    this.init();
  }

  init() {
    if (this.searchInput) {
      this.searchInput.addEventListener('input', () => this.render());
    }

    adminStore.subscribe((event) => {
      if (event === 'AUDIT_LOG_ADDED') {
        this.render();
      }
    });

    this.render();
  }

  render() {
    if (!this.tbody) return;

    const query = this.searchInput?.value.trim() || '';
    const logs = auditService.getAuditTrail(query);

    if (this.countBadge) this.countBadge.textContent = logs.length;

    if (logs.length === 0) {
      this.tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align:center; padding:32px; color:var(--text-muted);">
            لا توجد سجلات تدقيق أمني مطابقة للبحث
          </td>
        </tr>
      `;
      return;
    }

    this.tbody.innerHTML = logs.map(l => {
      let tagClass = 'provision';
      if (l.action.includes('SUSPEND') || l.action.includes('ACTIVATE')) tagClass = 'suspend';
      if (l.action.includes('CREDENTIALS')) tagClass = 'credentials';

      return `
        <tr>
          <td><span class="audit-timestamp">${l.timestamp}</span></td>
          <td><span class="audit-tag ${tagClass}">${l.action}</span></td>
          <td><span class="correlation-id">${l.correlationId}</span></td>
          <td><strong style="font-family:var(--font-latin); font-size:12px;">${l.tenantCode}</strong></td>
          <td><span style="font-size:12px; color:var(--text-secondary);">${l.details}</span></td>
          <td><small style="font-family:var(--font-latin); color:var(--text-muted);">${l.actor}</small></td>
        </tr>
      `;
    }).join('');
  }
}
