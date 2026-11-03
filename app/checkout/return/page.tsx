"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

type CaptureResult = {
  verified?: boolean; status?: string; message?: string; error?: string; persisted?: boolean;
  persistenceWarning?: string; verifiedAt?: string; evidenceSource?: string; expectedAmount?: string;
  transaction?: { orderId?: string; referenceId?: string; captureId?: string; amount?: string; currency?: string; product?: string; quantity?: number };
};
const MAX_ATTEMPTS = 5;
function wait(ms: number) { return new Promise((resolve) => setTimeout(resolve, ms)); }

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
      setLoading(false); return;
    }
    if (inFlight.current) return;
    inFlight.current = true; setLoading(true); setAttempt(0);
    if (manualRetry) setRetrying(true);
    try {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) {
        setResult({ verified: false, status: "REVIEW_REQUIRED", error: "Sign-in configuration is missing. Payment was not confirmed in this workspace." });
        return;
      }
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (sessionError || !accessToken) {
        setResult({ verified: false, status: "SESSION_REQUIRED", error: "Your workspace session could not be confirmed. Return to your workspace and sign in again before retrying verification. Do not pay again." });
        return;
      }

      let lastResult: CaptureResult = { verified: false, status: "REVIEW_REQUIRED", error: "PayPal's confirmation is taking longer than expected. Retry verification safely; do not pay again." };
      for (let currentAttempt = 1; currentAttempt <= MAX_ATTEMPTS; currentAttempt++) {
        setAttempt(currentAttempt);
        try {
          const response = await fetch("/api/paypal/capture-order", {
            method: "POST", cache: "no-store",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
            body: JSON.stringify({ orderId })
          });
          const body = (await response.json()) as CaptureResult;
          lastResult = body;
          if (response.ok && body.verified) {
            if (body.persisted) { setResult(body); return; }
            if (currentAttempt < MAX_ATTEMPTS) { await wait(800 * currentAttempt); continue; }
            setResult(body); return;
          }
          const retryable = response.status === 409 || response.status === 429 || response.status >= 500;
          if (!retryable || currentAttempt === MAX_ATTEMPTS) { setResult(body); return; }
        } catch {
          lastResult = { verified: false, status: "REVIEW_REQUIRED", error: "The verification request was interrupted. PayProof AI retried automatically; do not pay again." };
          if (currentAttempt === MAX_ATTEMPTS) { setResult(lastResult); return; }
        }
        await wait(650 * currentAttempt);
      }
      setResult(lastResult);
    } finally {
      inFlight.current = false; setLoading(false); setRetrying(false);
    }
  }, [orderId]);

  useEffect(() => { void verifyPayment(); }, [verifyPayment]);

  return (
    <main className="checkout-page"><div className="checkout-card">
      <Link className="brand checkout-brand" href="/"><span className="brand-mark">P<span>✓</span></span><span className="brand-name">payproof<span>ai</span></span></Link>
      {loading ? <>
        <div className="checkout-symbol loading-symbol">…</div><p className="checkout-eyebrow">SANDBOX VERIFICATION</p>
        <h1>Verifying with PayPal</h1>
        <p>PayProof AI is checking the transaction directly with PayPal and saving the evidence to your signed-in workspace. Keep this page open; do not pay again.</p>
        <p className="checkout-small">Verification attempt {attempt || 1} of {MAX_ATTEMPTS}</p>
      </> : result?.verified ? <>
        <div className="checkout-symbol success-symbol">✓</div><p className="checkout-eyebrow">SANDBOX VERIFICATION</p>
        <h1>Payment verified</h1><p>{result.message}</p>
        <div className="verification-details">
          <span>Product</span><strong>{result.transaction?.product || "Catalogue order"}</strong>
          <span>Quantity</span><strong>{result.transaction?.quantity ?? "—"}</strong>
          <span>Expected amount</span><strong>{result.transaction?.currency} {result.expectedAmount || "—"}</strong>
          <span>Captured amount</span><strong>{result.transaction?.currency} {result.transaction?.amount || "—"}</strong>
          <span>Evidence source</span><strong>{result.evidenceSource || "PayPal Sandbox server API"}</strong>
          <span>Verification time</span><strong>{result.verifiedAt ? new Date(result.verifiedAt).toLocaleString() : "Not available"}</strong>
          <span>PayPal order reference</span><strong>{result.transaction?.referenceId || result.transaction?.orderId || "Available in PayPal Sandbox"}</strong>
          <span>Capture reference</span><strong>{result.transaction?.captureId || "Available in PayPal Sandbox"}</strong>
          <span>Order saved</span><strong>{result.persisted ? "Yes" : "Not yet"}</strong>
        </div>
        {result.persistenceWarning && <p className="checkout-small">{result.persistenceWarning}</p>}
        <div className="verification-decision">
          <strong>{result.persisted ? "NEXT ACTION · RETURN TO WORKSPACE" : "NEXT ACTION · SAVE EVIDENCE"}</strong>
          <p>{result.persisted ? "PayPal verification passed and the order is saved to your account. Return to your workspace to see the updated order." : "Payment verification passed, but the saved evidence is not confirmed. Do not fulfil until the order appears in your workspace."}</p>
        </div>
        {result.persisted && <p className="checkout-small">Sandbox testing only; no real payment processing.</p>}
        {!result.persisted && <button type="button" className="primary-button checkout-home" onClick={() => void verifyPayment(true)} disabled={loading || retrying}>{retrying ? "Retrying evidence save…" : "Retry saving evidence"}</button>}
      </> : <>
        <div className="checkout-symbol review-symbol">!</div><p className="checkout-eyebrow">NO PAYMENT CONFIRMATION</p>
        <h1>Needs a closer look</h1><p>{result?.error || result?.message || "The transaction did not pass every verification check."}</p>
        <p className="checkout-small">For safety, PayProof AI will not mark this order as paid unless the expected transaction is verified. Do not pay again.</p>
        <button type="button" className="primary-button checkout-home" onClick={() => void verifyPayment(true)} disabled={loading || retrying}>{retrying ? "Retrying verification…" : "Retry verification"}</button>
      </>}
      <Link className="primary-button checkout-home" href="/">Return to workspace <span>→</span></Link>
      <p className="checkout-footnote">PayProof AI · Sandbox testing only · No real payment processing</p>
    </div></main>
  );
}
export default function CheckoutReturnPage() {
  return <Suspense fallback={<main className="checkout-page"><div className="checkout-card"><p>Loading verification result…</p></div></main>}><ReturnContent /></Suspense>;
}
