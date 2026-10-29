import { NextRequest, NextResponse } from "next/server";
import { reconciliationAuthorized, reconciliationDb } from "@/lib/reconciliation-store";

export const runtime = "nodejs";

const DEMO_READ_ONLY_TOKEN = "PAYPROOF-DEMO-READONLY";

const demoRows = [
  { id: "demo-row-001", statement_id: "demo-statement", transaction_id: "DEMO-STMT-001", amount: "24.50", currency: "USD", reference: "DEMO-REFERENCE-NOT-LIVE", description: "Illustrative coffee gift set row", posted_at: "2026-10-29T10:00:00.000Z", source_file: "payproof-demo-statement.csv", match_status: "unmatched", matched_order_id: null, match_reason: "Synthetic demo row. It does not reference a real verified PayPal capture.", approved_by: null, approved_at: null, rejected_by: null, rejected_at: null, ledger_posted_at: null, created_at: "2026-10-29T10:00:00.000Z" },
  { id: "demo-row-002", statement_id: "demo-statement", transaction_id: "DEMO-STMT-002", amount: "40.00", currency: "USD", reference: "DEMO-REFERENCE-MISMATCH", description: "Illustrative amount mismatch", posted_at: "2026-10-29T10:05:00.000Z", source_file: "payproof-demo-statement.csv", match_status: "exception", matched_order_id: null, match_reason: "Synthetic example: reference and amount are illustrative; no real payment evidence is linked.", approved_by: null, approved_at: null, rejected_by: null, rejected_at: null, ledger_posted_at: null, created_at: "2026-10-29T10:05:00.000Z" },
  { id: "demo-row-003", statement_id: "demo-statement", transaction_id: "DEMO-STMT-003", amount: "16.00", currency: "USD", reference: "UNKNOWN-DEMO-REFERENCE", description: "Illustrative unmatched payment", posted_at: "2026-10-29T10:10:00.000Z", source_file: "payproof-demo-statement.csv", match_status: "unmatched", matched_order_id: null, match_reason: "No matching verified capture in this synthetic example.", approved_by: null, approved_at: null, rejected_by: null, rejected_at: null, ledger_posted_at: null, created_at: "2026-10-29T10:10:00.000Z" }
];

export async function GET(request: NextRequest) {
  const suppliedToken = request.headers.get("x-reconciliation-token") || "";
  if (suppliedToken === DEMO_READ_ONLY_TOKEN) {
    return NextResponse.json({
      ok: true,
      demo: true,
      rows: demoRows,
      audit: [{ id: "demo-audit-001", action: "sample_workspace_loaded", actor: "Public demo reviewer", details: { note: "Synthetic read-only data; no production records accessed." }, created_at: "2026-10-29T10:15:00.000Z", statement_row_id: null }],
      ledger: []
    });
  }
  if (!reconciliationAuthorized(request)) return NextResponse.json({ error: "Authorised reconciliation access is required." }, { status: 401 });
  try {
    const [rows, audit, ledger] = await Promise.all([
      reconciliationDb<unknown[]>("bank_statement_rows?select=id,statement_id,transaction_id,amount,currency,reference,description,posted_at,source_file,match_status,matched_order_id,match_reason,approved_by,approved_at,rejected_by,rejected_at,ledger_posted_at,created_at&order=created_at.desc&limit=200", { method: "GET" }),
      reconciliationDb<unknown[]>("reconciliation_audit?select=id,statement_row_id,order_id,action,actor,details,created_at&order=created_at.desc&limit=100", { method: "GET" }),
      reconciliationDb<unknown[]>("ledger_entries?select=id,statement_row_id,order_id,entry_type,amount,currency,memo,posted_by,posted_at&order=posted_at.desc&limit=100", { method: "GET" })
    ]);
    return NextResponse.json({ ok: true, rows, audit, ledger });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load reconciliation workspace." }, { status: 500 });
  }
}
