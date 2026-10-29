import Link from "next/link";
import { WorkspaceLayout } from "@/components/workspace-layout";

const samplePayments = [
  { id: "PP-DEMO-1048", product: "Handwoven market tote", expected: "$38.00 USD", captured: "$38.00 USD · example only", status: "Example match", tone: "good", capture: "CAP-DEMO-48", time: "No verified timestamp", source: "Synthetic example", discrepancy: "None in this illustrative scenario", next: "Run a real Sandbox checkout to verify" },
  { id: "PP-DEMO-1047", product: "Coffee gift set × 2", expected: "$49.00 USD", captured: "Unavailable", status: "Awaiting payment", tone: "pending", capture: "No capture reference", time: "No verification timestamp", source: "Sample record · not saved", discrepancy: "No completed capture evidence", next: "Wait; verify payment server-side" },
  { id: "PP-DEMO-1046", product: "Ceramic mug pair", expected: "$42.00 USD", captured: "$40.00 USD · synthetic example", status: "Review required", tone: "review", capture: "Synthetic reference only", time: "No verified timestamp", source: "Synthetic mismatch scenario", discrepancy: "$2.00 USD amount difference", next: "Pause fulfilment and investigate" }
];

export default function PaymentsPage() {
  return (
    <WorkspaceLayout title="Payment evidence" eyebrow="PAYMENT OPERATIONS" description="Compare expected amounts with capture evidence, references, timestamps, discrepancies, and the next safe action. The rows below are illustrative scenarios—not live order records.">
      <div className="ops-info-banner"><span className="ops-info-icon">i</span><div><strong>What counts as proof?</strong><p>A server-side PayPal response with a completed capture, matching amount, currency and order reference. A screenshot or AI answer is not payment proof.</p></div></div>
      <section className="ops-metric-grid">
        <article className="ops-metric"><span>Sample payment records</span><strong>03</strong><small>Illustrative only</small><span className="ops-metric-icon purple">▤</span></article>
        <article className="ops-metric"><span>Verified in this sample</span><strong>01</strong><small>Not a live payment count</small><span className="ops-metric-icon green">✓</span></article>
        <article className="ops-metric"><span>Awaiting confirmation</span><strong>01</strong><small>Do not fulfil yet</small><span className="ops-metric-icon amber">◷</span></article>
        <article className="ops-metric"><span>Needs review</span><strong>01</strong><small>Check the evidence</small><span className="ops-metric-icon red">!</span></article>
      </section>
      <div className="ops-section-title"><div><h2>Payment register</h2><p>Sample records show the structure; they are not connected to real customer orders.</p></div><Link className="ops-secondary-button" href="/">Run Sandbox checkout ↗</Link></div>
      <section className="ops-panel ops-table-panel">
        <div className="ops-panel-top"><div><span className="ops-panel-symbol">▤</span><div><strong>Recent payment outcomes</strong><p>Amount · status · capture evidence</p></div></div><span className="ops-sample-tag">SAMPLE DATA</span></div>
        <div className="ops-table-wrap"><table className="ops-table"><thead><tr><th>ORDER / SOURCE</th><th>PRODUCT</th><th>EXPECTED</th><th>CAPTURED EVIDENCE</th><th>STATUS / NEXT ACTION</th></tr></thead><tbody>{samplePayments.map((payment) => <tr key={payment.id}><td><strong className="ops-id">{payment.id}</strong><small>{payment.source}</small><small>{payment.time}</small></td><td>{payment.product}</td><td className="ops-amount">{payment.expected}</td><td><strong>{payment.captured}</strong><small>Reference: <code>{payment.capture}</code></small><small>Difference: {payment.discrepancy}</small></td><td><span className={`ops-status ${payment.tone}`}><i />{payment.status}</span><small>{payment.next}</small></td></tr>)}</tbody></table></div>
      </section>
      <div className="ops-two-column">
        <section className="ops-panel ops-evidence-panel">
          <div className="ops-panel-top"><div><span className="ops-panel-symbol mint">✓</span><div><strong>Payment Evidence Brief</strong><p>Compare evidence facts before deciding what happens next</p></div></div><span className="ops-live-badge">RULES</span></div>
          <div className="ops-evidence-check"><span>01</span><div><strong>Capture status is completed</strong><p>Read from the PayPal server response, not the browser.</p></div><b>Required</b></div>
          <div className="ops-evidence-check"><span>02</span><div><strong>Amount and currency match</strong><p>Compare the captured value with the server-priced order.</p></div><b>Required</b></div>
          <div className="ops-evidence-check"><span>03</span><div><strong>Order reference matches</strong><p>Link the capture to the order that initiated checkout.</p></div><b>Required</b></div>
          <div className="ops-evidence-check"><span>04</span><div><strong>Verification timestamp and source</strong><p>Display the server verification time and evidence source from the saved record. Sample rows here have no verified timestamp.</p></div><b>Show source</b></div><div className="ops-evidence-check"><span>05</span><div><strong>Choose a safe next action</strong><p>Proceed only after verified matching evidence; wait when capture evidence is missing; review any discrepancy.</p></div><b>Human review</b></div>
        </section>
        <section className="ops-panel ops-visual-panel">
          <div className="ops-panel-top"><div><span className="ops-panel-symbol violet">↗</span><div><strong>Verification flow</strong><p>One clear path from checkout to evidence</p></div></div></div>
          <div className="ops-flow-visual"><div className="ops-flow-node"><span>01</span><strong>Order</strong><small>Server-priced</small></div><i /><div className="ops-flow-node"><span>02</span><strong>PayPal</strong><small>Capture check</small></div><i /><div className="ops-flow-node"><span>03</span><strong>Record</strong><small>Save outcome</small></div></div>
          <div className="ops-flow-caption"><span className="ops-flow-dot" /> No AI-generated payment decisions <span className="ops-caption-divider">·</span> No real-money processing</div>
        </section>
      </div>
      <div className="ops-bottom-cta"><div><span className="ops-cta-icon">↗</span><div><strong>Want to see the verification flow live?</strong><p>Run a PayPal Sandbox checkout with a test buyer. No real money is processed.</p></div></div><Link className="ops-primary-button" href="/">Test PayPal checkout <span>↗</span></Link></div>
    </WorkspaceLayout>
  );
}
