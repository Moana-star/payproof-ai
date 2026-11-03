import { NextRequest, NextResponse } from "next/server";
import { auditReconciliation, reconciliationActor, reconciliationDb, reconciliationUser } from "@/lib/reconciliation-store";

export const runtime = "nodejs";
type StatementRow = { id: string; transaction_id: string; amount: string; currency: string; reference: string | null; match_status: string };
type VerifiedOrder = { id: string; order_number: string; total_amount: string; currency: string; payment_status: string; payment_environment: string; paypal_order_id: string | null; paypal_capture_id: string | null; verified_at: string | null };

export async function POST(request: NextRequest) {
  const user = await reconciliationUser(request);
  if (!user) return NextResponse.json({ error: "Sign in to match transactions in your workspace." }, { status: 401 });
  let body: { actor?: unknown } = {}; try { body = await request.json(); } catch {}
  const actor = reconciliationActor(user.email || user.id); const owner = encodeURIComponent(user.id);
  try {
    const [rows, orders] = await Promise.all([
      reconciliationDb<StatementRow[]>(`bank_statement_rows?owner_id=eq.${owner}&match_status=in.(unmatched,exception)&select=id,transaction_id,amount,currency,reference,match_status&order=created_at.asc&limit=500`),
      reconciliationDb<VerifiedOrder[]>(`orders?owner_id=eq.${owner}&payment_status=eq.paid&paypal_capture_id=not.is.null&verified_at=not.is.null&select=id,order_number,total_amount,currency,payment_status,payment_environment,paypal_order_id,paypal_capture_id,verified_at&limit=2000`)
    ]);
    const byReference = new Map<string, VerifiedOrder>();
    for (const order of orders) for (const value of [order.order_number, order.paypal_order_id, order.paypal_capture_id]) if (value) byReference.set(value.toLowerCase(), order);
    const totals = { exactMatch: 0, amountOrReferenceException: 0, unmatched: 0 };
    for (const row of rows) {
      const reference = (row.reference || "").trim().toLowerCase(); const order = reference ? byReference.get(reference) : undefined;
      let status = "unmatched"; let matchedOrderId: string | null = null; let reason = "No verified PayPal capture matched this statement reference.";
      if (order) {
        matchedOrderId = order.id;
        const amountMatches = Number(row.amount).toFixed(2) === Number(order.total_amount).toFixed(2); const currencyMatches = row.currency === order.currency;
        if (amountMatches && currencyMatches) { status = "matched_pending_review"; reason = `Exact reference, amount and currency match a server-verified completed PayPal ${order.payment_environment} capture. Human approval is still required.`; totals.exactMatch++; }
        else { status = "exception"; reason = !amountMatches && !currencyMatches ? "Reference matched but amount and currency differ." : !amountMatches ? "Reference matched but statement amount differs from the verified order total." : "Reference matched but currency differs from the verified order currency."; totals.amountOrReferenceException++; }
      } else {
        const sameAmount = orders.filter((candidate) => Number(candidate.total_amount).toFixed(2) === Number(row.amount).toFixed(2) && candidate.currency === row.currency);
        if (sameAmount.length) { status = "exception"; reason = sameAmount.length === 1 ? "Amount and currency suggest a possible order, but the reference did not match. Manual investigation required." : "Multiple verified orders share this amount and currency; no automatic link was made."; totals.amountOrReferenceException++; }
        else totals.unmatched++;
      }
      await reconciliationDb(`bank_statement_rows?id=eq.${encodeURIComponent(row.id)}&owner_id=eq.${owner}`, { method: "PATCH", headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ match_status: status, matched_order_id: matchedOrderId, match_reason: reason, updated_at: new Date().toISOString() }) });
      await auditReconciliation({ owner_id: user.id, statement_row_id: row.id, order_id: matchedOrderId, action: "matching_evaluated", actor, details: { transaction_id: row.transaction_id, result: status, reason } });
    }
    return NextResponse.json({ ok: true, examined: rows.length, ...totals, message: "Matching completed against your server-verified PayPal captures. Candidates remain unposted pending explicit approval." });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Matching failed." }, { status: 500 }); }
}
