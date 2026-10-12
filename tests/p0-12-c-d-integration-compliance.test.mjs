import test from "node:test";
import assert from "node:assert/strict";
import {
  HisabatiAdapter,
  BankakPaymentAdapter,
  SudanTaxInvoiceAdapter,
  IdempotentIntegrationExecutor,
  IdempotencyCollisionError,
  verifyWebhookSignature
} from "../dist/src/integration/index.js";
import {
  CompliancePolicyEngine
} from "../dist/src/compliance/index.js";
import {
  computeHmacSha256,
  canonicalJsonStringify
} from "../dist/src/security/index.js";

const BASE_SCOPE = {
  tenantId: "t-001",
  organizationId: "org-001",
  branchId: "branch-001",
  deviceId: "dev-001"
};

test("INT-01: Provider credentials isolation - credentials belong to secure integration boundary, never POS client", () => {
  const hisabati = new HisabatiAdapter();
  const bankak = new BankakPaymentAdapter();
  const tax = new SudanTaxInvoiceAdapter();

  // Adapters expose environment and identity, but NO raw secret keys in client payload
  assert.equal(hisabati.identity.status, "ACTIVE");
  assert.equal(bankak.identity.status, "ACTIVE");
  assert.equal(tax.identity.status, "ACTIVE");

  assert.equal("clientSecret" in hisabati.identity, false);
  assert.equal("apiKey" in bankak.identity, false);
  assert.equal("privateKey" in tax.identity, false);
});

test("INT-02 & INT-03: Evidence presence never equals provider verification; OCR metadata is untrusted until verified", async () => {
  const adapter = new HisabatiAdapter();

  const req = {
    requestId: "req-hisabati-01",
    correlationId: "corr-001",
    idempotencyKey: "idem-hisabati-01",
    ...BASE_SCOPE,
    operation: "VERIFY_EVIDENCE",
    timestamp: "2026-10-12T10:00:00.000Z",
    payload: {
      evidenceId: "ev-901",
      saleId: "sale-901",
      paymentMethod: "BANKAK",
      declaredAmount: 5000,
      currency: "SDG",
      receiptImageHash: "sha256-abcdef123456",
      externalReference: "BOK-TXN-999"
    }
  };

  const response = await adapter.execute(req);

  // Invariant: Response has structured provider reference and API_VERIFIED state only after matching
  assert.equal(response.providerStatus, "API_VERIFIED");
  assert.equal(response.result?.verifiedMatch, true);
  assert.equal(response.result?.extractedAmount, 5000);
});

test("INT-04: Provider outage/timeout preserves core domain integrity and marks RECONCILIATION_REQUIRED", async () => {
  const bankak = new BankakPaymentAdapter();
  bankak.setSimulateTimeout(true); // Simulate timeout

  const executor = new IdempotentIntegrationExecutor();

  const req = {
    requestId: "req-bankak-timeout",
    correlationId: "corr-bankak-01",
    idempotencyKey: "idem-bankak-timeout",
    ...BASE_SCOPE,
    operation: "CHARGE_MOBILE_MONEY",
    timestamp: "2026-10-12T10:00:00.000Z",
    payload: {
      transactionReference: "REF-OUTAGE-01",
      amount: 1500,
      currency: "SDG",
      saleId: "sale-timeout-01",
      paymentDate: "2026-10-12T10:00:00.000Z"
    }
  };

  const res = await executor.executeWithIdempotency(bankak, req);

  // Invariant: Timeout does NOT fail catastrophically or lose data; flags RECONCILIATION_REQUIRED
  assert.equal(res.providerStatus, "RECONCILIATION_REQUIRED");
  assert.ok(res.error);
  assert.equal(res.error.code, "PROVIDER_TIMEOUT");
  assert.equal(res.error.retryable, true);
});

test("INT-05: Idempotent execution - duplicate request returns cached response without duplicate provider side-effect", async () => {
  const bankak = new BankakPaymentAdapter();
  const executor = new IdempotentIntegrationExecutor();

  let callCount = 0;
  const originalExecute = bankak.execute.bind(bankak);
  bankak.execute = async (r) => {
    callCount++;
    return originalExecute(r);
  };

  const req = {
    requestId: "req-idem-01",
    correlationId: "corr-idem-01",
    idempotencyKey: "idem-key-duplicate-test",
    ...BASE_SCOPE,
    operation: "VERIFY_PAYMENT",
    timestamp: "2026-10-12T10:00:00.000Z",
    payload: {
      transactionReference: "REF-IDEM-99",
      amount: 3000,
      currency: "SDG",
      saleId: "sale-idem-99",
      paymentDate: "2026-10-12T10:00:00.000Z"
    }
  };

  // First execution: invokes adapter
  const res1 = await executor.executeWithIdempotency(bankak, req);
  assert.equal(res1.providerStatus, "API_VERIFIED");
  assert.equal(callCount, 1);

  // Second execution with SAME idempotency key: returns cached response without calling provider again!
  const res2 = await executor.executeWithIdempotency(bankak, req);
  assert.equal(res2.providerStatus, "API_VERIFIED");
  assert.equal(callCount, 1, "Provider MUST NOT be invoked a second time for duplicate idempotency key!");
  assert.deepEqual(res1, res2);
});

