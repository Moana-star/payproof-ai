import { NextRequest, NextResponse } from "next/server";
import { reconciliationActor, reconciliationDb, reconciliationUser } from "@/lib/reconciliation-store";

export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  const user = await reconciliationUser(request);
  if (!user) return NextResponse.json({ error: "Sign in to post transactions to your workspace ledger." }, { status: 401 });
  let body: { rowId?: unknown; actor?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "A statement row ID is required." }, { status: 400 }); }
  if (typeof body.rowId !== "string" || !/^[0-9a-f-]{36}$/i.test(body.rowId)) return NextResponse.json({ error: "A valid statement row ID is required." }, { status: 400 });
  const actor = reconciliationActor(user.email || user.id);
  try {
    const result = await reconciliationDb<Array<{ post_reconciliation_entry: { ok: boolean; already_posted: boolean; ledger_entry_id: string } }>>("rpc/post_reconciliation_entry", {
      method: "POST", body: JSON.stringify({ p_row_id: body.rowId, p_owner_id: user.id, p_actor: actor })
    });
    const posting = result?.[0]?.post_reconciliation_entry;
    if (!posting?.ok || !posting.ledger_entry_id) return NextResponse.json({ error: "The ledger posting could not be confirmed." }, { status: 500 });
    return NextResponse.json({ ok: true, ledgerEntryId: posting.ledger_entry_id, alreadyPosted: posting.already_posted,
      message: posting.already_posted ? "This transaction was already posted. The existing persistent ledger entry was returned; no duplicate was created."
        : "Approved transaction posted to your persistent PayProof AI workspace ledger and recorded in the audit trail." });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Persistent ledger posting failed." }, { status: 409 }); }
}
