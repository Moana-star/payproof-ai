"use client";

import { useState } from "react";
import Link from "next/link";

type Investigation = {
  status?: string;
  verified?: boolean;
  summary?: string;
  error?: string;
  paypalStatus?: string;
  orderId?: string | null;
  captureId?: string | null;
  captureStatus?: string;
  amount?: string | null;
  currency?: string | null;
  checks?: Record<string, boolean>;
  failedChecks?: string[];
};

const checkLabels: Record<string, string> = {
  orderIdMatches: "PayPal order ID matches",
  orderCompleted: "Order status is completed",
  capturePresent: "Capture record exists",
  captureCompleted: "Capture status is completed",
  amountMatches: "Captured amount matches $24.50",
  currencyMatches: "Currency matches USD",
  referenceMatches: "Trusted order reference matches"
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
        <Link className="brand checkout-brand" href="/">
          <span className="brand-mark">P<span>✓</span></span>
          <span className="brand-name">payproof<span>ai</span></span>
        </Link>
        <p className="checkout-eyebrow">EVIDENCE-FIRST WORKFLOW</p>
        <h1>Payment Investigator</h1>
        <p>Check a PayPal Sandbox order against the expected demo amount, currency, trusted reference, order status, and capture details. This preview uses deterministic server-side checks; AI explanations are not enabled yet.</p>
        <label htmlFor="order-id" className="field-label">PAYPAL SANDBOX ORDER ID</label>
        <input id="order-id" value={orderId} onChange={(event) => setOrderId(event.target.value)} maxLength={40} autoComplete="off" placeholder="Paste the order ID from checkout" style={{ width: "100%", boxSizing: "border-box", padding: "14px", border: "1px solid #ded9e2", borderRadius: 10, margin: "8px 0 14px" }} />
        <button className="primary-button checkout-home" onClick={investigate} disabled={loading} style={{ width: "100%", justifyContent: "center" }}>
          {loading ? "Checking PayPal…" : "Investigate order"} <span>→</span>
        </button>
        {result && <section aria-live="polite" className="draft-result" style={{ marginTop: 20 }}>
          <div className="draft-title">Result <span>{result.status || "REVIEW_REQUIRED"}</span></div>
          <p>{result.summary || result.error || "The evidence could not be verified."}</p>
          {result.paypalStatus && <div className="draft-line"><span>PayPal order status</span><strong>{result.paypalStatus}</strong></div>}
          {result.captureStatus && <div className="draft-line"><span>Capture status</span><strong>{result.captureStatus}</strong></div>}
          {result.captureId && <div className="draft-line"><span>Capture ID</span><strong>{result.captureId}</strong></div>}
          {result.amount && result.currency && <div className="draft-line"><span>Captured amount</span><strong>{result.amount} {result.currency}</strong></div>}
          {result.checks && <div style={{ marginTop: 12 }}>
            <strong style={{ fontSize: 11 }}>Verification checks</strong>
            {Object.entries(result.checks).map(([key, passed]) => <div className="draft-line" key={key}><span>{checkLabels[key] || key}</span><strong style={{ color: passed ? "#188a63" : "#c8515c" }}>{passed ? "PASS" : "FAIL"}</strong></div>)}
          </div>}
          <p className="field-hint">{verified ? "All required checks passed for this fixed-price Sandbox demo only. This is not production payment processing." : "Not verified. Do not fulfil this order until every required check passes and the order is matched to a trusted internal record."}</p>
        </section>}
        <div className="evidence-note" style={{ marginTop: 22 }}>
          <span>✓</span><p><strong>Important</strong><br />A browser redirect, screenshot, customer claim, or AI-generated explanation is not proof of payment. This demo checks only its fixed-price reference and does not persist investigation history or authorize arbitrary customer orders.</p>
        </div>
        <Link className="text-button" href="/" style={{ display: "inline-block", marginTop: 20 }}>← Back to dashboard</Link>
      </div>
    </main>
  );
}
