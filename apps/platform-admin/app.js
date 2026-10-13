/**
 * [Feature / Domain]: Platform Administration — Application Bootstrap Orchestrator
 * [Multi-Tenancy Context]: Global Enterprise Platform Orchestrator (D-038 / D-041)
 * [Security / Entitlement]: Platform Superadmin Entry Point
 *
 * Adheres strictly to Enterprise Hexagonal / Component Architecture:
 * - Domain Constants & RFC 7807 DTOs:  ./js/domain/*
 * - Reactive Application Store:        ./js/state/adminStore.js
 * - Domain Application Services:       ./js/services/*
 * - Decoupled UI Components:           ./js/components/*
 */

import { Sidebar } from './js/components/Sidebar.js';
import { Topbar } from './js/components/Topbar.js';
import { OverviewView } from './js/components/OverviewView.js';
import { TenantsView } from './js/components/TenantsView.js';
import { ProvisioningView } from './js/components/ProvisioningView.js';
import { AuditView } from './js/components/AuditView.js';
import { CredentialModal } from './js/components/CredentialModal.js';
import { showToast } from './js/components/Toast.js';

class PlatformAdminApplication {
  constructor() {
    this.components = {};
  }

  /**
   * Initializes all decoupled components and sets up the enterprise runtime.
   */
  bootstrap() {
    this.components.sidebar = new Sidebar();
    this.components.topbar = new Topbar();
    this.components.overview = new OverviewView();
    this.components.tenants = new TenantsView();
    this.components.provisioning = new ProvisioningView();
    this.components.audit = new AuditView();
    this.components.credentialModal = new CredentialModal();

    // Initial operational feedback
    setTimeout(() => {
      showToast('منصة فارماتك السحابية متصلة', '4 صيدليات نشطة · بيئة التشغيل السحابي آمنة 100%', 'info');
    }, 1000);

    console.log('⚡ PharmaTech Platform Console (Enterprise Modular) initialized.');
  }
}

// Bootstrap on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new PlatformAdminApplication();
  app.bootstrap();
});
