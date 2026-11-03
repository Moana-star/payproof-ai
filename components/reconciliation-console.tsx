"use client";

import { useMemo, useState } from "react";

type Row = {
  id: string; statement_id: string; transaction_id: string; amount: string; currency: string;
  reference: string | null; description: string | null; posted_at: string | null; source_file: string;
  match_status: "unmatched" | "matched_pending_review" | "exception" | "approved" | "posted" | "rejected";
  matched_order_id: string | null; match_reason: string | null; approved_by: string | null;
  approved_at: string | null; rejected_by: string | null; rejected_at: string | null; ledger_posted_at: string | null;
  created_at: string;
};
type Audit = { id: string; action: string; actor: string; details: Record<string, unknown>; created_at: string; statement_row_id: string | null };
type Ledger = { id: string; transaction_id?: string; amount: string; currency: string; memo: string; posted_by: string; posted_at: string; statement_row_id: string };
type WorkspaceData = { rows: Row[]; audit: Audit[]; ledger: Ledger[] };

const DEMO_READ_ONLY_TOKEN = "PAYPROOF-DEMO-READONLY";

const statusLabels: Record<Row["match_status"], string> = {
  unmatched: "Unmatched", matched_pending_review: "Match · needs approval", exception: "Exception", approved: "Approved · not posted", posted: "Posted to demo ledger", rejected: "Rejected"
};

