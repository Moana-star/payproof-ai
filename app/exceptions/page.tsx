import Link from "next/link";
import { WorkspaceLayout } from "@/components/workspace-layout";

const exceptions = [
  { id: "EX-DEMO-01", order: "PP-DEMO-1046", title: "Captured amount differs from expected total", detail: "Expected $42.00 USD · Example capture $40.00 USD", status: "Review required", tone: "review", priority: "High attention", caseId: "amount-mismatch", steps: ["Re-fetch the PayPal order and capture from the server.", "Compare the captured amount and currency with the server-priced order.", "Keep fulfilment paused until the discrepancy is resolved."] },
  { id: "EX-DEMO-02", order: "PP-DEMO-1047", title: "No completed capture evidence", detail: "Expected $49.00 USD · Capture reference unavailable", status: "Awaiting evidence", tone: "pending", priority: "Pending", caseId: "pending-capture", steps: ["Check the PayPal order status server-side.", "If the buyer did not approve, leave the order pending.", "Do not mark the order paid based on a browser return alone."] },
  { id: "EX-DEMO-03", order: "PP-DEMO-1048", title: "Sample record requires source confirmation", detail: "The sample row is not a live PayPal transaction", status: "Sample only", tone: "neutral", priority: "Information", caseId: "completed-match", steps: ["Use the real Sandbox checkout flow to generate evidence.", "Review the server verification result.", "Confirm persistence separately from payment verification."] }
];

export default function ExceptionsPage() {
  return (
    <WorkspaceLayout title="Exception review" eyebrow="PAYMENT EXCEPTIONS" description="Make incomplete or inconsistent payment evidence visible, with a safe next step for every case. These are demonstration scenarios, not live alerts.">
      <div className="ops-info-banner ops-warning-banner"><span className="ops-info-icon">!</span><div><strong>Review does not mean fraud</strong><p>Pending, missing or mismatched information should trigger investigation—not an automatic fraud label or an irreversible decision.</p></div></div>
      <div className="ops-exception-summary"><div><span className="ops-summary-icon red">!</span><div><strong>01</strong><small>Amount mismatch example</small></div></div><div><span className="ops-summary-icon amber">◷</span><div><strong>01</strong><small>Missing capture example</small></div></div><div><span className="ops-summary-icon purple">↗</span><div><strong>03</strong><small>Illustrative scenarios</small></div></div></div>
      <div className="ops-section-title"><div><h2>Cases to review</h2><p>Each case includes the evidence gap and the next safe action.</p></div><span className="ops-sample-tag">DEMO SCENARIOS</span></div>
      <div className="ops-exception-list">{exceptions.map((item) => <article className="ops-panel ops-exception-card" key={item.id}>
        <div className="ops-exception-head"><div className="ops-exception-symbol">{item.tone === "review" ? "!" : item.tone === "pending" ? "◷" : "i"}</div><div className="ops-exception-title"><span>{item.id} · {item.order}</span><h3>{item.title}</h3><p>{item.detail}</p></div><span className={`ops-status ${item.tone}`}><i />{item.status}</span></div>
        <div className="ops-exception-body"><div><p className="ops-field-label">RECOMMENDED REVIEW STEPS</p><ol>{item.steps.map((step) => <li key={step}>{step}</li>)}</ol></div><div className="ops-exception-actions"><span className="ops-priority">{item.priority}</span><Link className="ops-secondary-button" href={`/assistant?case=${item.caseId}`}>Explain with AI ↗</Link><Link className="ops-text-link" href="/payments">View evidence register →</Link></div></div>
      </article>)}</div>
      <div className="ops-bottom-cta"><div><span className="ops-cta-icon">✓</span><div><strong>Keep payment decisions evidence-led</strong><p>Only server-side PayPal verification can establish payment status.</p></div></div><Link className="ops-primary-button" href="/">Run Sandbox test <span>↗</span></Link></div>
    </WorkspaceLayout>
  );
}
