# PayProof AI — Hackathon Submission Copy

Use this as the source copy when completing the public hackathon submission. Replace the video placeholder with the final public YouTube URL. Do not publish private judge credentials or secrets.

## Project title

PayProof AI

## One-line pitch

**Evidence first. AI explains the record. Verified payment data decides.**

## Short description

PayProof AI helps small online sellers turn customer order messages into reviewable drafts, collect payments through PayPal Sandbox, inspect server-verified payment evidence, and understand exceptions with bounded AI assistance. It keeps payment decisions grounded in provider verification rather than model output, screenshots, or customer claims.

## The problem

Small sellers often manage customer orders in chat while payment information sits in a separate checkout or provider dashboard. Manually connecting the requested items, expected total, payment reference, and final payment status creates friction and can lead to premature fulfilment.

## The solution

PayProof AI brings order intake, checkout, payment evidence, and exception explanation into one reviewable workflow.

A seller can paste an order message and receive a structured draft. The seller reviews it; application code calculates the trusted total; PayPal Sandbox handles checkout; and the server verifies the provider result against the expected order details. If evidence is incomplete or inconsistent, the workflow should remain under review. AI helps explain the known facts and safe next steps but cannot change payment state or trigger financial actions.

## What is technically interesting

- Next.js and React application with a focused payment-operations workspace.
- Server-side PayPal OAuth and Orders API integration in Sandbox.
- Server-side verification of final payment status and expected payment details.
- Supabase persistence integration for order and payment-event records.
- Groq-backed structured order extraction and evidence explanations.
- Clear separation between language-model output and deterministic payment decisions.
- Human review for order confirmation and ambiguous evidence.

## How AI is used

AI is used for two bounded language tasks:

1. Extracting a proposed order draft from unstructured customer text.
2. Explaining known fields in selected evidence scenarios in plain language.

AI does not calculate authoritative totals, verify that money was received, invent transaction evidence, change payment status, or execute fulfilment/refunds/payouts. Provider verification and payment-state decisions remain server-side application responsibilities.

## PayPal integration

PayPal is central to the order-to-payment workflow. The application creates PayPal Sandbox checkouts and uses server-side provider verification after buyer approval. The demonstration uses Sandbox accounts and synthetic records; it does not process real money.

## Impact

For small sellers, a clearer connection between the order and payment record can reduce manual checking and help prevent action on incomplete or mismatched evidence. The prototype focuses on making the next safe action understandable, not on automating away human judgement.

## Innovation

The differentiator is not simply adding a chatbot to a payment dashboard. PayProof AI deliberately limits AI authority: the model can interpret language and explain evidence, while deterministic application logic and PayPal verification control the payment decision. This makes uncertainty visible instead of hiding it behind confident generated text.

## Demo links

- Live application: https://payproof-5jgb7rn9d-naom6083-2980.vercel.app/
- Source code: https://github.com/Moana-star/payproof-ai
- Judge testing guide: https://github.com/Moana-star/payproof-ai/blob/main/JUDGE_GUIDE.md
- Demo script: https://github.com/Moana-star/payproof-ai/blob/main/DEMO_SCRIPT.md
- Final test checklist: https://github.com/Moana-star/payproof-ai/blob/main/TEST_PLAN.md
- Demo video: [ADD PUBLIC YOUTUBE URL — UNDER 3 MINUTES]

## Technologies and tools

- Next.js 15
- React 19
- TypeScript
- PayPal Developer / Orders API (Sandbox)
- Supabase
- Groq AI
- Vercel

## Testing and limitations

Describe only tests actually completed on the deployed release. Distinguish server-side payment verification from database persistence. Clearly label sample reconciliation and exception records as synthetic/illustrative. This is a hackathon prototype, not a production payment processor or live-money application. Production use would require further security, privacy, account-scoped authorisation, reliability, and operational review.

## Five judging dimensions — presentation guide

### Technological implementation
Show the order draft, server-priced checkout, PayPal Sandbox approval, server-side verification, and persistence outcome. Explain what is deterministic and what is AI-assisted.

### Design
Show how the workspace makes order details, payment status, evidence, and next actions easy to inspect. Keep the interface uncluttered and make sample data labels visible.

### Potential impact
Explain the seller problem with a concrete example: a customer claims to have paid, but the seller needs to know whether the correct amount was actually captured before fulfilling.

### Innovation
Emphasise the evidence-first architecture: AI can explain but cannot decide payment status. Demonstrate an amount mismatch or missing-evidence case.

### Presentation
Keep the demo under three minutes. Show a working happy path, one exception, and the trust boundary. Avoid long slides, unverified claims, or credential exposure.
