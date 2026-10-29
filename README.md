# PayProof AI

**Know what was paid. Understand what needs attention.**

PayProof AI is an evidence-first payment-operations prototype for small online sellers. It combines AI-assisted order-message extraction, PayPal Sandbox checkout verification, payment evidence, and a human-reviewed reconciliation workflow.

> **Trust rule:** AI can organise and explain information. Only server-side verification against PayPal can establish payment status. A screenshot, customer claim, or AI answer is not payment proof.

## Hosted demo

**Judge-ready Preview:** https://payproof-ai-git-feat-judge-ready-evidence-7cb616-naom6083-2980.vercel.app/

This preview uses PayPal Sandbox only. Dashboard example rows are labelled sample data; payment evidence comes from saved server-verified Sandbox captures. Reconciliation uses simulated statement CSV data and posts only to the internal demo ledger, not a bank or external accounting platform. The hosted preview is a working build, but judges should use the documented workflow and limitations rather than interpret sample rows as live customer transactions.

## The problem

Small merchants often receive order details in conversations while payment updates live in separate systems. That creates manual work and the risk of fulfilling an order before a payment is confirmed.

## What the prototype includes

- **Order intake:** Groq-backed structured extraction proposes a product, quantity, notes, and missing information. The seller reviews the draft; the model does not set trusted prices or payment status.
- **Server-priced checkout:** the application validates supported catalogue items and calculates totals outside the model.
- **PayPal Sandbox verification:** server-side verification checks capture status and expected transaction details before treating an order as paid.
- **Persistence:** Supabase-backed order storage is implemented. A successful Sandbox capture has been observed with the order saved as paid and its verification timestamp; perform a fresh end-to-end check before relying on this in a judging session.
- **Payment evidence and AI explanation:** the assistant explains explicitly labelled synthetic evidence scenarios. It is advisory and cannot change payment state.
- **Reconciliation:** CSV statement import, duplicate transaction detection, exact-reference/amount/currency matching against verified Sandbox captures, exception review, reviewer approval, and internal demo-ledger posting.
- **Audit trail:** import, matching, approval, and ledger-posting events are recorded. This is an operational prototype, not a tamper-proof or externally certified ledger.
- **Responsive operations UI:** Overview, Orders, AI order intake, Payment activity, Reconciliation, Payment evidence, AI assistant, Exception review, and Audit trail.

The reconciliation workflow has been exercised with a **simulated statement row** matched to a verified Sandbox capture, then approved and posted to the internal demo ledger. This demonstrates the review flow only; it is **not evidence of a real bank feed or bank transaction**.

## How it works

1. Paste a customer order message.
2. AI proposes a structured draft and flags missing or ambiguous details.
3. The seller reviews the draft; application code validates the product and computes the total.
4. The server creates a PayPal Sandbox checkout.
5. The server verifies the PayPal transaction before recording a paid status.
6. The application attempts to persist the order and payment evidence in Supabase.
7. A statement CSV can be imported for exact matching against eligible verified Sandbox captures.
8. A human reviewer approves a valid match; only then can an internal demo-ledger entry be posted.
9. Audit events provide a reviewable history of the reconciliation actions.

## Current implementation status

This is a hackathon prototype, **not production-ready**.

- [x] Responsive dashboard and operations pages
- [x] Server-side PayPal Sandbox order creation/capture verification code
- [x] Server-priced catalogue and structured AI order-extraction endpoint
- [x] Supabase persistence code for orders and payment events
- [x] Protected CSV import, duplicate detection, evidence matching, exception decisions, and reviewer-gated internal demo-ledger posting
- [x] Idempotent posting guard and status-consistent posted-row explanation
- [x] MIT license and environment-variable template
- [x] A successful Sandbox capture and saved paid order have been observed
- [x] Reconciliation flow tested using clearly labelled simulated statement data
- [x] Confirm `GROQ_API_KEY` is configured for Vercel Preview
- [ ] Test AI order intake and the AI assistant on the active deployed Preview
- [ ] Perform a fresh end-to-end Sandbox checkout and independently confirm the matching Supabase order and payment-event records
- [ ] Run automated lint/build checks on the exact final commit and verify the resulting deployment
- [ ] Exercise safe failure paths: incomplete order, cancelled/uncompleted payment, amount/currency/reference mismatch, provider outage, and duplicate request
- [ ] Record and watch the public demo video (under three minutes)
- [ ] Complete final hackathon submission fields and confirm the public links work

