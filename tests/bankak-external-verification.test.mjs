import test from "node:test";
import assert from "node:assert/strict";
import { catalogRepository } from "../apps/api/catalog.mjs";
import { salesRepository } from "../apps/api/sales.mjs";
import {
  BankakPaymentAdapter,
  verifyWebhookSignature
} from "../dist/src/integration/index.js";
import { computeHmacSha256, canonicalJsonStringify } from "../dist/src/security/index.js";

test("Bankak External Verification Suite — Clean Architecture & ADR-012 Compliance", async (t) => {
  const allMeds = catalogRepository.getAll();
  assert.ok(allMeds.length > 0, "Catalog must contain medicines");
  const med = allMeds[0];

  await t.test("1. Sale with Bankak payment initializes in PENDING_VERIFICATION (no premature verification)", async () => {
    const saleRequest = {
      cash_register_id: "018f0000-0000-7000-8000-000000000001",
      cash_session_id: "018f0000-0000-7000-8000-000000000002",
      lines: [
        {
          product_id: med.id,
          quantity: { value: "1", unit_code: "EA" },
          unit_price: { value: String(med.price), currency: "SDG" }
        }
      ],
      payments: [
        {
          method: "BANK_TRANSFER",
          amount: { value: String(med.price), currency: "SDG" },
          evidence_reference: "TXN-BOK-88776655"
        }
      ]
    };

    const res = await salesRepository.processSale(saleRequest);
    assert.ok(res.invoice_number);

    const savedSale = salesRepository.getSaleById(res.invoice_number);
    assert.ok(savedSale);
    assert.equal(savedSale.payments.length, 1);
    assert.equal(savedSale.payments[0].method, "BANK_TRANSFER");
    assert.equal(savedSale.payments[0].verification_status, "PENDING_VERIFICATION");
    assert.equal(savedSale.payments[0].evidence_reference, "TXN-BOK-88776655");
  });

  await t.test("2. verifyBankakPayment calls External Gateway API and transitions payment to API_VERIFIED", async () => {
    const res = await salesRepository.processSale({
      cash_register_id: "018f0000-0000-7000-8000-000000000001",
      cash_session_id: "018f0000-0000-7000-8000-000000000002",
      lines: [
        {
          product_id: med.id,
          quantity: { value: "1", unit_code: "EA" },
          unit_price: { value: String(med.price), currency: "SDG" }
        }
      ],
      payments: [
        {
          method: "BANKAK",
          amount: { value: String(med.price), currency: "SDG" },
          evidence_reference: "TXN-API-VERIFY-01"
        }
      ]
    });

    const result = await salesRepository.verifyBankakPayment(res.invoice_number);
    assert.equal(result.success, true);
    assert.equal(result.verificationStatus, "API_VERIFIED");
    assert.ok(result.providerReference.includes("TXN-API-VERIFY-01"));
    assert.equal(result.settledAmount, parseFloat(med.price));
    assert.equal(result.senderAccountMasked, "******1234");

    // Check sale in repository
    const updatedSale = salesRepository.getSaleById(res.invoice_number);
    assert.equal(updatedSale.payments[0].verification_status, "API_VERIFIED");
    assert.equal(updatedSale.payments[0].provider_reference, result.providerReference);
    assert.ok(updatedSale.payments[0].verified_at);
  });

  await t.test("3. matchWebhookNotification updates pending sale when external app pushes extracted transaction", async () => {
    const res = await salesRepository.processSale({
      cash_register_id: "018f0000-0000-7000-8000-000000000001",
      cash_session_id: "018f0000-0000-7000-8000-000000000002",
      lines: [
        {
          product_id: med.id,
          quantity: { value: "1", unit_code: "EA" },
          unit_price: { value: String(med.price), currency: "SDG" }
        }
      ],
      payments: [
        {
          method: "BANK_TRANSFER",
          amount: { value: String(med.price), currency: "SDG" },
          evidence_reference: "TXN-WH-EXTRACTED-99"
        }
      ]
    });

    const savedBefore = salesRepository.getSaleById(res.invoice_number);
    assert.equal(savedBefore.payments[0].verification_status, "PENDING_VERIFICATION");

    // External App pushes extracted webhook payload
    const webhookPayload = {
      transactionReference: "TXN-WH-EXTRACTED-99",
      amount: parseFloat(med.price),
      currency: "SDG",
      senderAccountMasked: "******9988",
      providerReference: "BOK-STMT-REF-998811",
      settledAt: "2026-10-17T12:00:00.000Z"
    };

    const matchResult = salesRepository.matchWebhookNotification(webhookPayload);
    assert.equal(matchResult.matchedCount, 1);
    assert.ok(matchResult.matchedInvoices.includes(res.invoice_number));

    // Confirm persisted state
    const matchedSale = salesRepository.getSaleById(res.invoice_number);
    assert.equal(matchedSale.payments[0].verification_status, "API_VERIFIED");
    assert.equal(matchedSale.payments[0].provider_reference, "BOK-STMT-REF-998811");
    assert.equal(matchedSale.payments[0].sender_account_masked, "******9988");
    assert.equal(matchedSale.payments[0].settled_amount, parseFloat(med.price));
  });

  await t.test("4. HMAC Webhook signature validation protects against spoofed notifications", () => {
    const secret = "pharma-bankak-webhook-secret-production";
    const payload = {
      transactionReference: "TXN-SECURE-001",
      amount: 12000,
      currency: "SDG"
    };
    const canonical = canonicalJsonStringify(payload);
    const validSignature = computeHmacSha256(canonical, secret);

    const validWebhook = {
      eventId: "evt-sec-01",
      providerId: "bankak-payment-adapter-v1",
      signature: validSignature,
      timestamp: "2026-10-17T12:15:00.000Z",
      payload
    };

    assert.equal(verifyWebhookSignature(validWebhook, secret), true);
    assert.equal(verifyWebhookSignature({ ...validWebhook, signature: "tampered_signature_hex" }, secret), false);
  });
});
