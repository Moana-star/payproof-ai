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
  const [token, setToken] = useState("");
  const [actor, setActor] = useState("Workspace reviewer");
  const [file, setFile] = useState<File | null>(null);
  const [data, setData] = useState<WorkspaceData>({ rows: [], audit: [], ledger: [] });
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("Enter the preview-only reviewer token to load protected reconciliation data.");
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
      setNotice(result.demo ? "Read-only sample workspace loaded. These are synthetic rows; no live records were accessed and all write actions are disabled." : `Loaded ${(result.rows || []).length} protected statement rows, ${(result.ledger || []).length} internal ledger entries, and ${(result.audit || []).length} audit events.`);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load reconciliation data."); }
    finally { setBusy(""); }
  }

  async function importCsv() {
    if (readOnlyDemo) { setError("The sample token is read-only. Use private reviewer access to import or change records."); return; }
    if (!file) { setError("Choose a CSV statement file first."); return; }
    setBusy("import"); setError("");
    try {
      const csv = await file.text();
      const result = await api("/api/reconciliation/import", { csv, filename: file.name, actor });
      const message = `${result.message} Imported ${result.rowsImported} new rows; skipped ${result.duplicatesSkipped} duplicate transaction IDs.`;
      setFile(null);
      await load();
      setNotice(message);
    } catch (e) { setError(e instanceof Error ? e.message : "CSV import failed."); }
    finally { setBusy(""); }
  }

  async function match() {
    if (readOnlyDemo) { setError("The sample token is read-only. Use private reviewer access to run matching."); return; }
    setBusy("match"); setError("");
    try {
      const result = await api("/api/reconciliation/match", { actor });
      const message = `Matching complete: ${result.exactMatch} exact candidate(s), ${result.amountOrReferenceException} exception(s), ${result.unmatched} unmatched. Nothing was auto-posted.`;
      await load();
      setNotice(message);
    } catch (e) { setError(e instanceof Error ? e.message : "Matching failed."); }
    finally { setBusy(""); }
  }

  async function decide(row: Row, decision: "approve" | "reject") {
    if (readOnlyDemo) { setError("The sample token is read-only. Private reviewer access is required for decisions."); return; }
    setBusy(row.id); setError("");
    try {
      const note = decision === "reject" ? window.prompt("Why are you rejecting this statement row? (Optional)") || "" : "";
      const result = await api("/api/reconciliation/review", { rowId: row.id, decision, actor, note });
      await load();
      setNotice(result.message);
    } catch (e) { setError(e instanceof Error ? e.message : "Review decision failed."); }
    finally { setBusy(""); }
  }

  async function approveAndPost(row: Row) {
    if (readOnlyDemo) { setError("The sample token is read-only. Private reviewer access is required to post ledger entries."); return; }
    if (!window.confirm(`Approve this exact reference, amount and currency match, then post ${row.amount} ${row.currency} to the PayProof AI internal demo ledger? The approval will be audited before posting. No external bank/accounting system is changed.`)) return;
    setBusy(row.id); setError("");
    try {
      const approval = await api("/api/reconciliation/review", { rowId: row.id, decision: "approve", actor, note: "Human reviewer approved exact evidence match before internal ledger posting." });
      const posting = await api("/api/reconciliation/post", { rowId: row.id, actor });
      await load();
      setNotice(`${approval.message} ${posting.message}`);
    } catch (e) { setError(e instanceof Error ? e.message : "Approval or ledger posting failed. Refresh the queue to confirm the recorded state."); }
    finally { setBusy(""); }
  }

  async function post(row: Row) {
    if (readOnlyDemo) { setError("The sample token is read-only. Private reviewer access is required to post ledger entries."); return; }
    if (!window.confirm(`Post ${row.amount} ${row.currency} to the PayProof AI internal demo ledger? This does not post to a bank or external accounting system.`)) return;
    setBusy(row.id); setError("");
    try {
      const result = await api("/api/reconciliation/post", { rowId: row.id, actor });
      await load();
      setNotice(result.message);
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
      <label>Preview reviewer token<input type="password" autoComplete="off" value={token} onChange={(e) => setToken(e.target.value)} placeholder="Enter sample or private reviewer token" /></label>
      <div className="recon-token-actions"><button className="secondary-button" onClick={() => { setToken(DEMO_READ_ONLY_TOKEN); setData({ rows: [], audit: [], ledger: [] }); setError(""); setNotice("Sample token filled in. Select Load workspace to view synthetic read-only data."); }} disabled={!!busy}>Use sample token</button><button className="secondary-button" onClick={load} disabled={!!busy}>{busy === "load" ? "Loading…" : readOnlyDemo ? "Load sample workspace" : "Load live reconciliation"}</button><button className="primary-button" onClick={async () => { setToken(DEMO_READ_ONLY_TOKEN); setBusy("sample"); setError(""); setNotice("Loading synthetic reviewer case…"); try { const response = await fetch("/api/reconciliation", { headers: { "x-reconciliation-token": DEMO_READ_ONLY_TOKEN } }); const result = await response.json(); if (!response.ok) throw new Error(result.error || "Could not load the sample review."); setData({ rows: result.rows || [], audit: result.audit || [], ledger: result.ledger || [] }); setNotice("Sample review loaded. Inspect the synthetic mismatch and unmatched rows below; no live records were accessed and no changes can be made."); } catch (e) { setError(e instanceof Error ? e.message : "Could not load the sample review."); } finally { setBusy(""); } }} disabled={!!busy}>{busy === "sample" ? "Loading sample…" : "Try sample review"} <span>↗</span></button></div>
      {readOnlyDemo && <p className="recon-readonly-note">Public sample token · Read-only synthetic data · Cannot import, approve, match or post.</p>}
    </div>
    <div className="recon-console-notice" role="status">{notice}</div>
    {error && <div className="recon-console-error" role="alert">{error}</div>}
    <div className="recon-import">
      <div><h3>1. Import bank statement CSV</h3><p>Upload a CSV export from your bank or payment provider. No bank account connection is implied.</p></div>
      <div className="recon-import-controls"><input type="file" accept=".csv,text/csv" onChange={(e) => setFile(e.target.files?.[0] || null)} aria-label="Choose bank statement CSV" /><button className="primary-button" onClick={importCsv} disabled={!file || !!busy || readOnlyDemo}>{busy === "import" ? "Importing…" : "Import statement"}</button></div>
      <details><summary>Required CSV format</summary><code>transaction_id,amount,currency,reference,description,posted_at</code><p>Example: BANK-1001,24.50,USD,PayPal-capture-or-order-ID,Coffee gift set,2026-10-28T10:00:00Z</p><small>Positive incoming amounts only. Transaction IDs are deduplicated. Keep the source file for your records.</small></details>
    </div>
    <section className="recon-judge-kit" aria-labelledby="judge-kit-title">
      <div className="recon-judge-kit-heading"><span className="recon-judge-kit-icon">✦</span><div><p className="eyebrow">FOR HACKATHON REVIEWERS</p><h3 id="judge-kit-title">Judge testing kit</h3><p>Start with the sample statement, then explore how PayProof AI handles payment evidence and exceptions.</p></div></div>
      <a className="primary-button recon-download-sample" href="/payproof-demo-statement.csv" download>Download sample CSV <span>↓</span></a>
      <div className="recon-judge-steps">
        <div><strong>1. Download</strong><p>The CSV contains synthetic examples only. It is not a bank export and includes no customer data.</p></div>
        <div><strong>2. Load evidence</strong><p>Use the private preview reviewer token supplied by the project owner to access protected reconciliation records. The website intentionally does not publish the token.</p></div>
        <div><strong>3. Import &amp; review</strong><p>Upload the CSV and run matching. Sample references are illustrative; to demonstrate an exact match, replace a row’s reference and amount with those from a real, verified Sandbox capture.</p></div>
      </div>
      <p className="recon-judge-safety">Sandbox only · No real money · No live bank connection · Posting affects only the internal demo ledger.</p><p className="recon-judge-safety">Quick start: choose <strong>Try sample review</strong> above to load illustrative mismatch and unmatched cases in one step. The public sample is read-only; private reviewer access is required for import, decisions, and ledger posting.</p>
    </section>
    <div className="recon-live-stats">
      <div><span>Potential matches</span><strong>{counts.candidates}</strong><small>Awaiting human approval</small></div>
      <div><span>Exceptions / unmatched</span><strong className="recon-red">{counts.exceptions}</strong><small>Never auto-approved</small></div>
      <div><span>Approved</span><strong className="recon-amber">{counts.approved}</strong><small>Not yet posted</small></div>
      <div><span>Internal ledger entries</span><strong>{counts.posted}</strong><small>Explicitly posted</small></div>
    </div>
    <div className="recon-queue-head">
      <div><h3>2. Match and review queue</h3><p>Only completed, persisted Sandbox PayPal captures with a verification timestamp are eligible evidence. Reference may be the internal PP order reference or PayPal order/capture ID.</p></div>
      <button className="primary-button" onClick={match} disabled={!!busy || !token.trim() || readOnlyDemo}>{busy === "match" ? "Matching…" : "Run safe matching"}</button>
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
          {row.match_status === "matched_pending_review" && <><button onClick={() => approveAndPost(row)} disabled={!!busy || readOnlyDemo} className="recon-post-button">{busy === row.id ? "Working…" : "Approve & post"}</button><button onClick={() => decide(row, "approve")} disabled={!!busy || readOnlyDemo} className="recon-approve-button">Approve only</button><button onClick={() => decide(row, "reject")} disabled={!!busy || readOnlyDemo} className="recon-reject-button">Reject</button></>}
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
