const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export type StoredOrder = {
  order_number: string;
  owner_id?: string | null;
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

  const responseText = await response.text();
  if (!responseText) return undefined as T;
  return JSON.parse(responseText) as T;
}

export async function createPendingOrder(order: StoredOrder, ownerId: string) {
  if (!isOrderStoreConfigured()) return { persisted: false as const };

  await supabaseRequest<unknown[]>("orders", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      ...order,
      owner_id: ownerId,
      payment_status: "awaiting_payment",
      payment_environment: "sandbox"
    })
  });

  return { persisted: true as const };
}

export async function updateOrderByNumber(orderNumber: string, patch: Partial<StoredOrder>, ownerId: string) {
  if (!isOrderStoreConfigured()) return { persisted: false as const };

  await supabaseRequest<unknown[]>(
    `orders?order_number=eq.${encodeURIComponent(orderNumber)}&owner_id=eq.${encodeURIComponent(ownerId)}`,
    {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() })
    }
  );

  return { persisted: true as const };
}

export async function saveVerifiedOrder(order: StoredOrder, captureId: string, ownerId: string) {
  if (!isOrderStoreConfigured()) return { persisted: false as const };

  const verifiedAt = order.verified_at || new Date().toISOString();
  // Upsert on the stable internal order reference makes repeated browser returns
  // safe; unique PayPal order/capture IDs provide a second duplicate guard.
  const savedOrders = await supabaseRequest<Array<{ id: string }>>(
    "orders?on_conflict=order_number&select=id",
    {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify({
        ...order,
        owner_id: ownerId,
        paypal_capture_id: captureId,
        payment_status: "paid",
        payment_environment: "sandbox",
        verified_at: verifiedAt,
        updated_at: verifiedAt
      })
    }
  );

  const savedOrderId = savedOrders[0]?.id;
  if (!savedOrderId) {
    throw new Error("Verified order was not returned by order storage.");
  }

  // Keep a relational link to the order and make capture-event retries idempotent.
  await supabaseRequest<unknown[]>("payment_events?on_conflict=provider_event_id", {
    method: "POST",
    headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
    body: JSON.stringify({
      order_id: savedOrderId,
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


export type PaymentRegisterOrder = Pick<StoredOrder,
  "order_number" | "product_name" | "quantity" | "total_amount" | "currency" |
  "payment_environment" | "payment_status" | "paypal_order_id" |
  "paypal_capture_id" | "paypal_reference_id" | "verified_at"
> & { created_at?: string | null };

export async function listRecentOrders(limit = 100, ownerId?: string): Promise<PaymentRegisterOrder[]> {
  // Server-rendered pages without a verified session must never receive shared account records.
  if (!ownerId) return [];
  if (!isOrderStoreConfigured()) {
    throw new Error("Payment storage is not configured. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the deployment environment.");
  }
  const safeLimit = Math.max(1, Math.min(Math.floor(limit), 200));
  return supabaseRequest<PaymentRegisterOrder[]>(
    `orders?select=order_number,product_name,quantity,total_amount,currency,payment_environment,payment_status,paypal_order_id,paypal_capture_id,paypal_reference_id,verified_at,created_at&owner_id=eq.${encodeURIComponent(ownerId)}&order=created_at.desc&limit=${safeLimit}`,
    { method: "GET" }
  );
}

export async function getOwnedOrderByPayPalId(paypalOrderId: string, ownerId: string): Promise<{ order_number: string; owner_id: string } | null> {
  if (!isOrderStoreConfigured()) return null;
  const rows = await supabaseRequest<Array<{ order_number: string; owner_id: string }>>(
    `orders?select=order_number,owner_id&paypal_order_id=eq.${encodeURIComponent(paypalOrderId)}&owner_id=eq.${encodeURIComponent(ownerId)}&limit=1`,
    { method: "GET" }
  );
  return rows[0] || null;
}
