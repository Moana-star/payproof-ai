import { NextRequest, NextResponse } from "next/server";
import { auditReconciliation, reconciliationActor, reconciliationAuthorized, reconciliationDb } from "@/lib/reconciliation-store";

export const runtime = "nodejs";

type StatementRow = { id: string; transaction_id: string; amount: string; currency: string; reference: string | null; match_status: string };
type VerifiedOrder = { id: string; order_number: string; total_amount: string; currency: string; payment_status: string; paypal_capture_id: string | null; verified_at: string | null };

export async function POST(request: NextRequest) {
  if (!reconciliationAuthorized(request)) return NextResponse.json({ error: "Authorised reconciliation access is required." }, { status: 401 });
  let body: { actor?: unknown } = {};
  try { body = await request.json(); } catch {}
  const actor = reconciliationActor(body.actor);
  try {
    const rows = await reconciliationDb<StatementRow[]>("bank_statement_rows?select=id,transaction_id,amount,currency,reference,match_status&match_status=in.(unmatched,exception)&order=created_at.asc&limit=500", { method: "GET" });
    const orders = await reconciliationDb<VerifiedOrder[]>("orders?select=id,order_number,total_amount,currency,payment_status,paypal_capture_id,verified_at&payment_status=eq.paid&paypal_capture_id=not.is.null&verified_at=not.is.null&limit=2000", { method: "GET" });
    const byReference = new Map(orders.map((order) => [order.order_number.toLowerCase(), order]));
    const totals = { exactMatch: 0, amountOrReferenceException: 0, unmatched: 0 };
    for (const row of rows) {
      const reference = (row.reference || "").trim().toLowerCase();
      const order = reference ? byReference.get(reference) : undefined;
      let status = "unmatched";
      let matchedOrderId: string | null = null;
      let reason = "No verified PayPal capture matched this statement reference.";
      if (order) {
        matchedOrderId = order.id;
        const amountMatches = Number(row.amount).toFixed(2) === Number(order.total_amount).toFixed(2);
        const currencyMatches = row.currency === order.currency;
        if (amountMatches && currencyMatches) {
          status = "matched_pending_review";
          reason = "Exact order reference, amount and currency match a server-verified completed PayPal capture. Reviewer approval is still required.";
          totals.exactMatch++;
        } else {
          status = "exception";
          reason = !amountMatches && !currencyMatches ? "Reference matched but both amount and currency differ." : !amountMatches ? "Reference matched but statement amount differs from the verified order total." : "Reference matched but currency differs from the verified order currency.";
          totals.amountOrReferenceException++;
        }
      } else {
        const sameAmount = orders.filter((candidate) => Number(candidate.total_amount).toFixed(2) === Number(row.amount).toFixed(2) && candidate.currency === row.currency);
        if (sameAmount.length) {
          status = "exception";
          reason = sameAmount.length === 1 ? "Amount and currency suggest a possible order, but the reference did not match. Human review required; no automatic link was made." : "Multiple verified orders share this amount and currency; reference is absent or unmatched. Human review required.";
          totals.amountOrReferenceException++;
        } else {
          totals.unmatched++;
        }
      }
      await reconciliationDb("bank_statement_rows?id=eq." + encodeURIComponent(row.id), {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ match_status: status, matched_order_id: matchedOrderId, match_reason: reason, updated_at: new Date().toISOString() })
      });
      await auditReconciliation({ statement_row_id: row.id, order_id: matchedOrderId, action: "matching_evaluated", actor, details: { transaction_id: row.transaction_id, result: status, reason } });
    }
    return NextResponse.json({ ok: true, examined: rows.length, ...totals, message: "Matching completed against server-verified PayPal captures. All potential matches remain unposted pending explicit human approval." });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Matching failed." }, { status: 500 });
  }
}
