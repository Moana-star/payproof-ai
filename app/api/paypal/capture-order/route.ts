import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { getOwnedOrderByPayPalId, isOrderStoreConfigured, saveVerifiedOrder } from "@/lib/order-store";
import { getAuthenticatedUser } from "@/lib/auth-server";
import { getPayPalAccessToken, paypalRequest } from "@/lib/paypal";

export const runtime = "nodejs";

const CURRENCY = "USD";
const CATALOG = {
  "coffee-gift-set": { name: "Coffee gift set", unitPriceCents: 2450 },
  "ceramic-mug-pair": { name: "Ceramic mug pair", unitPriceCents: 4200 },
  "handwoven-market-tote": { name: "Handwoven market tote", unitPriceCents: 3800 }
} as const;

type ProductId = keyof typeof CATALOG;
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

function parseOrderDetails(unit: PurchaseUnit | undefined) {
  if (!unit || !unit.reference_id || !/^PP-[0-9a-f-]{36}$/i.test(unit.reference_id)) return null;
  const match = /^PAYPROOF\|([a-z-]+)\|([1-9]\d{0,2})$/.exec(unit.custom_id ?? "");
  if (!match) return null;
  const productId = match[1] as ProductId;
  const product = CATALOG[productId];
  const quantity = Number(match[2]);
  if (!product || !Number.isInteger(quantity) || quantity < 1 || quantity > 100) return null;
  const totalCents = product.unitPriceCents * quantity;
  if (!Number.isSafeInteger(totalCents) || totalCents > 100000000) return null;
  return {
    referenceId: unit.reference_id,
    productId,
    product: product.name,
    quantity,
    unitPrice: (product.unitPriceCents / 100).toFixed(2),
    amount: (totalCents / 100).toFixed(2)
  };
}

function checkOrder(order: PayPalOrder) {
  const unit = order.purchase_units?.[0];
  const details = parseOrderDetails(unit);
  const capture = unit?.payments?.captures?.[0];
  const amountMatches = Boolean(details && unit?.amount?.value === details.amount && capture?.amount?.value === details.amount);
  const currencyMatches = Boolean(unit?.amount?.currency_code === CURRENCY && capture?.amount?.currency_code === CURRENCY);
  const referenceMatches = Boolean(details && unit?.reference_id === details.referenceId);
  const captureCompleted = capture?.status === "COMPLETED";
  const verified = order.status === "COMPLETED" && captureCompleted && amountMatches && currencyMatches && referenceMatches;

  return {
    verified,
    capture,
    details,
    checks: {
      orderCompleted: order.status === "COMPLETED",
      captureCompleted,
      amountMatches,
      currencyMatches,
      referenceMatches
    }
  };
}

async function resultResponse(order: PayPalOrder, ownerId: string) {
  const checked = checkOrder(order);
  if (!checked.verified || !checked.details || !checked.capture?.id || !order.id) {
    return NextResponse.json({
      verified: false,
      status: "REVIEW_REQUIRED",
      message: "PayPal did not confirm the expected completed order, amount, and currency. Do not fulfil this order.",
      checks: checked.checks
    }, { status: 409 });
  }

  const verifiedAt = new Date().toISOString();
  let persisted = false;
  let persistenceWarning: string | undefined;
  if (isOrderStoreConfigured()) {
    try {
      const result = await saveVerifiedOrder({
        order_number: checked.details.referenceId,
        product_id: checked.details.productId,
        product_name: checked.details.product,
        quantity: checked.details.quantity,
        unit_amount: checked.details.unitPrice,
        total_amount: checked.details.amount,
        currency: CURRENCY,
        payment_environment: "sandbox",
        payment_status: "paid",
        paypal_order_id: order.id,
        paypal_capture_id: checked.capture.id,
        paypal_reference_id: checked.details.referenceId,
        verified_at: verifiedAt
      }, checked.capture.id, ownerId);
      persisted = result.persisted;
    } catch {
      // The payment remains verified by PayPal, but do not claim it was saved.
      // A retry of this return route can safely retry persistence.
      persistenceWarning = "Payment is verified by PayPal, but saving the order failed. Do not fulfil until the order is visible in the workspace.";
    }
  } else {
    persistenceWarning = "Payment is verified by PayPal, but database credentials are not configured. The order has not been saved.";
  }

  return NextResponse.json({
    verified: true,
    status: "COMPLETED",
    message: persisted
      ? "PayPal Sandbox confirms the completed capture and the order was saved."
      : "PayPal Sandbox confirms the completed capture and matches it to the server-priced catalogue order.",
    transaction: {
      orderId: order.id,
      referenceId: checked.details.referenceId,
      captureId: checked.capture.id,
      product: checked.details.product,
      quantity: checked.details.quantity,
      amount: checked.capture.amount?.value,
      currency: checked.capture.amount?.currency_code
    },
    sandbox: true,
    persisted,
    verifiedAt,
    evidenceSource: "PayPal Sandbox server API",
    expectedAmount: checked.details.amount,
    ...(persistenceWarning ? { persistenceWarning } : {})
  });
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "Sign in to verify a payment for your workspace." }, { status: 401 });
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
    const ownedOrder = await getOwnedOrderByPayPalId(orderId, user.id);
    if (!ownedOrder) return NextResponse.json({ error: "This PayPal order does not belong to your workspace." }, { status: 404 });
    const accessToken = await getPayPalAccessToken();
    const existing = await paypalRequest<PayPalOrder>(
      `/v2/checkout/orders/${encodeURIComponent(orderId)}`,
      accessToken,
      { method: "GET" }
    );

    const unit = existing.purchase_units?.[0];
    const details = parseOrderDetails(unit);
    const expectedOrder = Boolean(
      details &&
      unit?.amount?.value === details.amount &&
      unit?.amount?.currency_code === CURRENCY
    );
    if (!expectedOrder) {
      return NextResponse.json({
        verified: false,
        status: "REVIEW_REQUIRED",
        error: "This PayPal order does not match a supported PayProof AI catalogue order. It was not captured."
      }, { status: 409 });
    }

    // A repeated browser return is safe: verify an existing capture instead of
    // attempting to capture the same PayPal order again.
    if (existing.status === "COMPLETED") return resultResponse(existing, user.id);

    if (existing.status !== "APPROVED") {
      return NextResponse.json({
        verified: false,
        status: "REVIEW_REQUIRED",
        message: "The PayPal order is not approved for capture. No capture was attempted."
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
    return resultResponse(captured, user.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to verify the PayPal payment.";
    const status = message.includes("credentials are not configured") ? 503 : 502;
    return NextResponse.json({ verified: false, status: "REVIEW_REQUIRED", error: message }, { status });
  }
}
