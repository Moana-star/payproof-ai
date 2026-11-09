import { NextRequest, NextResponse } from "next/server";
import { reconciliationDb, reconciliationUser } from "@/lib/reconciliation-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type OrderRow = {
  id: string; order_number: string; created_at: string; payment_status: string;
  payment_environment: string; paypal_order_id: string | null; paypal_capture_id: string | null;
  verified_at: string | null; total_amount: string; currency: string;
};
type PaymentEvent = {
  id: string; order_id: string; event_type: string; provider_event_id: string | null;
  details: Record<string, unknown>; created_at: string;
  orders?: { order_number: string; owner_id: string } | null;
};
type ReconciliationEvent = {
  id: string; order_id: string | null; statement_row_id: string | null; action: string;
  actor: string; details: Record<string, unknown>; created_at: string;
  orders?: { order_number: string } | null;
  bank_statement_rows?: { transaction_id: string } | null;
};
type LedgerEvent = {
  id: string; order_id: string | null; statement_row_id: string; entry_type: string;
  amount: string; currency: string; memo: string; posted_by: string; posted_at: string;
  orders?: { order_number: string } | null;
  bank_statement_rows?: { transaction_id: string } | null;
};

function event(id: string, type: string, title: string, status: string, actor: string,
  reference: string | null, outcome: string, createdAt: string, orderNumber: string | null) {
  return { id, type, title, status, actor, reference, outcome, createdAt, orderNumber };
}

export async function GET(request: NextRequest) {
  const user = await reconciliationUser(request);
  if (!user) return NextResponse.json(
    { requiresSignIn: true, events: [] },
    { status: 401, headers: { "Cache-Control": "private, no-store" } }
  );

  try {
    const owner = encodeURIComponent(user.id);
    const [orders, payments, reviews, ledger] = await Promise.all([
      reconciliationDb<OrderRow[]>(`orders?owner_id=eq.${owner}&select=id,order_number,created_at,payment_status,payment_environment,paypal_order_id,paypal_capture_id,verified_at,total_amount,currency&order=created_at.desc&limit=200`),
      reconciliationDb<PaymentEvent[]>(`payment_events?select=id,order_id,event_type,provider_event_id,details,created_at,orders!inner(order_number,owner_id)&orders.owner_id=eq.${owner}&order=created_at.desc&limit=500`),
      reconciliationDb<ReconciliationEvent[]>(`reconciliation_audit?owner_id=eq.${owner}&select=id,order_id,statement_row_id,action,actor,details,created_at,orders(order_number),bank_statement_rows(transaction_id)&order=created_at.desc&limit=300`),
      reconciliationDb<LedgerEvent[]>(`ledger_entries?owner_id=eq.${owner}&select=id,order_id,statement_row_id,entry_type,amount,currency,memo,posted_by,posted_at,orders(order_number),bank_statement_rows(transaction_id)&order=posted_at.desc&limit=200`)
    ]);

    const events = [
      ...orders.map((row) => event(
        `order-created-${row.id}`, "order.created", "Order created", "recorded", "PayProof AI",
        row.order_number, `Server-priced order created for ${row.currency} ${row.total_amount}. Payment status: ${row.payment_status.replace(/_/g, " ")}.`,
        row.created_at, row.order_number
      )),
      ...payments.map((row) => {
        const detail = row.details || {};
        const type = row.event_type;
        const title = type === "paypal.order.created" ? "PayPal Sandbox order created"
          : type === "sandbox.capture.completed" ? "Payment capture completed"
          : type === "sandbox.capture.verified" ? "Server verification completed"
          : type === "sandbox.order.persisted" ? "Verified order saved"
          : type.replace(/[._]/g, " ");
        const status = type === "sandbox.capture.completed" || type === "sandbox.capture.verified" || type === "sandbox.order.persisted" ? "success" : "recorded";
        const reference = row.provider_event_id || (typeof detail.paypal_order_id === "string" ? detail.paypal_order_id : null);
        const outcome = typeof detail.outcome === "string" ? detail.outcome
          : typeof detail.message === "string" ? detail.message
          : typeof detail.amount === "string" ? `Amount ${detail.amount} ${typeof detail.currency === "string" ? detail.currency : ""}`.trim()
          : "Event recorded by the PayProof AI server.";
        return event(row.id, type, title, status, "PayProof AI server", reference, outcome, row.created_at, row.orders?.order_number || null);
      }),
      ...reviews.map((row) => {
        const title = row.action.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
        const details = row.details || {};
        const transaction = typeof details.transaction_id === "string" ? details.transaction_id : row.bank_statement_rows?.transaction_id;
        const note = typeof details.note === "string" && details.note ? ` Reviewer note: ${details.note}` : "";
        return event(row.id, `reconciliation.${row.action}`, title, "recorded", row.actor,
          transaction || row.statement_row_id, `${typeof details.result === "string" ? `Result: ${details.result}. ` : ""}${typeof details.reason === "string" ? details.reason : ""}${note}`.trim() || "Reviewer action recorded.", row.created_at, row.orders?.order_number || null);
      }),
      ...ledger.map((row) => event(
        `ledger-${row.id}`, "ledger.posted", "Ledger entry posted", "success", row.posted_by,
        row.id, `${row.currency} ${row.amount} · ${row.memo}`, row.posted_at, row.orders?.order_number || null
      ))
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({ configured: true, events }, {
      headers: { "Cache-Control": "private, no-store" }
    });
  } catch {
    return NextResponse.json(
      { error: "The authenticated audit history could not be loaded." },
      { status: 503, headers: { "Cache-Control": "private, no-store" } }
    );
  }
}
