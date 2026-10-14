/**
 * [Feature / Domain]: Platform Administration — Overview Dashboard Component
 * [Multi-Tenancy Context]: Aggregated SaaS Metrics & Telemetry Visualization
 * [Security / Entitlement]: Platform Performance & Financial Health
 */

import { adminStore } from '../state/adminStore.js';
import { TelemetryService } from '../services/telemetryService.js';

export class OverviewView {
  constructor() {
    this.totalTenantsEl = document.getElementById('metric-total-tenants');
    this.totalMrrEl = document.getElementById('metric-total-mrr');
    this.gatewayUptimeEl = document.getElementById('metric-gateway-uptime');
    this.pendingCredsEl = document.getElementById('metric-pending-creds');
    this.recentTenantsTbody = document.getElementById('overview-recent-tenants-tbody');

    this.init();
  }

  init() {
    adminStore.subscribe((event) => {
      if (['TENANT_PROVISIONED', 'TENANT_UPDATED', 'TENANTS_LOADED', 'TENANT_STATUS_CHANGED'].includes(event)) {
        this.render();
      }
    });

    this.render();
  }

  render() {
    const snap = TelemetryService.getSnapshot();

    if (this.totalTenantsEl) this.totalTenantsEl.textContent = snap.totalTenants;
    if (this.totalMrrEl) {
      this.totalMrrEl.innerHTML = `${Number(snap.totalMRR).toLocaleString()} <small style="font-size:13px; font-weight:600;">ج.س</small>`;
    }
    if (this.gatewayUptimeEl) this.gatewayUptimeEl.textContent = snap.gatewayUptime;
    if (this.pendingCredsEl) this.pendingCredsEl.textContent = snap.pendingPasswordChangeCount;

    if (this.recentTenantsTbody) {
      const recent = adminStore.tenants.slice(0, 4);
      this.recentTenantsTbody.innerHTML = recent.map(t => `
        <tr>
          <td>
            <div class="tenant-cell-main">
              <div class="tenant-avatar-badge">${t.tenantCode.slice(7, 9) || 'PH'}</div>
              <div class="tenant-info">
                <strong>${t.tenantName}</strong>
                <small>${t.tenantCode}</small>
              </div>
            </div>
          </td>
          <td><span class="plan-badge ${t.plan.toLowerCase()}">${t.plan}</span></td>
          <td>
            <span class="status-pill ${t.status.toLowerCase()}">
              ${t.status === 'ACTIVE' ? 'نشط' : 'معلق'}
            </span>
          </td>
          <td><span class="num">${t.createdAt}</span></td>
        </tr>
      `).join('');
    }
  }
}
