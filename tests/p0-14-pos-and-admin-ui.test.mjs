import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { PosViewModel } from "../dist/src/presentation/pos-view-model.js";
import { PlatformAdminViewModel } from "../dist/src/presentation/platform-admin-view-model.js";

const sampleProduct = {
  id: "prod-001",
  sku: "MED-AMX-500",
  barcode: "6291100123456",
  name: "Amoxicillin 500mg Capsules",
  nameAr: "أموكسيسيلين 500 مجم كبسولات",
  category: "Antibiotics",
  unit: "Box (20 caps)",
  price: 2500.00,
  prescriptionRequired: true,
  batches: [
    { batchNumber: "BAT-2027-A", expiryDate: "2027-08-01", availableQuantity: 50 },
    { batchNumber: "BAT-2026-B", expiryDate: "2026-12-15", availableQuantity: 50 }, // Earliest valid batch
    { batchNumber: "BAT-EXPIRED", expiryDate: "2025-01-01", availableQuantity: 10 } // Expired
  ]
};

const sampleSession = {
  cashRegisterId: "018f0000-0000-7000-8000-000000000001",
  cashSessionId: "018f0000-0000-7000-8000-000000000002",
  cashierId: "usr-001",
  cashierName: "Dr. Ahmed El-Tahir",
  branchId: "brn-khartoum-01"
};

const sampleAllocation = {
  deviceId: "pos-dev-01",
  totalCapacity: 100,
  consumedCapacity: 80 // Remaining = 20
};

test("UI-POS-01: PosViewModel adds products adhering strictly to FEFO batch ordering (earliest expiry first)", () => {
  const vm = new PosViewModel(sampleSession, sampleAllocation);
  vm.addItem(sampleProduct, undefined, 2);

  assert.equal(vm.cart.length, 1);
  const cartItem = vm.cart[0];
  assert.equal(cartItem.batchNumber, "BAT-2026-B", "Must select earliest valid expiring batch");
  assert.equal(cartItem.quantity, 2);
  assert.equal(cartItem.lineTotal, 5000.00);
});

test("UI-POS-02: PosViewModel rejects expired batches from active sale", () => {
  const vm = new PosViewModel(sampleSession, sampleAllocation);
  assert.throws(
    () => vm.addItem(sampleProduct, "BAT-EXPIRED", 1),
    /BATCH_EXPIRED/,
    "Expired batch must be blocked"
  );
});

test("UI-POS-03: PosViewModel enforces offline safety allocation capacity limit", () => {
  const vm = new PosViewModel(sampleSession, sampleAllocation);
  vm.setOffline(true);

  assert.equal(vm.allocationRemaining, 20);

  // Adding 15 units (within 20 quota) succeeds
  vm.addItem(sampleProduct, undefined, 10);
  assert.equal(vm.cart[0].quantity, 10);

  // Attempting to add 15 more (total 25 > 20 quota) must throw
  assert.throws(
    () => vm.addItem(sampleProduct, undefined, 15),
    /OFFLINE_ALLOCATION_EXHAUSTED/,
    "Must enforce device allocation ceiling when offline"
  );
});

test("UI-POS-04: PosViewModel supports split payments and validates exact total match", () => {
  const vm = new PosViewModel(sampleSession, sampleAllocation);
  vm.addItem(sampleProduct, undefined, 2); // 5000 SDG total

  assert.equal(vm.grandTotal, 5000.00);

  // Add partial cash payment
  vm.addPayment({ method: "CASH", amount: 3000.00 });
  assert.equal(vm.remainingBalance, 2000.00);

  let validation = vm.validateForCompletion();
  assert.equal(validation.valid, false);
  assert.match(validation.reason, /PAYMENT_MISMATCH/);

  // Add remaining payment via Bank Transfer
  vm.addPayment({
    method: "BANK_TRANSFER",
    amount: 2000.00,
    verificationMode: "MANUAL_CONFIRMATION",
    reference: "TXN-BANKAK-883921"
  });

  assert.equal(vm.remainingBalance, 0.00);
  validation = vm.validateForCompletion();
  assert.equal(validation.valid, true);
});

test("UI-POS-05: PosViewModel converts active cart into valid OpenAPI 3.1 CompleteSaleRequestDto", () => {
  const vm = new PosViewModel(sampleSession, sampleAllocation);
  vm.addItem(sampleProduct, undefined, 1);
  vm.addPayment({ method: "CASH", amount: 2500.00 });

  const dto = vm.toCompleteSaleRequestDto("cust-001");
  assert.equal(dto.cash_register_id, sampleSession.cashRegisterId);
  assert.equal(dto.cash_session_id, sampleSession.cashSessionId);
  assert.equal(dto.customer_id, "cust-001");
  assert.equal(dto.lines.length, 1);
  assert.equal(dto.lines[0].product_id, "prod-001");
  assert.equal(dto.lines[0].quantity.value, "1");
  assert.equal(dto.lines[0].batch_id, "BAT-2026-B");
  assert.equal(dto.payments.length, 1);
  assert.equal(dto.payments[0].method, "CASH");
  assert.equal(dto.payments[0].amount.value, "2500.00");
  assert.equal(dto.payments[0].amount.currency, "SDG");
});

