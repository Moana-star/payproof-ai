const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_PUBLIC_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export type ReconciliationUser = { id: string; email?: string | null };

export async function reconciliationUser(request: Request): Promise<ReconciliationUser | null> {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (!token || !SUPABASE_URL || !SUPABASE_PUBLIC_KEY) return null;

  const response = await fetch(`${SUPABASE_URL.replace(/\/$/, "")}/auth/v1/user`, {
    headers: { apikey: SUPABASE_PUBLIC_KEY, Authorization: `Bearer ${token}` },
    cache: "no-store"
  });
  if (!response.ok) return null;
  const user = await response.json();
  return typeof user.id === "string" ? { id: user.id, email: user.email || null } : null;
}

export function reconciliationActor(value: unknown, fallback = "authenticated reviewer") {
  if (typeof value !== "string") return fallback;
  const actor = value.trim().replace(/[<>\r\n]/g, "").slice(0, 80);
  return actor || fallback;
}

export async function reconciliationDb<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Reconciliation storage is not configured.");
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
  if (!response.ok) throw new Error(`Reconciliation storage request failed (HTTP ${response.status}).`);
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export async function auditReconciliation(input: {
  owner_id: string;
  statement_row_id?: string | null;
  order_id?: string | null;
  action: string;
  actor: string;
  details?: Record<string, unknown>;
}) {
  await reconciliationDb("reconciliation_audit", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      owner_id: input.owner_id,
      statement_row_id: input.statement_row_id || null,
      order_id: input.order_id || null,
      action: input.action,
      actor: input.actor,
      details: input.details || {}
    })
  });
}
