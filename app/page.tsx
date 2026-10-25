"use client";

import { useMemo, useState } from "react";

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
  { id: "PP-1048", customer: "Amina W.", item: "Handwoven market tote", amount: "$38.00", status: "Paid", time: "Verified just now · Demo data", initials: "AW" },
  { id: "PP-1047", customer: "Daniel K.", item: "Coffee gift set", amount: "$24.50", status: "Awaiting payment", time: "Checkout not completed · Demo data", initials: "DK" },
  { id: "PP-1046", customer: "Maya R.", item: "Ceramic mug pair", amount: "$42.00", status: "Review needed", time: "Payment evidence missing · Demo data", initials: "MR" }
];

const statusClass: Record<OrderStatus, string> = {
  Paid: "paid",
  "Awaiting payment": "pending",
  "Review needed": "review"
};

export default function Home() {
  const [orders, setOrders] = useState(initialOrders);
  const [message, setMessage] = useState("");
  const [draft, setDraft] = useState<{ item: string; quantity: string; note: string } | null>(null);
  const [notice, setNotice] = useState("Demo workspace · Sample records only");
  const [showGuide, setShowGuide] = useState(false);

  const paidTotal = useMemo(
    () => orders.filter((order) => order.status === "Paid").length,
    [orders]
  );

  function prepareDraft() {
    if (!message.trim()) {
      setNotice("Add an order message first so we can prepare a draft.");
      return;
    }
    const lower = message.toLowerCase();
    const item = lower.includes("coffee") ? "Coffee gift set"
      : lower.includes("mug") ? "Ceramic mug pair"
      : lower.includes("tote") || lower.includes("bag") ? "Handwoven market tote"
      : "Unmatched item — needs review";
    const quantityMatch = lower.match(/\b(\d+)\s*(?:x|pieces?|items?)\b/);
    const quantity = quantityMatch?.[1] ?? "Not specified";
    setDraft({
      item,
      quantity,
      note: item.startsWith("Unmatched") || quantity === "Not specified"
        ? "Some details are missing or ambiguous. Confirm the product and quantity before saving."
        : "Draft prepared from the message. Review every field before confirming."
    });
    setNotice("Draft prepared for review. No order or payment has been created.");
  }

  function saveDraft() {
    if (!draft || draft.item.startsWith("Unmatched") || draft.quantity === "Not specified") {
      setNotice("Please resolve the missing product and quantity before confirming this draft.");
      return;
    }
    setNotice("Draft review passed. PayPal Sandbox checkout will be enabled after credentials and server verification are configured.");
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
          <div className="topbar-actions"><span className="sandbox-pill"><i /> Sandbox mode</span><button className="help-button" onClick={() => setShowGuide(!showGuide)} aria-expanded={showGuide}>How it works <span>↗</span></button></div>
        </header>

        <div className="content" id="overview">
          <div className="welcome-row">
            <div><p className="eyebrow">MONDAY, OCTOBER 26, 2026</p><h1>Good morning, Moana <span>✳</span></h1><p className="subheading">A clearer view of orders, payments, and what needs your attention.</p></div>
            <button className="primary-button" onClick={() => document.getElementById("intake")?.scrollIntoView({ behavior: "smooth" })}><span>＋</span> New order</button>
          </div>

          {showGuide && <div className="guide-panel"><strong>How PayProof AI works</strong><p>Order messages can become reviewable drafts. PayPal server-side verification will determine payment status once the sandbox integration is configured. All records on this screen are illustrative demo data.</p></div>}

          <div className="notice" role="status"><span className="notice-icon">i</span><span>{notice}</span><button onClick={() => setNotice("Demo workspace · Sample records only")} aria-label="Reset notice">×</button></div>

          <div className="metrics-grid">
            <article className="metric-card"><div className="metric-top"><span>Total orders</span><span className="metric-icon violet">▤</span></div><div className="metric-value">{orders.length.toString().padStart(2, "0")}</div><div className="metric-foot"><span className="metric-neutral">Sample workspace</span><span>All orders</span></div></article>
            <article className="metric-card"><div className="metric-top"><span>Verified paid</span><span className="metric-icon green">✓</span></div><div className="metric-value">{paidTotal.toString().padStart(2, "0")}</div><div className="metric-foot"><span className="metric-green">Demo state only</span><span>Needs live verification</span></div></article>
            <article className="metric-card"><div className="metric-top"><span>Awaiting payment</span><span className="metric-icon amber">◷</span></div><div className="metric-value">{orders.filter(o => o.status === "Awaiting payment").length.toString().padStart(2, "0")}</div><div className="metric-foot"><span className="metric-neutral">No action yet</span><span>Checkout pending</span></div></article>
            <article className="metric-card"><div className="metric-top"><span>Needs attention</span><span className="metric-icon red">!</span></div><div className="metric-value">{orders.filter(o => o.status === "Review needed").length.toString().padStart(2, "0")}</div><div className="metric-foot"><span className="metric-red">Review required</span><span>Before fulfilment</span></div></article>
          </div>

          <div className="section-heading" id="orders"><div><h2>Recent orders</h2><p>Track each order without guessing about payment status.</p></div><button className="text-button" onClick={() => setNotice("Showing all sample orders in this prototype.")}>View all orders <span>→</span></button></div>

          <section className="orders-card">
            <div className="table-toolbar"><div className="table-title">All orders <span className="table-count">{orders.length}</span></div><div className="table-filters"><span className="filter-label">Status</span><button className="filter-button" onClick={() => setOrders(orders.slice().reverse())}>Recent activity ↕</button></div></div>
            <div className="order-table-wrap"><table className="order-table"><thead><tr><th>ORDER</th><th>CUSTOMER / ITEM</th><th>AMOUNT</th><th>PAYMENT STATUS</th><th>LAST ACTIVITY</th></tr></thead><tbody>{orders.map((order) => <tr key={order.id}><td><span className="order-id">{order.id}</span></td><td><div className="customer-cell"><div className="avatar">{order.initials}</div><div><strong>{order.customer}</strong><span>{order.item}</span></div></div></td><td className="amount">{order.amount}</td><td><span className={`status-badge ${statusClass[order.status]}`}><i />{order.status}</span></td><td className="activity-text">{order.time}</td></tr>)}</tbody></table></div>
            <div className="table-footer"><span>Illustrative records for interface preview</span><span>1–{orders.length} of {orders.length}</span></div>
          </section>

          <div className="lower-grid">
            <section className="intake-card" id="intake">
              <div className="panel-heading"><div><span className="panel-icon">✳</span><div><h2>AI order intake</h2><p>Turn a customer message into a draft.</p></div></div><span className="beta-badge">PREVIEW</span></div>
              <label className="field-label" htmlFor="customer-message">CUSTOMER MESSAGE</label>
              <textarea id="customer-message" value={message} onChange={(event) => setMessage(event.target.value)} placeholder={'Example: Hi, I would like 2 coffee gift sets, please.'} rows={4} />
              <div className="field-hint">The assistant may suggest fields, but you review them before saving.</div>
              <button className="secondary-button full-button" onClick={prepareDraft}>Prepare order draft <span>→</span></button>
              {draft && <div className="draft-result"><div className="draft-title">Draft for review <span>NOT SAVED</span></div><div className="draft-line"><span>Product</span><strong>{draft.item}</strong></div><div className="draft-line"><span>Quantity</span><strong>{draft.quantity}</strong></div><p>{draft.note}</p><button className="primary-button full-button" onClick={saveDraft}>Confirm draft details</button></div>}
            </section>

            <section className="attention-card" id="activity">
              <div className="panel-heading"><div><span className="panel-icon attention-icon">!</span><div><h2>Needs your attention</h2><p>Items to review before taking action.</p></div></div><span className="attention-count">{orders.filter(o => o.status === "Review needed").length}</span></div>
              {orders.filter(o => o.status === "Review needed" || o.status === "Awaiting payment").map((order) => <div className="attention-item" key={order.id}><div className={`attention-dot ${order.status === "Review needed" ? "dot-red" : "dot-amber"}`} /><div><strong>{order.status === "Review needed" ? "Payment needs review" : "Payment not completed"}</strong><p>{order.id} · {order.customer} · {order.amount}</p></div><button aria-label={`Review ${order.id}`} onClick={() => setNotice(`${order.id}: sample record only. A live PayPal verification flow is not configured yet.`)}>→</button></div>)}
              <div className="evidence-note"><span>✓</span><p><strong>Never trust a screenshot alone.</strong><br />A paid status requires server-side PayPal verification.</p></div>
            </section>
          </div>

          <footer className="footer"><span>PayProof AI <span className="footer-dot">·</span> Built for clearer payment operations</span><span><i /> Sandbox preview · No real payments</span></footer>
        </div>
      </section>
    </main>
  );
}
