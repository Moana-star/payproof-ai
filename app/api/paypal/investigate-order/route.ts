import { NextRequest, NextResponse } from "next/server";
import { getPayPalAccessToken, paypalRequest } from "@/lib/paypal";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as { orderId?: unknown } | null;
  if (!body || typeof body.orderId !== "string" || body.orderId.length < 8 || body.orderId.length > 40) {
    return NextResponse.json({ error: "A valid order ID is required." }, { status: 400 });
  }
  try {
    const token = await getPayPalAccessToken();
    const order = await paypalRequest<{ id?: string; status?: string }>("/v2/checkout/orders/" + encodeURIComponent(body.orderId), token, { method: "GET" });
    const matches = order.id === body.orderId;
    const verified = matches && order.status === "COMPLETED";
    return NextResponse.json({ status: verified ? "VERIFIED" : "REVIEW_REQUIRED", verified, orderIdMatches: matches, paypalStatus: order.status ?? "UNKNOWN", summary: verified ? "PayPal reports a completed order; inspect capture details before fulfilment." : "A completed verified payment has not been established. Do not fulfil this order.", sandbox: true });
  } catch {
    return NextResponse.json({ status: "REVIEW_REQUIRED", verified: false, error: "Could not retrieve order evidence from PayPal Sandbox." }, { status: 502 });
  }
}