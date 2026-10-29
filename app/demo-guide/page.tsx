"use client";

import Link from "next/link";
import { useState } from "react";
import { WorkspaceLayout } from "@/components/workspace-layout";

const steps = [
  { time: "0:00–0:20", title: "Set the problem", detail: "Explain that small sellers receive order requests in messages while payment evidence is managed separately." },
  { time: "0:20–0:50", title: "Show AI-assisted order intake", detail: "Enter a clear sample message, generate a draft, inspect the product and quantity, then show how missing or ambiguous details are flagged. Explain that the seller reviews it and catalogue/server logic owns pricing." },
  { time: "0:50–1:30", title: "Verify a PayPal Sandbox payment", detail: "Run a fresh checkout using Sandbox credentials and show the server-verified result, amount, currency, order reference, capture reference, and saved status where available. A browser redirect alone is not proof." },
  { time: "1:30–2:10", title: "Review reconciliation", detail: "Use a clearly labelled simulated statement row. Show why it matched or became an exception, then demonstrate human approval, internal demo-ledger posting, and the audit event. Never imply this is a live bank feed." },
  { time: "2:10–2:45", title: "Show the evidence brief", detail: "Compare expected and captured values, point out the verification timestamp and evidence source when persisted, and explain the Proceed / Wait / Review rule." },
  { time: "2:45–2:55", title: "Close with the trust model", detail: "PayProof AI combines AI-assisted order intake with server-verified PayPal Sandbox evidence and human-reviewed reconciliation. AI assists; evidence and people decide." }
];

const labels = [
  { title: "PayPal Sandbox", detail: "Test transactions from PayPal's Sandbox environment; no real money." },
  { title: "Synthetic AI scenario", detail: "Illustrative AI content used to demonstrate a case, not evidence from a real order." },
  { title: "Simulated statement row", detail: "A test CSV row used to demonstrate matching and exceptions; not a bank feed." },
  { title: "Internal demo ledger", detail: "An application-side record only; no external bank or accounting system is changed." }
];

export default function DemoGuidePage() {
  const [checked, setChecked] = useState<string[]>([]);
  const [showScript, setShowScript] = useState(false);

  function toggle(title: string) {
    setChecked((current) => current.includes(title) ? current.filter((item) => item !== title) : [...current, title]);
  }

  return (
    <WorkspaceLayout title="Judge demo guide" eyebrow="DEMO MODE · SANDBOX ONLY" description="A short, honest route through the strongest PayProof AI workflows. Use only test data and never expose credentials or private customer details.">
      <div className="ops-info-banner"><span className="ops-info-icon">i</span><div><strong>Know what is live and what is illustrative</strong><p>This guide is a walkthrough, not proof that every integration has passed. Show a fresh Sandbox result for payment verification and label simulated reconciliation data at the point of use.</p></div></div>
      <section className="ops-panel" style={{ padding: 24, marginBottom: 20 }}>
        <div className="ops-panel-top"><div><span className="ops-panel-symbol mint">▶</span><div><strong>Three-minute presentation route</strong><p>Target runtime: 2 minutes 55 seconds</p></div></div><span className="ops-sample-tag">DEMO CHECKLIST</span></div>
        <div style={{ display: "grid", gap: 18, marginTop: 20 }}>
          {steps.map((step, index) => (
            <label key={step.title} style={{ display: "grid", gridTemplateColumns: "22px 100px minmax(0, 1fr)", gap: 12, alignItems: "start", cursor: "pointer" }}>
              <input type="checkbox" checked={checked.includes(step.title)} onChange={() => toggle(step.title)} aria-label={`Mark ${step.title} complete`} style={{ marginTop: 4 }} />
              <strong style={{ fontSize: 13, whiteSpace: "nowrap" }}>{step.time}</strong>
              <span><strong>{index + 1}. {step.title}</strong><span style={{ display: "block", marginTop: 5, lineHeight: 1.6, color: "var(--muted, #667085)" }}>{step.detail}</span></span>
            </label>
          ))}
        </div>
        <p style={{ marginTop: 18, fontSize: 13 }}>{checked.length} of {steps.length} walkthrough steps checked.</p>
      </section>
      <div className="ops-section-title"><div><h2>Data labels judges should see</h2><p>Keep the distinction visible wherever each record appears.</p></div></div>
      <section className="ops-panel" style={{ padding: 24, marginBottom: 20 }}>
        <div style={{ display: "grid", gap: 18 }}>
          {labels.map((item) => <div key={item.title} style={{ display: "grid", gridTemplateColumns: "minmax(150px, 220px) minmax(0, 1fr)", gap: 16, alignItems: "start" }}><strong>{item.title}</strong><span style={{ lineHeight: 1.6, color: "var(--muted, #667085)" }}>{item.detail}</span></div>)}
        </div>
      </section>
      <section className="ops-panel" style={{ padding: 24, marginBottom: 20 }}>
        <div className="ops-panel-top"><div><span className="ops-panel-symbol violet">✓</span><div><strong>Final recording checklist</strong><p>Complete before sharing the demo video</p></div></div></div>
        <ul style={{ lineHeight: 1.9, paddingLeft: 22 }}>
          <li>Use a fresh Sandbox checkout and show the server-verified result.</li>
          <li>Never type or display API keys, reviewer tokens, or credentials.</li>
          <li>Do not describe simulated statement rows as a real bank connection.</li>
          <li>Show a reviewer decision and its audit event only if you have actually performed the action.</li>
          <li>Keep the final video below three minutes and watch the full recording before submission.</li>
        </ul>
        <button className="ops-secondary-button" onClick={() => setShowScript((value) => !value)}>{showScript ? "Hide closing script" : "Show 15-second closing script"}</button>
        {showScript && <blockquote style={{ marginTop: 16, lineHeight: 1.7 }}>“PayProof AI helps sellers turn customer messages into reviewable order drafts, verify PayPal Sandbox payment evidence on the server, and review reconciliation exceptions with an audit trail. AI assists the workflow; verified evidence and human approval control payment decisions.”</blockquote>}
      </section>
      <div className="ops-bottom-cta"><div><span className="ops-cta-icon">↗</span><div><strong>Ready to walk through the product?</strong><p>Start with the workspace, then verify a Sandbox payment and review the evidence.</p></div></div><Link className="ops-primary-button" href="/">Open workspace <span>↗</span></Link></div>
    </WorkspaceLayout>
  );
}
