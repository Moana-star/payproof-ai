import assert from "node:assert/strict";

const baseUrl = (process.argv[2] || process.env.PAYPROOF_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const results = [];

async function check(name, run) {
  try {
    await run();
    results.push({ name, status: "PASS" });
    console.log(`PASS  ${name}`);
  } catch (error) {
    results.push({ name, status: "FAIL" });
    console.error(`FAIL  ${name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function json(path, init) {
  const response = await fetch(`${baseUrl}${path}`, init);
  let body = null;
  try { body = await response.json(); } catch {}
  return { response, body };
}

await check("homepage responds", async () => {
  const response = await fetch(baseUrl);
  assert.equal(response.status, 200);
});

await check("auth page responds", async () => {
  const response = await fetch(`${baseUrl}/auth`);
  assert.equal(response.status, 200);
});

await check("unauthenticated order list reveals no records", async () => {
  const { response, body } = await json("/api/orders");
  assert.equal(response.status, 200);
  assert.equal(body.requiresSignIn, true);
  assert.deepEqual(body.orders, []);
});

await check("unauthenticated PayPal order creation is rejected", async () => {
  const { response } = await json("/api/paypal/create-order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ product: "Coffee gift set", quantity: 1 })
  });
  assert.equal(response.status, 401);
});

await check("unauthenticated PayPal capture is rejected", async () => {
  const { response } = await json("/api/paypal/capture-order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderId: "TEST-ORDER-123" })
  });
  assert.equal(response.status, 401);
});

await check("reconciliation live records are protected without reviewer credentials", async () => {
  const { response } = await json("/api/reconciliation");
  assert.equal(response.status, 401);
});

for (const [name, path, body] of [
  ["CSV import", "/api/reconciliation/import", { csv: "transaction_id,amount,currency,reference\ntest,1.00,USD,ref" }],
  ["matching", "/api/reconciliation/match", {}],
  ["review", "/api/reconciliation/review", { rowId: "00000000-0000-4000-8000-000000000000", decision: "approve" }],
  ["ledger posting", "/api/reconciliation/post", { rowId: "00000000-0000-4000-8000-000000000000" }]
]) {
  await check(`reconciliation ${name} rejects missing reviewer credentials`, async () => {
    const { response } = await json(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    assert.equal(response.status, 401);
  });
}

await check("public read-only reconciliation preview contains only synthetic demo data", async () => {
  const { response, body } = await json("/api/reconciliation", {
    headers: { "x-reconciliation-token": "PAYPROOF-DEMO-READONLY" }
  });
  assert.equal(response.status, 200);
  assert.equal(body.demo, true);
  assert.ok(Array.isArray(body.rows));
  assert.ok(body.rows.length > 0);
  assert.ok(body.rows.every((row) => String(row.id).startsWith("demo-")));
  assert.ok(body.rows.every((row) => String(row.source_file).includes("demo")));
  assert.deepEqual(body.ledger, []);
});

const failed = results.filter((result) => result.status === "FAIL").length;
console.log(`\nSmoke checks: ${results.length - failed}/${results.length} passed.`);
if (failed) process.exitCode = 1;
