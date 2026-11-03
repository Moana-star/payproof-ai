"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

type CaptureResult = {
  verified?: boolean;
  status?: string;
  message?: string;
  error?: string;
  persisted?: boolean;
  persistenceWarning?: string;
  transaction?: { orderId?: string; referenceId?: string; captureId?: string; amount?: string; currency?: string; product?: string; quantity?: number };
};

const MAX_ATTEMPTS = 4;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function ReturnContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("token");
  const [result, setResult] = useState<CaptureResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [retrying, setRetrying] = useState(false);
  const inFlight = useRef(false);

  const verifyPayment = useCallback(async (manualRetry = false) => {
    if (!orderId) {
      setResult({ verified: false, status: "REVIEW_REQUIRED", error: "PayPal did not return an order reference. No payment was confirmed." });
      setLoading(false);
      return;
    }
    if (inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    setAttempt(0);
    if (manualRetry) setRetrying(true);

    let lastResult: CaptureResult = {
      verified: false,
      status: "REVIEW_REQUIRED",
      error: "PayPal's confirmation is taking longer than expected. You can safely retry verification; do not pay again."
    };

    try {
      for (let currentAttempt = 1; currentAttempt <= MAX_ATTEMPTS; currentAttempt++) {
        setAttempt(currentAttempt);
        try {
          const response = await fetch("/api/paypal/capture-order", {
            method: "POST",
            cache: "no-store",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId })
          });
          const body = (await response.json()) as CaptureResult;
          lastResult = body;

          // PayPal can briefly report an order as not yet completed immediately after
          // redirect. The endpoint re-reads PayPal and uses a stable capture request ID,
          // so retrying verification does not create a second capture.
          if (response.ok && body.verified) {
            if (body.persisted) {
              setResult(body);
              return;
            }
            // Payment can be verified while a database write is temporarily unavailable.
            // Retry once more through the same idempotent endpoint to save the evidence.
            if (currentAttempt < MAX_ATTEMPTS) {
              await wait(900 * currentAttempt);
              continue;
            }
            setResult(body);
            return;
          }

          // Retry temporary conflict/not-yet-ready responses and server errors. Stop early
          // for clear client errors such as malformed input.
          const retryable = response.status === 409 || response.status >= 500 || response.status === 429;
          if (!retryable || currentAttempt === MAX_ATTEMPTS) {
            setResult(body);
            return;
          }
        } catch {
          lastResult = {
            verified: false,
            status: "REVIEW_REQUIRED",
            error: "The verification request was interrupted. PayProof AI will retry automatically; do not pay again."
          };
          if (currentAttempt === MAX_ATTEMPTS) {
            setResult(lastResult);
            return;
          }
        }

        await wait(700 * currentAttempt);
      }
      setResult(lastResult);
    } finally {
      inFlight.current = false;
      setLoading(false);
      setRetrying(false);
    }
  }, [orderId]);

  useEffect(() => {
    void verifyPayment();
  }, [verifyPayment]);

  return (
    <main className="checkout-page">
      <div className="checkout-card">
        <Link className="brand checkout-brand" href="/"><span className="brand-mark">P<span>✓</span></span><span className="brand-name">payproof<span>ai</span></span></Link>
        {loading ? <>
          <div className="checkout-symbol loading-symbol">…</div>
          <h1>Verifying with PayPal</h1>
          <p>PayProof AI is checking the server-side transaction and saving the evidence. Keep this page open; do not pay again.</p>
          <p className="checkout-small">Verification attempt {attempt || 1} of {MAX_ATTEMPTS}</p>
        </> : result?.verified ? <>
          <div className="checkout-symbol success-symbol">✓</div>
          <p className="checkout-eyebrow">SANDBOX VERIFICATION</p>
          <h1>Payment verified</h1>
          <p>{result.message}</p>
          <div className="verification-details">
            <span>Product</span><strong>{result.transaction?.product || "Catalogue order"}</strong>
            <span>Quantity</span><strong>{result.transaction?.quantity ?? "—"}</strong>
            <span>Verified amount</span><strong>{result.transaction?.currency} {result.transaction?.amount}</strong>
            <span>PayPal order reference</span><strong>{result.transaction?.referenceId || result.transaction?.orderId || "Available in PayPal Sandbox"}</strong>
            <span>Capture reference</span><strong>{result.transaction?.captureId || "Available in PayPal Sandbox"}</strong>
            <span>Order saved</span><strong>{result.persisted ? "Yes" : "Not yet"}</strong>
          </div>
          {result.persistenceWarning && <p className="checkout-small">{result.persistenceWarning}</p>}
          {result.persisted && <p className="checkout-small">The verified order and capture reference have been saved to the PayProof AI database. Sandbox testing only; no real payment processing.</p>}
          {!result.persisted && <button type="button" className="primary-button checkout-home" onClick={() => void verifyPayment(true)} disabled={loading || retrying}>{retrying ? "Retrying evidence save…" : "Retry saving evidence"}</button>}
        </> : <>
          <div className="checkout-symbol review-symbol">!</div>
          <p className="checkout-eyebrow">NO PAYMENT CONFIRMATION</p>
          <h1>Needs a closer look</h1>
          <p>{result?.error || result?.message || "The transaction did not pass every verification check."}</p>
          <p className="checkout-small">For safety, PayProof AI will not mark this order as paid unless the expected transaction is verified. Do not pay again.</p>
          <button type="button" className="primary-button checkout-home" onClick={() => void verifyPayment(true)} disabled={loading || retrying}>{retrying ? "Retrying verification…" : "Retry verification"}</button>
        </>}
        <Link className="primary-button checkout-home" href="/">Return to workspace <span>→</span></Link>
        <p className="checkout-footnote">PayProof AI · Sandbox testing only · No real payment processing</p>
      </div>
    </main>
  );
}

export default function CheckoutReturnPage() {
  return <Suspense fallback={<main className="checkout-page"><div className="checkout-card"><p>Loading verification result…</p></div></main>}><ReturnContent /></Suspense>;
}
