import { NextRequest, NextResponse } from "next/server";
import { auditReconciliation, reconciliationActor, reconciliationDb, reconciliationUser } from "@/lib/reconciliation-store";

export const runtime = "nodejs";

type VerifiedCapture = {
  id: string;
  order_number: string;
  total_amount: string | number;
  currency: string;
  payment_environment: string | null;
  paypal_order_id: string | null;
  paypal_capture_id: string;
  verified_at: string;
};

function csvCell(value: unknown) {
  const text = value == null ? "" : String(value);
  return '"' + text.replace(/"/g, '""') + '"';
}

export async function GET(request: NextRequest) {
  const user = await reconciliationUser(request);
  if (!user) return NextResponse.json({ error: "Sign in to download payment evidence for your account." }, { status: 401 });

  try {
    const owner = encodeURIComponent(user.id);
    const captures = await reconciliationDb<VerifiedCapture[]>(
      `orders?owner_id=eq.${owner}&payment_status=eq.paid&paypal_capture_id=not.is.null&verified_at=not.is.null&select=id,order_number,total_amount,currency,payment_environment,paypal_order_id,paypal_capture_id,verified_at&order=verified_at.desc&limit=5000`
    );

    if (!captures.length) {
      return NextResponse.json({ error: "No server-verified PayPal captures were found in this signed-in account yet." }, { status: 404 });
    }

    const headers = [
      "transaction_id", "amount", "currency", "reference", "description",
      "posted_at", "provider_order_id", "payment_environment", "verified_at", "evidence_type"
    ];
    const lines = [
      headers.join(","),
      ...captures.map((capture) => [
        capture.paypal_capture_id,
        Number(capture.total_amount).toFixed(2),
        capture.currency,
        capture.paypal_capture_id,
        `PayProof order ${capture.order_number}; PayPal capture ${capture.paypal_capture_id}`,
        capture.verified_at,
        capture.paypal_order_id || "",
        capture.payment_environment || "unknown",
        capture.verified_at,
        "server_verified_paypal_capture"
      ].map(csvCell).join(","))
    ];

    await auditReconciliation({
      owner_id: user.id,
      action: "paypal_evidence_csv_downloaded",
      actor: reconciliationActor(user.email || user.id),
      details: { rows_exported: captures.length, evidence_type: "server_verified_paypal_captures" }
    });

    const filename = `payproof-paypal-payment-evidence-${new Date().toISOString().slice(0, 10)}.csv`;
    return new NextResponse(lines.join("\r\n") + "\r\n", {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff"
      }
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not generate payment evidence CSV." }, { status: 500 });
  }
}
