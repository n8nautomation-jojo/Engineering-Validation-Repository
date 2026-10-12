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

// Dictionary for intelligent Arabic pharmacy transliteration & English mapping
const ARABIC_DICT = {
  'النيل': 'NILE', 'الأزرق': 'BLUE', 'الازرق': 'BLUE', 'النيلين': 'NILEIN',
  'الخرطوم': 'KRT', 'بحري': 'BAHRI', 'ام درمان': 'OMDURMAN', 'أم درمان': 'OMDURMAN',
  'الشفاء': 'SHIFA', 'الامل': 'AMAL', 'الأمل': 'AMAL', 'البلسم': 'BALSAM',
  'ميديكو': 'MEDICO', 'فارما': 'PHARMA', 'كير': 'CARE', 'الصحة': 'HEALTH',
  'الحياة': 'HAYAT', 'طيبة': 'TIBA', 'الرحمة': 'RAHMA', 'السلام': 'SALAM',
  'المركزية': 'CENTRAL', 'النموذجية': 'MODEL', 'الرواد': 'RAWAD', 'التاج': 'TAJ'
};
const STOP_WORDS = new Set(['صيدلية', 'صيدليات', 'مجموعة', 'شركة', 'سلسلة', 'مركز', 'مؤسسة']);

function transliterateArabic(str) {
  const map = {
    'ا':'A','أ':'A','إ':'A','آ':'A','ء':'','ب':'B','ت':'T','ث':'TH','ج':'J','ح':'H','خ':'KH',
    'د':'D','ذ':'Z','ر':'R','ز':'Z','س':'S','ش':'SH','ص':'S','ض':'D','ط':'T','ظ':'Z','ع':'A',
    'غ':'GH','ف':'F','ق':'K','ك':'K','ل':'L','م':'M','ن':'N','ه':'H','و':'W','ي':'Y','ى':'Y','ة':'A'
  };
  return str.split('').map(c => map[c] || (c.match(/[a-zA-Z0-9]/) ? c.toUpperCase() : '')).join('');
}

// Generate unique tenant code suggestions based on pharmacy name
function generateTenantCodeSuggestions(name, existingTenants) {
  if (!name || !name.trim()) return [];
  const existingSet = new Set(existingTenants.map(t => t.tenantCode.toUpperCase()));
  const clean = name.trim().replace(/[^\w\s\u0600-\u06FF]/g, '');
  const tokens = clean.split(/\s+/).filter(t => t && !STOP_WORDS.has(t));

  const parts = [];
  for (const t of tokens) {
    if (ARABIC_DICT[t]) parts.push(ARABIC_DICT[t]);
    else {
      const trans = transliterateArabic(t);
      if (trans) parts.push(trans);
    }
  }

  let slug = parts.join('-');
  if (!slug) slug = 'PHARMA';
  slug = slug.toUpperCase().replace(/[^A-Z0-9-]/g, '').substring(0, 16).replace(/-+$/, '');

  const candidates = [];

  // Option 1: PHARMA-{SLUG}
  let opt1 = slug.startsWith('PHARMA') ? slug : `PHARMA-${slug}`;
  candidates.push(opt1);

  // Option 2: {SLUG}-GRP
  let opt2 = `${slug}-GRP`;
  candidates.push(opt2);

  // Option 3: {SLUG}-SD
  let opt3 = `${slug}-SD`;
  candidates.push(opt3);

  // Option 4: PHARMA-{INITIALS}-{RANDOM}
  const initials = parts.map(p => p[0]).join('') || 'PH';
  let opt4 = `PHARMA-${initials}-01`;
  candidates.push(opt4);

  // Resolve uniqueness against existing codes
  const uniqueSuggestions = [];
  for (const cand of candidates) {
    let finalCand = cand;
    let counter = 1;
    while (existingSet.has(finalCand)) {
      const pad = counter < 10 ? `0${counter}` : counter;
      finalCand = `${cand.replace(/-\d+$/, '')}-${pad}`;
      counter++;
    }
    if (!uniqueSuggestions.includes(finalCand)) {
      uniqueSuggestions.push(finalCand);
    }
  }

  return uniqueSuggestions;
}

