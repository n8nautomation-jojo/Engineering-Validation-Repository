import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { catalogRepository } from "../apps/api/catalog.mjs";
import { salesRepository } from "../apps/api/sales.mjs";
import { OutboxDispatcher } from "../dist/src/application/sync/outbox-dispatcher.js";

test("POS Outbox Binding: processSale writes durable OutboxEvent and OutboxDispatcher dispatches it", async () => {
  // Ensure we have an active product with non-zero stock
  const allMeds = catalogRepository.getAll();
  assert.ok(allMeds.length > 0, "Catalog must contain medicines");
  const med = allMeds[0];

  const initialPending = await salesRepository.getPendingOutboxEvents(100);
  const initialPendingCount = initialPending.length;

  const saleDto = {
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
        method: "CASH",
        amount: { value: String(med.price), currency: "SDG" }
      }
    ]
  };

  const response = await salesRepository.processSale(saleDto, {
    "idempotency-key": `idem-test-${Date.now()}`,
    "x-correlation-id": `corr-test-${Date.now()}`
  });

  assert.ok(response.sale_id, "Sale ID must be generated");
  assert.equal(response.status, "COMPLETED");

  // Verify that an OutboxEvent was written to SQLite
  const pendingEvents = await salesRepository.getPendingOutboxEvents(100);
  assert.equal(pendingEvents.length, initialPendingCount + 1, "Pending outbox events must increase by 1");

  const matchingEvent = pendingEvents.find(e => e.aggregateId === response.sale_id);
  assert.ok(matchingEvent, "Matching outbox event must exist in pending queue");
  assert.equal(matchingEvent.eventType, "sale.completed");
  assert.equal(matchingEvent.status, "PENDING");
  assert.equal(matchingEvent.payload.invoiceNumber, response.invoice_number);

  // Now dispatch via OutboxDispatcher
  const store = salesRepository.getOutboxStore();
  let delivered = false;
  const mockTransport = {
    async deliver(event) {
      if (event.eventId === matchingEvent.eventId) {
        delivered = true;
        return { success: true, status: 200, retryable: false };
      }
      return { success: true, status: 200, retryable: false };
    }
  };

  const dispatcher = new OutboxDispatcher(store, mockTransport);
  const summary = await dispatcher.dispatchPending(100);

  assert.ok(delivered, "Matching outbox event must be delivered to transport");
  assert.ok(summary.succeeded >= 1);

  // Invariant: The event must now be DISPATCHED in the store
  const allEvents = await salesRepository.getAllOutboxEvents();
  const updatedEvent = allEvents.find(e => e.eventId === matchingEvent.eventId);
  assert.ok(updatedEvent);
  assert.equal(updatedEvent.status, "DISPATCHED");
});
