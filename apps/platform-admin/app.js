// PharmaTech Platform Console Controller
// Enforces D-038 (Platform Administration & Secure Tenant Onboarding) & D-041 (Provisioning Contract)

const INITIAL_TENANTS = [
  {
    tenantId: "tnt-001",
    tenantCode: "PHARMA-NILEIN",
    tenantName: "مجموعة صيدليات النيلين النموذجية",
    orgName: "شركة النيلين للخدمات الطبية",
    branchName: "الخرطوم — تقاطع القصر",
    adminUser: "nilein_admin",
    adminStatus: "ACTIVE",
    tempPassword: "N/A",
    plan: "ENTERPRISE",
    status: "ACTIVE",
    createdAt: "2026-09-01 10:00"
  },
  {
    tenantId: "tnt-002",
    tenantCode: "PHARMA-MEDICO",
    tenantName: "سلسلة صيدليات ميديكو الخرطوم",
    orgName: "ميديكو كير المحدودة",
    branchName: "الرياض — شارع المشتل",
    adminUser: "medico_admin",
    adminStatus: "ACTIVE",
    tempPassword: "N/A",
    plan: "STANDARD",
    status: "ACTIVE",
    createdAt: "2026-09-15 14:30"
  },
  {
    tenantId: "tnt-003",
    tenantCode: "PHARMA-OMDURMAN",
    tenantName: "صيدلية أم درمان المركزية",
    orgName: "مؤسسة أم درمان الصيدلانية",
    branchName: "سوق أم درمان الكبير",
    adminUser: "omdurman_admin",
    adminStatus: "ACTIVE",
    tempPassword: "N/A",
    plan: "COMMUNITY",
    status: "ACTIVE",
    createdAt: "2026-10-01 09:15"
  },
  {
    tenantId: "tnt-004",
    tenantCode: "PHARMA-BLUENILE",
    tenantName: "صيدليات النيل الأزرق",
    orgName: "شركة النيل الأزرق المحدودة",
    branchName: "بحري المحطة الوسطى",
    adminUser: "bluenile_admin",
    adminStatus: "PASSWORD_CHANGE_REQUIRED",
    tempPassword: "Temp-9K22!2026",
    plan: "STANDARD",
    status: "ACTIVE",
    createdAt: "2026-10-10 11:20"
  }
];

const INITIAL_AUDIT_LOG = [
  {
    id: "aud-001",
    timestamp: "2026-10-10 11:20:04",
    actor: "platform-superadmin",
    action: "PROVISION_TENANT",
    tenantCode: "PHARMA-BLUENILE",
    details: "تهيئة المستأجر وتعيين المشرف في حالة PASSWORD_CHANGE_REQUIRED",
    correlationId: "corr-prov-9921"
  },
  {
    id: "aud-002",
    timestamp: "2026-10-01 09:15:10",
    actor: "platform-superadmin",
    action: "PROVISION_TENANT",
    tenantCode: "PHARMA-OMDURMAN",
    details: "تهيئة المستأجر وتخصيص خطة COMMUNITY",
    correlationId: "corr-prov-8812"
  }
];

// State
const state = {
  tenants: [...INITIAL_TENANTS],
  auditLog: [...INITIAL_AUDIT_LOG],
  activeTab: "overview"
};

// DOM References
const navItems = document.querySelectorAll(".nav-item");
const tabViews = document.querySelectorAll(".tab-view");
const pageTitle = document.getElementById("page-title");
const totalTenantsCount = document.getElementById("total-tenants-count");

const overviewTenantsBody = document.getElementById("overview-tenants-body");
const tenantsListBody = document.getElementById("tenants-list-body");
const auditLogBody = document.getElementById("audit-log-body");

const tenantSearchInput = document.getElementById("tenant-search-input");
const auditSearchInput = document.getElementById("audit-search-input");
const quickProvisionBtn = document.getElementById("quick-provision-btn");

const provisioningForm = document.getElementById("provisioning-form");
const credentialModal = document.getElementById("credential-modal");
const closeCredentialModalBtn = document.getElementById("close-credential-modal-btn");
const finishCredModalBtn = document.getElementById("finish-cred-modal-btn");
const copyCredBtn = document.getElementById("copy-cred-btn");