// State
const state = {
  tenants: [...INITIAL_TENANTS],
  auditLog: [...INITIAL_AUDIT_LOG],
  activeTab: "overview",
  isCodeManuallyEdited: false
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
const tenantNameInput = document.getElementById("tenant-name-input");
const tenantCodeInput = document.getElementById("tenant-code-input");
const orgNameInput = document.getElementById("org-name-input");
const branchNameInput = document.getElementById("branch-name-input");
const adminUserInput = document.getElementById("admin-user-input");
const adminEmailInput = document.getElementById("admin-email-input");
const subPlanSelect = document.getElementById("sub-plan-select");

const codeStatusBadge = document.getElementById("code-status-badge");
const regenerateCodeBtn = document.getElementById("regenerate-code-btn");
const suggestedChipsContainer = document.getElementById("suggested-chips-container");
const codeHintMsg = document.getElementById("code-hint-msg");

const themeToggleBtn = document.getElementById("theme-toggle-btn");
const themeLabelText = document.getElementById("theme-label-text");

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

if (quickProvisionBtn) {
  quickProvisionBtn.addEventListener("click", () => switchTab("provisioning"));
}

// Theme Switcher Logic
function initTheme() {
  const savedTheme = localStorage.getItem("pharmatech-theme") || "dark";
  applyTheme(savedTheme);
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("pharmatech-theme", theme);
  if (theme === "light") {
    themeLabelText.textContent = "الوضع الليلي الفاخر";
  } else {
    themeLabelText.textContent = "الوضع النهاري المريح";
  }
}

if (themeToggleBtn) {
  themeToggleBtn.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme") || "dark";
    const next = current === "dark" ? "light" : "dark";
    applyTheme(next);
  });
}

// Intelligent Tenant Code Generation
function updateTenantCodeSuggestions() {
  const name = tenantNameInput.value.trim();
  if (!name) {
    if (!state.isCodeManuallyEdited) {
      tenantCodeInput.value = "";
    }
    suggestedChipsContainer.innerHTML = "";
    codeStatusBadge.className = "code-status-badge auto";
    codeStatusBadge.textContent = "سيتم التوليد تلقائياً";
    codeHintMsg.textContent = "اكتب اسم الصيدلية ليتم توليد الرمز تلقائياً ويضمن النظام عدم تكراره.";
    return;
  }

  const suggestions = generateTenantCodeSuggestions(name, state.tenants);
  if (!suggestions || suggestions.length === 0) return;

  // Auto-fill code if not manually changed by user
  if (!state.isCodeManuallyEdited) {
    tenantCodeInput.value = suggestions[0];
    validateAndUpdateCodeBadge(suggestions[0], true);
  }

  // Also auto-fill Org Name and Admin Username if empty
  if (!orgNameInput.value.trim()) {
    orgNameInput.value = `شركة ${name} المحدودة`;
  }
  if (!adminUserInput.value.trim()) {
    const slug = suggestions[0].toLowerCase().replace(/^pharma-/, '').replace(/-/g, '_');
    adminUserInput.value = `${slug}_admin`;
  }
  if (!branchNameInput.value.trim()) {
    branchNameInput.value = "الفرع الرئيسي";
  }

  // Render clickable suggestions chips
  suggestedChipsContainer.innerHTML = "";
  suggestions.forEach((sug, idx) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = `chip-btn ${tenantCodeInput.value.trim().toUpperCase() === sug ? 'active' : ''}`;
    chip.textContent = sug;
    chip.addEventListener("click", () => {
      tenantCodeInput.value = sug;
      state.isCodeManuallyEdited = false;
      validateAndUpdateCodeBadge(sug, true);
      document.querySelectorAll(".chip-btn").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
    });
    suggestedChipsContainer.appendChild(chip);
  });
}

