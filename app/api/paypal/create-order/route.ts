import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createPendingOrder, isOrderStoreConfigured, updateOrderByNumber } from "@/lib/order-store";
import { getPayPalAccessToken, paypalRequest } from "@/lib/paypal";
import { getAuthenticatedUser } from "@/lib/auth-server";

export const runtime = "nodejs";

const CURRENCY = "USD";
const MAX_QUANTITY = 100;
const CATALOG = {
  "Coffee gift set": { id: "coffee-gift-set", unitPriceCents: 2450 },
  "Ceramic mug pair": { id: "ceramic-mug-pair", unitPriceCents: 4200 },
  "Handwoven market tote": { id: "handwoven-market-tote", unitPriceCents: 3800 }
} as const;

type ProductName = keyof typeof CATALOG;
type PayPalLink = { rel?: string; href?: string };
type CreatedOrder = { id?: string; status?: string; links?: PayPalLink[] };

function money(cents: number) {
  return (cents / 100).toFixed(2);
}

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Sign in to create and save orders in your own workspace." }, { status: 401 });
  let body: { product?: unknown; quantity?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Send a valid JSON request with a product and quantity." }, { status: 400 });
  }

  if (typeof body.product !== "string" || !Object.hasOwn(CATALOG, body.product)) {
    return NextResponse.json({
      error: "Choose a product from the supported catalogue: Coffee gift set, Ceramic mug pair, or Handwoven market tote."
    }, { status: 400 });
  }
  if (!Number.isInteger(body.quantity) || Number(body.quantity) < 1 || Number(body.quantity) > MAX_QUANTITY) {
    return NextResponse.json({ error: `Quantity must be a whole number from 1 to ${MAX_QUANTITY}.` }, { status: 400 });
  }

  if (!isOrderStoreConfigured()) return NextResponse.json({ error: "Order storage is not configured. Checkout is disabled until Supabase storage is ready." }, { status: 503 });

  const productName = body.product as ProductName;
  const product = CATALOG[productName];
  const quantity = Number(body.quantity);
  const totalCents = product.unitPriceCents * quantity;
  if (!Number.isSafeInteger(totalCents) || totalCents > 100000000) {
    return NextResponse.json({ error: "This order total exceeds the supported Sandbox limit." }, { status: 400 });
  }

  // The browser supplies only a catalogue name and quantity. Prices are always
  // selected and calculated here, on the server, never trusted from the client.
  const referenceId = `PP-${randomUUID()}`;
  const amount = money(totalCents);
  const orderRecord = {
    order_number: referenceId,
    product_id: product.id,
    product_name: productName,
    quantity,
    unit_amount: money(product.unitPriceCents),
    total_amount: amount,
    currency: CURRENCY as "USD",
    payment_environment: "sandbox" as const,
    payment_status: "awaiting_payment" as const,
    paypal_reference_id: referenceId
  };

  try {
    // Persist the server-priced draft before redirecting to PayPal. If storage
    // is configured but unavailable, fail closed rather than silently losing it.
    const pending = await createPendingOrder(orderRecord, user.id);
    const appBaseUrl = (
      process.env.APP_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : null) ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
      "http://localhost:3000"
    ).replace(/\/$/, "");
    const accessToken = await getPayPalAccessToken();
    const order = await paypalRequest<CreatedOrder>("/v2/checkout/orders", accessToken, {
      method: "POST",
      headers: { "PayPal-Request-Id": randomUUID() },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [{
          reference_id: referenceId,
          custom_id: `PAYPROOF|${product.id}|${quantity}`,
          description: `${quantity} × ${productName}`,
          amount: {
            currency_code: CURRENCY,
            value: amount,
            breakdown: {
              item_total: { currency_code: CURRENCY, value: amount }
            }
          },
          items: [{
            name: productName,
            description: "PayProof AI Sandbox catalogue item",
            unit_amount: { currency_code: CURRENCY, value: money(product.unitPriceCents) },
            quantity: String(quantity),
            category: "PHYSICAL_GOODS"
          }]
        }],
        application_context: {
          brand_name: "PayProof AI Sandbox",
          user_action: "PAY_NOW",
          return_url: `${appBaseUrl}/checkout/return`,
          cancel_url: `${appBaseUrl}/checkout/cancel`
        }
      })
    });

    const approvalUrl = order.links?.find((link) => link.rel === "approve")?.href;
    if (!order.id || !approvalUrl) {
      await updateOrderByNumber(referenceId, { payment_status: "failed" }, user.id);
      return NextResponse.json({ error: "PayPal did not return a usable approval link." }, { status: 502 });
    }

    const linked = await updateOrderByNumber(referenceId, { paypal_order_id: order.id }, user.id);
    return NextResponse.json({
      orderId: order.id,
      approvalUrl,
      product: productName,
      quantity,
      unitPrice: money(product.unitPriceCents),
      amount,
      currency: CURRENCY,
      sandbox: true,
      saved: pending.persisted && linked.persisted
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create a PayPal Sandbox order.";
    const status = message.includes("credentials are not configured") ? 503 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
