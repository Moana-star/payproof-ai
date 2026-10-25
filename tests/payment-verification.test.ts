import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluatePaymentEvidence, EXPECTED_AMOUNT, EXPECTED_CURRENCY, EXPECTED_REFERENCE, type PayPalOrderEvidence } from "../lib/payment-verification";
import { MAX_MESSAGE_LENGTH, safeDraft } from "../lib/order-extraction";

const orderId = "TESTORDER12345678";

function validOrder(overrides: Partial<PayPalOrderEvidence> = {}): PayPalOrderEvidence {
  return {
    id: orderId,
    status: "COMPLETED",
    purchase_units: [{
      reference_id: EXPECTED_REFERENCE,
      custom_id: EXPECTED_REFERENCE,
      payments: {
        captures: [{
          id: "TESTCAPTURE123",
          status: "COMPLETED",
          amount: { value: EXPECTED_AMOUNT, currency_code: EXPECTED_CURRENCY }
        }]
      }
    }],
    ...overrides
  };
}

test("verifies only a completed capture with matching order, amount, currency, and reference", () => {
  const result = evaluatePaymentEvidence(validOrder(), orderId);
  assert.equal(result.verified, true);
  assert.deepEqual(result.failedChecks, []);
});

test("does not verify an approved order without a capture", () => {
  const result = evaluatePaymentEvidence(validOrder({
    status: "APPROVED",
    purchase_units: [{ reference_id: EXPECTED_REFERENCE, custom_id: EXPECTED_REFERENCE }]
  }), orderId);
  assert.equal(result.verified, false);
  assert.ok(result.failedChecks.includes("orderCompleted"));
  assert.ok(result.failedChecks.includes("capturePresent"));
});

test("does not verify a pending capture", () => {
  const order = validOrder();
  order.purchase_units![0].payments!.captures![0].status = "PENDING";
  const result = evaluatePaymentEvidence(order, orderId);
  assert.equal(result.verified, false);
  assert.ok(result.failedChecks.includes("captureCompleted"));
});

test("does not verify a mismatched PayPal order ID", () => {
  const result = evaluatePaymentEvidence(validOrder({ id: "OTHERORDER12345678" }), orderId);
  assert.equal(result.verified, false);
  assert.ok(result.failedChecks.includes("orderIdMatches"));
});

test("does not verify a mismatched captured amount", () => {
  const order = validOrder();
  order.purchase_units![0].payments!.captures![0].amount!.value = "1.00";
  const result = evaluatePaymentEvidence(order, orderId);
  assert.equal(result.verified, false);
  assert.ok(result.failedChecks.includes("amountMatches"));
});

test("does not verify a mismatched currency", () => {
  const order = validOrder();
  order.purchase_units![0].payments!.captures![0].amount!.currency_code = "KES";
  const result = evaluatePaymentEvidence(order, orderId);
  assert.equal(result.verified, false);
  assert.ok(result.failedChecks.includes("currencyMatches"));
});

test("does not verify a mismatched trusted reference", () => {
  const order = validOrder();
  order.purchase_units![0].custom_id = "UNTRUSTED-REFERENCE";
  const result = evaluatePaymentEvidence(order, orderId);
  assert.equal(result.verified, false);
  assert.ok(result.failedChecks.includes("referenceMatches"));
});

test("does not verify a declined or otherwise unsuccessful capture", () => {
  const order = validOrder();
  order.purchase_units![0].payments!.captures![0].status = "DENIED";
  const result = evaluatePaymentEvidence(order, orderId);
  assert.equal(result.verified, false);
  assert.ok(result.failedChecks.includes("captureCompleted"));
});

test("accepts only a supported product and a bounded integer quantity in AI output", () => {
  const draft = safeDraft({
    product: "Coffee gift set",
    quantity: 2,
    customerNote: "Please deliver next week.",
    missingInformation: [],
    confidenceNotes: "Explicit product and quantity."
  });
  assert.ok(draft);
  assert.equal(draft.product, "Coffee gift set");
  assert.equal(draft.quantity, 2);
});

test("downgrades unknown products and invalid quantities to review-required fields", () => {
  const draft = safeDraft({
    product: "Luxury laptop",
    quantity: 101,
    missingInformation: [],
    confidenceNotes: "Model suggested a product."
  });
  assert.ok(draft);
  assert.equal(draft.product, null);
  assert.equal(draft.quantity, null);
  assert.equal(MAX_MESSAGE_LENGTH, 2000);
});

test("rejects malformed AI output and bounds untrusted model strings", () => {
  assert.equal(safeDraft(null), null);
  assert.equal(safeDraft([]), null);
  const draft = safeDraft({
    product: "Coffee gift set",
    quantity: 1,
    customerNote: "x".repeat(900),
    missingInformation: Array.from({ length: 8 }, () => "y".repeat(200)),
    confidenceNotes: "z".repeat(400)
  });
  assert.ok(draft);
  assert.equal(draft.customerNote.length, 500);
  assert.equal(draft.missingInformation.length, 5);
  assert.equal(draft.missingInformation[0].length, 160);
  assert.equal(draft.confidenceNotes.length, 240);
});
