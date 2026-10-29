# PayProof AI — 2:45 Hackathon Demo Script

**Demo URL:** https://payproof-ai-git-feat-persistent-order-storage-naom6083-2980.vercel.app/  
**Source:** https://github.com/Moana-star/payproof-ai  
**Purpose:** show the problem, the AI's bounded role, server-side payment verification, and human-controlled reconciliation.

> Rehearse once using the exact deployed version. Use PayPal Sandbox buyer credentials only. Never show secret keys, real customer data, or private account pages in the recording. If a feature fails, do not edit the video to imply it worked—show the safe fallback or record again after fixing it.

## Timed walkthrough

### 0:00–0:20 — Problem and promise

**Say:** “Small sellers often receive orders in messages, then have to verify payments separately. PayProof AI brings order intake, payment evidence, and reconciliation into one reviewable workflow. The key rule is simple: AI can help interpret information, but it cannot decide that money was received.”

**Show:** Overview dashboard. Point out that sample dashboard records are illustrative.

### 0:20–0:50 — AI-assisted order intake

**Action:** Open AI order intake. Paste:  
`Hi, I'd like 2 Coffee gift sets, please.`

**Say:** “The model proposes a structured draft. The seller reviews the product and quantity; prices and totals are computed by application code, not the model.”

**Show:** Prepared draft and its review fields. If the Groq service is unavailable, do not pretend the AI succeeded; explain that the app blocks the draft and preserves manual review as the safe fallback.

### 0:50–1:35 — PayPal Sandbox verification

**Action:** Show the Sandbox checkout entry point and, if already prepared, a completed Sandbox verification result.

**Say:** “Checkout uses PayPal Sandbox. A browser redirect alone is not proof of payment. The server checks PayPal's result and expected transaction details before recording a paid state.”

**Show:** Verification result and, if available without exposing credentials, the matching saved order and verification timestamp. Make clear that this is a Sandbox transaction, not a real-money payment.

### 1:35–2:15 — Reconciliation with human control

**Action:** Open Reconciliation. Use the already-created simulated test row and its posted status; do not create another row against the same capture. Show the exact-match result, human approval, internal demo-ledger entry, and audit trail.

**Say:** “The reconciliation demo uses a simulated statement row, not a real bank feed. It matches exact reference, amount, and currency against verified Sandbox evidence. Matching never posts automatically: a reviewer must approve it, and the action is recorded in the audit trail.”

**Show:** The posted row, internal demo-ledger entry, and audit events. Point out the simulation label.

### 2:15–2:40 — Safety and differentiation

**Action:** Open Payment Evidence or the AI assistant and select the amount-mismatch or pending synthetic scenario.

**Say:** “The assistant explains evidence and recommends next steps. It cannot change payment status or override a mismatch. Missing or conflicting evidence stays in review.”

### 2:40–2:45 — Close

**Say:** “PayProof AI makes payment operations easier to review without asking merchants to trust an AI guess.”

## Recording checklist

- [ ] Use the deployed Preview URL and verify it is the latest READY deployment.
- [ ] Confirm AI order intake works before recording; never display an API key.
- [ ] Confirm the AI assistant works before recording, or omit the live answer and explain the synthetic evidence screen.
- [ ] Have a completed Sandbox verification result ready; do not spend the recording waiting for a checkout.
- [ ] Use the existing simulated reconciliation row; do not create duplicate test rows.
- [ ] Show the simulation label and distinguish Sandbox from real-money transactions.
- [ ] Keep the final recording under three minutes.
- [ ] Make the text readable at recording resolution; zoom the browser if needed.
- [ ] Watch the exported video from beginning to end and check audio, privacy, links, and duration.
- [ ] Publish the video with public viewing permissions and paste the link into the hackathon submission.
