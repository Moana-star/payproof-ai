"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { WorkspaceLayout } from "@/components/workspace-layout";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

type SavedOrder = {
  order_number: string;
  customer_name?: string | null;
  product_name: string;
  quantity: number;
  total_amount: string;
  currency: string;
  payment_status: string;
  payment_environment?: string | null;
  paypal_order_id?: string | null;
  paypal_capture_id?: string | null;
  verified_at?: string | null;
  created_at?: string | null;
};

function money(amount: string, currency: string) {
  const value = Number(amount);
  if (!Number.isFinite(value)) return `${amount} ${currency}`;
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD" }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency || "USD"}`;
  }
}

export default function ExceptionsPage() {
  const [orders, setOrders] = useState<SavedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) {
        if (active) { setSignedIn(false); setLoading(false); }
        return;
      }
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!active) return;
        if (!session) {
          setSignedIn(false);
          setOrders([]);
          setLoading(false);
          return;
        }
        setSignedIn(true);
        const response = await fetch("/api/orders", {
          cache: "no-store",
          headers: { Authorization: `Bearer ${session.access_token}` }
        });
        const data = await response.json() as { orders?: SavedOrder[]; error?: string; configured?: boolean };
        if (!response.ok) throw new Error(data.error || "Your saved orders could not be loaded.");
        if (data.configured === false) throw new Error("Order storage is not configured. No live exception data is available.");
        if (active) setOrders(data.orders || []);
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Live account orders could not be loaded.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, []);

  const cases = useMemo(
    () => orders.filter((order) => order.payment_status !== "paid"),
    [orders]
  );

  return (
    <WorkspaceLayout
      title="Exception review"
      eyebrow="PAYMENT EXCEPTIONS"
      description="Review genuine outstanding payment records from your signed-in workspace. Cases are drawn from saved account orders—not illustrative demo scenarios."
    >
      <div className="ops-info-banner ops-warning-banner">
        <span className="ops-info-icon">!</span>
        <div>
          <strong>Review does not mean fraud</strong>
          <p>An order awaiting capture is a payment follow-up, not evidence of fraud. PayProof never labels a customer fraudulent based only on a pending payment.</p>
        </div>
      </div>

      <div className="ops-exception-summary">
        <div><span className="ops-summary-icon amber">◷</span><div><strong>{loading ? "—" : cases.filter((item) => item.payment_status === "awaiting_payment").length.toString().padStart(2, "0")}</strong><small>Awaiting PayPal capture</small></div></div>
        <div><span className="ops-summary-icon red">!</span><div><strong>{loading ? "—" : cases.filter((item) => item.payment_status !== "awaiting_payment").length.toString().padStart(2, "0")}</strong><small>Other payment review</small></div></div>
        <div><span className="ops-summary-icon purple">▤</span><div><strong>{loading ? "—" : cases.length.toString().padStart(2, "0")}</strong><small>Live cases in this account</small></div></div>
      </div>

      <div className="ops-section-title">
        <div><h2>Live account cases</h2><p>Only saved orders belonging to the signed-in account are shown.</p></div>
        <span className="ops-live-badge">ACCOUNT DATA</span>
      </div>

      {loading ? (
        <section className="ops-panel" style={{ padding: 24 }}><strong>Loading your account payment records…</strong><p>Payment status is read from saved orders; this page does not create or infer cases.</p></section>
      ) : !signedIn ? (
        <section className="ops-panel" style={{ padding: 24 }}>
          <h3>Sign in to view your real cases</h3>
          <p>This page does not display shared or synthetic transactions. Sign in to load orders saved to your own workspace.</p>
          <Link className="ops-primary-button" href="/auth">Sign in <span>↗</span></Link>
        </section>
      ) : error ? (
        <section className="ops-panel" style={{ padding: 24 }}><h3>Live records unavailable</h3><p>{error}</p><button className="ops-secondary-button" type="button" onClick={() => window.location.reload()}>Retry</button></section>
      ) : cases.length === 0 ? (
        <section className="ops-panel" style={{ padding: 28 }}>
          <div className="ops-cta-icon">✓</div>
          <h3>No outstanding payment exceptions</h3>
          <p>All saved orders in this account currently have a server-verified paid status. New pending or review-required orders will appear here automatically.</p>
          <Link className="ops-secondary-button" href="/reconciliation">Review reconciliation <span>↗</span></Link>
        </section>
      ) : (
        <div className="ops-exception-list">
          {cases.map((order) => {
            const pending = order.payment_status === "awaiting_payment";
            const customer = order.customer_name?.trim() || "Customer name not captured";
            const created = order.created_at ? new Date(order.created_at).toLocaleString() : "Creation time unavailable";
            const title = pending ? "PayPal capture not completed" : "Payment requires review";
            const detail = `${money(order.total_amount, order.currency)} · ${order.product_name} × ${order.quantity} · ${customer}`;
            return (
              <article className="ops-panel ops-exception-card" key={order.order_number}>
                <div className="ops-exception-head">
                  <div className="ops-exception-symbol">{pending ? "◷" : "!"}</div>
                  <div className="ops-exception-title">
                    <span>{order.order_number}</span>
                    <h3>{title}</h3>
                    <p>{detail}</p>
                    <small>Saved order · {created}</small>
                  </div>
                  <span className={`ops-status ${pending ? "pending" : "review"}`}><i />{pending ? "Awaiting payment" : "Review required"}</span>
                </div>
                <div className="ops-exception-body">
                  <div>
                    <p className="ops-field-label">SAFE NEXT STEPS</p>
                    <ol>
                      <li>Check the order&apos;s current status in the PayPal Sandbox and the Payment evidence register.</li>
                      <li>If no completed server-verified capture exists, keep the order unpaid and do not fulfil it.</li>
                      <li>After the buyer completes checkout, refresh the account record and confirm the server verification timestamp.</li>
                    </ol>
                    {order.paypal_order_id && <p><strong>PayPal order reference:</strong> <code>{order.paypal_order_id}</code></p>}
                    {order.paypal_capture_id && <p><strong>Capture reference:</strong> <code>{order.paypal_capture_id}</code></p>}
                  </div>
                  <div className="ops-exception-actions">
                    <span className="ops-priority">{pending ? "Payment follow-up" : "Manual review"}</span>
                    <Link className="ops-secondary-button" href="/payments">View payment evidence ↗</Link>
                    <Link className="ops-text-link" href="/reconciliation">Open reconciliation →</Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <div className="ops-bottom-cta">
        <div><span className="ops-cta-icon">✓</span><div><strong>Evidence-led payment decisions</strong><p>Only a server-verified completed PayPal capture can establish paid status. Reconciliation posting still requires human approval.</p></div></div>
        <Link className="ops-primary-button" href="/demo-guide">Open judge demo guide <span>↗</span></Link>
      </div>
    </WorkspaceLayout>
  );
}
