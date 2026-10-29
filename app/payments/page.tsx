import Link from "next/link";
import { WorkspaceLayout } from "@/components/workspace-layout";
import { isOrderStoreConfigured, listRecentOrders } from "@/lib/order-store";

export const dynamic = "force-dynamic";

type RegisterOrder = Awaited<ReturnType<typeof listRecentOrders>>[number];

function money(amount: string, currency: string) {
  const value = Number(amount);
  return Number.isFinite(value) ? new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value) : `${amount} ${currency}`;
}

function statusPresentation(status: string) {
  switch (status) {
    case "paid": return { label: "Verified paid", tone: "good", next: "Server-verified payment. Check fulfilment policy before dispatch." };
    case "awaiting_payment": return { label: "Awaiting payment", tone: "pending", next: "Wait for server-side PayPal capture verification." };
    case "payment_review": return { label: "Review required", tone: "review", next: "Hold fulfilment until a reviewer resolves the exception." };
    case "failed": return { label: "Payment failed", tone: "review", next: "Do not fulfil. Review the failed payment outcome." };
    case "cancelled": return { label: "Cancelled", tone: "pending", next: "No fulfilment; order is cancelled." };
    default: return { label: "Unknown status", tone: "review", next: "Review the saved order status before taking action." };
  }
}

function verifiedTime(value?: string | null) {
  if (!value) return "Not verified";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Invalid timestamp" : date.toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Nairobi" }) + " EAT";
}

