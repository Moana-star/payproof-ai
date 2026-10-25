"use client";

import { useState } from "react";
import Link from "next/link";

type Investigation = {
  status?: string;
  verified?: boolean;
  summary?: string;
  error?: string;
  paypalStatus?: string;
  orderIdMatches?: boolean;
};

export default function PaymentInvestigatorPage() {
  const [orderId, setOrderId] = useState("");
  const [result, setResult] = useState<Investigation | null>(null);
  const [loading, setLoading] = useState(false);

  async function investigate() {
    if (!orderId.trim()) {
      setResult({ status: "REVIEW_REQUIRED", error: "Enter the PayPal Sandbox order ID first." });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch("/api/paypal/investigate-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: orderId.trim() })
      });
      const data = await response.json() as Investigation;
      setResult(data);
    } catch {
      setResult({ status: "REVIEW_REQUIRED", error: "The investigation request failed. Check your connection and try again." });
    } finally {
      setLoading(false);
    }
  }

  const verified = result?.verified === true;
  return (
    <main className="checkout-page">
      <div className="checkout-card" style={{ maxWidth: 620, textAlign: "left" }}>
        <a className="brand checkout-brand" href="/">
          <span className="brand-mark">P<span>✓</span></span>
          <span className="brand-name">payproof<span>ai</span></span>
        </a>
        <p className="checkout-eyebrow">EVIDENCE-FIRST WORKFLOW</p>
        <h1>Payment Investigator</h1>
        <p>Review a PayPal Sandbox order using server-side evidence. AI can help explain results, but it cannot mark a payment as paid.</p>
        <label htmlFor="order-id" className="field-label">PAYPAL SANDBOX ORDER ID</label>
        <input id="order-id" value={orderId} onChange={(event) => setOrderId(event.target.value)} maxLength={40} autoComplete="off" placeholder="Paste the order ID from checkout" style={{ width: "100%", boxSizing: "border-box", padding: "14px", border: "1px solid #ded9e2", borderRadius: 10, margin: "8px 0 14px" }} />
        <button className="primary-button checkout-home" onClick={investigate} disabled={loading} style={{ width: "100%", justifyContent: "center" }}>
          {loading ? "Checking PayPal…" : "Investigate order"} <span>→</span>
        </button>
        {result && <section aria-live="polite" className="draft-result" style={{ marginTop: 20 }}>
          <div className="draft-title">Result <span>{result.status || "REVIEW_REQUIRED"}</span></div>
          <p>{result.summary || result.error || "The evidence could not be verified."}</p>
          {result.paypalStatus && <div className="draft-line"><span>PayPal status</span><strong>{result.paypalStatus}</strong></div>}
          {typeof result.orderIdMatches === "boolean" && <div className="draft-line"><span>Order ID match</span><strong>{result.orderIdMatches ? "Matched" : "Mismatch"}</strong></div>}
          <p className="field-hint">{verified ? "Current demo checks passed. This is Sandbox evidence only." : "Not verified. Do not fulfil this order until the discrepancy is resolved."}</p>
        </section>}
        <div className="evidence-note" style={{ marginTop: 22 }}>
          <span>✓</span><p><strong>Important</strong><br />A browser redirect, screenshot, customer claim, or AI-generated explanation is not proof of payment. This prototype does not persist investigation history.</p>
        </div>
        <Link className="text-button" href="/" style={{ display: "inline-block", marginTop: 20 }}>← Back to dashboard</Link>
      </div>
    </main>
  );
}