function validateAndUpdateCodeBadge(code, isAuto) {
  const upper = (code || "").trim().toUpperCase();
  if (!upper) {
    codeStatusBadge.className = "code-status-badge conflict";
    codeStatusBadge.textContent = "رمز المستأجر مطلوب";
    codeHintMsg.textContent = "يرجى إدخال أو اختيار رمز فريد للصيدلية.";
    return;
  }

  const isDuplicate = state.tenants.some(t => t.tenantCode === upper);
  if (isDuplicate) {
    codeStatusBadge.className = "code-status-badge conflict";
    codeStatusBadge.textContent = "⚠️ مستخدم مسبقاً";
    codeHintMsg.innerHTML = `<span style="color:var(--accent-danger)">هذا الرمز (${upper}) مسجل لصيدلية أخرى، يرجى اختيار رمز آخر أو النقر على اقتراح بديل.</span>`;
  } else if (isAuto) {
    codeStatusBadge.className = "code-status-badge auto";
    codeStatusBadge.textContent = "✨ تم التوليد تلقائياً (فريد)";
    codeHintMsg.innerHTML = `<span style="color:var(--accent-green)">كود فريد غير مستخدم من قبل، ويمكنك تعديله كما تشاء.</span>`;
  } else {
    codeStatusBadge.className = "code-status-badge edited";
    codeStatusBadge.textContent = "✏️ تم التعديل يدوياً (متاح)";
    codeHintMsg.innerHTML = `<span style="color:var(--accent-cyan)">الرمز (${upper}) متاح وصالح للاعتماد.</span>`;
  }
}

tenantNameInput.addEventListener("input", () => {
  updateTenantCodeSuggestions();
});

tenantCodeInput.addEventListener("input", () => {
  state.isCodeManuallyEdited = true;
  validateAndUpdateCodeBadge(tenantCodeInput.value, false);
});

regenerateCodeBtn.addEventListener("click", () => {
  const name = tenantNameInput.value.trim() || "صيدلية فارماتك";
  const suggestions = generateTenantCodeSuggestions(name, state.tenants);
  const randomSuffix = Math.floor(10 + Math.random() * 89);
  const newCode = `PHARMA-${(suggestions[0] || 'PHARMA').replace(/^PHARMA-/, '').replace(/-\d+$/, '')}-${randomSuffix}`;
  tenantCodeInput.value = newCode;
  state.isCodeManuallyEdited = false;
  validateAndUpdateCodeBadge(newCode, true);
});

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

  const tenantCode = tenantCodeInput.value.trim().toUpperCase();
  const tenantName = tenantNameInput.value.trim();
  const orgName = orgNameInput.value.trim();
  const branchName = branchNameInput.value.trim();
  const adminUser = adminUserInput.value.trim();
  const plan = subPlanSelect.value;

  // Check duplicate
  if (state.tenants.some(t => t.tenantCode === tenantCode)) {
    validateAndUpdateCodeBadge(tenantCode, false);
    tenantCodeInput.focus();
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
  state.isCodeManuallyEdited = false;
  suggestedChipsContainer.innerHTML = "";
  codeStatusBadge.className = "code-status-badge auto";
  codeStatusBadge.textContent = "سيتم التوليد تلقائياً";

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
    copyCredBtn.innerHTML = `
      <svg fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="mini-icon">
        <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
      </svg>
      <span>تم النسخ بنجاح!</span>
    `;
    setTimeout(() => {
      copyCredBtn.innerHTML = `
        <svg fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor" class="mini-icon">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
        </svg>
        <span>نسخ بيانات الدخول إلى الحافظة</span>
      `;
    }, 2500);
  });
});

tenantSearchInput.addEventListener("input", renderTenantsList);
auditSearchInput.addEventListener("input", renderAuditLog);

// Initialize
initTheme();
renderOverview();
renderTenantsList();
renderAuditLog();
