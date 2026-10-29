"use client";

import { useEffect, useMemo, useState } from "react";
import { ReconciliationConsole } from "@/components/reconciliation-console";

type OrderStatus = "Paid" | "Awaiting payment" | "Review needed";
type Order = {
  id: string;
  customer: string;
  item: string;
  amount: string;
  status: OrderStatus;
  time: string;
  initials: string;
};

const initialOrders: Order[] = [
  { id: "PP-1048", customer: "Amina W.", item: "Handwoven market tote", amount: "$38.00", status: "Paid", time: "Illustrative only · Not live-verified", initials: "AW" },
  { id: "PP-1047", customer: "Daniel K.", item: "Coffee gift set", amount: "$24.50", status: "Awaiting payment", time: "Sample record · Not saved", initials: "DK" },
  { id: "PP-1046", customer: "Maya R.", item: "Ceramic mug pair", amount: "$42.00", status: "Review needed", time: "Sample record · Not saved", initials: "MR" }
];

const CATALOG_PRICES: Record<string, number> = {
  "Coffee gift set": 24.5,
  "Ceramic mug pair": 42,
  "Handwoven market tote": 38
};

const statusClass: Record<OrderStatus, string> = {
  Paid: "pending",
  "Awaiting payment": "pending",
  "Review needed": "review"
};

