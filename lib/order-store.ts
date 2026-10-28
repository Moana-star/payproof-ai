const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export type StoredOrder = {
  order_number: string;
  customer_name?: string | null;
  customer_email?: string | null;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_amount: string;
  total_amount: string;
  currency: "USD";
  payment_environment: "sandbox" | "live";
  payment_status: "awaiting_payment" | "paid" | "payment_review" | "failed" | "cancelled";
  paypal_order_id?: string | null;
  paypal_capture_id?: string | null;
  paypal_reference_id?: string | null;
  verified_at?: string | null;
  metadata?: Record<string, unknown>;
};

export function isOrderStoreConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
}

async function supabaseRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("PayProof AI order storage is not configured.");
  }

  const response = await fetch(`${SUPABASE_URL.replace(/\/$/, "")}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      ...(init.headers || {})
    },
    cache: "no-store"
  });

  if (!response.ok) {
    // Keep database details and credentials out of browser-facing responses.
    throw new Error(`Order storage request failed (HTTP ${response.status}).`);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export async function createPendingOrder(order: StoredOrder) {
  if (!isOrderStoreConfigured()) return { persisted: false as const };

  await supabaseRequest<unknown[]>("orders", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      ...order,
      payment_status: "awaiting_payment",
      payment_environment: "sandbox"
    })
  });

  return { persisted: true as const };
}

export async function updateOrderByNumber(orderNumber: string, patch: Partial<StoredOrder>) {
  if (!isOrderStoreConfigured()) return { persisted: false as const };

  await supabaseRequest<unknown[]>(
    `orders?order_number=eq.${encodeURIComponent(orderNumber)}`,
    {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() })
    }
  );

  return { persisted: true as const };
}

export async function saveVerifiedOrder(order: StoredOrder, captureId: string) {
  if (!isOrderStoreConfigured()) return { persisted: false as const };

  const verifiedAt = order.verified_at || new Date().toISOString();
  // Upsert on the stable internal order reference makes repeated browser returns
  // safe; unique PayPal order/capture IDs provide a second duplicate guard.
  await supabaseRequest<unknown[]>(
    "orders?on_conflict=order_number",
    {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({
        ...order,
        paypal_capture_id: captureId,
        payment_status: "paid",
        payment_environment: "sandbox",
        verified_at: verifiedAt,
        updated_at: verifiedAt
      })
    }
  );

  // Capture ID is unique, so repeated verification cannot create duplicate events.
  await supabaseRequest<unknown[]>("payment_events?on_conflict=provider_event_id", {
    method: "POST",
    headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
    body: JSON.stringify({
      provider: "paypal",
      event_type: "sandbox.capture.completed",
      provider_event_id: captureId,
      details: {
        order_number: order.order_number,
        paypal_order_id: order.paypal_order_id,
        capture_id: captureId,
        amount: order.total_amount,
        currency: order.currency
      }
    })
  });

  return { persisted: true as const };
}
