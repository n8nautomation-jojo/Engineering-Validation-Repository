/**
 * PharmaTech — Notifications & Alerts Dialog Component
 * Shift alerts, FEFO warnings & low-stock triggers
 */

import { appStore } from '../state/store.js';
import { showToast } from './Toast.js';

export class NotificationsDialog {
  constructor() {
    this.dialog = document.getElementById('dialog-notifications');
    this.container = document.getElementById('notifications-modal-list');
    this.bellBtn = document.getElementById('notifications-bell-btn');
    this.closeBtn = document.getElementById('btn-close-notifications');
    this.clearBtn = document.getElementById('btn-clear-notifications');
    this.badgeCount = document.getElementById('notifications-badge-count');

    this.init();
  }

  init() {
    this.bellBtn?.addEventListener('click', () => this.open());
    this.closeBtn?.addEventListener('click', () => this.close());

    this.clearBtn?.addEventListener('click', () => {
      appStore.notifications = [];
      if (this.badgeCount) this.badgeCount.textContent = '0';
      this.close();
      showToast('تم تعليم الكل كمقروء', 'تم مسح الإشعارات النشطة في الوردية', 'info');
    });

    // Alert row triggers in middle grid
    document.getElementById('alert-row-lowstock')?.addEventListener('click', () => {
      appStore.setStatusFilter('low');
      showToast('نواقص الأدوية', 'تمت تصفية الجدول لعرض الأصناف المنخفضة فقط', 'warning');
    });

    document.getElementById('alert-row-expiry')?.addEventListener('click', () => {
      appStore.setStatusFilter('expiring');
      showToast('أولوية FEFO', 'تمت تصفية الجدول لعرض الأدوية التي تقترب من الصلاحية أولاً', 'danger');
    });

    document.getElementById('alert-row-shipment')?.addEventListener('click', () => {
      this.open();
    });
  }

  open() {
    if (!this.container) return;

    if (appStore.notifications.length === 0) {
      this.container.innerHTML = `
        <div style="text-align:center; padding:24px; color:var(--muted-foreground);">
          لا توجد إشعارات جديدة في الوردية
        </div>
      `;
    } else {
      this.container.innerHTML = appStore.notifications.map((n, idx) => `
        <button type="button" class="alert-item notification-action-item" data-idx="${idx}" style="width:100%; text-align:inherit; background:none; border:none; cursor:pointer;">
          <span class="alert-symbol ${n.type}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 9v4m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/></svg>
          </span>
          <span class="alert-text">
            <strong>${n.title}</strong>
            <small>${n.desc}</small>
          </span>
          <span style="font-size:11px; color:var(--muted-foreground);">${n.time}</span>
        </button>
      `).join('');

      this.container.querySelectorAll('.notification-action-item').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = Number(btn.dataset.idx);
          const notif = appStore.notifications[idx];
          if (!notif) return;

          this.close();

          if (notif.action === 'LOW_STOCK') {
            const invBtn = document.querySelector('.nav-button[data-view="inventory"]');
            if (invBtn) invBtn.click();
            setTimeout(() => appStore.setStatusFilter('low'), 10);
          } else if (notif.action === 'EXPIRING') {
            const invBtn = document.querySelector('.nav-button[data-view="inventory"]');
            if (invBtn) invBtn.click();
            setTimeout(() => appStore.setStatusFilter('expiring'), 10);
          } else if (notif.action === 'SHIPMENTS') {
            const purchBtn = document.querySelector('.nav-button[data-view="purchasing"]');
            if (purchBtn) purchBtn.click();
          }
        });
      });
    }

    this.dialog?.classList.remove('hidden');
  }

  close() {
    this.dialog?.classList.add('hidden');
  }
}
