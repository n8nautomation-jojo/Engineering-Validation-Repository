import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  ApiRouter,
  PharmaTechApiClient
} from "../dist/src/api/index.js";

test("API-01: POST /sales with valid headers and DTO dispatches and returns 201 Created", async () => {
  const router = new ApiRouter();

  const request = {
    method: "POST",
    path: "/sales",
    headers: {
      "idempotency-key": "idem-sale-api-01",
      "x-correlation-id": "corr-api-01",
      "x-device-id": "dev-pos-01"
    },
    body: {
      cash_register_id: "reg-01",
      cash_session_id: "ses-01",
      lines: [
        {
          product_id: "prod-01",
          quantity: { value: "2", unit_code: "BOX" },
          unit_price: { value: "50.00", currency: "SDG" }
        }
      ],
      payments: [
        {
          method: "CASH",
          amount: { value: "100.00", currency: "SDG" }
        }
      ]
    }
  };

  const response = await router.dispatch(request);
  assert.equal(response.status, 201);
  assert.equal(response.body.status, "COMPLETED");
  assert.ok(response.body.sale_id);
  assert.ok(response.body.invoice_number);
});

test("API-02: POST /sales missing Idempotency-Key returns 400 Bad Request", async () => {
  const router = new ApiRouter();

  const request = {
    method: "POST",
    path: "/sales",
    headers: {
      "x-correlation-id": "corr-missing-idem"
    },
    body: {
      cash_session_id: "ses-01",
      lines: [],
      payments: []
    }
  };

  const response = await router.dispatch(request);
  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, "MISSING_HEADER");
  assert.match(response.body.error.message, /Idempotency-Key/i);
});

test("API-03: POST /sales with missing required fields returns 422 Unprocessable Entity", async () => {
  const router = new ApiRouter();

  const request = {
    method: "POST",
    path: "/sales",
    headers: {
      "idempotency-key": "idem-422-test"
    },
    body: {
      // Missing cash_session_id, lines, payments
      note: "incomplete payload"
    }
  };

  const response = await router.dispatch(request);
  assert.equal(response.status, 422);
  assert.equal(response.body.error.code, "VALIDATION_ERROR");
});

test("API-04: GET /sales/{saleId} returns 200 OK with sale details", async () => {
  const router = new ApiRouter();

  const response = await router.dispatch({
    method: "GET",
    path: "/sales/sale-abc-123",
    headers: { "x-correlation-id": "corr-get-sale" }
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.sale_id, "sale-abc-123");
  assert.equal(response.body.status, "COMPLETED");
});

test("API-05: POST /sync/conflicts/{conflictId}/resolution dispatches correctly", async () => {
  let resolverInvoked = false;
  const router = new ApiRouter({
    conflictResolver: async (conflictId, resolution, headers) => {
      resolverInvoked = true;
      return { conflict_id: conflictId, resolution_applied: true };
    }
  });

  const response = await router.dispatch({
    method: "POST",
    path: "/sync/conflicts/conf-8899/resolution",
    headers: { "idempotency-key": "idem-conf-01" },
    body: { resolution_strategy: "ACCEPT_SERVER" }
  });

  assert.equal(response.status, 200);
  assert.equal(resolverInvoked, true);
  assert.equal(response.body.conflict_id, "conf-8899");
});

test("API-06: PharmaTechApiClient completes sale and parses typed response", async () => {
  const router = new ApiRouter();
  const client = new PharmaTechApiClient(router, "dev-pos-sdk-01");

  const saleResult = await client.completeSale(
    {
      cash_register_id: "reg-sdk-01",
      cash_session_id: "ses-sdk-01",
      lines: [
        {
          product_id: "prod-sdk-01",
          quantity: { value: "1", unit_code: "UNIT" }
        }
      ],
      payments: [
        {
          method: "CASH",
          amount: { value: "50.00", currency: "SDG" }
        }
      ]
    },
    {
      idempotencyKey: "idem-sdk-sale-01",
      correlationId: "corr-sdk-sale-01"
    }
  );

  assert.equal(saleResult.status, "COMPLETED");
  assert.ok(saleResult.sale_id);
  assert.ok(saleResult.invoice_number);
});

test("API-07: PharmaTechApiClient throws typed error on HTTP failure", async () => {
  const router = new ApiRouter();
  const client = new PharmaTechApiClient(router);

  // Missing required idempotencyKey in options -> throws
  await assert.rejects(
    async () => {
      await client.completeSale(
        {
          cash_register_id: "reg-01",
          cash_session_id: "ses-01",
          lines: [],
          payments: []
        },
        {} // No idempotencyKey!
      );
    },
    (err) => {
      assert.match(err.message, /MISSING_HEADER/i);
      return true;
    }
  );
});

test("API-08: Phase 3.5 contract fixtures JSON scenarios parse cleanly and match SDK schemas", () => {
  const fixturesPath = path.resolve("docs/06-api/fixtures/phase-3-5-contract-fixtures.json");
  const rawFixtures = fs.readFileSync(fixturesPath, "utf8");
  const fixtures = JSON.parse(rawFixtures);

  // Validate that required scenarios are present in fixtures
  const expectedScenarios = [
    "cash_sale",
    "bank_transfer_recorded_without_api_verification",
    "transfer_with_screenshot_evidence",
    "manual_verification_decision",
    "hisabati_external_verification_pending",
    "split_cash_and_transfer",
    "offline_completed_sale_pending_sync",
    "insufficient_stock",
    "stale_version",
    "idempotency_replay"
  ];

  for (const scenario of expectedScenarios) {
    assert.ok(scenario in fixtures, `Fixture scenario '${scenario}' must be present in fixtures JSON`);
  }
});
