import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { auditReconciliation, reconciliationActor, reconciliationAuthorized, reconciliationDb } from "@/lib/reconciliation-store";

export const runtime = "nodejs";
export const maxDuration = 30;

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let value = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"' && quoted && line[i + 1] === '"') { value += '"'; i++; }
    else if (ch === '"') quoted = !quoted;
    else if (ch === "," && !quoted) { fields.push(value.trim()); value = ""; }
    else value += ch;
  }
  if (quoted) throw new Error("CSV contains an unclosed quoted field.");
  fields.push(value.trim());
  return fields;
}

function parseCsv(text: string) {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) throw new Error("Upload a CSV with a header and at least one transaction row.");
  if (lines.length > 5001) throw new Error("A single import is limited to 5,000 rows.");
  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/[\s-]+/g, "_"));
  const required = ["transaction_id", "amount", "currency", "reference"];
  const missing = required.filter((h) => !headers.includes(h));
  if (missing.length) throw new Error(`Missing required CSV columns: ${missing.join(", ")}.`);
  const index = (key: string) => headers.indexOf(key);
  const seen = new Set<string>();
  return lines.slice(1).map((line, rowIndex) => {
    const cells = parseCsvLine(line);
    const get = (key: string) => index(key) >= 0 ? (cells[index(key)] || "") : "";
    const transactionId = get("transaction_id").trim();
    const amountText = get("amount").replace(/[$,\s]/g, "");
    const amount = Number(amountText);
    const currency = get("currency").trim().toUpperCase();
    const reference = get("reference").trim();
    if (!transactionId || transactionId.length > 180) throw new Error(`Row ${rowIndex + 2}: transaction_id is required (maximum 180 characters).`);
    if (seen.has(transactionId)) throw new Error(`Row ${rowIndex + 2}: duplicate transaction_id in this file.`);
    seen.add(transactionId);
    if (!Number.isFinite(amount) || amount <= 0 || !/^\d+(\.\d{1,2})?$/.test(amountText)) throw new Error(`Row ${rowIndex + 2}: amount must be a positive value with up to two decimals. Debits/negative rows are not imported.`);
    if (!/^[A-Z]{3}$/.test(currency)) throw new Error(`Row ${rowIndex + 2}: currency must be a three-letter code such as USD.`);
    const postedText = get("posted_at");
    const postedAt = postedText ? new Date(postedText) : null;
    if (postedText && Number.isNaN(postedAt?.getTime())) throw new Error(`Row ${rowIndex + 2}: posted_at is not a valid date.`);
    return {
      transaction_id: transactionId,
      amount: amount.toFixed(2),
      currency,
      reference: reference.slice(0, 240) || null,
      description: get("description").slice(0, 500) || null,
      posted_at: postedAt?.toISOString() || null
    };
  });
}

export async function POST(request: NextRequest) {
  if (!reconciliationAuthorized(request)) return NextResponse.json({ error: "Authorised reconciliation access is required. Configure RECONCILIATION_ADMIN_TOKEN and enter it in the workspace." }, { status: 401 });
  let body: { csv?: unknown; filename?: unknown; actor?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Send a valid JSON body containing the CSV text." }, { status: 400 }); }
  if (typeof body.csv !== "string" || body.csv.length > 2_000_000) return NextResponse.json({ error: "CSV text is required and must be smaller than 2 MB." }, { status: 400 });
  const actor = reconciliationActor(body.actor);
  const filename = typeof body.filename === "string" ? body.filename.replace(/[^a-zA-Z0-9._ -]/g, "").slice(0, 120) : "statement.csv";
  try {
    const rows = parseCsv(body.csv);
    const statementId = createHash("sha256").update(body.csv).digest("hex").slice(0, 32);
    const inserted = await reconciliationDb<Array<{ id: string; transaction_id: string }>>("bank_statement_rows?on_conflict=transaction_id&select=id,transaction_id", {
      method: "POST",
      headers: { Prefer: "resolution=ignore-duplicates,return=representation" },
      body: JSON.stringify(rows.map((row) => ({ ...row, statement_id: statementId, source_file: filename, match_status: "unmatched" })))
    });
    await auditReconciliation({ action: "statement_imported", actor, details: { statement_id: statementId, filename, rows_seen: rows.length, rows_inserted: inserted.length, duplicate_rows_skipped: rows.length - inserted.length } });
    return NextResponse.json({ ok: true, statementId, rowsSeen: rows.length, rowsImported: inserted.length, duplicatesSkipped: rows.length - inserted.length, message: "CSV imported. No payments were matched or posted automatically." });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "CSV import failed." }, { status: 400 });
  }
}
