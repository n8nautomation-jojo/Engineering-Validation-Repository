import test from "node:test";
import assert from "node:assert/strict";
import { money } from "../dist/src/kernel/money.js";
import { quantity } from "../dist/src/kernel/quantity.js";
import { expiryDate } from "../dist/src/kernel/expiry-date.js";

test("Money accepts ISO currency and finite amount", () => {
  assert.deepEqual(money(12.5, "SDG"), { amount: 12.5, currency: "SDG" });
});

test("Money rejects invalid currency", () => {
  assert.throws(() => money(12, "sudan"), /INVALID_CURRENCY/);
});

test("Quantity rejects negative values", () => {
  assert.throws(() => quantity(-1), /INVALID_QUANTITY/);
});

test("ExpiryDate accepts a real ISO calendar date", () => {
  assert.deepEqual(expiryDate("2027-02-28"), { value: "2027-02-28" });
});

test("ExpiryDate rejects impossible dates", () => {
  assert.throws(() => expiryDate("2027-02-30"), /INVALID_EXPIRY_DATE/);
});
