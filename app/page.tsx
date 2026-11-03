"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ReconciliationConsole } from "@/components/reconciliation-console";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

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

const initialOrders: Order[] = [];

const CATALOG_PRICES: Record<string, number> = {
  "Coffee gift set": 24.5,
  "Ceramic mug pair": 42,
  "Handwoven market tote": 38
};

const statusClass: Record<OrderStatus, string> = {
  Paid: "paid",
  "Awaiting payment": "pending",
  "Review needed": "review"
};

export default function Home() {
  const [authUserName, setAuthUserName] = useState("");
  const [authAvatarUrl, setAuthAvatarUrl] = useState("");
  const [authChecked, setAuthChecked] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [authWorkspaceName, setAuthWorkspaceName] = useState("Demo workspace");
  const [orders, setOrders] = useState(initialOrders);
  const [ordersSource, setOrdersSource] = useState<"sample" | "saved" | "unavailable">("sample");
  const [ordersLoadNote, setOrdersLoadNote] = useState("");
  const [flowStep, setFlowStep] = useState<1 | 2 | 3>(1);
  const [flowCustomer, setFlowCustomer] = useState("");
  const [flowMessage, setFlowMessage] = useState("");
  const [flowProduct, setFlowProduct] = useState("Coffee gift set");
  const [flowQuantity, setFlowQuantity] = useState("1");
  const [flowBusy, setFlowBusy] = useState(false);
  const [flowError, setFlowError] = useState("");
  const [flowDraft, setFlowDraft] = useState<{ item: string; quantity: string; note: string } | null>(null);
  const [flowValidation, setFlowValidation] = useState<{ valid: boolean; message: string } | null>(null);
  const [dashboardSearch, setDashboardSearch] = useState("");

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setAuthChecked(true);
      setIsSignedIn(false);
      setOrdersSource("sample");
      setOrdersLoadNote("Sign in and complete a Sandbox checkout to see real orders here. No sample transactions are displayed.");
      setNotice("Public preview · No account orders are shown. Sign in to create and view your own saved Sandbox orders.");
      return;
    }
    let active = true;
    const loadOrders = async (token: string | null) => {
      if (!token) {
        setOrders(initialOrders);
        setOrdersSource("sample");
        setOrdersLoadNote("Sign in and complete a Sandbox checkout to see real orders here. No sample transactions are displayed.");
        setNotice("Public preview · No account orders are shown. Sign in to create and view your own saved Sandbox orders.");
        return;
      }
      try {
        const response = await fetch("/api/orders", {
          cache: "no-store",
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await response.json() as {
          configured?: boolean;
          orders?: Array<{
            order_number: string; customer_name?: string | null; product_name: string; quantity: number;
            total_amount: string; currency: string; payment_status: string;
            verified_at?: string | null; created_at?: string | null;
          }>;
          error?: string;
        };
        if (!active) return;
        if (!response.ok) throw new Error(data.error || "Saved orders could not be loaded.");
        if (!data.configured) {
          setOrders([]);
          setOrdersSource("unavailable");
          setOrdersLoadNote("Order storage is not configured yet. Your account is signed in, but saved orders cannot be loaded.");
          setNotice("Account signed in, but order storage is not configured. Do not treat sample rows as account records.");
          return;
        }
        const saved = (data.orders || []).map((order) => {
          const status: OrderStatus = order.payment_status === "paid" ? "Paid" : order.payment_status === "awaiting_payment" ? "Awaiting payment" : "Review needed";
          const amountValue = Number(order.total_amount);
          const amount = Number.isFinite(amountValue)
            ? new Intl.NumberFormat("en-US", { style: "currency", currency: order.currency || "USD" }).format(amountValue)
            : `${order.total_amount} ${order.currency}`;
          const timestamp = order.verified_at || order.created_at;
          return {
            id: order.order_number,
            customer: order.customer_name?.trim() || "Customer details not recorded",
            item: `${order.product_name} × ${order.quantity}`,
            amount,
            status,
            time: status === "Paid" ? (timestamp ? `Server verified · ${new Date(timestamp).toLocaleString()}` : "Server-verified Sandbox capture") : status === "Awaiting payment" ? "Awaiting PayPal capture" : "Review required · Do not fulfil",
            initials: (order.customer_name?.trim().split(/\s+/).map((part) => part[0]).join("").slice(0,2).toUpperCase() || "CU")
          };
        });
        setOrders(saved);
        setOrdersSource("saved");
        setOrdersLoadNote(saved.length
          ? "Showing only orders saved to your account. Paid status comes from server-verified PayPal captures."
          : "Your workspace is ready. No saved orders yet; complete a Sandbox checkout to add one.");
        setNotice(saved.length
          ? "Private workspace · Showing only orders saved to your account. Payment evidence is available under Payment evidence."
          : "Private workspace ready · No saved orders yet. Create a Sandbox order to begin.");
      } catch {
        if (!active) return;
        setOrdersSource("unavailable");
        setOrdersLoadNote("Your saved orders could not be loaded. Please refresh or check the Supabase configuration.");
        setNotice("Your account is signed in, but saved orders could not be loaded. Refresh before relying on the dashboard.");
      }
    };
    const applySession = async (session: { access_token: string; user: { email?: string; user_metadata?: Record<string, unknown> } } | null) => {
      if (!active) return;
      if (!session) {
        setAuthChecked(true);
        setIsSignedIn(false);
        setAuthUserName("");
        setAuthWorkspaceName("Demo workspace");
        await loadOrders(null);
        return;
      }
      setAuthChecked(true);
      setIsSignedIn(true);
      const metadata = session.user.user_metadata || {};
      setAuthUserName(typeof metadata.display_name === "string" && metadata.display_name.trim() ? metadata.display_name.trim() : (session.user.email?.split("@")[0] || "Account"));
      setAuthAvatarUrl(typeof metadata.avatar_url === "string" ? metadata.avatar_url : "");
      setAuthWorkspaceName(typeof metadata.workspace_name === "string" && metadata.workspace_name.trim() ? metadata.workspace_name.trim() : "My workspace");
      setAuthAvatarUrl(typeof metadata.avatar_url === "string" ? metadata.avatar_url : "");
      await loadOrders(session.access_token);
    };
    supabase.auth.getSession().then(({ data }) => applySession(data.session ? {
      access_token: data.session.access_token,
      user: { email: data.session.user.email, user_metadata: data.session.user.user_metadata }
    } : null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      void applySession(session ? { access_token: session.access_token, user: { email: session.user.email, user_metadata: session.user.user_metadata } } : null);
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);
  const [message, setMessage] = useState("");
  const [messageCustomerName, setMessageCustomerName] = useState("");
  const [draft, setDraft] = useState<{ customerName: string; item: string; quantity: string; note: string } | null>(null);
  const [notice, setNotice] = useState("Checking workspace status…");
  const [showGuide, setShowGuide] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [draftLoading, setDraftLoading] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<{ valid: boolean; message: string } | null>(null);
  const paidTotal = useMemo(
    () => orders.filter((order) => order.status === "Paid").length,
    [orders]
  );
  const matchingTransactions = useMemo(
    () => orders.filter((order) => `${order.id} ${order.customer} ${order.item} ${order.amount} ${order.status}`.toLowerCase().includes(dashboardSearch.trim().toLowerCase())),
    [orders, dashboardSearch]
  );

  async function startSandboxCheckout(product = "Coffee gift set", quantity = 1, customerName = "") {
    if (checkoutLoading) return;
    setCheckoutLoading(true);
    setNotice("Creating a PayPal Sandbox checkout using the server-priced catalogue. No real money will be processed.");
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = supabase ? await supabase.auth.getSession() : { data: { session: null } };
      if (!session) {
        setNotice("Sign in or create an account before starting a checkout so the order is saved to your own workspace.");
        window.location.assign("/auth");
        return;
      }
      const response = await fetch("/api/paypal/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ product, quantity, customerName })
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

  async function prepareCheckoutOrder() {
    if (flowBusy) return;
    setFlowError("");
    if (!flowCustomer.trim()) {
      setFlowError("Enter the customer name before continuing.");
      return;
    }
    if (!flowMessage.trim()) {
      setFlowProduct("Coffee gift set");
      setFlowQuantity("1");
      await startSandboxCheckout("Coffee gift set", 1, flowCustomer.trim());
      return;
    }
    setFlowBusy(true);
    try {
      const response = await fetch("/api/orders/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: flowMessage })
      });
      const data = await response.json() as {
        draft?: { product: string | null; quantity: number | null; missingInformation: string[]; confidenceNotes?: string };
        error?: string;
      };
      if (!response.ok || !data.draft) throw new Error(data.error || "AI could not prepare this order. Please review the order text.");
      const product = data.draft.product;
      const quantity = data.draft.quantity;
      if (!product || !Object.hasOwn(CATALOG_PRICES, product)) {
        throw new Error("The order text does not identify a supported catalogue product. Please use Coffee gift set, Ceramic mug pair, or Handwoven market tote.");
      }
      if (!quantity || !Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
        throw new Error("The order text must include a valid whole-number quantity from 1 to 100.");
      }
      setFlowProduct(product);
      setFlowQuantity(String(quantity));
      setFlowDraft({
        item: product,
        quantity: String(quantity),
        note: data.draft.missingInformation.length
          ? `Needs confirmation: ${data.draft.missingInformation.join(" ")} · Confidence notes: ${(data.draft.confidenceNotes || "Review the extracted details against the customer message.")}`
          : `Confidence notes: ${(data.draft.confidenceNotes || "Review the extracted details against the customer message.")}`
      });
      setFlowValidation(null);
      setFlowError("");
    } catch (error) {
      setFlowError(error instanceof Error ? error.message : "The order could not be prepared. Please try again.");
    } finally {
      setFlowBusy(false);
    }
  }

  function resetOrderFlow() {
    setFlowStep(1);
    setFlowError("");
    setFlowMessage("");
    setFlowCustomer("");
    setFlowProduct("Coffee gift set");
    setFlowQuantity("1");
    setFlowDraft(null);
    setFlowValidation(null);
  }

  async function prepareDraft() {
    if (draftLoading) return;
    if (!messageCustomerName.trim()) {
      const error = "Enter the customer name before extracting order details.";
      setDraftError(error);
      setNotice(error);
      return;
    }
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
        customerName: messageCustomerName.trim(),
        item,
        quantity,
        note: [extracted.missingInformation.length ? `Needs confirmation: ${extracted.missingInformation.join(" ")}` : "", extracted.confidenceNotes ? `Confidence notes: ${extracted.confidenceNotes}` : ""].filter(Boolean).join(" · ")
      });
      setNotice("AI extracted a draft. Review the customer name, product and quantity; nothing has been saved and payment is not verified.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "AI order intake is temporarily unavailable.";
      setDraftError(message);
      setNotice(message);
    } finally {
      setDraftLoading(false);
    }
  }

  function updateDraftField(field: "customerName" | "item" | "quantity", value: string) {
    setDraft((current) => current ? { ...current, [field]: value } : current);
    setValidationResult(null);
  }

  function validateDraftDetails() {
    if (!draft) return;
    const issues: string[] = [];
    const customerName = draft.customerName.trim();
    const product = draft.item.trim();
    const quantity = draft.quantity.trim();
    if (!customerName) issues.push("Enter the customer name.");
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
    setValidationResult({ valid: true, message: "The customer name is provided, the product is in the supported catalogue and the quantity is valid. Confirm all details against the original customer message. The server will calculate the price; this draft is not saved and payment is not verified." });
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
          <a className="nav-item active" href="#overview"><span className="nav-icon">▦</span> Dashboard</a>
          <a className="nav-item" href="/payments"><span className="nav-icon">◈</span> Payments</a>
          <a className="nav-item" href="#customers"><span className="nav-icon">♙</span> Customers</a>
          <a className="nav-item" href="#shipping"><span className="nav-icon">▣</span> Shipping</a>
          <a className="nav-item" href="#analytics"><span className="nav-icon">▥</span> Analytics</a>
          <a className="nav-item" href="#reports"><span className="nav-icon">▤</span> Reports</a>
          <a className="nav-item" href="#invoices"><span className="nav-icon">▧</span> Invoices</a>
          <a className="nav-item" href="#transactions"><span className="nav-icon">↗</span> Transactions</a>
          <a className="nav-item" href="#reconciliation"><span className="nav-icon">⇄</span> Reconciliation</a>
          <a className="nav-item" href="/exceptions"><span className="nav-icon">!</span> Exceptions</a>
          <div className="nav-group-label">PREFERENCES</div>
          <a className="nav-item" href="/demo-guide"><span className="nav-icon">?</span> Help &amp; support</a>
          <a className="nav-item" href="/profile"><span className="nav-icon">⚙</span> Settings</a>
        </nav>
        <div className="sidebar-bottom">
          <div className="trust-card">
            <span className="trust-icon">✓</span>
            <strong>Evidence first</strong>
            <p>AI helps explain. Verified payment data decides.</p>
          </div>
          <div className="profile-row">
            <div className="avatar profile-avatar">{authAvatarUrl ? <img src={authAvatarUrl} alt="" /> : (authUserName ? authUserName.trim().split(/\s+/)[0].slice(0, 1).toUpperCase() : "P")}</div>
            <div><strong>{authUserName ? authUserName.trim().split(/\s+/)[0] : "Demo workspace"}</strong><span>{authUserName || "Public Sandbox preview"}</span></div>
            <span className="profile-dots">···</span>
          </div>
        </div>
      </aside>

      <section className="main-area">
        <header className="topbar">
          <div className="dashboard-search"><span>⌕</span><input aria-label="Search workspace" placeholder="Search orders and payments" value={dashboardSearch} onChange={(event) => setDashboardSearch(event.target.value)} /><span className="dashboard-date">▦ &nbsp; Sandbox activity</span></div>
          <div className="topbar-actions"><span className="sandbox-pill"><i /> Sandbox mode</span><Link className="demo-payment-guide-link" href="/demo-guide">Try demo payment guide <span>↗</span></Link>{authUserName ? <><Link className="demo-payment-guide-link" href="/profile">{authUserName.trim().split(/\s+/)[0] || "Profile"} ↗</Link><button className="help-button" onClick={async () => { const supabase = getSupabaseBrowserClient(); await supabase?.auth.signOut(); }}>Sign out</button></> : <Link className="sandbox-checkout-button" href="/auth">Sign in / Create account ↗</Link>}<button className="help-button" onClick={() => setShowGuide(!showGuide)} aria-expanded={showGuide}>How it works <span>↗</span></button></div>
        </header>

        <div className="content" id="overview">
          <div className="reference-overview-heading">
            <div><p className="eyebrow">PAYMENT WORKSPACE</p><h1>Overview</h1><p>Monitor your payments and configure your settings</p></div>
            <button className="primary-button" onClick={() => { setFlowError(""); setFlowStep(2); }}><span>＋</span> New order</button>
          </div>

          {showGuide && <div className="guide-panel"><strong>How PayProof AI works</strong><p>Order messages become reviewable drafts. For a new checkout, PayProof AI verifies the PayPal Sandbox response server-side and attempts to save the verified order to Supabase. {isSignedIn ? "Your signed-in dashboard shows orders saved to your account." : "The public dashboard rows are illustrative demo data."}</p></div>}

          <div className="notice" role="status"><span className="notice-icon">i</span><span>{notice}</span><button onClick={() => setNotice(isSignedIn ? "Private workspace · Your saved Sandbox evidence is under Payment evidence." : "Public demo · Sample rows are illustrative only. Sign in to view your private saved Sandbox orders.")} aria-label="Reset notice">×</button></div>


          <div className="metrics-grid">
            <article className="metric-card"><div className="metric-top"><span>Total orders</span><span className="metric-icon violet">▤</span></div><div className="metric-value">{orders.length.toString().padStart(2, "0")}</div><div className="metric-foot"><span className="metric-neutral">{ordersSource === "saved" ? "Connected records" : "Sample workspace"}</span><span>All orders</span></div></article>
            <article className="metric-card"><div className="metric-top"><span>{ordersSource === "saved" ? "Verified paid" : "Sample paid"}</span><span className="metric-icon green">✓</span></div><div className="metric-value">{paidTotal.toString().padStart(2, "0")}</div><div className="metric-foot"><span className="metric-green">{ordersSource === "saved" ? "Server verified" : "Illustrative only"}</span><span>{ordersSource === "saved" ? "Saved Sandbox records" : "Not a live payment count"}</span></div></article>
            <article className="metric-card"><div className="metric-top"><span>Awaiting payment</span><span className="metric-icon amber">◷</span></div><div className="metric-value">{orders.filter(o => o.status === "Awaiting payment").length.toString().padStart(2, "0")}</div><div className="metric-foot"><span className="metric-neutral">No action yet</span><span>Checkout pending</span></div></article>
            <article className="metric-card"><div className="metric-top"><span>Needs attention</span><span className="metric-icon red">!</span></div><div className="metric-value">{orders.filter(o => o.status === "Review needed").length.toString().padStart(2, "0")}</div><div className="metric-foot"><span className="metric-red">Review required</span><span>Exceptions only</span></div></article>
          </div>
          <section className="dashboard-reference-panels">
            <article className="dashboard-config-card">
              <div className="dashboard-panel-heading"><div><h2>Payment Configuration</h2><p>How this workspace handles payment and order evidence</p></div><span className="config-status">SANDBOX</span></div>
              <div className="configuration-fields">
                <label>API credentials <span>Protected</span><input value="••••••••••••••••••••••••" readOnly aria-label="Protected PayPal credentials" /></label>
                <small>PayPal credentials are stored securely on the server and never displayed here.</small>
                <label>Webhook endpoint <span>Server managed</span><input value="Configured server-side" readOnly aria-label="Webhook endpoint configuration status" /></label>
                <small>Payment events are verified against PayPal&apos;s server-side records.</small>
                <label>Workspace display name<input value={authWorkspaceName?.trim() || authUserName?.trim() || "Workspace name not set"} readOnly aria-label="Workspace display name" /></label>
                <small>This is your workspace label, not a verified PayPal merchant identity.</small>
              </div>
              <p className="config-safe-note">Sandbox environment · No real money is processed.</p>
            </article>
            <article className="dashboard-transactions-card">
              <div className="dashboard-panel-heading"><div><h2>Recent Transactions</h2><p>Latest order and payment activity</p></div><span className="transaction-count">{matchingTransactions.length} total</span></div>
              <div className="dashboard-transaction-search-note">{dashboardSearch.trim() ? `Showing ${Math.min(matchingTransactions.length, 4)} of ${matchingTransactions.length} matches` : `Latest 4 of ${orders.length} total records`}</div>
              {matchingTransactions.slice(0,4).map((order) => (
                <div className="dashboard-transaction-row" key={order.id}>
                  <div className="dashboard-transaction-person"><span className="dashboard-transaction-avatar">{order.initials}</span><div><strong>{order.customer}</strong><small>{order.item}</small><small>{order.time}</small></div></div>
                  <div className="dashboard-transaction-amount"><strong>{order.amount}</strong><span className={order.status === "Paid" ? "transaction-paid" : order.status === "Review needed" ? "transaction-review" : "transaction-pending"}>{order.status}</span></div>
                </div>
              ))}
              {matchingTransactions.length === 0 && <p className="dashboard-empty">{dashboardSearch.trim() ? "No matching transactions." : "No saved transactions yet. Create a Sandbox checkout to see your real order activity here."}</p>}
              <p className="dashboard-sample-note">{ordersSource === "saved" ? "Account orders · Paid status requires server verification" : "No live account activity yet"}</p>
            </article>
          </section>


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
            {!authChecked ? <p className="workspace-isolation-note">Checking workspace access…</p> : isSignedIn ? <div className="workspace-isolation-note"><strong>Reconciliation workspace</strong><p>Open the reconciliation workspace to review the protected statement-matching demo. Your saved orders and payment evidence remain private to your account; shared judge-preview records are kept separate.</p><Link className="primary-button" href="/reconciliation">Open reconciliation workspace ↗</Link><p className="recon-judge-safety">Private reviewer access is required for protected import, review decisions and internal-ledger posting. This preview does not connect to a bank or external accounting platform.</p></div> : <ReconciliationConsole />}
          </section>

          <div className="section-heading" id="transactions"><div><h2>Recent orders</h2><p>Track each order without guessing about payment status.</p></div><button className="text-button" onClick={() => setNotice(ordersSource === "saved" ? "Showing saved Sandbox orders. For capture details and verification timestamps, open Payment evidence." : "Showing illustrative sample orders. These are not saved payment records.")}>View all orders <span>→</span></button></div>

          <section className="orders-card">
            <div className="table-toolbar"><div className="table-title">{ordersSource === "saved" ? "Saved orders" : "Your orders"} <span className="table-count">{orders.length}</span></div><div className="table-filters"><span className="filter-label">Status</span><button className="filter-button" onClick={() => setOrders(orders.slice().reverse())}>Recent activity ↕</button></div></div>
            <div className="order-table-wrap"><table className="order-table"><thead><tr><th>ORDER</th><th>CUSTOMER / ITEM</th><th>AMOUNT</th><th>PAYMENT STATUS</th><th>LAST ACTIVITY</th></tr></thead><tbody>{orders.map((order) => <tr key={order.id}><td><span className="order-id">{order.id}</span></td><td><div className="customer-cell"><div className="avatar">{order.initials}</div><div><strong>{order.customer}</strong><span>{order.item}</span></div></div></td><td className="amount">{order.amount}</td><td><span className={`status-badge ${statusClass[order.status]}`}><i />{order.status === "Paid" ? (ordersSource === "saved" ? "Verified paid" : "Sample · unverified") : order.status}</span></td><td className="activity-text">{order.time}</td></tr>)}{orders.length === 0 && <tr><td colSpan={5}>{"No orders yet. Create a Sandbox checkout; verified and pending orders will appear here from your account records."}</td></tr>}</tbody></table></div>
            <div className="table-footer"><span>{ordersLoadNote || (ordersSource === "saved" ? "Persistent Sandbox order records" : "Illustrative records · Not live payment evidence")}</span><span>{orders.length ? `1–${orders.length} of ${orders.length}` : "0 orders"}</span></div>
          </section>

          <div className="lower-grid">
            <section className="intake-card" id="intake">
              <div className="panel-heading"><div><span className="panel-icon">✳</span><div><h2>AI Message-to-Order</h2><p>Turn customer messages into reviewable sales orders with customer details.</p></div></div><span className="beta-badge">AI-ASSISTED · REVIEW REQUIRED</span></div>
              <div className="intake-sample-row">
                <label className="field-label" htmlFor="customer-message">PASTE CUSTOMER MESSAGE</label>
                <button type="button" className="sample-message-button" onClick={() => { setMessage("Hi, I'd like 2 Coffee gift sets, please. Can you prepare the order for me?"); setDraft(null); setDraftError(null); setValidationResult(null); setMessageCustomerName("Alex Morgan"); setNotice("Sample customer message and sample customer name loaded. Select Prepare order draft to test AI extraction."); }}>Load sample message</button>
              </div>
              <label className="field-label" htmlFor="intake-customer-name">CUSTOMER NAME</label>
              <input id="intake-customer-name" className="draft-edit-input" type="text" value={messageCustomerName} maxLength={100} autoComplete="name" placeholder="Customer full name (required)" aria-required="true" onChange={(event) => { setMessageCustomerName(event.target.value); setDraft(null); setDraftError(null); setValidationResult(null); }} />
              <textarea id="customer-message" value={message} onChange={(event) => { setMessage(event.target.value); if (draftError) setDraftError(null); }} placeholder={'Try the sample message, or paste a customer message here. Example: Hi, I would like 2 coffee gift sets, please.'} rows={4} />
              <div className="field-hint">Enter the customer name, then paste a message from WhatsApp, email, or another channel. AI identifies the product and quantity for your review. Nothing is saved automatically.</div>
              <button type="button" className="secondary-button full-button" onClick={prepareDraft} disabled={draftLoading} aria-busy={draftLoading}>{draftLoading ? "Preparing draft…" : "Prepare order draft"} <span>{draftLoading ? "…" : "→"}</span></button>
              {draftError && <p className="draft-error" role="alert">{draftError}</p>}
              <p className="draft-action-hint" aria-live="polite">{draftLoading ? "Please wait while the message is analysed." : draftError ? "No sales order was created. You can try again." : draft ? "Draft ready. Check every detail against the original customer message." : "Enter the customer name and message, then select Prepare order draft."}</p>
              {draft && <div className="draft-result"><div className="draft-title">Extracted sales order <span>REVIEW REQUIRED · NOT SAVED</span></div><p className="draft-review-hint">Confirm the customer name and edit the suggested fields, then compare them with the original customer message above.</p><label className="draft-field-label" htmlFor="draft-customer-name">CUSTOMER NAME</label><input id="draft-customer-name" className="draft-edit-input" type="text" value={draft.customerName} maxLength={100} autoComplete="name" onChange={(event) => updateDraftField("customerName", event.target.value)} aria-describedby="draft-review-help" /><label className="draft-field-label" htmlFor="draft-product">PRODUCT NAME</label><input id="draft-product" className="draft-edit-input" type="text" value={draft.item} maxLength={120} autoComplete="off" onChange={(event) => updateDraftField("item", event.target.value)} aria-describedby="draft-review-help" /><label className="draft-field-label" htmlFor="draft-quantity">QUANTITY</label><input id="draft-quantity" className="draft-edit-input" type="number" min="1" max="100000" step="1" inputMode="numeric" value={draft.quantity === "Not specified" ? "" : draft.quantity} placeholder="Enter quantity" onChange={(event) => updateDraftField("quantity", event.target.value)} aria-describedby="draft-review-help" /><p id="draft-review-help" className="draft-review-hint">Validation checks formatting only; it cannot confirm product availability, price, customer intent, or payment.</p>{draft.note && <p className="draft-note">{draft.note}</p>}<button type="button" className="primary-button full-button" onClick={validateDraftDetails}>Validate draft details</button>{validationResult && <div className={`draft-validation ${validationResult.valid ? "validation-success" : "validation-warning"}`} role="status" aria-live="polite"><strong>{validationResult.valid ? "✓ Details checked" : "Review required"}</strong><p>{validationResult.message}</p></div>}{validationResult?.valid && <div className="draft-checkout"><div className="draft-total"><span>Estimated total · {draft.item}</span><strong>${(CATALOG_PRICES[draft.item] * Number(draft.quantity)).toFixed(2)} USD</strong></div><p>Sandbox checkout only. The server independently validates the product and calculates the final amount. This does not save an order record.</p><button type="button" className="primary-button full-button" onClick={() => startSandboxCheckout(draft.item, Number(draft.quantity), draft.customerName.trim())} disabled={checkoutLoading}>{checkoutLoading ? "Connecting to PayPal…" : "Continue to PayPal Sandbox"} <span>↗</span></button></div>}</div>}
            </section>

            <section className="attention-card" id="activity">
              <div className="panel-heading"><div><span className="panel-icon attention-icon">!</span><div><h2>Payment follow-up</h2><p>Pending payments and exceptions requiring review.</p></div></div><span className="attention-count">{orders.filter(o => o.status !== "Paid").length}</span></div>
              {orders.filter(o => o.status === "Review needed" || o.status === "Awaiting payment").map((order) => <div className="attention-item" key={order.id}><div className={`attention-dot ${order.status === "Review needed" ? "dot-red" : "dot-amber"}`} /><div><strong>{order.status === "Review needed" ? "Payment needs review" : "Payment not completed"}</strong><p>{order.id} · {order.customer} · {order.amount}</p></div><button aria-label={`Review ${order.id}`} onClick={() => setNotice(ordersSource === "saved" ? `${order.id}: check Payment evidence for saved PayPal capture details. Do not fulfil while payment is awaiting or under review.` : `${order.id}: illustrative sample only. Use Test PayPal checkout to run the configured Sandbox verification flow.`)}>→</button></div>)}
              <div className="evidence-note"><span>✓</span><p><strong>Never trust a screenshot alone.</strong><br />A paid status requires server-side PayPal verification.</p></div>
            </section>
          </div>

          <details className="workspace-modules" aria-label="Additional workspace modules">
            <summary className="workspace-modules-summary"><span><span className="eyebrow">WORKSPACE MODULES</span><strong>More ways to manage your business</strong><small>Customer records, fulfilment, analytics, reports and invoices</small></span><span className="workspace-modules-toggle">Explore modules <b>＋</b></span></summary>
            <div className="workspace-module-grid">
              <Link className="workspace-module-card" href="/customers"><span>♙</span><div><h3>Customers</h3><p>Customer profiles, contact details and order history.</p><small>Open customer directory <b>→</b></small></div></Link>
              <Link className="workspace-module-card" href="/shipping"><span>▣</span><div><h3>Shipping</h3><p>Fulfilment review for server-verified paid orders.</p><small>Open shipping workspace <b>→</b></small></div></Link>
              <Link className="workspace-module-card" href="/analytics"><span>▥</span><div><h3>Analytics</h3><p>Payment trends and order performance from saved records.</p><small>Open analytics dashboard <b>→</b></small></div></Link>
              <Link className="workspace-module-card" href="/reports"><span>▤</span><div><h3>Reports</h3><p>Review order summaries and export account records.</p><small>Open reports workspace <b>→</b></small></div></Link>
              <Link className="workspace-module-card" href="/invoices"><span>▧</span><div><h3>Invoices</h3><p>Order references and payment details for billing.</p><small>Open invoice register <b>→</b></small></div></Link>
            </div>
          </details>

          <footer className="footer"><span>PayProof AI <span className="footer-dot">·</span> Built for clearer payment operations</span><span><i /> Sandbox preview · No real payments</span></footer>
        </div>

      {flowStep === 2 && (
        <section className="order-flow-screen" aria-label="Create new order">
          <div className="order-flow-card order-form-reference">
            <div className="order-flow-icon">▤</div>
            <h1>Create New Order</h1>
            <div className="order-flow-form">
              <label htmlFor="flow-customer">Customer Name</label>
              <input id="flow-customer" type="text" value={flowCustomer} onChange={(event) => { setFlowCustomer(event.target.value); setFlowError(""); }} placeholder="Enter customer name" autoComplete="name" maxLength={100} required />
              <label htmlFor="flow-message">Enter Order Text <span className="order-optional-label">(optional)</span></label>
              <textarea id="flow-message" value={flowMessage} onChange={(event) => { setFlowMessage(event.target.value); setFlowError(""); }} placeholder="Example: 2 Coffee gift sets" rows={4} />
              <p className="order-flow-hint">Your order text will be used to prepare a suggested sales order. Review and validate the extracted product and quantity before continuing to PayPal. Nothing is saved at this stage.</p>
              {flowError && <p className="order-flow-error" role="alert">{flowError}</p>}
              {flowDraft && <div className="draft-result flow-draft-result">
                <div className="draft-title">Extracted sales order <span>REVIEW REQUIRED · NOT SAVED</span></div>
                <p className="draft-review-hint">Edit the suggested fields, then compare them with the original customer message above.</p>
                <label className="draft-field-label" htmlFor="flow-draft-product">PRODUCT NAME</label>
                <input id="flow-draft-product" className="draft-edit-input" type="text" value={flowDraft.item} maxLength={120} autoComplete="off" onChange={(event) => { setFlowDraft((current) => current ? { ...current, item: event.target.value } : current); setFlowValidation(null); }} />
                <label className="draft-field-label" htmlFor="flow-draft-quantity">QUANTITY</label>
                <input id="flow-draft-quantity" className="draft-edit-input" type="number" min="1" max="100" step="1" inputMode="numeric" value={flowDraft.quantity} onChange={(event) => { setFlowDraft((current) => current ? { ...current, quantity: event.target.value } : current); setFlowValidation(null); }} />
                <p className="draft-review-hint">Validation checks formatting only; it cannot confirm product availability, price, customer intent, or payment.</p>
                {flowDraft.note && <p className="draft-note">{flowDraft.note}</p>}
                <button type="button" className="primary-button full-button" onClick={() => {
                  if (!flowDraft) return;
                  const productIsSupported = Object.prototype.hasOwnProperty.call(CATALOG_PRICES, flowDraft.item.trim());
                  const quantityIsValid = /^[1-9]\d*$/.test(flowDraft.quantity.trim()) && Number.isSafeInteger(Number(flowDraft.quantity)) && Number(flowDraft.quantity) <= 100;
                  if (!productIsSupported || !quantityIsValid) {
                    setFlowValidation({ valid: false, message: !productIsSupported ? "Choose a supported catalogue product: Coffee gift set, Ceramic mug pair, or Handwoven market tote." : "Enter a whole-number quantity from 1 to 100." });
                    return;
                  }
                  setFlowValidation({ valid: true, message: "The product is in the supported catalogue and the quantity is valid. Confirm both against the original customer message. The server will calculate the price; this draft is not saved and payment is not verified." });
                }}>Validate draft details</button>
                {flowValidation && <div className={`draft-validation ${flowValidation.valid ? "validation-success" : "validation-warning"}`} role="status" aria-live="polite"><strong>{flowValidation.valid ? "✓ Details checked" : "Review required"}</strong><p>{flowValidation.message}</p></div>}
                {flowValidation?.valid && <div className="draft-checkout">
                  <div className="draft-total"><span>Estimated total · {flowDraft.item}</span><strong>${(CATALOG_PRICES[flowDraft.item.trim()] * Number(flowDraft.quantity)).toFixed(2)} USD</strong></div>
                  <p>Sandbox checkout only. The server independently validates the product and calculates the final amount. This does not save an order record.</p>
                  <button type="button" className="primary-button full-button" onClick={() => startSandboxCheckout(flowDraft.item.trim(), Number(flowDraft.quantity), flowCustomer.trim())} disabled={checkoutLoading}>{checkoutLoading ? "Connecting to PayPal…" : "Continue to PayPal Sandbox"} <span>↗</span></button>
                </div>}
              </div>}
            </div>
            <div className="order-flow-actions order-form-actions">{!flowDraft && <button className="primary-button" onClick={prepareCheckoutOrder} disabled={flowBusy}>{flowBusy ? "Preparing…" : "Extract order details"}</button>}<button className="secondary-button" onClick={resetOrderFlow}>Cancel</button></div>
          </div>
        </section>
      )}
      </section>
    </main>
  );
}