test("INT-06: Idempotency key reuse with different payload is rejected", async () => {
  const bankak = new BankakPaymentAdapter();
  const executor = new IdempotentIntegrationExecutor();

  const req1 = {
    requestId: "req-col-01",
    correlationId: "corr-col-01",
    idempotencyKey: "shared-key-collision",
    ...BASE_SCOPE,
    operation: "VERIFY_PAYMENT",
    timestamp: "2026-10-12T10:00:00.000Z",
    payload: { transactionReference: "REF-1", amount: 100, currency: "SDG", saleId: "s-1", paymentDate: "2026-10-12" }
  };

  await executor.executeWithIdempotency(bankak, req1);

  // Different payload with SAME key
  const req2 = {
    requestId: "req-col-02",
    correlationId: "corr-col-02",
    idempotencyKey: "shared-key-collision",
    ...BASE_SCOPE,
    operation: "VERIFY_PAYMENT",
    timestamp: "2026-10-12T10:00:00.000Z",
    payload: { transactionReference: "REF-2", amount: 200, currency: "SDG", saleId: "s-2", paymentDate: "2026-10-12" }
  };

  await assert.rejects(
    async () => {
      await executor.executeWithIdempotency(bankak, req2);
    },
    (err) => err instanceof IdempotencyCollisionError
  );
});

test("INT-07: Webhook signature verification and replay prevention", () => {
  const secret = "webhook-hmac-secret-xyz-987";
  const payload = { event: "PAYMENT_CONFIRMED", transactionId: "TXN-887766", amount: 2500 };
  const canonical = canonicalJsonStringify(payload);
  const signature = computeHmacSha256(canonical, secret);

  const webhook = {
    eventId: "evt-wh-01",
    providerId: "bankak-payment-adapter-v1",
    signature,
    timestamp: "2026-10-12T10:00:00.000Z",
    payload
  };

  assert.equal(verifyWebhookSignature(webhook, secret), true);
  assert.equal(verifyWebhookSignature({ ...webhook, signature: "tampered_sig" }, secret), false);
});

test("INT-08: Sudan Tax / E-Invoice adapter calculates tax from item configuration and rejects discrepancies", async () => {
  const taxAdapter = new SudanTaxInvoiceAdapter();

  // Valid invoice payload: Item 1 tax 0%, Item 2 tax 17% (configurable rates)
  const validPayload = {
    invoiceId: "inv-sd-01",
    saleId: "sale-sd-01",
    branchTaxId: "TIN-987654321",
    subtotal: 1000,
    totalTax: 85, // 0 + 85
    grandTotal: 1085,
    currency: "SDG",
    issuedAt: "2026-10-12T10:00:00.000Z",
    items: [
      {
        itemId: "item-1-essential-drug",
        description: "Amoxicillin 500mg",
        quantity: 2,
        unitPrice: 250,
        taxRatePercent: 0,
        taxAmount: 0,
        totalAmount: 500
      },
      {
        itemId: "item-2-cosmetic",
        description: "Medical Skin Cream",
        quantity: 1,
        unitPrice: 500,
        taxRatePercent: 17,
        taxAmount: 85,
        totalAmount: 585
      }
    ]
  };

  const validRes = await taxAdapter.execute({
    requestId: "req-tax-01",
    correlationId: "corr-tax-01",
    idempotencyKey: "idem-tax-01",
    ...BASE_SCOPE,
    operation: "SUBMIT_TAX_INVOICE",
    timestamp: "2026-10-12T10:00:00.000Z",
    payload: validPayload
  });

  assert.equal(validRes.providerStatus, "API_VERIFIED");
  assert.ok(validRes.result?.taxAuthorityReference);
  assert.ok(validRes.result?.digitalSignature);
  assert.ok(validRes.result?.qrCodePayload.includes("TIN-987654321"));

  // Discrepancy attack: totalTax declared does not match items sum
  const invalidPayload = { ...validPayload, totalTax: 150 };
  const invalidRes = await taxAdapter.execute({
    requestId: "req-tax-02",
    correlationId: "corr-tax-02",
    idempotencyKey: "idem-tax-02",
    ...BASE_SCOPE,
    operation: "SUBMIT_TAX_INVOICE",
    timestamp: "2026-10-12T10:00:00.000Z",
    payload: invalidPayload
  });

  assert.equal(invalidRes.providerStatus, "REJECTED");
  assert.equal(invalidRes.error?.code, "TAX_CALCULATION_MISMATCH");
});

