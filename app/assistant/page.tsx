"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { WorkspaceLayout } from "@/components/workspace-layout";

const cases = [
  { id: "completed-match", label: "Completed capture · matching order", status: "COMPLETED", amount: "38.00 USD", evidence: "Synthetic example: PayPal order status COMPLETED; capture status COMPLETED; expected amount 38.00 USD; captured amount 38.00 USD; currency USD matches; order reference matches. This is illustrative data, not a live transaction." },
  { id: "amount-mismatch", label: "Capture amount mismatch", status: "REVIEW_REQUIRED", amount: "42.00 expected · 40.00 captured", evidence: "Synthetic example: expected amount 42.00 USD; captured amount 40.00 USD; capture status COMPLETED; currency USD matches; amount comparison fails. Do not fulfil this order until a human reviews the mismatch. This is illustrative data, not a live transaction." },
  { id: "pending-capture", label: "Payment not completed", status: "PENDING", amount: "49.00 USD expected", evidence: "Synthetic example: expected amount 49.00 USD; PayPal capture evidence is unavailable; payment status PENDING. No completed capture has been verified. Do not fulfil this order. This is illustrative data, not a live transaction." }
];

export default function AssistantPage() {
  const [caseId, setCaseId] = useState(cases[0].id);
  useEffect(() => {
    const requestedCase = new URLSearchParams(window.location.search).get("case");
    if (requestedCase && cases.some((item) => item.id === requestedCase)) setCaseId(requestedCase);
  }, []);
  const [question, setQuestion] = useState("Explain what the evidence shows and what the merchant should do next.");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const selected = cases.find((item) => item.id === caseId) || cases[0];

  async function askAssistant() {
    if (!question.trim() || loading) return;
    setLoading(true); setAnswer(""); setError("");
    try {
      const response = await fetch("/api/assistant/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId, question: question.trim() })
      });
      const data = await response.json() as { answer?: string; error?: string };
      if (!response.ok || !data.answer) throw new Error(data.error || "The assistant could not explain this case.");
      setAnswer(data.answer);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The AI assistant is unavailable. Review the evidence manually.");
    } finally { setLoading(false); }
  }

  return (
    <WorkspaceLayout title="AI payment assistant" eyebrow="AI-ASSISTED INVESTIGATION" description="Ask what the payment evidence means. The assistant explains verified fields; it never decides whether a payment succeeded.">
      <div className="ops-info-banner"><span className="ops-info-icon">✳</span><div><strong>Evidence-grounded, not evidence-generating</strong><p>The current interactive examples use synthetic scenarios. AI provider access requires the server-side GROQ_API_KEY environment variable. Never paste real customer secrets or payment credentials here.</p></div></div>
      <div className="ops-assistant-grid">
        <section className="ops-panel ops-assistant-workspace">
          <div className="ops-panel-top"><div><span className="ops-panel-symbol violet">✳</span><div><strong>Payment Evidence Brief</strong><p>Select a scenario, then ask a question.</p></div></div><span className="ops-ai-label">AI ASSISTED</span></div>
          <label className="ops-field-label" htmlFor="case-select">SAMPLE EVIDENCE SCENARIO</label>
          <select id="case-select" className="ops-select" value={caseId} onChange={(event) => { setCaseId(event.target.value); setAnswer(""); setError(""); }}>
            {cases.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
          <div className="ops-case-summary"><div><span>Observed status</span><strong className={selected.status === "COMPLETED" ? "text-good" : selected.status === "PENDING" ? "text-warn" : "text-risk"}>{selected.status.replace("_", " ")}</strong></div><div><span>Amount context</span><strong>{selected.amount}</strong></div></div>
          <label className="ops-field-label" htmlFor="evidence-question">YOUR QUESTION</label>
          <textarea id="evidence-question" className="ops-textarea" value={question} maxLength={500} onChange={(event) => setQuestion(event.target.value)} placeholder="Why does this order need review?" rows={4} />
          <button className="ops-primary-button ops-wide-button" type="button" onClick={askAssistant} disabled={loading || !question.trim()}>{loading ? "Reviewing evidence…" : "Explain this evidence"} <span>{loading ? "…" : "→"}</span></button>
          {error && <div className="ops-inline-error" role="alert"><strong>Assistant unavailable</strong><p>{error}</p><span>Use the evidence summary above and verify the real transaction through PayPal.</span></div>}
          {answer && <div className="ops-ai-answer" role="status"><div className="ops-answer-title"><span>✳</span><div><strong>Evidence explanation</strong><small>AI-generated · based on the selected synthetic scenario</small></div></div><p>{answer}</p><div className="ops-answer-foot">This explanation is advisory. Confirm transaction status using PayPal’s server-side verification.</div></div>}
        </section>
        <aside className="ops-assistant-aside">
          <section className="ops-panel ops-visual-panel">
            <div className="ops-panel-top"><div><span className="ops-panel-symbol mint">✓</span><div><strong>What the assistant can do</strong><p>Helpful analysis with clear boundaries</p></div></div></div>
            <div className="ops-capability"><span>01</span><div><strong>Explain mismatches</strong><p>Describe which fields agree or disagree.</p></div></div>
            <div className="ops-capability"><span>02</span><div><strong>Identify missing evidence</strong><p>Point out unavailable capture or reference details.</p></div></div>
            <div className="ops-capability"><span>03</span><div><strong>Suggest safe next steps</strong><p>Recommend review or re-checking the server record.</p></div></div>
          </section>
          <section className="ops-safety-card"><span>!</span><div><strong>What it will never do</strong><p>Invent a transaction, set an order price, mark a payment as paid, or replace PayPal verification.</p></div></section>
          <Link className="ops-secondary-button ops-aside-link" href="/exceptions">Review exception scenarios ↗</Link>
        </aside>
      </div>
    </WorkspaceLayout>
  );
}
