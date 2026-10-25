import Link from "next/link";

export default function CheckoutCancelPage() {
  return (
    <main className="checkout-page">
      <div className="checkout-card">
        <a className="brand checkout-brand" href="/"><span className="brand-mark">P<span>✓</span></span><span className="brand-name">payproof<span>ai</span></span></a>
        <div className="checkout-symbol review-symbol">↩</div>
        <p className="checkout-eyebrow">CHECKOUT CANCELLED</p>
        <h1>No payment was confirmed</h1>
        <p>You returned from PayPal before completing the demo checkout. The order must remain unpaid until PayPal confirms a completed capture.</p>
        <Link className="primary-button checkout-home" href="/">Return to workspace <span>→</span></Link>
        <p className="checkout-footnote">PayProof AI · Sandbox testing only · No real payment processing</p>
      </div>
    </main>
  );
}
