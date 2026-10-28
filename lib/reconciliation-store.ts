import { timingSafeEqual } from "node:crypto";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function reconciliationAuthorized(request: Request) {
  const expected = process.env.RECONCILIATION_ADMIN_TOKEN;
  const supplied = request.headers.get("x-reconciliation-token") || "";
  if (!expected || !supplied) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(supplied);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function reconciliationActor(value: unknown) {
  if (typeof value !== "string") return "authorised-reviewer";
  const actor = value.trim().replace(/[<>\r\n]/g, "").slice(0, 80);
  return actor || "authorised-reviewer";
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
      statement_row_id: input.statement_row_id || null,
      order_id: input.order_id || null,
      action: input.action,
      actor: input.actor,
      details: input.details || {}
    })
  });
}
