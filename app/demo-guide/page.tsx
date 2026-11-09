"use client";

import Link from "next/link";
import { useState } from "react";
import { WorkspaceLayout } from "@/components/workspace-layout";

const steps = [
  { time: "0:00–0:20", title: "Set the problem", detail: "Explain that small sellers receive order requests in messages while payment evidence is managed separately." },
  { time: "0:20–0:50", title: "Show AI-assisted order intake", detail: "Load the sample message, prepare a draft, inspect the product and quantity, and point out anything ambiguous. The seller reviews the draft; catalogue and server logic own pricing." },
  { time: "0:50–1:30", title: "Verify a PayPal Sandbox payment", detail: "Run a fresh checkout with Sandbox credentials. Show the server-verified result, amount, currency, order reference, capture reference and saved status when available. A browser redirect alone is not proof." },
  { time: "1:30–2:10", title: "Review reconciliation", detail: "Use the clearly labelled simulated statement row. Explain its match or exception status. Show approval, internal demo-ledger posting and the audit event only if you actually complete those actions." },
  { time: "2:10–2:45", title: "Show the evidence brief", detail: "Compare expected and captured values. Point out the verification timestamp and evidence source when present, then explain the Proceed / Wait / Review rule." },
  { time: "2:45–2:55", title: "Close with the trust model", detail: "PayProof AI combines AI-assisted order intake, server-verified PayPal Sandbox evidence and human-reviewed reconciliation. AI assists; evidence and people decide." }
];

const labels = [
  { title: "PayPal Sandbox", detail: "Test transactions from PayPal's Sandbox environment. No real money moves." },
  { title: "Synthetic AI scenario", detail: "Illustrative content used to demonstrate a case; it is not evidence from a real customer order." },
  { title: "Simulated statement row", detail: "A test CSV row for demonstrating matching and exceptions; it is not a live bank feed." },
  { title: "Internal demo ledger", detail: "An application-side record only. It does not change a bank account or external accounting system." }
];

