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

    if (!verified) {
      return NextResponse.json({
        status: "REVIEW_REQUIRED",
        verified: false,
        summary: "Payment is not verified. One or more required PayPal checks are incomplete or mismatched. Do not fulfil this order.",
        paypalStatus: order.status ?? "UNKNOWN",
        checks,
        failedChecks,
        sandbox: true
      }, { status: 409 });
    }

    return NextResponse.json({
      status: "VERIFIED",
      verified: true,
      summary: "PayPal Sandbox confirms the expected completed capture, amount, currency, and order reference.",
      orderId: order.id,
      paypalStatus: order.status,
      captureId: capture?.id,
      captureStatus: capture?.status,
      amount: capture?.amount?.value,
      currency: capture?.amount?.currency_code,
      checks,
      failedChecks,
      sandbox: true
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const httpStatus = message.match(/HTTP (\\d{3})/)?.[1];
    if (message.includes("credentials are not configured") || httpStatus === "401" || httpStatus === "403") {
      return NextResponse.json({
        status: "REVIEW_REQUIRED",
        verified: false,
        error: "PayPal Sandbox authentication is not available. Check that the matching Sandbox app credentials are configured for this deployment."
      }, { status: 503 });
    }
    if (httpStatus === "404") {
      return NextResponse.json({
        status: "REVIEW_REQUIRED",
        verified: false,
        error: "PayPal Sandbox did not find this order ID. Check the ID; no payment is verified."
      }, { status: 404 });
    }
    return NextResponse.json({
      status: "REVIEW_REQUIRED",
      verified: false,
      error: "Could not retrieve PayPal Sandbox evidence. Retry later or review the Sandbox configuration. No payment is verified.",
      sandbox: true
    }, { status: 502 });
  }
}