export default function Home() {
  const [greeting, setGreeting] = useState("Hello");
  useEffect(() => {
    const updateGreeting = () => {
      const hour = new Date().getHours();
      setGreeting(hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening");
    };
    updateGreeting();
    const interval = window.setInterval(updateGreeting, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const [orders, setOrders] = useState(initialOrders);
  const [message, setMessage] = useState("");
  const [draft, setDraft] = useState<{ item: string; quantity: string; note: string } | null>(null);
  const [notice, setNotice] = useState("Demo workspace · Sample records only. Saved Sandbox evidence is under Payment evidence.");
  const [showGuide, setShowGuide] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [draftLoading, setDraftLoading] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<{ valid: boolean; message: string } | null>(null);
  const paidTotal = useMemo(
    () => orders.filter((order) => order.status === "Paid").length,
    [orders]
  );

  async function startSandboxCheckout(product = "Coffee gift set", quantity = 1) {
    if (checkoutLoading) return;
    setCheckoutLoading(true);
    setNotice("Creating a PayPal Sandbox checkout using the server-priced catalogue. No real money will be processed.");
    try {
      const response = await fetch("/api/paypal/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product, quantity })
      });
      const data = (await response.json()) as { approvalUrl?: string; error?: string };
      if (!response.ok || !data.approvalUrl) {
        throw new Error(data.error || "Could not create a PayPal Sandbox checkout.");
      }
      window.location.assign(data.approvalUrl);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "PayPal Sandbox checkout could not be started.");
      setCheckoutLoading(false);
    }
  }

  async function prepareDraft() {
    if (draftLoading) return;
    if (!message.trim()) {
      setNotice("Add an order message first so the AI can prepare a draft.");
      return;
    }
    setDraftLoading(true);
    setDraft(null);
    setDraftError(null);
    setValidationResult(null);
    setNotice("Analysing the message securely. Suggestions remain unconfirmed until you review them.");
    try {
      const response = await fetch("/api/orders/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message })
      });
      const data = await response.json() as {
        draft?: { product: string | null; quantity: number | null; missingInformation: string[]; confidenceNotes: string };
        error?: string;
      };
      if (!response.ok || !data.draft) throw new Error(data.error || "The AI could not prepare a valid draft.");
      const extracted = data.draft;
      const item = extracted.product || "Unmatched item — needs review";
      const quantity = extracted.quantity ? String(extracted.quantity) : "Not specified";
      setDraft({
        item,
        quantity,
        note: [extracted.missingInformation.length ? `Needs confirmation: ${extracted.missingInformation.join(" ")}` : "", extracted.confidenceNotes ? `Confidence notes: ${extracted.confidenceNotes}` : ""].filter(Boolean).join(" · ")
      });
      setNotice("AI draft prepared. Review the product and quantity; nothing has been saved and payment is not verified.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "AI order intake is temporarily unavailable.";
      setDraftError(message);
      setNotice(message);
    } finally {
      setDraftLoading(false);
    }
  }

  function updateDraftField(field: "item" | "quantity", value: string) {
    setDraft((current) => current ? { ...current, [field]: value } : current);
    setValidationResult(null);
  }

  function validateDraftDetails() {
    if (!draft) return;
    const issues: string[] = [];
    const product = draft.item.trim();
    const quantity = draft.quantity.trim();
    if (!Object.prototype.hasOwnProperty.call(CATALOG_PRICES, product)) {
      issues.push("Choose one supported catalogue product exactly: Coffee gift set, Ceramic mug pair, or Handwoven market tote.");
    }
    if (!/^[1-9]\d*$/.test(quantity) || !Number.isSafeInteger(Number(quantity)) || Number(quantity) > 100) {
      issues.push("Enter a whole-number quantity from 1 to 100.");
    }
    if (issues.length) {
      setValidationResult({ valid: false, message: issues.join(" ") });
      setNotice("Draft needs your attention. Correct the highlighted details, then validate again.");
      return;
    }
    setValidationResult({ valid: true, message: "The product is in the supported catalogue and the quantity is valid. Confirm both against the original customer message. The server will calculate the price; this draft is not saved and payment is not verified." });
    setNotice("Draft details checked. Nothing has been saved and payment is not verified.");
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" aria-label="PayProof AI home">
          <span className="brand-mark">P<span>✓</span></span>
          <span className="brand-name">payproof<span>ai</span></span>
        </a>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="side-nav" aria-label="Main navigation">
          <a className="nav-item active" href="#overview"><span className="nav-icon">▦</span> Overview</a>
          <a className="nav-item" href="#orders"><span className="nav-icon">▤</span> Orders <span className="nav-count">{orders.length}</span></a>
          <a className="nav-item" href="#intake"><span className="nav-icon">✳</span> AI order intake</a>
          <a className="nav-item" href="#activity"><span className="nav-icon">↗</span> Payment activity</a>
          <a className="nav-item" href="#reconciliation"><span className="nav-icon">⇄</span> Reconciliation</a>
          <a className="nav-item" href="/payments"><span className="nav-icon">✓</span> Payment evidence</a>
          <a className="nav-item" href="/assistant"><span className="nav-icon">✳</span> AI assistant</a>
          <a className="nav-item" href="/exceptions"><span className="nav-icon">!</span> Exception review</a>
          <a className="nav-item" href="/audit"><span className="nav-icon">⌁</span> Audit trail</a>
        </nav>
        <div className="sidebar-bottom">
          <div className="trust-card">
            <span className="trust-icon">✓</span>
            <strong>Evidence first</strong>
            <p>AI helps explain. Verified payment data decides.</p>
          </div>
          <div className="profile-row">
            <div className="avatar profile-avatar">M</div>
            <div><strong>Moana&apos;s workspace</strong><span>Sandbox preview</span></div>
            <span className="profile-dots">···</span>
          </div>
        </div>
      </aside>

      <section className="main-area">
        <header className="topbar">
          <div className="breadcrumb">Workspace <span>/</span> Overview</div>
          <div className="topbar-actions"><span className="sandbox-pill"><i /> Sandbox mode</span><Link className="demo-payment-guide-link" href="/demo-guide">Try demo payment guide <span>↗</span></Link><button className="sandbox-checkout-button" onClick={() => startSandboxCheckout()} disabled={checkoutLoading}>{checkoutLoading ? "Connecting…" : "Test PayPal checkout"} <span>↗</span></button><button className="help-button" onClick={() => setShowGuide(!showGuide)} aria-expanded={showGuide}>How it works <span>↗</span></button></div>
        </header>

        <div className="content" id="overview">
          <div className="welcome-row">
            <div><p className="eyebrow">YOUR PAYMENT WORKSPACE</p><h1>{greeting}, Moana <span>✳</span></h1><p className="subheading">A clearer view of orders, payments, and what needs your attention.</p></div>
            <button className="primary-button" onClick={() => document.getElementById("intake")?.scrollIntoView({ behavior: "smooth" })}><span>＋</span> New order</button>
          </div>

          {showGuide && <div className="guide-panel"><strong>How PayProof AI works</strong><p>Order messages become reviewable drafts. For a new checkout, PayProof AI verifies the PayPal Sandbox response server-side and attempts to save the verified order to Supabase. The dashboard rows shown here remain illustrative demo data.</p></div>}

          <div className="notice" role="status"><span className="notice-icon">i</span><span>{notice}</span><button onClick={() => setNotice("Demo workspace · Sample records only. Saved Sandbox evidence is under Payment evidence.")} aria-label="Reset notice">×</button></div>

          <section className="value-strip" aria-label="PayProof AI product principles">
            <article className="value-card">
              <span className="value-kicker">01 · THE PROBLEM</span>
              <h2>Orders arrive in conversations.</h2>
              <p>Customer messages, checkout links, and payment updates can become scattered across tools.</p>
            </article>
            <article className="value-card">
              <span className="value-kicker">02 · THE PROMISE</span>
              <h2>One clearer review workflow.</h2>
              <p>Organise order details, surface missing information, and keep exceptions visible before fulfilment.</p>
            </article>
            <article className="value-card value-card-proof">
              <span className="value-kicker">03 · THE PROOF</span>
              <h2>Evidence over assumptions.</h2>
              <p>A Sandbox capture is checked server-side against PayPal. Sample dashboard records are not live payment evidence.</p>
            </article>
          </section>

          <div className="workflow-heading">
            <div><p className="eyebrow">BUILT AROUND TRUST</p><h2>From customer message to payment evidence</h2></div>
            <span className="workflow-label"><i /> Sandbox prototype</span>
          </div>
          <section className="workflow-grid" aria-label="PayProof AI workflow">
            <article className="workflow-step"><span className="workflow-number">1</span><div><h3>Capture</h3><p>Start with the customer’s original message and identify the details that matter.</p></div></article>
            <article className="workflow-step"><span className="workflow-number">2</span><div><h3>Review</h3><p>Check suggested product and quantity. Missing or ambiguous details stay flagged.</p></div></article>
            <article className="workflow-step"><span className="workflow-number">3</span><div><h3>Verify</h3><p>Use PayPal’s server response to verify the catalogue item, quantity, amount and Sandbox capture.</p></div></article>
          </section>

          <div className="metrics-grid">
            <article className="metric-card"><div className="metric-top"><span>Total orders</span><span className="metric-icon violet">▤</span></div><div className="metric-value">{orders.length.toString().padStart(2, "0")}</div><div className="metric-foot"><span className="metric-neutral">Sample workspace</span><span>All orders</span></div></article>
            <article className="metric-card"><div className="metric-top"><span>Sample paid</span><span className="metric-icon green">✓</span></div><div className="metric-value">{paidTotal.toString().padStart(2, "0")}</div><div className="metric-foot"><span className="metric-green">Illustrative only</span><span>Not a live payment count</span></div></article>
            <article className="metric-card"><div className="metric-top"><span>Awaiting payment</span><span className="metric-icon amber">◷</span></div><div className="metric-value">{orders.filter(o => o.status === "Awaiting payment").length.toString().padStart(2, "0")}</div><div className="metric-foot"><span className="metric-neutral">No action yet</span><span>Checkout pending</span></div></article>
            <article className="metric-card"><div className="metric-top"><span>Needs attention</span><span className="metric-icon red">!</span></div><div className="metric-value">{orders.filter(o => o.status === "Review needed").length.toString().padStart(2, "0")}</div><div className="metric-foot"><span className="metric-red">Review required</span><span>Before fulfilment</span></div></article>
          </div>

          <section className="reconciliation-panel" id="reconciliation" aria-labelledby="reconciliation-title">
            <div className="reconciliation-header">
              <div>
                <p className="eyebrow">RECONCILIATION WORKSPACE</p>
                <h2 id="reconciliation-title">Payment matching &amp; reconciliation</h2>
                <p>Import a statement, match against verified PayPal captures, review exceptions, and approve ledger entries with an audit trail.</p>
              </div>
              <div className="reconciliation-actions">
                <span className="reconciliation-demo-tag"><i /> Protected preview · Manual import</span>
                <a className="secondary-button" href="/exceptions">Exception review ↗</a>
              </div>
            </div>
            <div className="reconciliation-flow" aria-label="Reconciliation workflow steps">
              <div className="reconciliation-flow-step complete"><span>1</span><div><strong>Import statement</strong><small>CSV with deduplication</small></div></div>
              <div className="reconciliation-flow-line" />
              <div className="reconciliation-flow-step complete"><span>2</span><div><strong>Match evidence</strong><small>Verified PayPal captures</small></div></div>
              <div className="reconciliation-flow-line" />
              <div className="reconciliation-flow-step review-step"><span>3</span><div><strong>Human approval</strong><small>Exceptions stay blocked</small></div></div>
              <div className="reconciliation-flow-line" />
              <div className="reconciliation-flow-step"><span>4</span><div><strong>Post &amp; audit</strong><small>Internal demo ledger</small></div></div>
            </div>
            <ReconciliationConsole />
          </section>

          <div className="section-heading" id="orders"><div><h2>Recent orders</h2><p>Track each order without guessing about payment status.</p></div><button className="text-button" onClick={() => setNotice("Showing all sample orders in this prototype.")}>View all orders <span>→</span></button></div>

          <section className="orders-card">
            <div className="table-toolbar"><div className="table-title">All orders <span className="table-count">{orders.length}</span></div><div className="table-filters"><span className="filter-label">Status</span><button className="filter-button" onClick={() => setOrders(orders.slice().reverse())}>Recent activity ↕</button></div></div>
            <div className="order-table-wrap"><table className="order-table"><thead><tr><th>ORDER</th><th>CUSTOMER / ITEM</th><th>AMOUNT</th><th>PAYMENT STATUS</th><th>LAST ACTIVITY</th></tr></thead><tbody>{orders.map((order) => <tr key={order.id}><td><span className="order-id">{order.id}</span></td><td><div className="customer-cell"><div className="avatar">{order.initials}</div><div><strong>{order.customer}</strong><span>{order.item}</span></div></div></td><td className="amount">{order.amount}</td><td><span className={`status-badge ${statusClass[order.status]}`}><i />{order.status === "Paid" ? "Sample · paid (unverified)" : order.status}</span></td><td className="activity-text">{order.time}</td></tr>)}</tbody></table></div>
            <div className="table-footer"><span>Illustrative records for interface preview</span><span>1–{orders.length} of {orders.length}</span></div>
          </section>

          <div className="lower-grid">
            <section className="intake-card" id="intake">
              <div className="panel-heading"><div><span className="panel-icon">✳</span><div><h2>AI order intake</h2><p>Extract order details for human review.</p></div></div><span className="beta-badge">AI-ASSISTED · REVIEW REQUIRED</span></div>
              <div className="intake-sample-row">
                <label className="field-label" htmlFor="customer-message">CUSTOMER MESSAGE</label>
                <button type="button" className="sample-message-button" onClick={() => { setMessage("Hi, I'd like 2 Coffee gift sets, please. Can you prepare the order for me?"); setDraft(null); setDraftError(null); setValidationResult(null); setNotice("Sample customer message loaded. Select Prepare order draft to test AI extraction."); }}>Load sample message</button>
              </div>
              <textarea id="customer-message" value={message} onChange={(event) => { setMessage(event.target.value); if (draftError) setDraftError(null); }} placeholder={'Try the sample message, or paste a customer message here. Example: Hi, I would like 2 coffee gift sets, please.'} rows={4} />
              <div className="field-hint">Try the sample message above, then choose Prepare order draft. AI suggestions are advisory only. Confirm every field; nothing is saved automatically and payment status is never inferred.</div>
              <button type="button" className="secondary-button full-button" onClick={prepareDraft} disabled={draftLoading} aria-busy={draftLoading}>{draftLoading ? "Preparing draft…" : "Prepare order draft"} <span>{draftLoading ? "…" : "→"}</span></button>
              {draftError && <p className="draft-error" role="alert">{draftError}</p>}
              <p className="draft-action-hint" aria-live="polite">{draftLoading ? "Please wait while the message is analysed." : draftError ? "No order was created. You can retry after the AI service issue is resolved." : draft ? "Draft prepared. Review every field before taking any action." : "Enter a customer message above, then select Prepare order draft."}</p>
              {draft && <div className="draft-result"><div className="draft-title">Draft for review <span>NOT SAVED</span></div><p className="draft-review-hint">Edit the suggested fields, then compare them with the original customer message above.</p><label className="draft-field-label" htmlFor="draft-product">PRODUCT NAME</label><input id="draft-product" className="draft-edit-input" type="text" value={draft.item} maxLength={120} autoComplete="off" onChange={(event) => updateDraftField("item", event.target.value)} aria-describedby="draft-review-help" /><label className="draft-field-label" htmlFor="draft-quantity">QUANTITY</label><input id="draft-quantity" className="draft-edit-input" type="number" min="1" max="100000" step="1" inputMode="numeric" value={draft.quantity === "Not specified" ? "" : draft.quantity} placeholder="Enter quantity" onChange={(event) => updateDraftField("quantity", event.target.value)} aria-describedby="draft-review-help" /><p id="draft-review-help" className="draft-review-hint">Validation checks formatting only; it cannot confirm product availability, price, customer intent, or payment.</p>{draft.note && <p className="draft-note">{draft.note}</p>}<button type="button" className="primary-button full-button" onClick={validateDraftDetails}>Validate draft details</button>{validationResult && <div className={`draft-validation ${validationResult.valid ? "validation-success" : "validation-warning"}`} role="status" aria-live="polite"><strong>{validationResult.valid ? "✓ Details checked" : "Review required"}</strong><p>{validationResult.message}</p></div>}{validationResult?.valid && <div className="draft-checkout"><div className="draft-total"><span>Estimated total · {draft.item}</span><strong>${(CATALOG_PRICES[draft.item] * Number(draft.quantity)).toFixed(2)} USD</strong></div><p>Sandbox checkout only. The server independently validates the product and calculates the final amount. This does not save an order record.</p><button type="button" className="primary-button full-button" onClick={() => startSandboxCheckout(draft.item, Number(draft.quantity))} disabled={checkoutLoading}>{checkoutLoading ? "Connecting to PayPal…" : "Continue to PayPal Sandbox"} <span>↗</span></button></div>}</div>}
            </section>

            <section className="attention-card" id="activity">
              <div className="panel-heading"><div><span className="panel-icon attention-icon">!</span><div><h2>Needs your attention</h2><p>Items to review before taking action.</p></div></div><span className="attention-count">{orders.filter(o => o.status === "Review needed").length}</span></div>
              {orders.filter(o => o.status === "Review needed" || o.status === "Awaiting payment").map((order) => <div className="attention-item" key={order.id}><div className={`attention-dot ${order.status === "Review needed" ? "dot-red" : "dot-amber"}`} /><div><strong>{order.status === "Review needed" ? "Payment needs review" : "Payment not completed"}</strong><p>{order.id} · {order.customer} · {order.amount}</p></div><button aria-label={`Review ${order.id}`} onClick={() => setNotice(`${order.id}: sample record only. Use Test PayPal checkout to run the configured Sandbox verification flow.`)}>→</button></div>)}
              <div className="evidence-note"><span>✓</span><p><strong>Never trust a screenshot alone.</strong><br />A paid status requires server-side PayPal verification.</p></div>
            </section>
          </div>

          <footer className="footer"><span>PayProof AI <span className="footer-dot">·</span> Built for clearer payment operations</span><span><i /> Sandbox preview · No real payments</span></footer>
        </div>
      </section>
    </main>
  );
}
