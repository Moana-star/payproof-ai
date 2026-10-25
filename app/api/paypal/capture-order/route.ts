import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getPayPalAccessToken, paypalRequest } from "@/lib/paypal";
import { evaluatePaymentEvidence, EXPECTED_AMOUNT, EXPECTED_CURRENCY, EXPECTED_REFERENCE, type PayPalOrderEvidence } from "@/lib/payment-verification";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let body: { orderId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ verified: false, status: "REVIEW_REQUIRED", error: "Send a valid JSON request." }, { status: 400 });
  }
  if (typeof body.orderId !== "string" || !/^[A-Z0-9-]{8,40}$/i.test(body.orderId)) {
    return NextResponse.json({ verified: false, status: "REVIEW_REQUIRED", error: "A valid PayPal order ID is required." }, { status: 400 });
  }

  const orderId = body.orderId;
  try {
    const accessToken = await getPayPalAccessToken();
    const existingOrder = await paypalRequest<PayPalOrderEvidence>(
      `/v2/checkout/orders/${encodeURIComponent(orderId)}`,
      accessToken,
      { method: "GET" }
    );

    const unit = existingOrder.purchase_units?.[0];
    const orderMatches = existingOrder.id === orderId;
    const referenceMatches = unit?.reference_id === EXPECTED_REFERENCE && unit?.custom_id === EXPECTED_REFERENCE;
    const expectedOrderAmountMatches =
      unit?.amount?.value === EXPECTED_AMOUNT &&
      unit?.amount?.currency_code === EXPECTED_CURRENCY;

    // Never capture an arbitrary PayPal order. Check its identity and trusted
    // fixed-price reference before any state-changing capture request.
    if (!orderMatches || !referenceMatches || !expectedOrderAmountMatches) {
      return NextResponse.json({
        verified: false,
        status: "REVIEW_REQUIRED",
        message: "The PayPal order does not match this demo's trusted order reference, amount, currency, or ID. It was not captured.",
        checks: { orderIdMatches: orderMatches, referenceMatches, expectedOrderAmountMatches },
        sandbox: true
      }, { status: 409 });
    }

    let result = existingOrder;
    if (existingOrder.status !== "COMPLETED") {
      if (existingOrder.status !== "APPROVED") {
        return NextResponse.json({
          verified: false,
          status: "REVIEW_REQUIRED",
          message: "PayPal has not approved this order for capture. No capture was attempted.",
          paypalStatus: existingOrder.status ?? "UNKNOWN",
          checks: { orderIdMatches: true, referenceMatches: true, expectedOrderAmountMatches: true, orderApproved: false },
          sandbox: true
        }, { status: 409 });
      }

      // Stable request ID makes retries for the same order idempotent.
      const requestId = createHash("sha256").update(`payproof-capture:${orderId}`).digest("hex").slice(0, 32);
      result = await paypalRequest<PayPalOrderEvidence>(
        `/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`,
        accessToken,
        {
          method: "POST",
          headers: { "PayPal-Request-Id": requestId },
          body: JSON.stringify({})
        }
      );
    }

    const { verified, checks, failedChecks, capture } = evaluatePaymentEvidence(result, orderId);
    if (!verified) {
      return NextResponse.json({
        verified: false,
        status: "REVIEW_REQUIRED",
        message: "PayPal did not confirm the expected completed capture. Do not fulfil this demo order.",
        paypalStatus: result.status ?? "UNKNOWN",
        checks,
        failedChecks,
        sandbox: true
      }, { status: 409 });
    }

    return NextResponse.json({
      verified: true,
      status: "COMPLETED",
      message: "PayPal Sandbox confirms the expected demo payment.",
      transaction: {
        orderId: result.id,
        captureId: capture?.id,
        amount: capture?.amount?.value,
        currency: capture?.amount?.currency_code
      },
      checks,
      sandbox: true
    });
  } catch {
    return NextResponse.json({
      verified: false,
      status: "REVIEW_REQUIRED",
      error: "PayPal Sandbox could not confirm the payment. No verified payment result is available; retry or review the Sandbox configuration.",
      sandbox: true
    }, { status: 502 });
  }
}