A Git commit is not proof that an integration has been tested. During the demo, distinguish live verified Sandbox evidence from illustrative dashboard records and synthetic assistant scenarios.

## Run locally

### Requirements

- Node.js 20 or another supported Node.js release
- npm
- PayPal Developer account with a Sandbox REST app
- Supabase project for persistence
- Groq API key for the AI features

### 1. Install

```bash
npm install
```

### 2. Configure environment variables

Create `.env.local` beside `package.json`, then copy the variable names from `.env.example` and set private values.

For PayPal Sandbox:

```env
PAYPAL_CLIENT_ID=your_sandbox_client_id
PAYPAL_CLIENT_SECRET=your_sandbox_client_secret
PAYPAL_BASE_URL=https://api-m.sandbox.paypal.com
APP_URL=http://localhost:3000
```

For persistence:

```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_server_side_service_role_key
```

For AI order intake and evidence explanations:

```env
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=openai/gpt-oss-20b
```

For the protected reconciliation console, configure a long random `RECONCILIATION_ADMIN_TOKEN` server-side in the environment where the console is enabled.

Keep credentials private. Never use `NEXT_PUBLIC_` for service keys, commit `.env.local`, or paste secret values into issues or chat. Use PayPal Sandbox credentials for the hackathon demo, not PayPal Live credentials.

### 3. Start the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 4. Test a Sandbox payment

Select **Test PayPal checkout** and approve with a PayPal Sandbox test buyer. Inspect the verification result, then independently confirm the order and payment-event records in Supabase. Payment verification and database persistence are separate outcomes.

### 5. Run checks

```bash
npm run lint
npm run build
```

Resolve errors before deploying. These are the intended checks; they are not a claim that every environment or end-to-end flow has already passed.

## AI boundaries

Groq is used for order-detail extraction and explanations of selected synthetic evidence scenarios. Model output is advisory and schema-validated. The seller reviews extracted fields. Price calculation, PayPal requests, payment-state decisions, and persistence remain application/server responsibilities.

The AI assistant page currently explains synthetic examples, not private live orders. Do not allow model output to set prices, claim a payment succeeded, bypass PayPal verification, or label an exception as fraud without evidence.

## Security, privacy, and limitations

1. Keep PayPal, Supabase, Groq, and reviewer credentials server-side.
2. Never treat screenshots, customer messages, or model output as payment evidence.
3. Calculate prices and totals in deterministic application code.
4. Verify payment state against PayPal on the server.
5. Require human review for ambiguous order details and reconciliation matches.
6. Use Sandbox transactions and synthetic records during the hackathon.
7. Treat a browser return URL as a trigger to verify—not proof of payment.
8. Do not expose real order history until authentication and owner-scoped authorization are implemented.
9. The reconciliation ledger is internal demo data; there is no live bank API/feed or external accounting write.
10. Before production use, add and test webhook signature verification, authentication/authorization, rate limits, retries, monitoring, privacy controls, and security review.

## Hackathon demo

Follow [DEMO_SCRIPT.md](DEMO_SCRIPT.md) for a short, honest walkthrough. Show the AI proposal, the server-verified Sandbox payment, and the human-approved reconciliation flow. Clearly identify synthetic examples and simulated statement data.

## Project documents

- [Project scope](scope.md)
- [Product requirements](prd.md)
- [Technical specification](spec.md)
- [Demo script](DEMO_SCRIPT.md)
- [Hackathon submission draft](SUBMISSION_DRAFT.md)
- [Judge readiness and acceptance tests](JUDGE_READINESS.md)
- [Environment template](.env.example)
- [MIT License](LICENSE)

## License

MIT. See [LICENSE](LICENSE).
