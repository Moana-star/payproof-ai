"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { WorkspaceLayout } from "@/components/workspace-layout";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

type ModuleKey = "customers" | "shipping" | "analytics" | "reports" | "invoices";
type Order = {
  order_number: string; customer_name?: string | null; product_name: string; quantity: number;
  total_amount: string; currency: string; payment_status: string; payment_environment?: string;
  paypal_order_id?: string | null; paypal_capture_id?: string | null; verified_at?: string | null; created_at?: string | null;
};
const config: Record<ModuleKey, { title: string; eyebrow: string; description: string; icon: string }> = {
  customers: { title: "Customers", eyebrow: "CUSTOMER MANAGEMENT", description: "Review customer identities and the order history recorded in your private PayProof AI workspace.", icon: "♙" },
  shipping: { title: "Shipping", eyebrow: "FULFILMENT OPERATIONS", description: "Review orders that may be ready for fulfilment. PayProof AI does not yet connect to a carrier or provide tracking updates.", icon: "▣" },
  analytics: { title: "Analytics", eyebrow: "BUSINESS INTELLIGENCE", description: "Explore payment and order metrics calculated from the records saved to your account.", icon: "▥" },
  reports: { title: "Reports", eyebrow: "OPERATIONAL REPORTING", description: "Generate a CSV export from your account's saved order records for further analysis.", icon: "▤" },
  invoices: { title: "Invoices", eyebrow: "BILLING RECORDS", description: "Review order references and payment status before issuing invoices through your own billing process.", icon: "▧" }
};
function money(amount: string, currency: string) {
  const value = Number(amount);
  return Number.isFinite(value) ? new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD" }).format(value) : amount + " " + currency;
}
function dateLabel(value?: string | null) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not recorded" : date.toLocaleDateString("en-KE", { dateStyle: "medium", timeZone: "Africa/Nairobi" });
}
export function WorkspaceModulePage({ module }: { module: ModuleKey }) {
  const meta = config[module];
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) { setLoading(false); setError("Account access is not configured. Add the public Supabase environment variables."); return; }
    let active = true;
    supabase.auth.getSession().then(async ({ data, error: sessionError }) => {
      if (!active) return;
      if (sessionError || !data.session) { setLoading(false); return; }
      setSignedIn(true);
      try {
        const response = await fetch("/api/orders", { cache: "no-store", headers: { Authorization: "Bearer " + data.session.access_token } });
        const payload = await response.json() as { orders?: Order[]; error?: string };
        if (!response.ok) throw new Error(payload.error || "Could not load your saved orders.");
        if (active) setOrders(payload.orders || []);
      } catch (e) { if (active) setError(e instanceof Error ? e.message : "Could not load your saved orders."); }
      finally { if (active) setLoading(false); }
    });
    return () => { active = false; };
  }, []);
  const customers = useMemo(() => {
    const map = new Map<string, { name: string; orders: Order[] }>();
    orders.forEach(order => {
      const name = order.customer_name?.trim() || "Name not provided";
      const key = name.toLowerCase();
      const existing = map.get(key) || { name, orders: [] };
      existing.orders.push(order); map.set(key, existing);
    });
    return [...map.values()];
  }, [orders]);
  const paid = orders.filter(o => o.payment_status === "paid");
  const pending = orders.filter(o => o.payment_status === "awaiting_payment");
  const review = orders.filter(o => ["payment_review", "failed"].includes(o.payment_status));
  const total = orders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
  function exportCsv() {
    const columns = ["order_number","customer_name","product_name","quantity","total_amount","currency","payment_status","paypal_order_id","paypal_capture_id","created_at","verified_at"];
    const quote = (v: unknown) => '"' + String(v ?? "").replace(/"/g, '""') + '"';
    const rows = [columns.join(","), ...orders.map(order => columns.map(key => quote(key === "customer_name" ? order.customer_name : order[key as keyof Order])).join(","))];
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const anchor = document.createElement("a");
    anchor.href = url; anchor.download = "payproof-ai-orders.csv"; anchor.click(); URL.revokeObjectURL(url);
  }
  const records = module === "customers" ? customers.length : orders.length;
  return <WorkspaceLayout title={meta.title} eyebrow={meta.eyebrow} description={meta.description}>
    <div className="ops-info-banner"><span className="ops-info-icon">i</span><div><strong>{signedIn ? "Private account data" : "Sign in to load your records"}</strong><p>{signedIn ? "This page uses the orders saved to your signed-in account. Empty states mean no matching records have been saved yet." : "Your business records are private. Sign in to view orders and customer information associated with your account."}</p>{!signedIn && <p><Link href="/auth">Sign in or create an account ↗</Link></p>}</div></div>
    {error && <div className="ops-info-banner ops-warning-banner"><span className="ops-info-icon">!</span><div><strong>Records could not be loaded</strong><p>{error}</p></div></div>}
    {module === "customers" && <>
      <div className="ops-metric-grid"><article className="ops-metric"><span>Customers</span><strong>{loading ? "—" : customers.length}</strong><small>Distinct customer names in saved orders</small><span className="ops-metric-icon purple">♙</span></article><article className="ops-metric"><span>Orders</span><strong>{orders.length}</strong><small>Saved account orders</small><span className="ops-metric-icon green">▤</span></article><article className="ops-metric"><span>Verified payments</span><strong>{paid.length}</strong><small>Server-verified captures</small><span className="ops-metric-icon green">✓</span></article><article className="ops-metric"><span>Needs review</span><strong>{review.length}</strong><small>Failed or flagged orders</small><span className="ops-metric-icon amber">!</span></article></div>
      <section className="ops-panel"><div className="ops-panel-top"><div><span className="ops-panel-symbol">♙</span><div><strong>Customer directory</strong><p>Customers grouped from saved order names</p></div></div><span className="ops-live-badge">ACCOUNT RECORDS</span></div><div className="ops-table-wrap"><table className="ops-table"><thead><tr><th>CUSTOMER</th><th>ORDERS</th><th>ORDER HISTORY</th><th>LAST ORDER</th></tr></thead><tbody>{customers.map(c => <tr key={c.name}><td><strong>{c.name}</strong></td><td>{c.orders.length}</td><td>{c.orders.map(o => o.order_number).join(", ")}</td><td>{dateLabel(c.orders.map(o => o.created_at).filter(Boolean).sort().at(-1))}</td></tr>)}{!customers.length && <tr><td colSpan={4}>{loading ? "Loading customer records…" : "No customer records yet. Save an order with a customer name to build your directory."}</td></tr>}</tbody></table></div></section>
    </>}
    {module === "shipping" && <>
      <div className="ops-metric-grid"><article className="ops-metric"><span>Verified orders</span><strong>{paid.length}</strong><small>Payment verified by server</small><span className="ops-metric-icon green">✓</span></article><article className="ops-metric"><span>Awaiting payment</span><strong>{pending.length}</strong><small>Not ready for fulfilment</small><span className="ops-metric-icon amber">◷</span></article><article className="ops-metric"><span>Review hold</span><strong>{review.length}</strong><small>Do not dispatch</small><span className="ops-metric-icon red">!</span></article><article className="ops-metric"><span>Carrier tracking</span><strong>—</strong><small>No carrier connected</small><span className="ops-metric-icon purple">▣</span></article></div>
      <div className="ops-info-banner ops-warning-banner"><span className="ops-info-icon">!</span><div><strong>Payment verification is not shipment confirmation</strong><p>Only verified-paid orders appear in the fulfilment review list. Add delivery details and confirm dispatch using your carrier's own system; tracking is not connected here.</p></div></div>
      <section className="ops-panel"><div className="ops-panel-top"><div><span className="ops-panel-symbol mint">▣</span><div><strong>Fulfilment review queue</strong><p>Verified payments that may be ready for manual fulfilment</p></div></div><span className="ops-live-badge">PAYMENT-VERIFIED ONLY</span></div><div className="ops-table-wrap"><table className="ops-table"><thead><tr><th>ORDER</th><th>CUSTOMER</th><th>ITEM</th><th>PAYMENT</th><th>VERIFIED</th><th>SHIPPING</th></tr></thead><tbody>{paid.map(o => <tr key={o.order_number}><td><strong className="ops-id">{o.order_number}</strong></td><td>{o.customer_name || "Name not provided"}</td><td>{o.product_name} × {o.quantity}</td><td><span className="ops-status good"><i />Verified paid</span></td><td>{dateLabel(o.verified_at)}</td><td><span className="ops-status neutral">Not dispatched here</span></td></tr>)}{!paid.length && <tr><td colSpan={6}>{loading ? "Loading fulfilment records…" : "No verified-paid orders are ready for fulfilment review."}</td></tr>}</tbody></table></div></section>
    </>}
    {module === "analytics" && <>
      <div className="ops-metric-grid"><article className="ops-metric"><span>Total orders</span><strong>{orders.length}</strong><small>All saved statuses</small><span className="ops-metric-icon purple">▤</span></article><article className="ops-metric"><span>Verified revenue</span><strong>{money(paid.reduce((s,o)=>s+(Number(o.total_amount)||0),0).toFixed(2), paid[0]?.currency || "USD")}</strong><small>Verified-paid orders only</small><span className="ops-metric-icon green">✓</span></article><article className="ops-metric"><span>Awaiting payment</span><strong>{pending.length}</strong><small>Not counted as revenue</small><span className="ops-metric-icon amber">◷</span></article><article className="ops-metric"><span>Exceptions</span><strong>{review.length}</strong><small>Failed or review status</small><span className="ops-metric-icon red">!</span></article></div>
      <section className="ops-panel"><div className="ops-panel-top"><div><span className="ops-panel-symbol violet">▥</span><div><strong>Order performance</strong><p>Calculated from your account's saved records</p></div></div><span className="ops-live-badge">LIVE ACCOUNT DATA</span></div><div className="ops-evidence-check"><span>01</span><div><strong>Verified payment rate</strong><p>{orders.length ? ((paid.length / orders.length) * 100).toFixed(1) + "% of saved orders are verified paid." : "No saved orders available to calculate a rate."}</p></div></div><div className="ops-evidence-check"><span>02</span><div><strong>Average verified order value</strong><p>{paid.length ? money((paid.reduce((s,o)=>s+(Number(o.total_amount)||0),0)/paid.length).toFixed(2), paid[0].currency || "USD") : "Not available until a payment is verified."}</p></div></div><div className="ops-evidence-check"><span>03</span><div><strong>Recorded order value</strong><p>{money(total.toFixed(2), orders[0]?.currency || "USD")} across all saved orders; this is not revenue because pending and review orders may be unpaid.</p></div></div></section>
    </>}
    {module === "reports" && <>
      <div className="ops-section-title"><div><h2>Order data export</h2><p>Download the saved order register as a CSV file.</p></div><button className="ops-primary-button" onClick={exportCsv} disabled={!signedIn || loading || !orders.length}>Export CSV <span>↓</span></button></div>
      <div className="ops-metric-grid"><article className="ops-metric"><span>Records available</span><strong>{orders.length}</strong><small>Saved orders</small><span className="ops-metric-icon purple">▤</span></article><article className="ops-metric"><span>Verified paid</span><strong>{paid.length}</strong><small>Server verified</small><span className="ops-metric-icon green">✓</span></article><article className="ops-metric"><span>Awaiting payment</span><strong>{pending.length}</strong><small>Pending</small><span className="ops-metric-icon amber">◷</span></article><article className="ops-metric"><span>Review / failed</span><strong>{review.length}</strong><small>Requires attention</small><span className="ops-metric-icon red">!</span></article></div>
      <section className="ops-panel"><div className="ops-panel-top"><div><span className="ops-panel-symbol">▤</span><div><strong>Report preview</strong><p>Only records returned for the signed-in account are included</p></div></div><span className="ops-live-badge">CSV EXPORT</span></div><div className="ops-table-wrap"><table className="ops-table"><thead><tr><th>ORDER</th><th>CUSTOMER</th><th>PRODUCT</th><th>AMOUNT</th><th>STATUS</th><th>DATE</th></tr></thead><tbody>{orders.map(o => <tr key={o.order_number}><td><strong className="ops-id">{o.order_number}</strong></td><td>{o.customer_name || "Name not provided"}</td><td>{o.product_name} × {o.quantity}</td><td className="ops-amount">{money(o.total_amount,o.currency)}</td><td>{o.payment_status}</td><td>{dateLabel(o.created_at)}</td></tr>)}{!orders.length && <tr><td colSpan={6}>{loading ? "Preparing report…" : "No saved orders to include in a report yet."}</td></tr>}</tbody></table></div></section>
    </>}
    {module === "invoices" && <>
      <div className="ops-info-banner ops-warning-banner"><span className="ops-info-icon">!</span><div><strong>Invoice issuing is not enabled</strong><p>This register helps you locate order and payment references. It does not create legally numbered invoices, send them to customers, or record due dates.</p></div></div>
      <div className="ops-metric-grid"><article className="ops-metric"><span>Order references</span><strong>{orders.length}</strong><small>Saved account orders</small><span className="ops-metric-icon purple">▧</span></article><article className="ops-metric"><span>Paid</span><strong>{paid.length}</strong><small>Verified captures</small><span className="ops-metric-icon green">✓</span></article><article className="ops-metric"><span>Awaiting payment</span><strong>{pending.length}</strong><small>Not settled</small><span className="ops-metric-icon amber">◷</span></article><article className="ops-metric"><span>Review required</span><strong>{review.length}</strong><small>Resolve before billing</small><span className="ops-metric-icon red">!</span></article></div>
      <section className="ops-panel"><div className="ops-panel-top"><div><span className="ops-panel-symbol violet">▧</span><div><strong>Order-to-invoice reference register</strong><p>Use these references when preparing invoices in your billing system</p></div></div><span className="ops-sample-tag">NOT ISSUED</span></div><div className="ops-table-wrap"><table className="ops-table"><thead><tr><th>ORDER</th><th>CUSTOMER</th><th>AMOUNT</th><th>PAYMENT REFERENCE</th><th>STATUS</th><th>INVOICE</th></tr></thead><tbody>{orders.map(o => <tr key={o.order_number}><td><strong className="ops-id">{o.order_number}</strong></td><td>{o.customer_name || "Name not provided"}</td><td className="ops-amount">{money(o.total_amount,o.currency)}</td><td><code>{o.paypal_capture_id || o.paypal_order_id || "Not available"}</code></td><td>{o.payment_status}</td><td><span className="ops-status neutral">Not issued</span></td></tr>)}{!orders.length && <tr><td colSpan={6}>{loading ? "Loading order references…" : "No saved order references yet."}</td></tr>}</tbody></table></div></section>
    </>}
    <div className="ops-bottom-cta"><div><span className="ops-cta-icon">{meta.icon}</span><div><strong>Back to your payment workspace</strong><p>All records remain tied to your signed-in account. Payment status is based on server verification.</p></div></div><Link className="ops-primary-button" href="/">Return to overview <span>↗</span></Link></div>
    <p className="ops-footer">{loading ? "Loading account records…" : signedIn ? records + (module === "customers" ? " customer profiles derived from saved orders" : " saved order records loaded") : "No private records displayed"} <span>Sandbox data · No real payments</span></p>
  </WorkspaceLayout>;
}
