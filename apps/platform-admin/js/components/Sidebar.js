/**
 * [Feature / Domain]: Platform Administration — Sidebar Navigation Component
 * [Multi-Tenancy Context]: Host Official Logo & Superadmin Tab Routing
 * [Security / Entitlement]: Global View Switching & D-038 Privacy Notice
 */

import { adminStore } from '../state/adminStore.js';

export class Sidebar {
  constructor() {
    this.navButtons = document.querySelectorAll('.nav-item');
    this.init();
  }

  init() {
    this.navButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        if (!tab) return;

        this.setActiveTab(tab);
      });
    });

    // Subscribe to external store requests (e.g. from topbar button)
    adminStore.subscribe((event, payload) => {
      if (event === 'TAB_CHANGED') {
        this.updateUI(payload);
      }
    });
  }

  setActiveTab(tab) {
    adminStore.setActiveTab(tab);
  }

  updateUI(tab) {
    this.navButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });

    // Update main page title
    const titles = {
      overview: 'نظرة عامة على النظام السحابي',
      tenants: 'إدارة المستأجرين (Tenants)',
      provisioning: 'تهيئة صيدلية جديدة',
      audit: 'سجل التدقيق الأمني المعتمد'
    };

    const titleEl = document.getElementById('page-title');
    if (titleEl && titles[tab]) {
      titleEl.textContent = titles[tab];
    }

    // Switch view panels
    document.querySelectorAll('.view-panel').forEach(panel => {
      panel.classList.toggle('active', panel.id === `view-${tab}`);
    });
  }
}
