import { NextResponse } from "next/server";
import { getPayPalAccessToken, paypalRequest } from "@/lib/paypal";

export const runtime = "nodejs";

const DEMO_ORDER = {
  referenceId: "PAYPROOF-DEMO-COFFEE-01",
  itemName: "PayProof AI demo coffee gift set",
  amount: "24.50",
  currency: "USD"
};

type PayPalLink = { rel?: string; href?: string };
type CreatedOrder = { id?: string; status?: string; links?: PayPalLink[] };

export async function POST() {
  try {
    const accessToken = await getPayPalAccessToken();
    const order = await paypalRequest<CreatedOrder>("/v2/checkout/orders", accessToken, {
      method: "POST",
      headers: { "PayPal-Request-Id": crypto.randomUUID() },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [{
          reference_id: DEMO_ORDER.referenceId,
          custom_id: DEMO_ORDER.referenceId,
          description: DEMO_ORDER.itemName,
          amount: {
            currency_code: DEMO_ORDER.currency,
            value: DEMO_ORDER.amount
          }
        }],
        application_context: {
          brand_name: "PayProof AI Sandbox",
          user_action: "PAY_NOW",
          return_url: `${process.env.APP_URL || "http://localhost:3000"}/checkout/return`,
          cancel_url: `${process.env.APP_URL || "http://localhost:3000"}/checkout/cancel`
        }
      })
    });

    const approvalUrl = order.links?.find((link) => link.rel === "approve")?.href;
    if (!order.id || !approvalUrl) {
      return NextResponse.json({ error: "PayPal did not return a usable approval link." }, { status: 502 });
    }

    return NextResponse.json({
      orderId: order.id,
      approvalUrl,
      amount: DEMO_ORDER.amount,
      currency: DEMO_ORDER.currency,
      itemName: DEMO_ORDER.itemName,
      demo: true
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create a PayPal Sandbox order.";
    const status = message.includes("credentials are not configured") ? 503 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
