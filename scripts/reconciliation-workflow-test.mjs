import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

const baseUrl = (process.env.PAYPROOF_BASE_URL || "https://payproof-ai-git-feat-chatgpt-style-payproo-068502-naom6083-2980.vercel.app").replace(/\/$/, "");
const token = process.env.PAYPROOF_TEST_USER_TOKEN;

if (!token) {
  console.error("Set PAYPROOF_TEST_USER_TOKEN to a dedicated signed-in QA account's access token. Never paste it into chat or commit it.");
  process.exit(2);
}

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

const ordersResult = await request("/api/orders");
assert.equal(ordersResult.response.status, 200, "Could not load the signed-in test account's orders.");
const order = (ordersResult.data.orders || []).find((item) =>
  item.payment_status === "paid" &&
  item.payment_environment === "sandbox" &&
  item.paypal_capture_id &&
  item.verified_at
);
assert.ok(order, "Complete a PayPal Sandbox checkout first. This test requires a saved, server-verified Sandbox capture.");
assert.ok(order.order_number && order.total_amount && order.currency, "Verified order is missing matching fields.");

const suffix = randomUUID().toUpperCase();
const rejectId = `PPQA-${suffix}-REJECT`;
const approveId = `PPQA-${suffix}-APPROVE`;
const csv = [
  "transaction_id,amount,currency,reference,description,posted_at",
  `${rejectId},${order.total_amount},${order.currency},${order.order_number},PayProof QA rejection-path test,${new Date().toISOString()}`,
  `${approveId},${order.total_amount},${order.currency},${order.order_number},PayProof QA approval-and-ledger test,${new Date().toISOString()}`
].join("\n");

const imported = await request("/api/reconciliation/import", { csv, filename: "payproof-qa-reconciliation.csv" });
assert.equal(imported.response.status, 200, `CSV import failed: ${imported.data.error || imported.response.status}`);
assert.equal(imported.data.rowsImported, 2, "The first import should add exactly two QA statement rows.");

const duplicate = await request("/api/reconciliation/import", { csv, filename: "payproof-qa-reconciliation.csv" });
assert.equal(duplicate.response.status, 200, `Duplicate import request failed: ${duplicate.data.error || duplicate.response.status}`);
assert.equal(duplicate.data.rowsImported, 0, "Re-importing the same owner/transaction IDs must insert no rows.");
assert.equal(duplicate.data.duplicatesSkipped, 2, "Both duplicate transaction IDs should be skipped.");
console.log("PASS  CSV import created two owner-scoped QA rows.");
console.log("PASS  Re-import skipped both duplicate transaction IDs.");

const matching = await request("/api/reconciliation/match", {});
assert.equal(matching.response.status, 200, `Matching failed: ${matching.data.error || matching.response.status}`);

const workspace = await request("/api/reconciliation");
assert.equal(workspace.response.status, 200, "Could not reload the private reconciliation workspace.");
const rowReject = (workspace.data.rows || []).find((row) => row.transaction_id === rejectId);
const rowApprove = (workspace.data.rows || []).find((row) => row.transaction_id === approveId);
assert.ok(rowReject && rowApprove, "Both QA statement rows must be visible in the owner's private workspace.");
for (const row of [rowReject, rowApprove]) {
  assert.equal(row.match_status, "matched_pending_review", `Expected an exact verified match pending review; got ${row.match_status}.`);
  assert.ok(row.matched_order_id, "The statement row was not linked to a verified order.");
}
console.log("PASS  Both rows matched exact reference, amount and currency; neither was auto-posted.");

const rejected = await request("/api/reconciliation/review", { rowId: rowReject.id, decision: "reject", note: "Automated PayProof QA rejection-path test." });
assert.equal(rejected.response.status, 200, `Rejection failed: ${rejected.data.error || rejected.response.status}`);
assert.equal(rejected.data.status, "rejected", "The rejected row did not enter rejected state.");

const approved = await request("/api/reconciliation/review", { rowId: rowApprove.id, decision: "approve", note: "Automated PayProof QA approval-path test." });
assert.equal(approved.response.status, 200, `Approval failed: ${approved.data.error || approved.response.status}`);
assert.equal(approved.data.status, "approved", "The approved row did not enter approved state.");
console.log("PASS  One candidate was rejected; the other was explicitly approved.");

const firstPost = await request("/api/reconciliation/post", { rowId: rowApprove.id });
assert.equal(firstPost.response.status, 200, `First ledger post failed: ${firstPost.data.error || firstPost.response.status}`);
assert.equal(firstPost.data.alreadyPosted, false, "The first post should create a new ledger entry.");
assert.ok(firstPost.data.ledgerEntryId, "The first post did not return a ledger entry ID.");

const secondPost = await request("/api/reconciliation/post", { rowId: rowApprove.id });
assert.equal(secondPost.response.status, 200, `Idempotent retry failed: ${secondPost.data.error || secondPost.response.status}`);
assert.equal(secondPost.data.alreadyPosted, true, "The second post should return the existing entry, not create another.");
assert.equal(secondPost.data.ledgerEntryId, firstPost.data.ledgerEntryId, "The repeated post returned a different ledger entry ID.");

const finalWorkspace = await request("/api/reconciliation");
assert.equal(finalWorkspace.response.status, 200, "Could not verify the final reconciliation state.");
const finalReject = (finalWorkspace.data.rows || []).find((row) => row.id === rowReject.id);
const finalApprove = (finalWorkspace.data.rows || []).find((row) => row.id === rowApprove.id);
assert.equal(finalReject?.match_status, "rejected", "Rejected QA row did not remain rejected.");
assert.equal(finalApprove?.match_status, "posted", "Approved QA row did not reach posted state.");
const qaLedger = (finalWorkspace.data.ledger || []).filter((entry) => entry.statement_row_id === rowApprove.id);
assert.equal(qaLedger.length, 1, "Exactly one persistent ledger entry must exist for the approved QA statement row.");
const qaAudit = (finalWorkspace.data.audit || []).filter((event) => [rowReject.id, rowApprove.id].includes(event.statement_row_id));
assert.ok(qaAudit.some((event) => event.action === "match_rejected"), "Rejection audit event is missing.");
assert.ok(qaAudit.some((event) => event.action === "match_approved"), "Approval audit event is missing.");
assert.ok(qaAudit.some((event) => event.action === "internal_ledger_posted" || event.action === "ledger_posted"), "Ledger-post audit event is missing.");

console.log("PASS  Repeated posting returned the same ledger entry; no duplicate was created.");
console.log("PASS  Final states and audit events were verified in the persistent workspace.");
console.log("NOTE  This test intentionally leaves two clearly named PPQA rows and one ledger entry in the dedicated QA account for review.");