export default function DemoGuidePage() {
  const [checked, setChecked] = useState<string[]>([]);
  const [showScript, setShowScript] = useState(false);

  function toggle(title: string) {
    setChecked((current) => current.includes(title) ? current.filter((item) => item !== title) : [...current, title]);
  }

  return (
    <WorkspaceLayout title="Judge demo guide" eyebrow="DEMO MODE · SANDBOX ONLY" description="A short, honest route through the strongest PayProof AI workflows. Use test data only; never expose credentials, reviewer tokens or private customer details.">
      <div className="ops-info-banner"><span className="ops-info-icon">i</span><div><strong>What this walkthrough proves — and what it does not</strong><p>This is a guided product walkthrough, not a certification that every integration has passed. Payment verification must be demonstrated with a fresh Sandbox result. Reconciliation sample rows are synthetic and must stay labelled as such.</p></div></div>

      <section className="ops-panel" style={{ padding: 24, marginBottom: 20, borderColor: "#ded8ff" }}>
        <div className="ops-panel-top"><div><span className="ops-panel-symbol violet">↗</span><div><strong>Try a Sandbox payment</strong><p>Follow the complete test checkout journey</p></div></div><span className="ops-sample-tag">NO REAL MONEY</span></div>
        <p style={{ lineHeight: 1.7, color: "var(--muted, #667085)", margin: "12px 0 18px" }}>The sample message helps you start quickly. Completing checkout requires the app's PayPal Sandbox configuration, a PayPal Sandbox test buyer, and working server-side order persistence. Do not use a real PayPal account or real payment details.</p>
        <ol style={{ lineHeight: 1.9, paddingLeft: 22, marginBottom: 18 }}>
          <li>Open the <strong>public sample workspace</strong> and choose <em>Load sample message</em> under AI order intake.</li>
          <li>Select <em>Prepare order draft</em>. Review the customer, product and quantity against the original message.</li>
          <li>Validate the details, then select <em>Continue to PayPal Sandbox</em>. The server independently validates the catalogue item and calculates the amount.</li>
          <li>On PayPal, sign in with a <strong>Sandbox test buyer</strong> from the PayPal Developer Dashboard and approve the test payment.</li>
          <li>Return to PayProof AI and open <em>Payment evidence</em>. Confirm that a server-verified capture and saved order are displayed. If they are not, report the result as unverified.</li>
        </ol>
        <div className="ops-info-banner"><span className="ops-info-icon">!</span><div><strong>Demo troubleshooting</strong><p>If checkout cannot start, check the Preview environment's PayPal Sandbox client ID, client secret and Sandbox API base URL. Order persistence also needs the server-side Supabase URL and service-role key. If AI draft extraction fails, check the server-side Groq key. Keep every secret server-side; never paste keys or tokens into the page, source code, chat or recording. A return redirect alone is not payment proof.</p></div></div>
      </section>

      <section className="ops-panel" style={{ padding: 24, marginBottom: 20 }}>
        <div className="ops-panel-top"><div><span className="ops-panel-symbol mint">♙</span><div><strong>Choose the right judge access path</strong><p>Public sample exploration and private account actions are separate</p></div></div></div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 16, marginTop: 18 }}>
          <div style={{ border: "1px solid var(--border, #e5e7eb)", borderRadius: 12, padding: 18 }}>
            <strong>1. Explore the public sample</strong>
            <p style={{ lineHeight: 1.65, color: "var(--muted, #667085)", margin: "8px 0 14px" }}>No reviewer token is needed to inspect the synthetic, read-only sample reconciliation view. It is illustrative and does not expose another user's private records.</p>
            <Link className="ops-secondary-button" href="/#reconciliation">Open public sample review <span>↗</span></Link>
          </div>
          <div style={{ border: "1px solid var(--border, #e5e7eb)", borderRadius: 12, padding: 18 }}>
            <strong>2. Use your own workspace</strong>
            <p style={{ lineHeight: 1.65, color: "var(--muted, #667085)", margin: "8px 0 14px" }}>Create an account or sign in first. Your saved orders and private workspace should belong to your account, not the project owner's account.</p>
            <Link className="ops-primary-button" href="/auth">Create account / Sign in <span>↗</span></Link>
          </div>
          <div style={{ border: "1px solid var(--border, #e5e7eb)", borderRadius: 12, padding: 18 }}>
            <strong>3. Request private reviewer access</strong>
            <p style={{ lineHeight: 1.65, color: "var(--muted, #667085)", margin: "8px 0 14px" }}>Statement imports, approval or rejection, and internal demo-ledger posting are restricted reviewer actions. They are not enabled by the public sample walkthrough.</p>
            <span className="ops-sample-tag">AUTHORISATION REQUIRED</span>
          </div>
        </div>
      </section>

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
          <li>Use a fresh Sandbox checkout and show the server-verified result, not just the return page.</li>
          <li>Never type or display API keys, reviewer tokens, or credentials.</li>
          <li>Do not describe simulated statement rows as a real bank connection.</li>
          <li>Show reviewer decisions and audit events only after successfully performing those actions.</li>
          <li>Do not show another user's private workspace or personal customer data.</li>
          <li>Keep the final video below three minutes and watch the full recording before submission.</li>
        </ul>
        <button className="ops-secondary-button" onClick={() => setShowScript((value) => !value)}>{showScript ? "Hide closing script" : "Show 15-second closing script"}</button>
        {showScript && <blockquote style={{ marginTop: 16, lineHeight: 1.7 }}>“PayProof AI helps sellers turn customer messages into reviewable order drafts, verify PayPal Sandbox payment evidence on the server, and review reconciliation exceptions with an audit trail. AI assists the workflow; verified evidence and human approval control payment decisions.”</blockquote>}
      </section>

      <div className="ops-bottom-cta"><div><span className="ops-cta-icon">↗</span><div><strong>Ready to explore PayProof AI?</strong><p>Start with the public sample, or sign in to create your own private workspace.</p></div></div><div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}><Link className="ops-secondary-button" href="/#reconciliation">Public sample</Link><Link className="ops-primary-button" href="/auth">Sign in / Create account <span>↗</span></Link></div></div>
    </WorkspaceLayout>
  );
}
