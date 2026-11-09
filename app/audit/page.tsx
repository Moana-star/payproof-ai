import Link from "next/link";
import { WorkspaceLayout } from "@/components/workspace-layout";
import { AuditTimeline } from "@/components/audit-timeline";

export default function AuditPage() {
  return (
    <WorkspaceLayout title="Audit trail" eyebrow="TRACEABILITY & ACCOUNTABILITY" description="Review the recorded history of payment and reconciliation actions in your own signed-in workspace.">
      <div className="ops-bottom-cta">
        <div><span className="ops-cta-icon">⌁</span><div><strong>Reconciliation and reviewer activity</strong><p>Statement imports, matching decisions, approvals, rejections and ledger postings appear in the same account-scoped history.</p></div></div>
        <Link className="ops-primary-button" href="/reconciliation">Open reconciliation <span>↗</span></Link>
      </div>
      <div className="ops-info-banner">
        <span className="ops-info-icon">i</span>
        <div><strong>Live account history · No synthetic events</strong><p>This timeline is loaded from saved order, PayPal payment-event, reconciliation-audit and ledger records. It is scoped to the signed-in account. If there are no records, the page explains how to generate the first Sandbox event instead of displaying invented transactions.</p></div>
      </div>
      <div className="ops-audit-layout">
        <AuditTimeline />
        <aside className="ops-audit-aside">
          <section className="ops-panel">
            <div className="ops-panel-top"><div><span className="ops-panel-symbol mint">✓</span><div><strong>Audit record fields</strong><p>Context retained for each event</p></div></div></div>
            {["Date and time","Event type and status","Related order reference","Actor or responsible system","Provider / evidence reference","Outcome or review details"].map((field, index) => <div className="ops-audit-field" key={field}><span>{String(index + 1).padStart(2, "0")}</span><strong>{field}</strong><i>Recorded</i></div>)}
          </section>
          <section className="ops-safety-card"><span>!</span><div><strong>Private and append-only</strong><p>Events are loaded only after server-side authentication and filtered by account ownership. Database safeguards reject updates, deletes and truncation of payment and reconciliation audit records.</p></div></section>
        </aside>
      </div>
      <div className="ops-bottom-cta">
        <div><span className="ops-cta-icon">↗</span><div><strong>Generate your first Sandbox audit trail</strong><p>Sign in, complete a PayPal Sandbox checkout, and return here to review the order, capture attempt, verification and saved evidence.</p></div></div>
        <Link className="ops-primary-button" href="/">Start Sandbox checkout <span>↗</span></Link>
      </div>
    </WorkspaceLayout>
  );
}
