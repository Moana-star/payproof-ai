import { NextRequest, NextResponse } from "next/server";
import { getPayPalAccessToken, paypalRequest } from "@/lib/paypal";
import { evaluatePaymentEvidence, type PayPalOrderEvidence } from "@/lib/payment-verification";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let body: { orderId?: unknown } | null;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ status: "REVIEW_REQUIRED", verified: false, error: "Send a valid JSON request." }, { status: 400 });
  }

  if (!body || typeof body.orderId !== "string" || !/^[A-Z0-9-]{8,40}$/i.test(body.orderId)) {
    return NextResponse.json({ status: "REVIEW_REQUIRED", verified: false, error: "A valid PayPal Sandbox order ID is required." }, { status: 400 });
  }

  const requestedOrderId = body.orderId;
  try {
    const token = await getPayPalAccessToken();
    const order = await paypalRequest<PayPalOrderEvidence>(
      "/v2/checkout/orders/" + encodeURIComponent(requestedOrderId),
      token,
      { method: "GET" }
    );
    const { verified, checks, failedChecks, capture } = evaluatePaymentEvidence(order, requestedOrderId);

    return NextResponse.json({
      status: verified ? "VERIFIED" : "REVIEW_REQUIRED",
      verified,
      summary: verified
        ? "PayPal Sandbox confirms the expected completed capture, amount, currency, and order reference."
        : "Payment is not verified. One or more required PayPal checks are incomplete or mismatched. Do not fulfil this order.",
      orderId: order.id ?? null,
      paypalStatus: order.status ?? "UNKNOWN",
      captureId: capture?.id ?? null,
      captureStatus: capture?.status ?? "MISSING",
      amount: capture?.amount?.value ?? null,
      currency: capture?.amount?.currency_code ?? null,
      checks,
      failedChecks,
      sandbox: true
    }, { status: verified ? 200 : 409 });
  } catch {
    return NextResponse.json({
      status: "REVIEW_REQUIRED",
      verified: false,
      error: "Could not retrieve PayPal Sandbox evidence. Check the Sandbox configuration or retry later. No payment is verified."
    }, { status: 502 });
  }
}
