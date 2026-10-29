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

- **AI order intake:** Groq-backed structured extraction proposes a catalogue product, quantity, customer note, and missing information. The seller reviews the draft; the model does not set trusted prices or payment status.
- **Explicit ambiguity handling:** the acceptance checklist covers missing quantities, ambiguous/multiple products, unsupported items, prompt injection, and provider failure. These cases must be verified against the exact deployed version before they are described as passed.
- **Server-priced checkout:** the application validates supported catalogue items and calculates totals outside the model.
- **PayPal Sandbox verification:** server-side verification checks capture status and expected transaction details before treating an order as paid.
- **User accounts and workspaces:** Supabase Auth sign-up/sign-in and editable profile/workspace names are implemented. Saved orders are scoped to the signed-in owner. The complete email-confirmation and login flow still needs a fresh end-to-end test.
- **Payment evidence:** the assistant can explain explicitly labelled synthetic evidence scenarios. It is advisory and cannot change payment state.
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

## Current implementation and release status

This is a hackathon prototype, **not production-ready**.

- [x] Responsive dashboard and operations pages
- [x] Server-side PayPal Sandbox order creation/capture verification code
- [x] Server-priced catalogue and structured AI order-extraction endpoint
- [x] Supabase persistence code for orders and payment events
- [x] Supabase Auth account/profile/workspace foundation and owner-scoped saved orders
- [x] Protected reconciliation write endpoints; public preview endpoint returns synthetic read-only rows only
- [x] Reviewer-gated internal demo-ledger posting and duplicate-post guard
- [x] MIT license and environment-variable template
- [x] Smoke test for unauthenticated API boundaries and synthetic-only public preview
- [ ] Add the Supabase redirect URLs and test sign-up, email confirmation, sign-in, sign-out, and profile updates with a fresh test account
- [ ] Test that two test accounts cannot see or change each other's orders
- [ ] Reconciliation records remain a protected reviewer/demo workflow and are **not yet a per-user workspace feature**; keep them restricted until owner scoping is implemented and verified
- [ ] Test AI order intake and AI explanation on the active deployed Preview; capture both successful and safe-failure examples
- [ ] Perform a fresh end-to-end Sandbox checkout and independently confirm the matching Supabase order and payment-event records
- [ ] Exercise cancellation, unapproved/incomplete payment, amount/currency/reference mismatch, provider outage, and duplicate requests
- [ ] Run lint, production build, and smoke checks on the exact candidate commit; inspect CI result
- [ ] Record and watch the public demo video (under three minutes)
- [ ] Complete final hackathon submission fields and confirm the public links work

A Git commit or successful build is not proof that an integration has been tested. During the demo, distinguish live verified Sandbox evidence from illustrative dashboard records and synthetic assistant scenarios.

## AI contribution and differentiation

The AI component converts unstructured order messages into a constrained draft and surfaces missing or ambiguous details for human review. It is deliberately prevented from setting prices, claiming a payment succeeded, bypassing PayPal verification, or independently approving reconciliation.

The useful claim is not “AI detects fraud.” The defensible claim is: **AI helps structure an order; deterministic server checks verify payment evidence; a person decides how to handle ambiguous reconciliation.** Measure the workflow during testing (time to review a draft, fields correctly extracted, missing details flagged, and unsafe claims rejected) before claiming that it saves a specific amount of time or reduces errors by a specific percentage.

## Run locally

### Requirements

- Node.js 20 or another supported Node.js release
- npm
- PayPal Developer account with a Sandbox REST app
- Supabase project for persistence
- Groq API key for the AI features

### 1. Install

```bash
npm ci
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

Open http://localhost:3000.

### 4. Run checks

```bash
npm run lint
npm run build
npm run start
# In another terminal:
npm run test:smoke -- http://127.0.0.1:3000
```

The smoke suite verifies public route availability, unauthenticated API rejection, and that the public read-only reconciliation preview contains only synthetic rows. It does **not** replace a real account, AI-provider, or PayPal Sandbox end-to-end test.

### 5. Test a Sandbox payment

Select **Test PayPal checkout** and approve with a PayPal Sandbox test buyer. Inspect the verification result, then independently confirm the order and payment-event records in Supabase. Payment verification and database persistence are separate outcomes.

## Security, privacy, and limitations

1. Keep PayPal, Supabase, Groq, and reviewer credentials server-side.
2. Never treat screenshots, customer messages, or model output as payment evidence.
3. Calculate prices and totals in deterministic application code.
4. Verify payment state against PayPal on the server.
5. Require human review for ambiguous order details and reconciliation matches.
6. Use Sandbox transactions and synthetic records during the hackathon.
7. Treat a browser return URL as a trigger to verify—not proof of payment.
8. Saved order reads and payment operations require authentication and are scoped to the signed-in owner; this needs a two-account isolation test before claiming end-to-end validation.
9. The reconciliation workflow is a separate protected reviewer/demo console, not yet scoped to individual users. Do not expose real customer reconciliation records there.
10. The reconciliation ledger is internal demo data; there is no live bank API/feed or external accounting write.
11. Before production use, add and test webhook signature verification, rate limits, retries, monitoring, privacy controls, and a security review.

## Hackathon demo

Follow [DEMO_SCRIPT.md](DEMO_SCRIPT.md) for a short, honest walkthrough. Show the AI proposal, the server-verified Sandbox payment, and the human-approved reconciliation flow. Clearly identify synthetic examples and simulated statement data.

## Project documents

- [Project scope](scope.md)
- [Product requirements](prd.md)
- [Technical specification](spec.md)
- [Demo script](DEMO_SCRIPT.md)
- [Judge readiness and acceptance tests](JUDGE_READINESS.md)
- [Environment template](.env.example)
- [MIT License](LICENSE)

## License

MIT. See [LICENSE](LICENSE).
