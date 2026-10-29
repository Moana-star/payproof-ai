"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

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
  const orderId = searchParams.get("token");
  const [result, setResult] = useState<CaptureResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const inFlight = useRef(false);
  const finished = useRef(false);

  const verifyPayment = useCallback(async (manualRetry = false) => {
    if (!orderId) {
      setResult({ verified: false, status: "REVIEW_REQUIRED", error: "PayPal did not return an order reference. No payment was confirmed." });
      setLoading(false);
      return;
    }
    if (inFlight.current || finished.current) return;
    inFlight.current = true;
    if (manualRetry) setRetrying(true);
    setLoading(true);

    try {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) {
        setResult({ verified: false, status: "REVIEW_REQUIRED", error: "Sign-in configuration is missing. The payment was not confirmed in this workspace." });
        return;
      }

      // Allow the browser auth session a second chance to hydrate after PayPal's cross-site redirect.
      let { data } = await supabase.auth.getSession();
      if (!data.session) {
        await new Promise((resolve) => setTimeout(resolve, 700));
        ({ data } = await supabase.auth.getSession());
      }
      if (!data.session) {
        setResult({ verified: false, status: "REVIEW_REQUIRED", error: "Your sign-in session is not available yet. Retry verification after confirming you are signed in; do not pay again." });
        return;
      }

      const sendVerification = async () => {
        const response = await fetch("/api/paypal/capture-order", {
          method: "POST",
          cache: "no-store",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + data.session!.access_token
          },
          body: JSON.stringify({ orderId })
        });
        const body = (await response.json()) as CaptureResult;
        return { response, body };
      };

      let outcome: Awaited<ReturnType<typeof sendVerification>>;
      try {
        outcome = await sendVerification();
      } catch {
        // A network interruption can happen after PayPal has captured. The server endpoint
        // checks PayPal's order status and uses an idempotency key, so one retry is safe.
        await new Promise((resolve) => setTimeout(resolve, 1000));
        outcome = await sendVerification();
      }
      if (!outcome.response.ok && outcome.response.status >= 500) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        outcome = await sendVerification();
      }

      setResult(outcome.body);
      if (outcome.body.verified) finished.current = true;
    } catch {
      setResult({ verified: false, status: "REVIEW_REQUIRED", error: "Automatic verification could not finish. Use Retry verification below; do not refresh or pay again." });
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
        {loading ? <><div className="checkout-symbol loading-symbol">…</div><h1>Verifying with PayPal</h1><p>PayProof AI is checking the server-side transaction and saving the evidence. Keep this page open; do not pay again.</p></>
          : result?.verified ? <><div className="checkout-symbol success-symbol">✓</div><p className="checkout-eyebrow">SANDBOX VERIFICATION</p><h1>Payment verified</h1><p>{result.message}</p><div className="verification-details"><span>Product</span><strong>{result.transaction?.product || "Catalogue order"}</strong><span>Quantity</span><strong>{result.transaction?.quantity ?? "—"}</strong><span>Expected amount</span><strong>{result.transaction?.currency} {result.expectedAmount || "—"}</strong><span>Captured amount</span><strong>{result.transaction?.currency} {result.transaction?.amount}</strong><span>Evidence source</span><strong>{result.evidenceSource || "PayPal Sandbox server API"}</strong><span>Verification time</span><strong>{result.verifiedAt ? new Date(result.verifiedAt).toLocaleString() : "Not available"}</strong><span>PayPal order reference</span><strong>{result.transaction?.referenceId || result.transaction?.orderId || "Available in PayPal Sandbox"}</strong><span>Capture reference</span><strong>{result.transaction?.captureId || "Available in PayPal Sandbox"}</strong><span>Order saved</span><strong>{result.persisted ? "Yes" : "Not yet"}</strong></div>{result.persistenceWarning && <p className="checkout-small">{result.persistenceWarning}</p>}<div className="verification-decision"><strong>{result.persisted ? "NEXT ACTION · PROCEED" : "NEXT ACTION · WAIT"}</strong><p>{result.persisted ? "Server verification passed and the evidence was saved. A seller can continue with the normal fulfilment review." : "Verification passed, but the saved evidence is not confirmed. Wait until the order is visible in the workspace before fulfilment."}</p></div>{result.persisted && <p className="checkout-small">The verified order and capture reference have been saved to the PayProof AI database. Sandbox testing only; no real payment processing.</p>}</>
          : <><div className="checkout-symbol review-symbol">!</div><p className="checkout-eyebrow">NO PAYMENT CONFIRMATION</p><h1>Needs a closer look</h1><p>{result?.error || result?.message || "The transaction did not pass every verification check."}</p><div className="verification-decision"><strong>NEXT ACTION · REVIEW</strong><p>Do not fulfil. PayProof AI has not marked this payment as verified. Retry the server check before taking any further action.</p></div><button type="button" className="primary-button checkout-home" onClick={() => void verifyPayment(true)} disabled={loading || retrying}>{retrying ? "Retrying verification…" : "Retry verification"}</button><p className="checkout-small">Do not pay again. A retry checks the existing PayPal order and will not intentionally create a second payment.</p></>}
        <Link className="primary-button checkout-home" href="/">Return to workspace <span>→</span></Link>
        <p className="checkout-footnote">PayProof AI · Sandbox testing only · No real payment processing</p>
      </div>
    </main>
  );
}

export default function CheckoutReturnPage() {
  return <Suspense fallback={<main className="checkout-page"><div className="checkout-card"><p>Loading verification result…</p></div></main>}><ReturnContent /></Suspense>;
}
