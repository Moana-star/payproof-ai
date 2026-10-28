# PayProof AI

**Know what was paid. Understand what needs attention.**

PayProof AI is an evidence-first payment operations prototype for small online sellers. It combines reviewable order-message intake, PayPal Sandbox checkout verification, exception guidance and AI-assisted explanations.

> **Trust rule:** AI can organise and explain information. Only server-side verification against PayPal can establish payment status. A screenshot, customer claim or AI answer is not payment proof.

## The problem

Small merchants often have order details in conversations and payment updates in separate tools. That creates manual work and the risk of fulfilling an order before a payment is confirmed.

## What the prototype includes

- **Overview workspace:** clearly labelled sample dashboard, order-intake workflow and Sandbox checkout entry point.
- **Payment evidence:** order references, expected verification checks, amount/currency comparison and a visual checkout-to-record flow.
- **AI payment assistant:** asks questions about synthetic evidence scenarios and uses Groq to explain what the supplied fields mean. It is advisory and cannot change payment status.
- **Exception review:** sample scenarios for amount mismatch, missing capture evidence and records that need source confirmation, each with safe next steps.
- **Audit trail:** an illustrative event timeline showing which identifiers and verification outcomes should be retained.
- **PayPal Sandbox integration:** server-priced catalogue checkout, capture verification, and Supabase order/event persistence code.
- **Responsive design:** desktop and mobile layouts, clear statuses, loading/error messaging, and keyboard-friendly controls.

The operations pages intentionally label their example records as synthetic or illustrative. They do not expose real customer orders. Live order-history access should not be added until authentication and owner-scoped authorisation are implemented.

## How the workflow is designed

1. Paste a customer message and prepare a reviewable order draft.
2. Confirm product and quantity; the server determines the catalogue price.
3. Create a PayPal Sandbox checkout.
4. After the buyer returns, the server checks PayPal order/capture status, expected amount, currency and internal order reference.
5. The server attempts to persist the order and capture event in Supabase.
6. If evidence is incomplete or inconsistent, the workflow stays in review rather than claiming payment success.
7. The AI assistant can explain a selected synthetic scenario and recommend a safe next step.

## Current implementation status

This is an active prototype, **not production-ready**.

- [x] Next.js dashboard and responsive operations pages
- [x] Server-side PayPal OAuth helper and Orders API routes
- [x] Server-priced Sandbox checkout and return/cancel screens
- [x] Server-side checks for completed capture, amount, currency and expected reference
- [x] Groq-backed structured order extraction endpoint (requires `GROQ_API_KEY`)
- [x] Groq-backed evidence explanation endpoint for synthetic scenarios (requires `GROQ_API_KEY`)
- [x] Supabase REST persistence code for pending/verified orders and idempotent capture events
- [ ] Complete a fresh end-to-end Sandbox checkout and confirm both expected Supabase rows exist
- [ ] Confirm the Groq key is configured in the Vercel environments and test the AI UI there
- [ ] Add automated tests for successful, cancelled, pending, duplicate and mismatched transactions
- [ ] Add authenticated, owner-scoped real order history before displaying live customer data
- [ ] Before any production use, review webhook verification, rate limits, retries, monitoring and privacy/security controls

Committed code is not proof that an integration has been tested. Until a fresh end-to-end test succeeds, treat the dashboard and operations-page records as illustrative and do not claim that real customer payments are being processed.

## Run locally

### Requirements

- Node.js 20 or another supported Node.js release
- npm
- A PayPal Developer account with a **Sandbox** REST app
- A Supabase project if you want to test persistence
- A Groq API key if you want to use the AI features

### 1. Install dependencies

From the repository root:

```bash
npm install
```

### 2. Configure environment variables

Create `.env.local` beside `package.json`, then copy the variable names from `.env.example` and set your private values.

Required for PayPal Sandbox checkout:

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

Keep all credentials server-side. Never use `NEXT_PUBLIC_` for service keys, commit `.env.local`, or paste secret values into issues or chat. Do not use PayPal Live credentials for the hackathon demo.

### 3. Start the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 4. Test a Sandbox payment

Select **Test PayPal checkout** and approve the order with a PayPal Sandbox personal/test buyer. Inspect the verification result page. If it reports that the order was saved, independently confirm the matching row in Supabase; payment verification and persistence are separate outcomes.

### 5. Run checks

```bash
npm run lint
npm run build
```

Resolve errors before deploying. These instructions describe the intended validation workflow; they do not claim that all checks or end-to-end flows have passed in every environment.

## AI boundaries

Groq is used for order-detail extraction and explanations of selected synthetic evidence scenarios. Model output is advisory only. Sellers must review extracted product and quantity details. Price calculation, PayPal requests, payment-state decisions and persistence remain server-side deterministic operations.

The AI assistant page currently explains synthetic examples, not private live orders. Do not allow model output to set prices, claim a payment succeeded, bypass PayPal verification or label an exception as fraud without evidence.

## Security and privacy principles

1. Keep PayPal and Supabase secrets server-side.
2. Never treat screenshots, customer messages or model output as payment evidence.
3. Calculate prices and totals in application code, not with an LLM.
4. Verify payment state against PayPal on the server.
5. Require human review for ambiguous order details.
6. Use Sandbox credentials and synthetic records during development.
7. Treat a browser return URL as a trigger to verify—not proof of payment.
8. Do not expose real order history without authentication and owner-scoped authorisation.
9. Before production use, add and test webhook verification, rate limiting, retries, monitoring and appropriate access controls.

## Hackathon demo

A strong demo should show a real Sandbox checkout, the server-verified result, the separate database persistence outcome, and a live AI explanation of a clearly labelled sample evidence case. Keep the public demo under three minutes and do not claim untested functionality.

## Project documents

- [Scope](scope.md)
- [Product requirements](prd.md)
- [Technical specification](spec.md)
- [Environment variable template](.env.example)
- [MIT License](LICENSE)

## License

MIT. See [LICENSE](LICENSE).
