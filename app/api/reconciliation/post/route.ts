import { NextRequest, NextResponse } from "next/server";
import { auditReconciliation, reconciliationActor, reconciliationAuthorized, reconciliationDb } from "@/lib/reconciliation-store";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!reconciliationAuthorized(request)) return NextResponse.json({ error: "Authorised reconciliation access is required." }, { status: 401 });
  let body: { rowId?: unknown; actor?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "A statement row ID is required." }, { status: 400 }); }
  if (typeof body.rowId !== "string" || !/^[0-9a-f-]{36}$/i.test(body.rowId)) return NextResponse.json({ error: "A valid statement row ID is required." }, { status: 400 });
  const actor = reconciliationActor(body.actor);
  try {
    const rows = await reconciliationDb<Array<{ id: string; transaction_id: string; amount: string; currency: string; match_status: string; matched_order_id: string | null; reference: string | null; description: string | null }>>(
      `bank_statement_rows?id=eq.${encodeURIComponent(body.rowId)}&select=id,transaction_id,amount,currency,match_status,matched_order_id,reference,description`,
      { method: "GET" }
    );
    const row = rows[0];
    if (!row) return NextResponse.json({ error: "Statement row was not found." }, { status: 404 });
    if (row.match_status !== "approved" || !row.matched_order_id) return NextResponse.json({ error: "Only an explicitly approved match linked to a verified order can be posted." }, { status: 409 });
    const existing = await reconciliationDb<Array<{ id: string }>>(`ledger_entries?statement_row_id=eq.${encodeURIComponent(row.id)}&select=id`, { method: "GET" });
    if (existing.length) {
      // Recover safely if the ledger insert succeeded but a later status/audit write failed.
      const now = new Date().toISOString();
      await reconciliationDb(`bank_statement_rows?id=eq.${encodeURIComponent(row.id)}&match_status=eq.approved`, {
        method: "PATCH", headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ match_status: "posted", ledger_posted_at: now, updated_at: now })
      });
      await auditReconciliation({ statement_row_id: row.id, order_id: row.matched_order_id, action: "duplicate_post_prevented", actor, details: { transaction_id: row.transaction_id, existing_ledger_entry_id: existing[0].id } });
      return NextResponse.json({ ok: true, alreadyPosted: true, ledgerEntryId: existing[0].id, message: "An existing ledger entry was found. No duplicate was created; the reconciliation status was repaired and audited." });
    }
    const order = await reconciliationDb<Array<{ id: string; order_number: string; payment_status: string; total_amount: string; currency: string; paypal_order_id: string | null; paypal_capture_id: string | null; verified_at: string | null }>>(
      `orders?id=eq.${encodeURIComponent(row.matched_order_id)}&select=id,order_number,payment_status,total_amount,currency,paypal_order_id,paypal_capture_id,verified_at`,
      { method: "GET" }
    );
    const verified = order[0];
    if (!verified || verified.payment_status !== "paid" || !verified.paypal_capture_id || !verified.verified_at) return NextResponse.json({ error: "The linked order no longer satisfies the verified-payment requirements." }, { status: 409 });
    if (![verified.order_number, verified.paypal_order_id, verified.paypal_capture_id].some((reference) => reference && reference.toLowerCase() === (row.reference || "").trim().toLowerCase()) || Number(verified.total_amount).toFixed(2) !== Number(row.amount).toFixed(2) || verified.currency !== row.currency) {
      return NextResponse.json({ error: "Reference, amount or currency changed since review. Re-run matching and review again." }, { status: 409 });
    }
    const inserted = await reconciliationDb<Array<{ id: string }>>("ledger_entries?on_conflict=statement_row_id&select=id", {
      method: "POST",
      headers: { Prefer: "resolution=ignore-duplicates,return=representation" },
      body: JSON.stringify({
        statement_row_id: row.id, order_id: verified.id, entry_type: "payment_receivable_settlement",
        amount: row.amount, currency: row.currency,
        memo: `Reconciled PayPal capture for ${verified.order_number}; bank transaction ${row.transaction_id}`,
        posted_by: actor
      })
    });
    if (!inserted.length) return NextResponse.json({ error: "A ledger entry already exists or could not be created; no duplicate was posted." }, { status: 409 });
    const now = new Date().toISOString();
    await reconciliationDb(`bank_statement_rows?id=eq.${encodeURIComponent(row.id)}&match_status=eq.approved`, {
      method: "PATCH", headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ match_status: "posted", ledger_posted_at: now, updated_at: now })
    });
    await auditReconciliation({ statement_row_id: row.id, order_id: verified.id, action: "internal_ledger_posted", actor, details: { transaction_id: row.transaction_id, ledger_entry_id: inserted[0].id, amount: row.amount, currency: row.currency, destination: "PayProof AI internal ledger only" } });
    return NextResponse.json({ ok: true, ledgerEntryId: inserted[0].id, message: "Posted to PayProof AI's internal demo ledger and recorded in the audit trail. This does not post to an external accounting or banking system." });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Ledger posting failed." }, { status: 500 });
  }
}
