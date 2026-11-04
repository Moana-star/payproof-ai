import assert from "node:assert/strict";

const baseUrl = (process.env.PAYPROOF_BASE_URL || "https://payproof-a75ejx7sf-naom6083-2980.vercel.app").replace(/\/$/, "");
const supabaseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const publicKey = process.env.SUPABASE_PUBLIC_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const tokenA = process.env.PAYPROOF_TEST_USER_A_TOKEN;
const tokenB = process.env.PAYPROOF_TEST_USER_B_TOKEN;

if (!supabaseUrl || !publicKey || !tokenA || !tokenB) {
  console.error("Set SUPABASE_URL, SUPABASE_PUBLIC_KEY, PAYPROOF_TEST_USER_A_TOKEN and PAYPROOF_TEST_USER_B_TOKEN in your local shell. Never paste tokens into GitHub or chat.");
  process.exit(2);
}

async function jsonRequest(url, init = {}) {
  const response = await fetch(url, { cache: "no-store", ...init });
  let body = {};
  try { body = await response.json(); } catch {}
  return { response, body };
}

async function getIdentity(token) {
  const { response, body } = await jsonRequest(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: publicKey, Authorization: `Bearer ${token}` }
  });
  assert.equal(response.status, 200, "Both test tokens must be valid Supabase sessions.");
  assert.ok(body.id, "Supabase did not return a user ID.");
  return body.id;
}

async function appRequest(path, token, body) {
  return jsonRequest(`${baseUrl}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { Authorization: `Bearer ${token}`, ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
}

const userA = await getIdentity(tokenA);
const userB = await getIdentity(tokenB);
assert.notEqual(userA, userB, "Use two different Supabase accounts, not two sessions for the same user.");

const [ordersA, ordersB, reconciliationA, reconciliationB] = await Promise.all([
  appRequest("/api/orders", tokenA),
  appRequest("/api/orders", tokenB),
  appRequest("/api/reconciliation", tokenA),
  appRequest("/api/reconciliation", tokenB)
]);

for (const [label, result] of [["Account A orders", ordersA], ["Account B orders", ordersB], ["Account A reconciliation", reconciliationA], ["Account B reconciliation", reconciliationB]]) {
  assert.equal(result.response.status, 200, `${label} failed with HTTP ${result.response.status}: ${result.body.error || "unknown error"}`);
}
assert.equal(ordersA.body.configured, true, "Account A order storage must be configured.");
assert.equal(ordersB.body.configured, true, "Account B order storage must be configured.");
assert.equal(reconciliationA.body.demo, false, "Account A must be using its private workspace.");
assert.equal(reconciliationB.body.demo, false, "Account B must be using its private workspace.");

const aOrders = ordersA.body.orders || [];
const bOrders = ordersB.body.orders || [];
const aRows = reconciliationA.body.rows || [];
const bRows = reconciliationB.body.rows || [];
const aAudit = reconciliationA.body.audit || [];
const bAudit = reconciliationB.body.audit || [];
const aLedger = reconciliationA.body.ledger || [];
const bLedger = reconciliationB.body.ledger || [];

function assertDisjoint(label, a, b, key) {
  const bIds = new Set(b.map((item) => item[key]).filter(Boolean));
  const overlap = a.map((item) => item[key]).filter((id) => id && bIds.has(id));
  assert.equal(overlap.length, 0, `${label}: account B can see records returned to account A.`);
}

assertDisjoint("Order references", aOrders, bOrders, "order_number");
assertDisjoint("Statement rows", aRows, bRows, "id");
assertDisjoint("Audit events", aAudit, bAudit, "id");
assertDisjoint("Ledger entries", aLedger, bLedger, "id");
assert.ok(aOrders.length > 0, "Account A needs at least one existing order to run cross-account checks.");
assert.ok(aRows.length > 0, "Account A needs at least one existing statement row to run cross-account checks.");

const foreignOrder = aOrders.find((order) => order.paypal_order_id);
if (foreignOrder) {
  const result = await appRequest("/api/paypal/capture-order", tokenB, { orderId: foreignOrder.paypal_order_id });
  assert.equal(result.response.status, 404, "Account B must not verify or capture Account A's PayPal order.");
} else {
  console.log("SKIP  Cross-account PayPal-order check (Account A has no saved PayPal order ID).");
}

const foreignRow = aRows[0];
const review = await appRequest("/api/reconciliation/review", tokenB, {
  rowId: foreignRow.id, decision: "reject", note: "Automated cross-account access-control test."
});
assert.equal(review.response.status, 404, "Account B must not review Account A's statement row.");

const post = await appRequest("/api/reconciliation/post", tokenB, { rowId: foreignRow.id });
assert.notEqual(post.response.status, 200, "Account B must not post Account A's statement row to a ledger.");

console.log("PASS  Two distinct Supabase identities were verified.");
console.log(`PASS  Private workspace reads are disjoint (A: ${aOrders.length} orders / ${aRows.length} rows; B: ${bOrders.length} orders / ${bRows.length} rows).`);
console.log("PASS  Account B cannot review or post Account A's statement row.");
if (foreignOrder) console.log("PASS  Account B cannot verify Account A's PayPal order.");
console.log("PASS  Audit and ledger records are not shared between the two account responses.");
