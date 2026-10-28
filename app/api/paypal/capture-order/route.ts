import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { getPayPalAccessToken, paypalRequest } from "@/lib/paypal";

export const runtime = "nodejs";

const EXPECTED_REFERENCE = "PAYPROOF-DEMO-COFFEE-01";
const EXPECTED_AMOUNT = "24.50";
const EXPECTED_CURRENCY = "USD";

type PayPalCapture = {
  id?: string;
  status?: string;
  amount?: { value?: string; currency_code?: string };
};
type PurchaseUnit = {
  reference_id?: string;
  custom_id?: string;
  amount?: { value?: string; currency_code?: string };
  payments?: { captures?: PayPalCapture[] };
};
type PayPalOrder = {
  id?: string;
  status?: string;
  purchase_units?: PurchaseUnit[];
};

function checkOrder(order: PayPalOrder) {
  const unit = order.purchase_units?.[0];
  const capture = unit?.payments?.captures?.[0];
  const amountMatches = (capture?.amount?.value ?? unit?.amount?.value) === EXPECTED_AMOUNT;
  const currencyMatches = (capture?.amount?.currency_code ?? unit?.amount?.currency_code) === EXPECTED_CURRENCY;
  const referenceMatches =
    unit?.reference_id === EXPECTED_REFERENCE &&
    unit?.custom_id === EXPECTED_REFERENCE;
  const captureCompleted = capture?.status === "COMPLETED";
  const verified =
    order.status === "COMPLETED" &&
    captureCompleted &&
    amountMatches &&
    currencyMatches &&
    referenceMatches;

  return {
    verified,
    capture,
    checks: {
      orderCompleted: order.status === "COMPLETED",
      captureCompleted,
      amountMatches,
      currencyMatches,
      referenceMatches
    }
  };
}

function resultResponse(order: PayPalOrder) {
  const checked = checkOrder(order);
  if (!checked.verified) {
    return NextResponse.json({
      verified: false,
      status: "REVIEW_REQUIRED",
      message: "PayPal did not confirm the expected completed payment. Do not fulfil this demo order.",
      checks: checked.checks
    }, { status: 409 });
  }

  return NextResponse.json({
    verified: true,
    status: "COMPLETED",
    message: "PayPal Sandbox confirms the expected demo payment.",
    transaction: {
      orderId: order.id,
      captureId: checked.capture?.id,
      amount: checked.capture?.amount?.value,
      currency: checked.capture?.amount?.currency_code
    },
    sandbox: true
  });
}

export async function POST(request: NextRequest) {
  try {
    let body: { orderId?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Send a valid JSON request." }, { status: 400 });
    }

    if (typeof body.orderId !== "string" || !/^[A-Z0-9-]{8,40}$/i.test(body.orderId)) {
      return NextResponse.json({ error: "A valid PayPal order ID is required." }, { status: 400 });
    }
    const orderId = body.orderId;
    const accessToken = await getPayPalAccessToken();

    // Inspect the server-side PayPal order before attempting a capture. A browser
    // return URL alone must never authorize capture of an unrelated PayPal order.
    const existing = await paypalRequest<PayPalOrder>(
      `/v2/checkout/orders/${encodeURIComponent(orderId)}`,
      accessToken,
      { method: "GET" }
    );

    const unit = existing.purchase_units?.[0];
    const expectedOrder =
      unit?.reference_id === EXPECTED_REFERENCE &&
      unit?.custom_id === EXPECTED_REFERENCE &&
      unit?.amount?.value === EXPECTED_AMOUNT &&
      unit?.amount?.currency_code === EXPECTED_CURRENCY;

    if (!expectedOrder) {
      return NextResponse.json({
        verified: false,
        status: "REVIEW_REQUIRED",
        error: "This PayPal order does not match the expected PayProof AI demo order. It was not captured."
      }, { status: 409 });
    }

    // A repeated browser return is safe: verify an existing capture instead of
    // attempting to capture the same order again.
    if (existing.status === "COMPLETED") {
      return resultResponse(existing);
    }

    if (existing.status !== "APPROVED") {
      return NextResponse.json({
        verified: false,
        status: "REVIEW_REQUIRED",
        message: "The PayPal order is not approved for capture. No capture was attempted.",
        checks: { orderApproved: false, referenceMatches: true, amountMatches: true, currencyMatches: true }
      }, { status: 409 });
    }

    // Stable request ID makes retries for this PayPal order idempotent.
    const requestId = createHash("sha256").update(`payproof-capture:${orderId}`).digest("hex").slice(0, 32);
    const captured = await paypalRequest<PayPalOrder>(
      `/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`,
      accessToken,
      {
        method: "POST",
        headers: { "PayPal-Request-Id": requestId },
        body: JSON.stringify({})
      }
    );

    return resultResponse(captured);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to verify the PayPal payment.";
    const status = message.includes("credentials are not configured") ? 503 : 502;
    return NextResponse.json({
      verified: false,
      status: "REVIEW_REQUIRED",
      error: message
    }, { status });
  }
}
