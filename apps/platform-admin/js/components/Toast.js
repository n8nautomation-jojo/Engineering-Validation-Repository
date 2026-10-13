/**
 * [Feature / Domain]: Platform Administration — Toast Notification Component
 * [Multi-Tenancy Context]: Non-blocking Superadmin Alert Dispatcher
 * [Security / Entitlement]: Global Feedback Surface
 */

export function showToast(title, desc = '', type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const iconMap = {
    success: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00B37E" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`,
    warning: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2.5"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>`,
    danger: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" x2="9" y1="9" y2="15"/><line x1="9" x2="15" y1="9" y2="15"/></svg>`,
    info: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0052CC" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="16" y2="12"/><line x1="12" x2="12.01" y1="8" y2="8"/></svg>`
  };

  toast.innerHTML = `
    <span style="display:grid; place-items:center; flex-shrink:0;">${iconMap[type] || iconMap.info}</span>
    <div style="flex:1;">
      <strong style="display:block; font-size:13px; font-weight:700;">${title}</strong>
      ${desc ? `<small style="display:block; font-size:11.5px; color:var(--text-muted); margin-top:2px;">${desc}</small>` : ''}
    </div>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 250);
  }, 4000);
}
