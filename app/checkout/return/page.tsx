"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

type CaptureResult = {
  verified?: boolean;
  status?: string;
  message?: string;
  error?: string;
  persisted?: boolean;
  persistenceWarning?: string;
  verifiedAt?: string;
  evidenceSource?: string;
  expectedAmount?: string;
  transaction?: { orderId?: string; referenceId?: string; captureId?: string; amount?: string; currency?: string; product?: string; quantity?: number };
};

function ReturnContent() {
  const searchParams = useSearchParams();
  const [result, setResult] = useState<CaptureResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const orderId = searchParams.get("token");
    if (!orderId) {
      setResult({ verified: false, status: "REVIEW_REQUIRED", error: "PayPal did not return an order reference. No payment was confirmed." });
      setLoading(false);
      return;
    }

    let active = true;
    fetch("/api/paypal/capture-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId })
    })
      .then(async (response) => {
        const data = (await response.json()) as CaptureResult;
        if (active) setResult(data);
      })
      .catch(() => {
        if (active) setResult({ verified: false, status: "REVIEW_REQUIRED", error: "We could not verify the result. Check the dashboard and retry safely." });
      })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [searchParams]);

  return (
    <main className="checkout-page">
      <div className="checkout-card">
        <Link className="brand checkout-brand" href="/"><span className="brand-mark">P<span>✓</span></span><span className="brand-name">payproof<span>ai</span></span></Link>
        {loading ? <><div className="checkout-symbol loading-symbol">…</div><h1>Verifying with PayPal</h1><p>We are checking the server-side transaction result. Please keep this page open.</p></>
          : result?.verified ? <><div className="checkout-symbol success-symbol">✓</div><p className="checkout-eyebrow">SANDBOX VERIFICATION</p><h1>Payment verified</h1><p>{result.message}</p><div className="verification-details"><span>Product</span><strong>{result.transaction?.product || "Catalogue order"}</strong><span>Quantity</span><strong>{result.transaction?.quantity ?? "—"}</strong><span>Expected amount</span><strong>{result.transaction?.currency} {result.expectedAmount || "—"}</strong><span>Captured amount</span><strong>{result.transaction?.currency} {result.transaction?.amount}</strong><span>Evidence source</span><strong>{result.evidenceSource || "PayPal Sandbox server API"}</strong><span>Verification time</span><strong>{result.verifiedAt ? new Date(result.verifiedAt).toLocaleString() : "Not available"}</strong><span>PayPal order reference</span><strong>{result.transaction?.referenceId || result.transaction?.orderId || "Available in PayPal Sandbox"}</strong><span>Capture reference</span><strong>{result.transaction?.captureId || "Available in PayPal Sandbox"}</strong><span>Order saved</span><strong>{result.persisted ? "Yes" : "Not yet"}</strong></div>{result.persistenceWarning && <p className="checkout-small">{result.persistenceWarning}</p>}<div className="verification-decision"><strong>{result.persisted ? "NEXT ACTION · PROCEED" : "NEXT ACTION · WAIT"}</strong><p>{result.persisted ? "Server verification passed and the evidence was saved. A seller can continue with the normal fulfilment review." : "Verification passed, but the saved evidence is not confirmed. Wait until the order is visible in the workspace before fulfilment."}</p></div>{result.persisted && <p className="checkout-small">The verified order and capture reference have been saved to the PayProof AI database. Sandbox testing only; no real payment processing.</p>}</>
          : <><div className="checkout-symbol review-symbol">!</div><p className="checkout-eyebrow">NO PAYMENT CONFIRMATION</p><h1>Needs a closer look</h1><p>{result?.error || result?.message || "The transaction did not pass every verification check."}</p><div className="verification-decision"><strong>NEXT ACTION · REVIEW</strong><p>Do not fulfil. Recheck the server response and PayPal Sandbox transaction details.</p></div><p className="checkout-small">For safety, PayProof AI will not mark this order as paid unless the expected transaction is verified.</p></>}
        <Link className="primary-button checkout-home" href="/">Return to workspace <span>→</span></Link>
        <p className="checkout-footnote">PayProof AI · Sandbox testing only · No real payment processing</p>
      </div>
    </main>
  );
}

export default function CheckoutReturnPage() {
  return <Suspense fallback={<main className="checkout-page"><div className="checkout-card"><p>Loading verification result…</p></div></main>}><ReturnContent /></Suspense>;
}
