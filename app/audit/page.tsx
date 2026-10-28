import Link from "next/link";
import { WorkspaceLayout } from "@/components/workspace-layout";

const events = [
  { time: "Step 01", title: "Order draft prepared", detail: "A product and quantity are selected from the supported server-side catalogue.", kind: "purple", tag: "ORDER", note: "Illustrative workflow" },
  { time: "Step 02", title: "PayPal Sandbox order created", detail: "PayPal returns an order reference and approval URL for the test buyer.", kind: "blue", tag: "PAYPAL", note: "Run a real Sandbox test to generate your own reference" },
  { time: "Step 03", title: "Capture verified server-side", detail: "The server checks completed status, expected amount, currency and order reference.", kind: "green", tag: "VERIFICATION", note: "Not produced by AI" },
  { time: "Step 04", title: "Order and payment event saved", detail: "The order record and capture event should be persisted with duplicate-safe handling.", kind: "amber", tag: "STORAGE", note: "Confirm in Supabase after an end-to-end test" }
];

export default function AuditPage() {
  return (
    <WorkspaceLayout title="Audit trail" eyebrow="TRACEABILITY & ACCOUNTABILITY" description="Understand the intended event history from order creation to verified payment and database persistence.">
      <div className="ops-bottom-cta"><div><span className="ops-cta-icon">⌁</span><div><strong>View the live reconciliation audit events</strong><p>The protected reconciliation workspace records statement imports, matching decisions, reviewer approvals and internal ledger posts.</p></div></div><Link className="ops-primary-button" href="/#reconciliation">Open live audit view <span>↗</span></Link></div>\n      <div className="ops-info-banner"><span className="ops-info-icon">i</span><div><strong>Sample timeline, not a live audit log</strong><p>This page illustrates the event structure. It does not expose customer records or claim that these steps have occurred for a real transaction. Live persistence must be confirmed in Supabase.</p></div></div>
      <div className="ops-audit-layout">
        <section className="ops-panel ops-timeline-panel">
          <div className="ops-panel-top"><div><span className="ops-panel-symbol violet">↗</span><div><strong>Payment lifecycle</strong><p>Each step should have a traceable source and outcome</p></div></div><span className="ops-sample-tag">ILLUSTRATIVE</span></div>
          <div className="ops-timeline">{events.map((event, index) => <article className="ops-timeline-event" key={event.time}><div className={`ops-timeline-marker ${event.kind}`}>{index + 1}</div><div className="ops-timeline-content"><div className="ops-timeline-meta"><span>{event.time}</span><span className="ops-event-tag">{event.tag}</span></div><h3>{event.title}</h3><p>{event.detail}</p><small>{event.note}</small></div></article>)}</div>
        </section>
        <aside className="ops-audit-aside">
          <section className="ops-panel">
            <div className="ops-panel-top"><div><span className="ops-panel-symbol mint">✓</span><div><strong>Audit record checklist</strong><p>Fields worth retaining for each capture</p></div></div></div>
            {["Internal order reference","PayPal order and capture IDs","Amount and currency","Verification timestamp","Payment environment (Sandbox)","Persistence outcome / retry status"].map((field, index) => <div className="ops-audit-field" key={field}><span>{String(index + 1).padStart(2, "0")}</span><strong>{field}</strong><i>Required</i></div>)}
          </section>
          <section className="ops-safety-card"><span>!</span><div><strong>Keep the record safe</strong><p>Do not expose service keys or customer data in browser responses. Real order-history access needs authentication and owner-scoped authorisation.</p></div></section>
        </aside>
      </div>
      <div className="ops-bottom-cta"><div><span className="ops-cta-icon">↗</span><div><strong>Generate a real Sandbox audit trail</strong><p>Complete a Sandbox checkout, then confirm the order and event rows exist in Supabase.</p></div></div><Link className="ops-primary-button" href="/">Test checkout <span>↗</span></Link></div>
    </WorkspaceLayout>
  );
}
