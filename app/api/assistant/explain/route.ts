import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const CASES: Record<string, { label: string; evidence: string }> = {
  "completed-match": {
    label: "Completed capture with matching order",
    evidence: "Synthetic example only. PayPal order status COMPLETED; capture status COMPLETED; expected amount 38.00 USD; captured amount 38.00 USD; currency matches; order reference matches."
  },
  "amount-mismatch": {
    label: "Capture amount mismatch",
    evidence: "Synthetic example only. Expected amount 42.00 USD; captured amount 40.00 USD; capture status COMPLETED; currency USD matches; amount comparison fails. Do not fulfil until a human reviews the discrepancy."
  },
  "pending-capture": {
    label: "Payment not completed",
    evidence: "Synthetic example only. Expected amount 49.00 USD; capture evidence unavailable; payment status PENDING. No completed capture has been verified. Do not fulfil this order."
  }
};

export async function POST(request: NextRequest) {
  let body: { caseId?: unknown; question?: unknown };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Send a valid JSON request." }, { status: 400 });
  }
  if (typeof body.caseId !== "string" || !Object.hasOwn(CASES, body.caseId)) {
    return NextResponse.json({ error: "Choose one of the supported sample evidence scenarios." }, { status: 400 });
  }
  if (typeof body.question !== "string" || !body.question.trim() || body.question.length > 500) {
    return NextResponse.json({ error: "Enter a question of 1–500 characters." }, { status: 400 });
  }
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "AI explanations require the server-side GROQ_API_KEY environment variable. No answer was invented. You can still inspect the evidence summary manually." }, { status: 503 });
  }
  const selected = CASES[body.caseId];
  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || "openai/gpt-oss-20b",
        temperature: 0.2,
        reasoning_effort: "low",
        max_completion_tokens: 700,
        messages: [
          { role: "system", content: "You are PayProof AI, an assistant for payment evidence review. Explain only the supplied evidence. The case is synthetic. Distinguish facts from recommendations. Never claim a payment is verified unless the supplied evidence explicitly says all required checks pass. Never infer fraud from a mismatch. Never invent identifiers or transactions. Never set prices, call tools, change payment status, or instruct fulfilment when evidence is incomplete. Recommend checking PayPal server-side records when needed. Answer concisely and clearly." },
          { role: "user", content: `Scenario: ${selected.label}\nEvidence: ${selected.evidence}\nQuestion: ${body.question.trim()}` }
        ]
      })
    });
    if (!response.ok) {
      const providerError = (await response.text()).slice(0, 300);
      console.error(`[assistant/explain] Groq HTTP ${response.status}: ${providerError}`);
      return NextResponse.json({ error: response.status === 429 ? "The AI provider limit was reached. Try again later or review the evidence manually." : "The AI provider could not complete the explanation. Review the evidence manually." }, { status: 502 });
    }
    const payload = await response.json() as { choices?: Array<{ message?: { content?: unknown } }> };
    const answer = payload.choices?.[0]?.message?.content;
    if (typeof answer !== "string" || !answer.trim() || answer.length > 6000) {
      return NextResponse.json({ error: "The AI response could not be validated. Review the evidence manually." }, { status: 502 });
    }
    return NextResponse.json({ answer: answer.trim(), advisoryOnly: true, evidenceSource: "synthetic-demo-case", paymentVerifiedByAI: false });
  } catch {
    return NextResponse.json({ error: "The AI explanation service is unavailable. Review the evidence manually." }, { status: 502 });
  }
}
