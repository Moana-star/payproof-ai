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

  // Scope every write to both the order reference and its authenticated owner.
  // Request the updated row so a zero-row update cannot be mistaken for success.
  const updated = await supabaseRequest<Array<{ id: string }>>(
    `orders?order_number=eq.${encodeURIComponent(orderNumber)}&owner_id=eq.${encodeURIComponent(ownerId)}&select=id`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() })
    }
  );

  if (!updated.length) {
    throw new Error("The order was not found in the signed-in owner's workspace; no changes were saved.");
  }

  return { persisted: true as const };
}

export async function saveVerifiedOrder(order: StoredOrder, captureId: string, ownerId: string) {
  if (!isOrderStoreConfigured()) return { persisted: false as const };

  const verifiedAt = order.verified_at || new Date().toISOString();

  // A verified capture may only update the exact pending order already owned
  // by this account. Do not upsert on order_number: an upsert could reassign
  // owner_id if a conflicting reference were ever presented.
  const savedOrders = await supabaseRequest<Array<{ id: string }>>(
    `orders?order_number=eq.${encodeURIComponent(order.order_number)}&owner_id=eq.${encodeURIComponent(ownerId)}&paypal_order_id=eq.${encodeURIComponent(order.paypal_order_id || "")}&select=id`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        customer_name: order.customer_name ?? null,
        product_id: order.product_id,
        product_name: order.product_name,
        quantity: order.quantity,
        unit_amount: order.unit_amount,
        total_amount: order.total_amount,
        currency: order.currency,
        payment_environment: "sandbox",
        payment_status: "paid",
        paypal_order_id: order.paypal_order_id,
        paypal_capture_id: captureId,
        paypal_reference_id: order.paypal_reference_id,
        verified_at: verifiedAt,
        updated_at: verifiedAt
      })
    }
  );

  const savedOrderId = savedOrders[0]?.id;
  if (!savedOrderId) {
    throw new Error("The verified capture could not update an order owned by the signed-in account.");
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
  "order_number" | "customer_name" | "product_name" | "quantity" | "total_amount" | "currency" |
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
    `orders?select=order_number,customer_name,product_name,quantity,total_amount,currency,payment_environment,payment_status,paypal_order_id,paypal_capture_id,paypal_reference_id,verified_at,created_at&owner_id=eq.${encodeURIComponent(ownerId)}&order=created_at.desc&limit=${safeLimit}`,
    { method: "GET" }
  );
}

export async function getOwnedOrderByPayPalId(paypalOrderId: string, ownerId: string): Promise<{ order_number: string; owner_id: string; customer_name?: string | null } | null> {
  if (!isOrderStoreConfigured()) return null;
  const rows = await supabaseRequest<Array<{ order_number: string; owner_id: string }>>(
    `orders?select=order_number,owner_id,customer_name&paypal_order_id=eq.${encodeURIComponent(paypalOrderId)}&owner_id=eq.${encodeURIComponent(ownerId)}&limit=1`,
    { method: "GET" }
  );
  return rows[0] || null;
}
