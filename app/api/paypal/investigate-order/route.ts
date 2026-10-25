import { NextRequest, NextResponse } from "next/server";
import { getPayPalAccessToken, paypalRequest } from "@/lib/paypal";

export const runtime = "nodejs";

const EXPECTED_REFERENCE = "PAYPROOF-DEMO-COFFEE-01";
const EXPECTED_AMOUNT = "24.50";
const EXPECTED_CURRENCY = "USD";

type PayPalOrder = {
  id?: string;
  status?: string;
  purchase_units?: Array<{
    reference_id?: string;
    custom_id?: string;
    payments?: {
      captures?: Array<{
        id?: string;
        status?: string;
        amount?: { value?: string; currency_code?: string };
      }>;
    };
  }>;
};

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
    const order = await paypalRequest<PayPalOrder>(
      "/v2/checkout/orders/" + encodeURIComponent(requestedOrderId),
      token,
      { method: "GET" }
    );

    const unit = order.purchase_units?.[0];
    const capture = unit?.payments?.captures?.[0];
    const checks = {
      orderIdMatches: order.id === requestedOrderId,
      orderCompleted: order.status === "COMPLETED",
      capturePresent: Boolean(capture?.id),
      captureCompleted: capture?.status === "COMPLETED",
      amountMatches: capture?.amount?.value === EXPECTED_AMOUNT,
      currencyMatches: capture?.amount?.currency_code === EXPECTED_CURRENCY,
      referenceMatches: unit?.reference_id === EXPECTED_REFERENCE && unit?.custom_id === EXPECTED_REFERENCE
    };
    const verified = Object.values(checks).every(Boolean);

    const failedChecks = Object.entries(checks)
      .filter(([, passed]) => !passed)
      .map(([name]) => name);

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