test("UI-ADM-01: PlatformAdminViewModel provisions tenant with temporary password in PASSWORD_CHANGE_REQUIRED state", () => {
  const adminVm = new PlatformAdminViewModel();
  const result = adminVm.provisionTenant({
    tenantCode: "PHARMA-SUDAN-01",
    tenantName: "Al-Nilein Pharmacy Group",
    orgCode: "ORG-01",
    orgName: "Main Organization",
    branchCode: "BRN-01",
    branchName: "Khartoum Central Branch",
    adminUsername: "nilein_admin",
    adminEmail: "admin@nilein.sd",
    subscriptionPlan: "ENTERPRISE"
  });

  assert.equal(result.success, true);
  assert.ok(result.tenant);
  assert.equal(result.tenant.adminStatus, "PASSWORD_CHANGE_REQUIRED");
  assert.ok(result.tenant.temporaryPassword.startsWith("Temp-"));
  assert.equal(result.tenant.subscriptionStatus, "ACTIVE");
});

test("UI-ADM-02: PlatformAdminViewModel records append-only audit event for provisioning", () => {
  const adminVm = new PlatformAdminViewModel();
  adminVm.provisionTenant({
    tenantCode: "PHARMA-TEST",
    tenantName: "Test Pharmacy",
    orgCode: "ORG-T",
    orgName: "Test Org",
    branchCode: "BRN-T",
    branchName: "Test Branch",
    adminUsername: "test_admin",
    adminEmail: "admin@test.sd",
    subscriptionPlan: "STANDARD"
  });

  assert.equal(adminVm.auditLog.length, 1);
  const event = adminVm.auditLog[0];
  assert.equal(event.action, "PROVISION_TENANT");
  assert.equal(event.tenantCode, "PHARMA-TEST");
  assert.ok(event.details.includes("PASSWORD_CHANGE_REQUIRED"));
});

test("UI-ADM-03: PlatformAdminViewModel prevents clinical record queries to enforce privacy boundary", () => {
  const adminVm = new PlatformAdminViewModel();
  assert.throws(
    () => adminVm.queryClinicalRecords(),
    /PRIVACY_BOUNDARY_VIOLATION/,
    "Platform administration must not access customer clinical or prescription data"
  );
});

test("UI-ADM-04: PlatformAdminViewModel provisioning is idempotent for duplicate tenant codes", () => {
  const adminVm = new PlatformAdminViewModel();
  const input = {
    tenantCode: "DUPLICATE-TNT",
    tenantName: "Duplicate Test Pharmacy",
    orgCode: "ORG-D",
    orgName: "Org D",
    branchCode: "BRN-D",
    branchName: "Branch D",
    adminUsername: "dup_admin",
    adminEmail: "admin@dup.sd",
    subscriptionPlan: "COMMUNITY"
  };

  const res1 = adminVm.provisionTenant(input);
  const res2 = adminVm.provisionTenant(input);

  assert.equal(res1.success, true);
  assert.equal(res2.success, true);
  assert.equal(res1.tenant.tenantId, res2.tenant.tenantId, "Replay must return exact identical tenant record");
  assert.equal(adminVm.tenants.length, 1, "Must not create duplicate tenant");
});

test("UI-APP-01: Desktop POS HTML and style assets exist and contain proper SEO, semantics, and unique IDs", () => {
  const htmlPath = path.resolve("apps/desktop-pos/index.html");
  const cssPath = path.resolve("apps/desktop-pos/style.css");
  const jsPath = path.resolve("apps/desktop-pos/app.js");

  assert.ok(fs.existsSync(htmlPath), "index.html must exist for desktop-pos");
  assert.ok(fs.existsSync(cssPath), "style.css must exist for desktop-pos");
  assert.ok(fs.existsSync(jsPath), "app.js must exist for desktop-pos");

  const html = fs.readFileSync(htmlPath, "utf8");
  assert.ok(html.includes("<title>"), "Must include descriptive <title>");
  assert.ok(html.includes("<meta name=\"description\""), "Must include meta description");
  assert.ok(html.includes("<h1>"), "Must include single <h1> heading");
  assert.ok(html.includes('id="product-search-input"'), "Must include search input with unique id");
  assert.ok(html.includes('id="allocation-meter"'), "Must include offline allocation meter");
  assert.ok(html.includes('id="payment-modal"'), "Must include split payment modal");
});

test("UI-APP-02: Platform Admin HTML and style assets exist and contain proper semantics, privacy boundaries, and unique IDs", () => {
  const htmlPath = path.resolve("apps/platform-admin/index.html");
  const cssPath = path.resolve("apps/platform-admin/style.css");
  const jsPath = path.resolve("apps/platform-admin/app.js");

  assert.ok(fs.existsSync(htmlPath), "index.html must exist for platform-admin");
  assert.ok(fs.existsSync(cssPath), "style.css must exist for platform-admin");
  assert.ok(fs.existsSync(jsPath), "app.js must exist for platform-admin");

  const html = fs.readFileSync(htmlPath, "utf8");
  assert.ok(html.includes("<title>"), "Must include descriptive <title>");
  assert.ok(html.includes("<meta name=\"description\""), "Must include meta description");
  assert.ok(html.includes("<h1"), "Must include <h1> heading");
  assert.ok(html.includes("حدود الخصوصية"), "Must enforce D-038 privacy boundary notice");
  assert.ok(html.includes('id="provisioning-form"'), "Must include provisioning form with unique id");
  assert.ok(html.includes('id="audit-log-body"'), "Must include audit log table container");
});