const credTenantCode = document.getElementById("cred-tenant-code");
const credAdminUser = document.getElementById("cred-admin-user");
const credTempPwd = document.getElementById("cred-temp-pwd");

// Tab Navigation
const TAB_TITLES = {
  overview: "نظرة عامة على النظام السحابي",
  tenants: "إدارة المستأجرين والاشتراكات",
  provisioning: "تهيئة صيدلية جديدة (Provisioning)",
  audit: "سجل التدقيق الأمني المركزي (Audit Log)"
};

function switchTab(tabId) {
  state.activeTab = tabId;
  navItems.forEach(item => {
    item.classList.toggle("active", item.dataset.tab === tabId);
  });
  tabViews.forEach(view => {
    view.classList.toggle("hidden", view.id !== `tab-${tabId}`);
    view.classList.toggle("active", view.id === `tab-${tabId}`);
  });
  pageTitle.textContent = TAB_TITLES[tabId] || "لوحة إدارة المنصة";
}

navItems.forEach(item => {
  item.addEventListener("click", () => switchTab(item.dataset.tab));
});

quickProvisionBtn.addEventListener("click", () => switchTab("provisioning"));

// Render Functions
function renderOverview() {
  totalTenantsCount.textContent = state.tenants.length;
  overviewTenantsBody.innerHTML = "";
  
  const recentTenants = state.tenants.slice().reverse().slice(0, 5);
  recentTenants.forEach(t => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${t.tenantCode}</strong></td>
      <td>${t.tenantName}</td>
      <td><span class="badge-env">${t.plan}</span></td>
      <td><span class="status-pill ${t.status.toLowerCase()}">${t.status}</span></td>
      <td style="color:var(--text-dim); font-size:0.8rem;">${t.createdAt}</td>
    `;
    overviewTenantsBody.appendChild(tr);
  });
}

function renderTenantsList() {
  const query = tenantSearchInput.value.trim().toLowerCase();
  tenantsListBody.innerHTML = "";

  const filtered = state.tenants.filter(t => 
    !query || 
    t.tenantCode.toLowerCase().includes(query) || 
    t.tenantName.includes(query) ||
    t.adminUser.toLowerCase().includes(query)
  );

  filtered.forEach(t => {
    const tr = document.createElement("tr");
    const adminStatusBadge = t.adminStatus === "PASSWORD_CHANGE_REQUIRED" ?
      `<span class="status-pill pwd-change">تغيير كلمة المرور إلزامي</span>` :
      `<span class="status-pill active">نشط</span>`;

    const statusPill = `<span class="status-pill ${t.status.toLowerCase()}">${t.status}</span>`;
    const toggleActionText = t.status === "ACTIVE" ? "تعليق (Suspend)" : "تفعيل (Activate)";

    tr.innerHTML = `
      <td><strong>${t.tenantCode}</strong></td>
      <td>${t.tenantName}</td>
      <td><code>${t.adminUser}</code></td>
      <td>${adminStatusBadge}</td>
      <td>${t.plan}</td>
      <td>${statusPill}</td>
      <td>
        <button class="btn-action toggle-sub-btn" data-code="${t.tenantCode}">${toggleActionText}</button>
      </td>
    `;

    tr.querySelector(".toggle-sub-btn").addEventListener("click", () => {
      toggleTenantStatus(t.tenantCode);
    });

    tenantsListBody.appendChild(tr);
  });
}

function renderAuditLog() {
  const query = auditSearchInput.value.trim().toLowerCase();
  auditLogBody.innerHTML = "";

  const filtered = state.auditLog.filter(a =>
    !query ||
    a.action.toLowerCase().includes(query) ||
    a.tenantCode.toLowerCase().includes(query) ||
    a.actor.toLowerCase().includes(query)
  );

  filtered.forEach(a => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><code style="color:var(--accent-cyan); font-size:0.75rem;">${a.id}</code></td>
      <td style="font-size:0.8rem; color:var(--text-dim);">${a.timestamp}</td>
      <td><strong>${a.actor}</strong></td>
      <td><span class="badge-env">${a.action}</span></td>
      <td><strong>${a.tenantCode}</strong></td>
      <td style="font-size:0.85rem;">${a.details}</td>
      <td><code style="font-size:0.75rem;">${a.correlationId}</code></td>
    `;
    auditLogBody.appendChild(tr);
  });
}

