import { NextRequest, NextResponse } from "next/server";
import { auditReconciliation, reconciliationActor, reconciliationDb, reconciliationUser } from "@/lib/reconciliation-store";

export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  const user = await reconciliationUser(request);
  if (!user) return NextResponse.json({ error: "Sign in to review transactions in your workspace." }, { status: 401 });
  let body: { rowId?: unknown; decision?: unknown; actor?: unknown; note?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Send a valid review decision." }, { status: 400 }); }
  if (typeof body.rowId !== "string" || !/^[0-9a-f-]{36}$/i.test(body.rowId)) return NextResponse.json({ error: "A valid statement row ID is required." }, { status: 400 });
  if (body.decision !== "approve" && body.decision !== "reject") return NextResponse.json({ error: "Decision must be approve or reject." }, { status: 400 });
  const actor = reconciliationActor(body.actor, user.email || "authenticated reviewer"); const owner = encodeURIComponent(user.id);
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 500) : "";
  try {
    const rows = await reconciliationDb<Array<{ id: string; match_status: string; matched_order_id: string | null; transaction_id: string }>>(
      `bank_statement_rows?id=eq.${encodeURIComponent(body.rowId)}&owner_id=eq.${owner}&select=id,match_status,matched_order_id,transaction_id`);
    const row = rows[0]; if (!row) return NextResponse.json({ error: "Statement row was not found in this workspace." }, { status: 404 });
    if (body.decision === "approve" && (row.match_status !== "matched_pending_review" || !row.matched_order_id))
      return NextResponse.json({ error: "Only exact verified reference, amount and currency matches can be approved. Exceptions cannot be forced through." }, { status: 409 });
    if (["posted", "approved", "rejected"].includes(row.match_status)) return NextResponse.json({ error: "This row has already been reviewed or posted." }, { status: 409 });
    const now = new Date().toISOString(); const status = body.decision === "approve" ? "approved" : "rejected";
    await reconciliationDb(`bank_statement_rows?id=eq.${encodeURIComponent(row.id)}&owner_id=eq.${owner}&match_status=eq.${row.match_status}`, {
      method: "PATCH", headers: { Prefer: "return=representation" },
      body: JSON.stringify(body.decision === "approve" ? { match_status: status, approved_by: actor, approved_at: now, updated_at: now }
        : { match_status: status, rejected_by: actor, rejected_at: now, match_reason: note ? `Reviewer rejected: ${note}` : "Reviewer rejected this statement row.", updated_at: now })
    });
    await auditReconciliation({ owner_id: user.id, statement_row_id: row.id, order_id: row.matched_order_id, action: body.decision === "approve" ? "match_approved" : "match_rejected", actor, details: { transaction_id: row.transaction_id, note } });
    return NextResponse.json({ ok: true, status, message: body.decision === "approve" ? "Match approved. It is not posted until you explicitly post it." : "Statement row rejected and recorded in the persistent audit trail." });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Review decision failed." }, { status: 500 }); }
}
