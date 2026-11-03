import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { auditReconciliation, reconciliationActor, reconciliationDb, reconciliationUser } from "@/lib/reconciliation-store";

export const runtime = "nodejs";
export const maxDuration = 30;

function parseCsvRecords(text: string): string[][] {
  const records: string[][] = [];
  let record: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"' && quoted && text[i + 1] === '"') { field += '"'; i++; }
    else if (ch === '"') quoted = !quoted;
    else if (ch === "," && !quoted) { record.push(field.trim()); field = ""; }
    else if ((ch === "\n" || ch === "\r") && !quoted) {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      record.push(field.trim()); field = "";
      if (record.some((value) => value.length)) records.push(record);
      record = [];
    } else field += ch;
  }
  if (quoted) throw new Error("CSV contains an unclosed quoted field.");
  if (field.length || record.length) { record.push(field.trim()); records.push(record); }
  return records;
}

function parseCsv(text: string) {
  const records = parseCsvRecords(text.replace(/^\uFEFF/, ""));
  if (records.length < 2) throw new Error("Upload a CSV with a header and at least one transaction row.");
  if (records.length > 5001) throw new Error("A single import is limited to 5,000 rows.");
  const normalize = (value: string) => value.toLowerCase().trim().replace(/[\s-]+/g, "_");
  const headers = records.shift()!.map(normalize);
  const find = (...names: string[]) => names.map((name) => headers.indexOf(name)).find((index) => index >= 0) ?? -1;
  const transactionIndex = find("transaction_id", "transactionid", "bank_transaction_id", "entry_id", "transaction_number", "id");
  const amountIndex = find("amount", "credit", "credit_amount", "paid_in", "paid_in_amount", "deposit_amount");
  const currencyIndex = find("currency", "currency_code", "ccy");
  const referenceIndex = find("reference", "transaction_reference", "payment_reference", "merchant_reference", "external_reference");
  const descriptionIndex = find("description", "details", "narration", "memo");
  const dateIndex = find("posted_at", "transaction_date", "date", "booking_date", "value_date");
  const missing = [
    transactionIndex < 0 ? "transaction ID" : "",
    amountIndex < 0 ? "amount/credit" : "",
    currencyIndex < 0 ? "currency" : "",
    referenceIndex < 0 ? "reference" : ""
  ].filter(Boolean);
  if (missing.length) throw new Error(`Could not identify required CSV columns: ${missing.join(", ")}. Include transaction ID, amount/credit, currency and payment reference.`);
  const seen = new Set<string>();
  return records.map((cells, rowIndex) => {
    const get = (index: number) => index >= 0 ? (cells[index] || "") : "";
    const transactionId = get(transactionIndex).trim();
    const amountText = get(amountIndex).replace(/[$,\s]/g, "");
    const amount = Number(amountText);
    const currency = get(currencyIndex).trim().toUpperCase();
    const reference = get(referenceIndex).trim();
    if (!transactionId || transactionId.length > 180) throw new Error(`Row ${rowIndex + 2}: transaction ID is required (maximum 180 characters).`);
    if (seen.has(transactionId)) throw new Error(`Row ${rowIndex + 2}: duplicate transaction ID in this file.`);
    seen.add(transactionId);
    if (!Number.isFinite(amount) || amount <= 0 || !/^\d+(\.\d{1,2})?$/.test(amountText)) throw new Error(`Row ${rowIndex + 2}: amount/credit must be positive with up to two decimals; debits are not imported.`);
    if (!/^[A-Z]{3}$/.test(currency)) throw new Error(`Row ${rowIndex + 2}: currency must be a three-letter code such as USD.`);
    const postedText = get(dateIndex);
    const postedAt = postedText ? new Date(postedText) : null;
    if (postedText && Number.isNaN(postedAt?.getTime())) throw new Error(`Row ${rowIndex + 2}: transaction date is not valid.`);
    return {
      transaction_id: transactionId,
      amount: amount.toFixed(2),
      currency,
      reference: reference.slice(0, 240) || null,
      description: get(descriptionIndex).slice(0, 500) || null,
      posted_at: postedAt?.toISOString() || null
    };
  });
}

export async function POST(request: NextRequest) {
  const user = await reconciliationUser(request);
  if (!user) return NextResponse.json({ error: "Sign in to import a statement into your workspace." }, { status: 401 });
  let body: { csv?: unknown; filename?: unknown; actor?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Send valid JSON containing CSV text." }, { status: 400 }); }
  if (typeof body.csv !== "string" || body.csv.length > 2_000_000) return NextResponse.json({ error: "CSV text is required and must be smaller than 2 MB." }, { status: 400 });
  const actor = reconciliationActor(user.email || user.id);
  const filename = typeof body.filename === "string" ? body.filename.replace(/[^a-zA-Z0-9._ -]/g, "").slice(0, 120) : "statement.csv";
  try {
    const rows = parseCsv(body.csv);
    const syntheticIds = new Set(["DEMO-STMT-001", "DEMO-STMT-002", "DEMO-STMT-003"]);
    const syntheticReferences = new Set(["DEMO-CAPTURE-001", "DEMO-REFERENCE-MISMATCH", "UNKNOWN-DEMO-REFERENCE", "DEMO-REFERENCE-NOT-LIVE"]);
    if (/^payproof-demo-statement(?:\\s*\\d+)?\\.csv$/i.test(filename) || rows.some((row) => syntheticIds.has(row.transaction_id.toUpperCase()) || syntheticReferences.has((row.reference || "").toUpperCase()))) {
      return NextResponse.json({ error: "This is PayProof AI's synthetic judge sample, not a real bank statement. Open Try sample review to use it; import a genuine bank or payment-provider export into your private workspace." }, { status: 400 });
    }
    const statementId = createHash("sha256").update(user.id).update(body.csv).digest("hex").slice(0, 32);
    const inserted = await reconciliationDb<Array<{ id: string; transaction_id: string }>>("bank_statement_rows?on_conflict=owner_id,transaction_id&select=id,transaction_id", {
      method: "POST", headers: { Prefer: "resolution=ignore-duplicates,return=representation" },
      body: JSON.stringify(rows.map((row) => ({ ...row, owner_id: user.id, statement_id: statementId, source_file: filename, match_status: "unmatched" })))
    });
    await auditReconciliation({ owner_id: user.id, action: "statement_imported", actor, details: { statement_id: statementId, filename, rows_seen: rows.length, rows_inserted: inserted.length, duplicate_rows_skipped: rows.length - inserted.length } });
    return NextResponse.json({ ok: true, statementId, rowsSeen: rows.length, rowsImported: inserted.length, duplicatesSkipped: rows.length - inserted.length,
      message: "Statement imported to your persistent workspace. No payments were matched or posted automatically." });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "CSV import failed." }, { status: 400 }); }
}