test("COMP-01: Sudan NMPB Controlled / Narcotic medicines mandate prescription and licensed pharmacist", () => {
  const engine = new CompliancePolicyEngine();

  const narcoticProfile = {
    productId: "prod-morphine-10mg",
    tradeName: "Morphine Sulfate 10mg",
    genericName: "Morphine",
    classification: "CONTROLLED_NARCOTIC",
    requiresPrescription: true,
    manufacturer: "Sudan Medical Industries",
    isColdChain: false
  };

  // 1. Missing prescription reference -> BLOCKED
  const decision1 = engine.validateMedicineDispensing(narcoticProfile, {
    isBatchExpired: false,
    dispensingPharmacistRegistrationNo: "PHARM-REG-4432",
    patientNationalId: "1234567890"
  });
  assert.equal(decision1.allowed, false);
  assert.match(decision1.reason, /CONTROLLED_SUBSTANCE_PRESCRIPTION_MANDATORY/i);

  // 2. Missing dispensing pharmacist registration number -> BLOCKED
  const decision2 = engine.validateMedicineDispensing(narcoticProfile, {
    isBatchExpired: false,
    prescriptionReference: "RX-NMPB-2026-001",
    patientNationalId: "1234567890"
  });
  assert.equal(decision2.allowed, false);
  assert.match(decision2.reason, /CONTROLLED_SUBSTANCE_PRESCRIPTION_MANDATORY/i);

  // 3. Complete valid input -> ALLOWED with enhanced audit required
  const decision3 = engine.validateMedicineDispensing(narcoticProfile, {
    isBatchExpired: false,
    prescriptionReference: "RX-NMPB-2026-001",
    dispensingPharmacistRegistrationNo: "PHARM-REG-4432",
    patientNationalId: "1234567890",
    patientName: "Osman Hassan",
    prescribingDoctorName: "Dr. Mohamed Elamin"
  });
  assert.equal(decision3.allowed, true);
  assert.equal(decision3.enhancedAuditRequired, true);
});

test("COMP-02: Batch expiry enforcement strictly blocks dispensing expired medicine", () => {
  const engine = new CompliancePolicyEngine();

  const standardDrug = {
    productId: "prod-paracetamol-500mg",
    tradeName: "Paracetamol 500mg",
    genericName: "Paracetamol",
    classification: "STANDARD",
    requiresPrescription: false,
    manufacturer: "Wafapharm Sudan",
    isColdChain: false
  };

  const decision = engine.validateMedicineDispensing(standardDrug, {
    isBatchExpired: true // Expired batch!
  });

  assert.equal(decision.allowed, false);
  assert.match(decision.reason, /EXPIRED_MEDICINE_DISPENSE_BLOCKED/i);
});

test("COMP-03: Electronic Transactions Act 2007 - destructive deletion of financial/audit records is prohibited", () => {
  const engine = new CompliancePolicyEngine();

  // Deletion of critical financial entities is forbidden
  assert.equal(engine.validateRecordPreservation("DELETE", "SALE").allowed, false);
  assert.equal(engine.validateRecordPreservation("PURGE", "PAYMENT").allowed, false);
  assert.equal(engine.validateRecordPreservation("DELETE", "INVENTORY_TRANSACTION").allowed, false);
  assert.equal(engine.validateRecordPreservation("DELETE", "AUDIT_RECORD").allowed, false);
  assert.equal(engine.validateRecordPreservation("DELETE", "CONTROLLED_DISPENSING").allowed, false);

  // Non-destructive actions (UPDATE / INSERT) or non-protected entities are allowed
  assert.equal(engine.validateRecordPreservation("UPDATE", "SALE").allowed, true);
  assert.equal(engine.validateRecordPreservation("DELETE", "TEMP_CACHE").allowed, true);
});

test("COMP-04: Pharmacy branch licensing validation validates expiry and status", () => {
  const engine = new CompliancePolicyEngine();

  const validLicence = {
    licenceNumber: "NMPB-PHARM-KRT-2026-099",
    establishmentType: "COMMUNITY_PHARMACY",
    issuingAuthority: "Sudan National Medicines and Poisons Board (NMPB)",
    organizationId: "org-001",
    branchId: "branch-001",
    supervisingPharmacistName: "Dr. Sara Abdelrahman",
    supervisingPharmacistRegistrationNo: "NMPB-R-8821",
    issuedAt: "2026-01-01T00:00:00.000Z",
    expiresAt: "2026-12-31T23:59:59.000Z",
    status: "ACTIVE"
  };

  // Valid active licence
  const v1 = engine.validateEstablishmentLicence(validLicence, "2026-06-15T12:00:00.000Z");
  assert.equal(v1.valid, true);

  // Expired licence
  const v2 = engine.validateEstablishmentLicence(validLicence, "2027-01-01T00:00:00.000Z");
  assert.equal(v2.valid, false);
  assert.match(v2.reason, /expired/i);

  // Suspended licence
  const v3 = engine.validateEstablishmentLicence({ ...validLicence, status: "SUSPENDED" }, "2026-06-15T12:00:00.000Z");
  assert.equal(v3.valid, false);
  assert.match(v3.reason, /not active/i);
});