export default async function PaymentsPage() {
  let orders: RegisterOrder[] = [];
  let storageError = "";
  const storageConfigured = isOrderStoreConfigured();

  if (storageConfigured) {
    try {
      orders = await listRecentOrders(100);
    } catch {
      storageError = "The database could not be reached. Check Supabase configuration, table permissions, and the orders schema.";
    }
  }

  const paid = orders.filter((order) => order.payment_status === "paid").length;
  const waiting = orders.filter((order) => order.payment_status === "awaiting_payment").length;
  const review = orders.filter((order) => order.payment_status === "payment_review" || order.payment_status === "failed").length;

  return (
    <WorkspaceLayout title="Payment evidence" eyebrow="PAYMENT OPERATIONS" description="Live payment register backed by saved order records. A payment is only marked paid after server-side PayPal verification.">
      <div className="ops-info-banner"><span className="ops-info-icon">i</span><div><strong>What counts as proof?</strong><p>A server-side PayPal response with a completed capture, matching amount, currency and order reference. A screenshot or AI answer is not payment proof.</p></div></div>

      {!storageConfigured && <div className="ops-info-banner"><span className="ops-info-icon">!</span><div><strong>Database not configured</strong><p>This page will not substitute sample rows. Configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel, and create the required orders and payment_events tables in Supabase.</p></div></div>}
      {storageError && <div className="ops-info-banner"><span className="ops-info-icon">!</span><div><strong>Could not load live records</strong><p>{storageError}</p></div></div>}

      <section className="ops-metric-grid">
        <article className="ops-metric"><span>Orders loaded</span><strong>{orders.length.toString().padStart(2, "0")}</strong><small>Saved database records</small><span className="ops-metric-icon purple">▤</span></article>
        <article className="ops-metric"><span>Verified paid</span><strong>{paid.toString().padStart(2, "0")}</strong><small>Server-verified records</small><span className="ops-metric-icon green">✓</span></article>
        <article className="ops-metric"><span>Awaiting payment</span><strong>{waiting.toString().padStart(2, "0")}</strong><small>Do not fulfil yet</small><span className="ops-metric-icon amber">◷</span></article>
        <article className="ops-metric"><span>Needs review</span><strong>{review.toString().padStart(2, "0")}</strong><small>Failed or flagged</small><span className="ops-metric-icon red">!</span></article>
      </section>

      <div className="ops-section-title"><div><h2>Payment register</h2><p>Latest saved orders from the connected database. Refresh this page to reload current records.</p></div><div style={{display:"flex",gap:10,flexWrap:"wrap"}}><Link className="ops-secondary-button" href="/demo-guide">Walkthrough guide ↗</Link><Link className="ops-secondary-button" href="/">Create an order ↗</Link></div></div>

      <section className="ops-panel ops-table-panel">
        <div className="ops-panel-top"><div><span className="ops-panel-symbol">▤</span><div><strong>Recent payment outcomes</strong><p>Order · expected amount · capture evidence</p></div></div><span className="ops-live-badge">{storageConfigured && !storageError ? "DATABASE" : "NOT CONNECTED"}</span></div>
        <div className="ops-table-wrap"><table className="ops-table"><thead><tr><th>ORDER / EVIDENCE</th><th>PRODUCT</th><th>EXPECTED</th><th>CAPTURE DETAILS</th><th>STATUS / NEXT ACTION</th></tr></thead><tbody>
          {orders.map((order) => {
            const status = statusPresentation(order.payment_status);
            return <tr key={order.order_number}>
              <td><strong className="ops-id">{order.order_number}</strong><small>Environment: {order.payment_environment}</small><small>Verified: {verifiedTime(order.verified_at)}</small></td>
              <td>{order.product_name} × {order.quantity}</td>
              <td className="ops-amount">{money(order.total_amount, order.currency)}</td>
              <td><strong>{order.paypal_capture_id ? "Capture recorded" : "No capture evidence"}</strong><small>PayPal order: <code>{order.paypal_order_id || "Not available"}</code></small><small>Capture: <code>{order.paypal_capture_id || "Not available"}</code></small><small>Reference: <code>{order.paypal_reference_id || order.order_number}</code></small></td>
              <td><span className={`ops-status ${status.tone}`}><i />{status.label}</span><small>{status.next}</small></td>
            </tr>;
          })}
          {orders.length === 0 && <tr><td colSpan={5}>{storageError ? "Live records are unavailable until the database connection is repaired." : storageConfigured ? "No saved orders yet. Create an order and complete a Sandbox checkout to populate this register." : "No records displayed because persistent storage is not configured. Sample data is intentionally disabled."}</td></tr>}
        </tbody></table></div>
      </section>

      <div className="ops-two-column">
        <section className="ops-panel ops-evidence-panel">
          <div className="ops-panel-top"><div><span className="ops-panel-symbol mint">✓</span><div><strong>Payment Evidence Rules</strong><p>Required checks before fulfilment</p></div></div><span className="ops-live-badge">SERVER CHECKS</span></div>
          <div className="ops-evidence-check"><span>01</span><div><strong>Capture status is completed</strong><p>Read from PayPal's server response, not the browser.</p></div><b>Required</b></div>
          <div className="ops-evidence-check"><span>02</span><div><strong>Amount and currency match</strong><p>Compare the captured value with the server-priced order.</p></div><b>Required</b></div>
          <div className="ops-evidence-check"><span>03</span><div><strong>Order reference matches</strong><p>Link the capture to the order that initiated checkout.</p></div><b>Required</b></div>
          <div className="ops-evidence-check"><span>04</span><div><strong>Evidence is saved</strong><p>Confirm the order and capture event exist in persistent storage.</p></div><b>Required</b></div>
          <div className="ops-evidence-check"><span>05</span><div><strong>Take a safe next action</strong><p>Wait when evidence is missing; review any discrepancy. Never fulfil based on AI output alone.</p></div><b>Human review</b></div>
        </section>
        <section className="ops-panel ops-visual-panel">
          <div className="ops-panel-top"><div><span className="ops-panel-symbol violet">↗</span><div><strong>Operational flow</strong><p>Checkout through evidence storage</p></div></div></div>
          <div className="ops-flow-visual"><div className="ops-flow-node"><span>01</span><strong>Order</strong><small>Server-priced</small></div><i /><div className="ops-flow-node"><span>02</span><strong>PayPal</strong><small>Capture verified</small></div><i /><div className="ops-flow-node"><span>03</span><strong>Database</strong><small>Evidence saved</small></div></div>
          <div className="ops-flow-caption"><span className="ops-flow-dot" /> No AI-generated payment decisions <span className="ops-caption-divider">·</span> Sandbox payments only
        </div>
        </section>
      </div>
      <div className="ops-bottom-cta"><div><span className="ops-cta-icon">↗</span><div><strong>Test the real payment flow</strong><p>Use a PayPal Sandbox test buyer. The register updates from saved order records, not illustrative data.</p></div></div><Link className="ops-primary-button" href="/">Create an order <span>↗</span></Link></div>
    </WorkspaceLayout>
  );
}
