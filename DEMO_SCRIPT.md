# PayProof AI — 2:45 Hackathon Demo Script

**Official submission video:** Publish a public YouTube video under 3 minutes and add its URL to the Devpost submission. This is required by the official rules. Cassie's separate 30–60 second PayPal-team introduction video is optional.

- Stable application: https://payproof-ai-beta.vercel.app/
- Latest assistant + reconciliation feature preview: https://payproof-ai-git-feat-chatgpt-style-payproo-068502-naom6083-2980.vercel.app/
- Assistant pull request: https://github.com/Moana-star/payproof-ai/pull/9
- Reconciliation pull request: https://github.com/Moana-star/payproof-ai/pull/8

**Important:** The latest feature preview is a Vercel preview, not the stable production deployment. It must pass the manual walkthrough below before it is used as the public judging demo. Never imply that preview-only features are in production.

## Before recording

Use the latest READY preview and confirm its commit SHA. Use a dedicated PayPal Sandbox buyer account and synthetic customer details. Prepare a completed Sandbox verification before recording. Never show secrets, private tokens, real card details or real customer data. If a feature fails, state that honestly and show the safe fallback. Do not fabricate a successful transaction for the recording.

## 0:00–0:25 — Problem and product

**Say:** “Small sellers receive orders in messages and payment updates in separate systems. PayProof AI connects order intake, PayPal checkout, payment verification and evidence review. AI helps organise information, but it cannot decide that money was received.”

**Show:** Overview dashboard and clearly labelled sample data.

## 0:25–0:55 — AI-assisted order intake

Paste:

`Hi, I would like 2 Coffee gift sets, please.`

Review the proposed product and quantity.

**Say:** “AI proposes a draft. The seller reviews it. Application code validates the catalogue and calculates the total; the model does not set trusted prices.”

**Show:** The actual message, extracted draft, review/correction step and trusted total.

## 0:55–1:35 — PayPal Sandbox checkout and verification

Show the checkout flow and a completed Sandbox verification result.

**Say:** “A browser redirect or customer screenshot is not proof. The server checks the PayPal transaction and expected details before recording a paid state.”

**Show:** Sandbox label, provider status, capture reference, expected-versus-captured amount/currency and verification timestamp where available. Do not show secrets.

## 1:35–2:15 — Reconciliation and human control

Open the feature preview, sign in and load the private workspace. Show a previously imported statement row and its match reason.

**Say:** “The matcher compares exact reference, amount and currency with eligible server-verified PayPal captures. A match is only a candidate. A human must approve it before posting to the internal ledger, and the action is recorded in the audit trail.”

Show the pending-review state, reviewer action, internal ledger entry and audit event only if those steps have actually been completed on the preview.

**Say:** “This is an internal application ledger, not a live bank feed or proof of bank settlement.”

## 2:15–2:45 — AI assistant and close

Ask the assistant to explain a known payment state or exception. Use a synthetic example if no real account record is supplied.

**Say:** “AI makes the record easier to understand. It cannot invent transaction IDs, override provider verification or approve a reconciliation. PayProof AI makes the evidence and the next safe action visible.”

## Recording and upload checklist

- [ ] Confirm the exact deployment URL, READY state and commit SHA.
- [ ] Complete the end-to-end test on the same preview build that appears in the video.
- [ ] Test AI order extraction and review before recording.
- [ ] Have a real completed PayPal Sandbox verification ready.
- [ ] Show the real application, not a mockup, for reconciliation.
- [ ] Distinguish provider-verified Sandbox evidence from synthetic examples.
- [ ] Do not call a PayPal capture bank settlement.
- [ ] Do not claim unmeasured time savings, fraud reduction or customer results.
- [ ] Record horizontally with readable text and a clear voice-over.
- [ ] Keep the final video under 3 minutes.
- [ ] Upload to YouTube with visibility set to Public.
- [ ] Add the YouTube URL to the Devpost submission and test that it opens while signed out.
- [ ] Keep the optional 30–60 second PayPal-team intro separate from the required submission video.
