import { NextRequest, NextResponse } from "next/server";
import { reconciliationAuthorized, reconciliationDb } from "@/lib/reconciliation-store";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
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
