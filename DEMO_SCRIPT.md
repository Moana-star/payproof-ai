# PayProof AI — 2:45 Hackathon Demo Script

**Required submission video:** Publish a public YouTube video under 3 minutes and add its URL to Devpost. The 30–60 second PayPal-team intro mentioned in Cassie's email is optional and separate.

**LATEST integrated feature preview:** ${preview}  
**Stable production app (older core release):** https://payproof-ai-beta.vercel.app/  
**Integrated feature preview (PRs #8 and #9):** https://payproof-ai-git-feat-chatgpt-style-payproo-068502-naom6083-2980.vercel.app/  
**Source:** https://github.com/Moana-star/payproof-ai

## Before recording

- Confirm which deployment is being shown and that it is the latest READY deployment.
- Use PayPal Sandbox buyer credentials only.
- Prepare a completed Sandbox payment before recording; do not spend the recording waiting for checkout.
- Use synthetic customer and order details.
- Do not show secrets, personal account information or real customer data.
- If a feature is unavailable, show the safe fallback and say so. Never edit a recording to imply a test passed when it did not.

## Timed walkthrough

### 0:00–0:25 — Problem and promise

**Say:** “Small sellers often receive orders in messages and payment updates in a separate system. That creates manual work and uncertainty about whether an order was actually paid. PayProof AI connects order intake, payment verification and evidence review. Our core rule is that AI can explain information, but it cannot decide that money was received.”

**Show:** Overview dashboard. Point out that sample records are illustrative.

### 0:25–0:55 — AI-assisted order intake

**Action:** Open order intake and paste:

`Hi, I would like 2 Coffee gift sets, please.`

Review the proposed product and quantity. Confirm the draft.

**Say:** “AI proposes structured order details. The seller reviews them. The application validates the catalogue and calculates the total; the model does not set trusted prices.”

**Show:** The reviewed draft and calculated total.

### 0:55–1:35 — PayPal Sandbox verification

**Action:** Show the checkout entry point and, if already completed, the successful Sandbox verification result.

**Say:** “The buyer checks out in PayPal Sandbox. A browser redirect is not proof. The application server checks the provider transaction and expected details before recording a paid state.”

**Show:** Provider status, transaction/capture reference and verification timestamp where available. Explicitly label the transaction as Sandbox.

### 1:35–2:15 — Reconciliation with human control (integrated feature preview)

**Action:** Open the latest integrated feature preview, sign in, load the private workspace and show a previously imported statement row with its match reason. Do not create a duplicate test row for an already-used capture.

**Say:** “The reconciliation preview compares statement references, amounts and currencies with eligible server-verified PayPal captures. A match is only a candidate. A human must approve it before it can be posted to the internal ledger, and the action is recorded in the audit trail.”

**Show:** Match status, reviewer action, internal ledger entry and audit event if those records are already present.

**Say clearly:** “This is an internal application ledger and a Sandbox/evidence workflow, not a live bank feed or proof of bank settlement.”

### 2:15–2:45 — AI boundary and close

**Action:** Ask the assistant to explain a known payment state or exception.

**Say:** “AI makes the record easier to understand. It cannot invent transaction IDs, override verification or approve a reconciliation. PayProof AI is designed to make the evidence and the next safe action visible.”

## Recording integrity checklist

- [ ] Verify the exact URL and deployment before recording.
- [ ] Test AI intake before recording; if the model is unavailable, state that and show the safe fallback.
- [ ] Have a completed Sandbox verification ready.
- [ ] Use only synthetic examples and test accounts.
- [ ] Show the actual reconciliation preview, not a mockup, when discussing the integrated feature preview.
- [ ] Do not describe PayPal capture as bank settlement.
- [ ] Do not claim time savings, fraud reduction or customer outcomes without measured evidence.
- [ ] Keep the final video within the requested hackathon duration and upload it to YouTube as Public, add the URL to Devpost and verify it opens while signed out.