export function ReconciliationConsole() {
  const [token, setToken] = useState(DEMO_READ_ONLY_TOKEN);
  const [actor, setActor] = useState("Workspace reviewer");
  const [file, setFile] = useState<File | null>(null);
  const [data, setData] = useState<WorkspaceData>({ rows: [], audit: [], ledger: [] });
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("Public sample token is ready. Select Load sample workspace to view synthetic read-only reconciliation cases.");
  const [error, setError] = useState("");
  const readOnlyDemo = token === DEMO_READ_ONLY_TOKEN;

  async function api(path: string, body?: Record<string, unknown>) {
    const response = await fetch(path, {
      method: body ? "POST" : "GET",
      headers: { "Content-Type": "application/json", "x-reconciliation-token": token, ...(body ? {} : {}) },
      ...(body ? { body: JSON.stringify(body) } : {})
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "The reconciliation request failed.");
    return result;
  }

  async function load() {
    if (!token.trim()) { setError("Enter the reviewer token configured for this preview."); return; }
    setBusy("load"); setError("");
    try {
      const result = await api("/api/reconciliation");
      setData({ rows: result.rows || [], audit: result.audit || [], ledger: result.ledger || [] });
      setNotice(result.demo ? "Synthetic sample workspace loaded. Demo actions are enabled locally; no live records are accessed." : `Loaded ${(result.rows || []).length} protected statement rows, ${(result.ledger || []).length} internal ledger entries, and ${(result.audit || []).length} audit events.`);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load reconciliation data."); }
    finally { setBusy(""); }
  }

  async function importCsv() {
    if (!file) { setError("Choose a CSV statement file first."); return; }
    setBusy("import"); setError("");
    try {
      const csv = await file.text();
      if (readOnlyDemo) {
        // Parse quoted CSV fields correctly, including commas and escaped quotes.
        const records: string[][] = [];
        let record: string[] = [], field = "", quoted = false;
        for (let i = 0; i < csv.length; i++) {
          const char = csv[i];
          if (char === '"' && quoted && csv[i + 1] === '"') { field += '"'; i++; }
          else if (char === '"') quoted = !quoted;
          else if (char === "," && !quoted) { record.push(field.trim()); field = ""; }
          else if ((char === "\\n" || char === "\\r") && !quoted) {
            if (char === "\\r" && csv[i + 1] === "\\n") i++;
            record.push(field.trim()); field = "";
            if (record.some((value) => value.length)) records.push(record);
            record = [];
          } else field += char;
        }
        if (field.length || record.length) { record.push(field.trim()); records.push(record); }
        const headers = (records.shift() || []).map((value) => value.trim().replace(/^\\uFEFF/, ""));
        const parsed = records.map((values) => Object.fromEntries(headers.map((header, i) => [header, values[i] || ""])));
        const now = new Date().toISOString();
        const knownIds = new Set(data.rows.map((row) => row.transaction_id.trim().toLowerCase()));
        const seen = new Set<string>();
        const imported: Row[] = parsed.filter((item) => {
          const id = (item.transaction_id || "").trim().toLowerCase();
          if (!id || knownIds.has(id) || seen.has(id)) return false;
          seen.add(id); return true;
        }).map((item, index) => ({
          id: `demo-import-${Date.now()}-${index}`, statement_id: "demo-local-statement",
          transaction_id: item.transaction_id.trim(), amount: item.amount || "0",
          currency: (item.currency || "USD").toUpperCase(), reference: item.reference || null,
          description: item.description || null, posted_at: item.posted_at || null, source_file: file.name,
          match_status: "unmatched", matched_order_id: null,
          match_reason: "Imported into this browser's synthetic demo session. Run safe matching to evaluate the sample fixture.",
          approved_by: null, approved_at: null, rejected_by: null, rejected_at: null, ledger_posted_at: null, created_at: now
        }));
        const skipped = parsed.length - imported.length;
        setData((current) => ({ ...current, rows: [...imported, ...current.rows], audit: [{ id: `demo-audit-${Date.now()}`, action: "demo_csv_imported", actor, details: { filename: file.name, rows: imported.length, duplicates_skipped: skipped, local_only: true }, created_at: now, statement_row_id: null }, ...current.audit] }));
        setNotice(`Imported ${imported.length} new CSV row(s); skipped ${skipped} duplicate or invalid transaction ID(s). No server records or real payment data were changed.`);
        setFile(null);
      } else {
        const result = await api("/api/reconciliation/import", { csv, filename: file.name, actor });
        setFile(null); await load();
        setNotice(`${result.message} Imported ${result.rowsImported} new rows; skipped ${result.duplicatesSkipped} duplicate transaction IDs.`);
      }
    } catch (e) { setError(e instanceof Error ? e.message : "CSV import failed."); }
    finally { setBusy(""); }
  }

  async function match() {
    setBusy("match"); setError("");
    try {
      if (readOnlyDemo) {
        const now = new Date().toISOString();
        let exactMatch = 0, exceptions = 0, unmatched = 0;
        setData((current) => {
          const rows = current.rows.map((row) => {
            if (["posted", "approved", "rejected"].includes(row.match_status)) return row;
            const fixtureMatch = (row.reference || "").trim().toUpperCase() === "DEMO-CAPTURE-001" && Number(row.amount).toFixed(2) === "24.50" && row.currency === "USD";
            if (fixtureMatch) { exactMatch++; return { ...row, match_status: "matched_pending_review" as const, matched_order_id: "demo-verified-capture-001", match_reason: "Synthetic fixture match: reference, amount and currency match a simulated completed PayPal Sandbox capture. This is demonstration evidence, not a real payment." }; }
            if ((row.reference || "").toUpperCase().includes("MISMATCH")) { exceptions++; return { ...row, match_status: "exception" as const, matched_order_id: null, match_reason: "Synthetic exception: this sample is deliberately configured as a mismatch. Resolve the source data; it cannot be approved." }; }
            unmatched++; return { ...row, match_status: "unmatched" as const, matched_order_id: null, match_reason: "No matching synthetic verified capture fixture was found." };
          });
          return { ...current, rows, audit: [{ id: `demo-audit-${Date.now()}`, action: "demo_matching_completed", actor, details: { exactMatch, exceptions, unmatched, local_only: true }, created_at: now, statement_row_id: null }, ...current.audit] };
        });
        setNotice("Demo matching completed against a clearly labelled synthetic PayPal capture fixture. Potential matches still require human approval; nothing was posted.");
      } else {
        const result = await api("/api/reconciliation/match", { actor });
        await load();
        setNotice(`Matching complete: ${result.exactMatch} exact candidate(s), ${result.amountOrReferenceException} exception(s), ${result.unmatched} unmatched. Nothing was auto-posted.`);
      }
    } catch (e) { setError(e instanceof Error ? e.message : "Matching failed."); }
    finally { setBusy(""); }
  }

  async function decide(row: Row, decision: "approve" | "reject") {
    setBusy(row.id); setError("");
    try {
      const note = decision === "reject" ? window.prompt("Why are you rejecting this statement row? (Optional)") || "" : "";
      if (readOnlyDemo) {
        const now = new Date().toISOString();
        setData((current) => ({ ...current,
          rows: current.rows.map((item) => item.id === row.id ? { ...item, match_status: decision === "approve" ? "approved" : "rejected", approved_by: decision === "approve" ? actor : null, approved_at: decision === "approve" ? now : null, rejected_by: decision === "reject" ? actor : null, rejected_at: decision === "reject" ? now : null, match_reason: decision === "approve" ? "Human reviewer approved the synthetic fixture match. Ready for internal demo-ledger posting." : `Rejected by ${actor}. ${note}` } : item),
          audit: [{ id: `demo-audit-${Date.now()}`, action: decision === "approve" ? "demo_match_approved" : "demo_match_rejected", actor, details: { transaction_id: row.transaction_id, note, local_only: true }, created_at: now, statement_row_id: row.id }, ...current.audit]
        }));
        setNotice(decision === "approve" ? "Synthetic match approved. You can now post it to the local demo ledger." : "Synthetic match rejected and recorded in the local demo audit trail.");
      } else {
        const result = await api("/api/reconciliation/review", { rowId: row.id, decision, actor, note });
        await load(); setNotice(result.message);
      }
    } catch (e) { setError(e instanceof Error ? e.message : "Review decision failed."); }
    finally { setBusy(""); }
  }

  async function approveAndPost(row: Row) {
    if (!window.confirm(`Approve this synthetic exact-match fixture, then post ${row.amount} ${row.currency} to the local demo ledger? This action does not change real payment records.`)) return;
    setBusy(row.id); setError("");
    try {
      if (readOnlyDemo) {
        const now = new Date().toISOString();
        const ledger: Ledger = { id: `demo-ledger-${Date.now()}`, transaction_id: row.transaction_id, amount: row.amount, currency: row.currency, memo: `Synthetic PayPal capture fixture for ${row.reference}`, posted_by: actor, posted_at: now, statement_row_id: row.id };
        setData((current) => ({ ...current,
          rows: current.rows.map((item) => item.id === row.id ? { ...item, match_status: "posted", approved_by: actor, approved_at: now, ledger_posted_at: now, match_reason: "Synthetic fixture was approved by a human reviewer and posted to the local demo ledger. No real payment was changed." } : item),
          ledger: [ledger, ...current.ledger],
          audit: [{ id: `demo-audit-post-${Date.now()}`, action: "demo_internal_ledger_posted", actor, details: { transaction_id: row.transaction_id, amount: row.amount, currency: row.currency, local_only: true }, created_at: now, statement_row_id: row.id }, { id: `demo-audit-approve-${Date.now()}`, action: "demo_match_approved", actor, details: { transaction_id: row.transaction_id, local_only: true }, created_at: now, statement_row_id: row.id }, ...current.audit]
        }));
        setNotice("Synthetic match approved and posted to the local demo ledger. Both actions are visible in the audit trail; no external system was changed.");
      } else {
        const approval = await api("/api/reconciliation/review", { rowId: row.id, decision: "approve", actor, note: "Human reviewer approved exact evidence match before internal ledger posting." });
        const posting = await api("/api/reconciliation/post", { rowId: row.id, actor });
        await load(); setNotice(`${approval.message} ${posting.message}`);
      }
    } catch (e) { setError(e instanceof Error ? e.message : "Approval or ledger posting failed."); }
    finally { setBusy(""); }
  }

  async function post(row: Row) {
    if (!window.confirm(`Post ${row.amount} ${row.currency} to the PayProof AI internal demo ledger? No external bank or accounting system is changed.`)) return;
    setBusy(row.id); setError("");
    try {
      if (readOnlyDemo) {
        const now = new Date().toISOString();
        const ledger: Ledger = { id: `demo-ledger-${Date.now()}`, transaction_id: row.transaction_id, amount: row.amount, currency: row.currency, memo: `Synthetic approved fixture for ${row.reference}`, posted_by: actor, posted_at: now, statement_row_id: row.id };
        setData((current) => ({ ...current, rows: current.rows.map((item) => item.id === row.id ? { ...item, match_status: "posted", ledger_posted_at: now, match_reason: "Synthetic approved fixture posted to the local demo ledger." } : item), ledger: [ledger, ...current.ledger], audit: [{ id: `demo-audit-${Date.now()}`, action: "demo_internal_ledger_posted", actor, details: { transaction_id: row.transaction_id, local_only: true }, created_at: now, statement_row_id: row.id }, ...current.audit] }));
        setNotice("Synthetic approved row posted to the local demo ledger and recorded in the audit trail.");
      } else {
        const result = await api("/api/reconciliation/post", { rowId: row.id, actor });
        await load(); setNotice(result.message);
      }
    } catch (e) { setError(e instanceof Error ? e.message : "Ledger posting failed."); }
    finally { setBusy(""); }
  }

  const visible = useMemo(() => data.rows.filter((row) => {
    const q = search.trim().toLowerCase();
    const matches = !q || [row.transaction_id, row.reference || "", row.description || "", row.source_file, row.match_reason || ""].some((value) => value.toLowerCase().includes(q));
    return matches && (filter === "all" || row.match_status === filter);
  }), [data.rows, search, filter]);

  const counts = useMemo(() => ({
    candidates: data.rows.filter((r) => r.match_status === "matched_pending_review").length,
    exceptions: data.rows.filter((r) => r.match_status === "exception" || r.match_status === "unmatched").length,
    approved: data.rows.filter((r) => r.match_status === "approved").length,
    posted: data.rows.filter((r) => r.match_status === "posted").length
  }), [data.rows]);

  return <div className="recon-console">
    <div className="recon-access">
      <div className="recon-access-copy"><strong>Protected reconciliation access</strong><p>The reviewer token is used only in requests from this browser session and is not saved by this page. Live rows are not public.</p></div>
      <label>Reviewer name<input value={actor} onChange={(e) => setActor(e.target.value)} maxLength={80} placeholder="Your name or reviewer role" /></label>
      <label>Preview reviewer token<input type={readOnlyDemo ? "text" : "password"} autoComplete="off" value={token} onChange={(e) => setToken(e.target.value)} placeholder="Enter sample or private reviewer token" /></label>
      <div className="recon-token-actions"><button className="secondary-button" onClick={() => { setToken(DEMO_READ_ONLY_TOKEN); setData({ rows: [], audit: [], ledger: [] }); setError(""); setNotice("Sample token filled in. Load the workspace to try the interactive synthetic demo."); }} disabled={!!busy}>Use sample token</button><button className="secondary-button" onClick={load} disabled={!!busy}>{busy === "load" ? "Loading…" : readOnlyDemo ? "Load sample workspace" : "Load live reconciliation"}</button><button className="primary-button" onClick={async () => { setToken(DEMO_READ_ONLY_TOKEN); setBusy("sample"); setError(""); setNotice("Loading synthetic reviewer case…"); try { const response = await fetch("/api/reconciliation", { headers: { "x-reconciliation-token": DEMO_READ_ONLY_TOKEN } }); const result = await response.json(); if (!response.ok) throw new Error(result.error || "Could not load the sample review."); setData({ rows: result.rows || [], audit: result.audit || [], ledger: result.ledger || [] }); setNotice("Sample review loaded. Run matching to evaluate the synthetic fixture; all demo actions remain local and do not affect live records."); } catch (e) { setError(e instanceof Error ? e.message : "Could not load the sample review."); } finally { setBusy(""); } }} disabled={!!busy}>{busy === "sample" ? "Loading sample…" : "Try sample review"} <span>↗</span></button></div>
      {readOnlyDemo && <p className="recon-readonly-note">Public demo token: <code>{DEMO_READ_ONLY_TOKEN}</code> · Demo actions run only on synthetic data in this browser session. No live payment records or external accounts are changed.</p>}
    </div>
    <div className="recon-console-notice" role="status">{notice}</div>
    {error && <div className="recon-console-error" role="alert">{error}</div>}
    <div className="recon-import">
      <div><h3>1. Import bank statement CSV</h3><p>Upload a CSV export from your bank or payment provider. No bank account connection is implied.</p></div>
      <div className="recon-import-controls"><input type="file" accept=".csv,text/csv" onChange={(e) => setFile(e.target.files?.[0] || null)} aria-label="Choose bank statement CSV" /><button className="primary-button" onClick={importCsv} disabled={!file || !!busy}>{busy === "import" ? "Importing…" : readOnlyDemo ? "Import sample CSV" : "Import statement"}</button></div>
      <details><summary>Required CSV format</summary><code>transaction_id,amount,currency,reference,description,posted_at</code><p>Example: BANK-1001,24.50,USD,PayPal-capture-or-order-ID,Coffee gift set,2026-10-28T10:00:00Z</p><small>Positive incoming amounts only. Transaction IDs are deduplicated. Keep the source file for your records.</small></details>
    </div>
    <section className="recon-judge-kit" aria-labelledby="judge-kit-title">
      <div className="recon-judge-kit-heading"><span className="recon-judge-kit-icon">✦</span><div><p className="eyebrow">FOR HACKATHON REVIEWERS</p><h3 id="judge-kit-title">Judge testing kit</h3><p>Start with the sample statement, then explore how PayProof AI handles payment evidence and exceptions.</p></div></div>
      <a className="primary-button recon-download-sample" href="/payproof-demo-statement.csv" download>Download sample CSV <span>↓</span></a>
      <div className="recon-judge-steps">
        <div><strong>1. Download</strong><p>The CSV contains synthetic examples only. It is not a bank export and includes no customer data.</p></div>
        <div><strong>2. Load evidence</strong><p>Load the public synthetic workspace. The demo supports local CSV import, matching, approval/rejection and ledger posting without changing live records.</p></div>
        <div><strong>3. Import &amp; review</strong><p>Upload the CSV and run matching. Sample references are illustrative; to demonstrate an exact match, replace a row’s reference and amount with those from a real, verified Sandbox capture.</p></div>
      </div>
      <p className="recon-judge-safety">Sandbox only · No real money · No live bank connection · Posting affects only the internal demo ledger.</p><p className="recon-judge-safety">Quick start: load the sample workspace, run safe matching, approve the synthetic exact-match candidate, then post it to the local demo ledger. Demo actions affect only this browser session.</p>
    </section>
    <div className="recon-live-stats">
      <div><span>Potential matches</span><strong>{counts.candidates}</strong><small>Awaiting human approval</small></div>
      <div><span>Exceptions / unmatched</span><strong className="recon-red">{counts.exceptions}</strong><small>Never auto-approved</small></div>
      <div><span>Approved</span><strong className="recon-amber">{counts.approved}</strong><small>Not yet posted</small></div>
      <div><span>Internal ledger entries</span><strong>{counts.posted}</strong><small>Explicitly posted</small></div>
    </div>
    <div className="recon-queue-head">
      <div><h3>2. Match and review queue</h3><p>Only completed, persisted Sandbox PayPal captures with a verification timestamp are eligible evidence. Reference may be the internal PP order reference or PayPal order/capture ID.</p></div>
      <button className="primary-button" onClick={match} disabled={!!busy || !token.trim()}>{busy === "match" ? "Matching…" : "Run safe matching"}</button>
    </div>
    <div className="reconciliation-table-heading">
      <div className="reconciliation-filters"><input aria-label="Search live reconciliation records" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search transaction or reference…" /><select aria-label="Filter live reconciliation status" value={filter} onChange={(e) => setFilter(e.target.value)}><option value="all">All statuses</option><option value="unmatched">Unmatched</option><option value="matched_pending_review">Needs approval</option><option value="exception">Exception</option><option value="approved">Approved</option><option value="posted">Posted</option><option value="rejected">Rejected</option></select></div>
      <span className="recon-result-count">{visible.length} rows</span>
    </div>
    <div className="reconciliation-table-wrap"><table className="reconciliation-table"><thead><tr><th>BANK TRANSACTION</th><th>REFERENCE / DESCRIPTION</th><th>AMOUNT</th><th>STATUS</th><th>REVIEW REASON</th><th>ACTION</th></tr></thead>
      <tbody>{visible.map((row) => <tr key={row.id}>
        <td><span className="recon-ref">{row.transaction_id}</span><small>{row.source_file}</small></td>
        <td><strong>{row.reference || "No reference"}</strong><small>{row.description || "—"}</small></td>
        <td>{row.amount} {row.currency}</td>
        <td><span className={`recon-status ${row.match_status === "posted" ? "recon-status-good" : row.match_status === "matched_pending_review" || row.match_status === "approved" ? "recon-status-warn" : "recon-status-risk"}`}>{statusLabels[row.match_status]}</span></td>
        <td className="recon-reason-cell">{row.match_status === "posted" ? "Exact reference, amount and currency were verified against a server-verified completed PayPal capture. A human reviewer approved this row and it was posted to the PayProof AI internal demo ledger." : row.match_reason || "Run matching to evaluate this record."}</td>
        <td><div className="recon-row-actions">
          {row.match_status === "matched_pending_review" && <><button onClick={() => approveAndPost(row)} disabled={!!busy} className="recon-post-button">{busy === row.id ? "Working…" : "Approve & post"}</button><button onClick={() => decide(row, "approve")} disabled={!!busy} className="recon-approve-button">Approve only</button><button onClick={() => decide(row, "reject")} disabled={!!busy} className="recon-reject-button">Reject</button></>}
          {row.match_status === "approved" && <button onClick={() => post(row)} disabled={!!busy} className="recon-post-button">{busy === row.id ? "Posting…" : "Post to demo ledger"}</button>}
          {row.match_status === "exception" && <span className="recon-manual-only">Resolve at source</span>}
          {row.match_status === "posted" && <span className="recon-posted-label">✓ Audited</span>}
          {row.match_status === "unmatched" && <span className="recon-manual-only">Needs investigation</span>}
          {row.match_status === "rejected" && <span className="recon-manual-only">Rejected by reviewer</span>}
        </div></td>
      </tr>)}{visible.length === 0 && <tr><td colSpan={6} className="recon-empty">No live statement rows loaded. Enter the reviewer token, load the workspace, and import a CSV to begin.</td></tr>}</tbody>
    </table></div>
    <div className="recon-safety-note"><strong>Posting guardrails</strong><span>Exact reference + amount + currency → manual approval → internal ledger. Exceptions cannot be force-approved. Duplicate ledger posts are blocked. This prototype does not write to a real bank or external accounting platform.</span></div>
    <div className="recon-console-bottom">
      <section><h3>3. Internal demo ledger</h3><p>Latest entries created only after explicit approval and posting.</p>{data.ledger.length ? data.ledger.slice(0,8).map((entry) => <div className="recon-ledger-row" key={entry.id}><span>{entry.memo}</span><strong>{entry.amount} {entry.currency}</strong><small>{entry.posted_by} · {new Date(entry.posted_at).toLocaleString()}</small></div>) : <p className="recon-muted">No entries posted yet.</p>}</section>
      <section><h3>4. Auditable activity</h3><p>Import, matching, review, rejection and posting decisions.</p>{data.audit.length ? data.audit.slice(0,10).map((event) => <div className="recon-audit-row" key={event.id}><span>{event.action.replaceAll("_", " ")}</span><small>{event.actor} · {new Date(event.created_at).toLocaleString()}</small></div>) : <p className="recon-muted">No audit events yet.</p>}</section>
    </div>
  </div>;
}
