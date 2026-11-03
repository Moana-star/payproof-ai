# PayProof AI — 2:45 Demo Script

- Stable app: https://payproof-ai-beta.vercel.app/
- This branch preview: https://payproof-papycsaha-naom6083-2980.vercel.app/
- PR: https://github.com/Moana-star/payproof-ai/pull/8

## Before recording

Use the latest READY preview, a dedicated PayPal Sandbox buyer account and synthetic customer details. Prepare a completed Sandbox verification before recording. Never show secrets or real customer data. If a feature fails, state that honestly and show the safe fallback.

## 0:00–0:25 — Problem

**Say:** “Small sellers receive orders in messages and payment updates in separate systems. PayProof AI connects order intake, payment verification and evidence review. AI can help interpret information, but it cannot decide that money was received.”

**Show:** Overview dashboard and clearly labelled sample data.

## 0:25–0:55 — AI order intake

Paste:

`Hi, I would like 2 Coffee gift sets, please.`

Review the proposed product and quantity.

**Say:** “AI proposes a draft. The seller reviews it. Application code validates the catalogue and calculates the total; the model does not set trusted prices.”

## 0:55–1:35 — PayPal Sandbox verification

Show the checkout flow and a completed Sandbox verification result.

**Say:** “A browser redirect is not proof. The server checks the PayPal transaction and expected details before recording a paid state.”

Show provider status, capture reference and verification timestamp where available. Label the transaction Sandbox.

## 1:35–2:15 — Reconciliation

Open this branch preview, sign in and load the private workspace. Show a previously imported statement row and its match reason.

**Say:** “The matcher compares exact reference, amount and currency with eligible server-verified PayPal captures. A match is only a candidate. A human must approve it before posting to the internal ledger, and the action is recorded in the audit trail.”

Show the pending-review state, reviewer action, internal ledger entry and audit event only if these steps have actually been completed.

**Say:** “This is an internal application ledger, not a live bank feed or proof of bank settlement.”

## 2:15–2:45 — AI boundary and close

Ask the assistant to explain a known payment state or exception.

**Say:** “AI makes the record easier to understand. It cannot invent transaction IDs, override verification or approve a reconciliation. PayProof AI makes evidence and the next safe action visible.”

## Recording checklist

- [ ] Confirm the exact deployment and commit.
- [ ] Test AI intake before recording.
- [ ] Have a completed Sandbox verification ready.
- [ ] Show the real preview, not a mockup, for reconciliation.
- [ ] Distinguish verified Sandbox evidence from synthetic examples.
- [ ] Do not call a PayPal capture bank settlement.
- [ ] Do not claim unmeasured time savings or fraud reduction.
- [ ] Keep the final video within the hackathon's requested duration.