function toggleTenantStatus(tenantCode) {
  const tenant = state.tenants.find(t => t.tenantCode === tenantCode);
  if (!tenant) return;

  const prev = tenant.status;
  tenant.status = prev === "ACTIVE" ? "SUSPENDED" : "ACTIVE";

  // Append Audit Record
  state.auditLog.unshift({
    id: `aud-${Date.now().toString(36)}`,
    timestamp: new Date().toLocaleString("en-CA").replace(",", ""),
    actor: "platform-superadmin",
    action: "UPDATE_SUBSCRIPTION_STATUS",
    tenantCode: tenant.tenantCode,
    details: `تم تعديل حالة اشتراك المستأجر من ${prev} إلى ${tenant.status}`,
    correlationId: `corr-sub-${Date.now().toString(36)}`
  });

  renderOverview();
  renderTenantsList();
  renderAuditLog();
}

// Provisioning Form Handling
provisioningForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const tenantCode = document.getElementById("tenant-code-input").value.trim().toUpperCase();
  const tenantName = document.getElementById("tenant-name-input").value.trim();
  const orgName = document.getElementById("org-name-input").value.trim();
  const branchName = document.getElementById("branch-name-input").value.trim();
  const adminUser = document.getElementById("admin-user-input").value.trim();
  const plan = document.getElementById("sub-plan-select").value;

  // Check duplicate
  if (state.tenants.some(t => t.tenantCode === tenantCode)) {
    alert(`عذراً: رمز المستأجر (${tenantCode}) مسجل مسبقاً! يجب أن يكون الرمز فريداً.`);
    return;
  }

  const tempPassword = `Temp-${Math.random().toString(36).substring(2, 7).toUpperCase()}!2026`;
  const timestamp = new Date().toLocaleString("en-CA").replace(",", "");
  const correlationId = `corr-prov-${Date.now().toString(36)}`;

  const newTenant = {
    tenantId: `tnt-${Date.now().toString(36)}`,
    tenantCode,
    tenantName,
    orgName,
    branchName,
    adminUser,
    adminStatus: "PASSWORD_CHANGE_REQUIRED",
    tempPassword,
    plan,
    status: "ACTIVE",
    createdAt: timestamp
  };

  state.tenants.unshift(newTenant);

  // Append Audit Entry
  state.auditLog.unshift({
    id: `aud-${Date.now().toString(36)}`,
    timestamp,
    actor: "platform-superadmin",
    action: "PROVISION_TENANT",
    tenantCode,
    details: `تهيئة مستأجر جديد: ${tenantName} مع إنشاء مشرف أولي في حالة PASSWORD_CHANGE_REQUIRED`,
    correlationId
  });

  // Show Credentials Modal
  credTenantCode.textContent = tenantCode;
  credAdminUser.textContent = adminUser;
  credTempPwd.textContent = tempPassword;
  credentialModal.classList.remove("hidden");

  provisioningForm.reset();
  renderOverview();
  renderTenantsList();
  renderAuditLog();
});

// Modal Actions
closeCredentialModalBtn.addEventListener("click", () => credentialModal.classList.add("hidden"));
finishCredModalBtn.addEventListener("click", () => {
  credentialModal.classList.add("hidden");
  switchTab("tenants");
});

copyCredBtn.addEventListener("click", () => {
  const text = `بيانات الدخول لمشرف صيدلية فارماتك:
رمز المستأجر: ${credTenantCode.textContent}
اسم المستخدم: ${credAdminUser.textContent}
كلمة المرور المؤقتة: ${credTempPwd.textContent}
ملاحظة: مطلوب تغيير كلمة المرور فور أول تسجيل دخول.`;
  navigator.clipboard.writeText(text).then(() => {
    alert("تم نسخ بيانات الدخول المؤقتة إلى الحافظة بنجاح!");
  });
});

tenantSearchInput.addEventListener("input", renderTenantsList);
auditSearchInput.addEventListener("input", renderAuditLog);

// Init
renderOverview();
renderTenantsList();
renderAuditLog();
