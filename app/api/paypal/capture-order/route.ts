import { NextRequest, NextResponse } from "next/server";
import { getPayPalAccessToken, paypalRequest } from "@/lib/paypal";

export const runtime = "nodejs";

const EXPECTED_REFERENCE = "PAYPROOF-DEMO-COFFEE-01";
const EXPECTED_AMOUNT = "24.50";
const EXPECTED_CURRENCY = "USD";

type CaptureResponse = {
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
  let orderId = "";
  try {
    const body = (await request.json()) as { orderId?: unknown };
    if (typeof body.orderId !== "string" || !/^[A-Z0-9-]{8,40}$/i.test(body.orderId)) {
      return NextResponse.json({ error: "A valid PayPal order ID is required." }, { status: 400 });
    }
    orderId = body.orderId;

    const accessToken = await getPayPalAccessToken();
    const result = await paypalRequest<CaptureResponse>(
      `/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`,
      accessToken,
      {
        method: "POST",
        headers: { "PayPal-Request-Id": crypto.randomUUID() },
        body: JSON.stringify({})
      }
    );

    const unit = result.purchase_units?.[0];
    const capture = unit?.payments?.captures?.[0];
    const amountMatches = capture?.amount?.value === EXPECTED_AMOUNT;
    const currencyMatches = capture?.amount?.currency_code === EXPECTED_CURRENCY;
    const referenceMatches =
      unit?.reference_id === EXPECTED_REFERENCE && unit?.custom_id === EXPECTED_REFERENCE;
    const verified =
      result.status === "COMPLETED" &&
      capture?.status === "COMPLETED" &&
      amountMatches &&
      currencyMatches &&
      referenceMatches;

    if (!verified) {
      return NextResponse.json({
        verified: false,
        status: "REVIEW_REQUIRED",
        message: "PayPal did not confirm the expected completed payment. Do not fulfil this demo order.",
        checks: {
          orderCompleted: result.status === "COMPLETED",
          captureCompleted: capture?.status === "COMPLETED",
          amountMatches,
          currencyMatches,
          referenceMatches
        }
      }, { status: 409 });
    }

    return NextResponse.json({
      verified: true,
      status: "COMPLETED",
      message: "PayPal Sandbox confirms the expected demo payment.",
      transaction: {
        orderId: result.id,
        captureId: capture.id,
        amount: capture.amount?.value,
        currency: capture.amount?.currency_code
      },
      sandbox: true
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to verify the PayPal payment.";
    const status = message.includes("credentials are not configured") ? 503 : 502;
    return NextResponse.json({ verified: false, status: "REVIEW_REQUIRED", error: message }, { status });
  }
}
