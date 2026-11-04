import assert from "node:assert/strict";
import { getTestAccessToken } from "./lib/test-auth.mjs";

const baseUrl = (process.env.PAYPROOF_BASE_URL || "https://payproof-ai-git-feat-chatgpt-style-payproo-068502-naom6083-2980.vercel.app").replace(/\/$/, "");
const token = await getTestAccessToken("PAYPROOF_TEST_USER");
const mode = process.argv[2] || "create";
const orderIdArg = process.argv[3];


async function request(path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: body === undefined ? "GET" : "POST",
    cache: "no-store",
    headers: { Authorization: `Bearer ${token}`, ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  let data = {};
  try { data = await response.json(); } catch {}
  return { response, data };
}

if (mode === "create") {
  const { response, data } = await request("/api/paypal/create-order", {
    product: "Coffee gift set",
    quantity: 1,
    customerName: process.env.PAYPROOF_TEST_CUSTOMER_NAME || "PayProof Sandbox QA"
  });
  assert.equal(response.status, 200, `Sandbox order creation failed (HTTP ${response.status}): ${data.error || "unknown error"}`);
  assert.equal(data.sandbox, true, "The API did not identify this as a Sandbox checkout.");
  assert.ok(data.orderId && data.approvalUrl, "PayPal did not return an order ID and approval URL.");
  console.log("PASS  A server-priced PayPal Sandbox order was created and saved as pending.");
  console.log(`Order ID: ${data.orderId}`);
  console.log(`Expected amount: ${data.currency} ${data.amount}`);
  console.log("NEXT  Open the approval URL below in the same browser profile where this test account is signed in, then approve with a PayPal Sandbox buyer account.");
  console.log("NEXT  PayPal should return to /checkout/return, which automatically calls server-side verification. Do not pay again or use a real PayPal account.");
  console.log(data.approvalUrl);
} else if (mode === "verify") {
  if (!orderIdArg) throw new Error("Usage: npm run test:paypal-sandbox -- verify <PAYPAL_ORDER_ID>");
  const { response, data } = await request("/api/paypal/capture-order", { orderId: orderIdArg });
  assert.equal(response.status, 200, `PayPal verification failed (HTTP ${response.status}): ${data.error || data.message || "not yet approved or not verified"}`);
  assert.equal(data.verified, true, "PayPal did not confirm a completed capture.");
  assert.equal(data.persisted, true, "The verified order was not confirmed as saved.");
  const register = await request("/api/orders");
  assert.equal(register.response.status, 200, "Could not reload the signed-in order register.");
  const saved = (register.data.orders || []).find((order) => order.paypal_order_id === orderIdArg);
  assert.ok(saved && saved.payment_status === "paid", "The verified Sandbox order is not visible as paid in this user's workspace.");
  console.log("PASS  PayPal Sandbox confirms the completed capture.");
  console.log("PASS  The server verified and saved the order to this signed-in workspace.");
  console.log(`Verified amount: ${data.transaction?.currency} ${data.transaction?.amount}`);
  console.log(`Capture reference: ${data.transaction?.captureId}`);
} else {
  throw new Error("Usage: npm run test:paypal-sandbox -- [create | verify <PAYPAL_ORDER_ID>]");
}
