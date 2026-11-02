# PayProof AI

**Evidence first. AI explains the record. Verified payment data decides.**

PayProof AI is an AI-assisted payment operations workspace for small online sellers. It turns customer order messages into reviewable drafts, supports PayPal Sandbox checkout, verifies payment evidence on the server, and helps explain exceptions in plain language.

**The core promise:** make payment status easier to understand without allowing an AI model, screenshot, or customer message to become proof that money was received.

[Open the live demo](https://payproof-5jgb7rn9d-naom6083-2980.vercel.app/) · [Judge testing guide](JUDGE_GUIDE.md) · [2:55 demo script](DEMO_SCRIPT.md) · [Final test checklist](TEST_PLAN.md)

---

## Why this matters

Small sellers often receive orders through chat while payment information lives elsewhere. They manually connect customer messages, expected totals, checkout references, and payment updates. That makes it easy to miss a mismatch or fulfil an order before payment is confirmed.

PayProof AI brings those steps into one reviewable workflow. It is designed around a simple trust boundary:

> **AI can organise and explain information. Only server-side verification against PayPal can establish payment status.**

## What you can do

| Capability | What it does | Trust boundary |
|---|---|---|
| Order intake | Extracts a proposed order from a customer message | Seller reviews and confirms the draft |
| Deterministic pricing | Uses application-side catalogue data to calculate totals | The model and browser do not set trusted prices |
| PayPal Sandbox checkout | Creates a checkout for a confirmed order | Uses Sandbox credentials; no live-money processing |
| Payment verification | Checks provider transaction status and expected payment details server-side | A browser return or success screen alone is not proof |
| Payment evidence | Presents payment references and verification outcomes | Unverified or conflicting evidence remains under review |
| AI explanations | Explains selected evidence scenarios and suggests safe next steps | Advisory only; cannot mark an order paid or execute a financial action |
| Reconciliation and exception workflows | Helps reviewers understand sample records and discrepancies | Clearly labelled demo/synthetic data; human review remains necessary |
| Audit-oriented views | Demonstrates the identifiers and events a reviewer should inspect | Illustrative views are not represented as a complete production audit system |

## How the main workflow works

1. A seller pastes a customer order message.
2. AI proposes structured order details and identifies missing information.
3. The seller reviews and confirms the draft.
4. Application code validates the selected catalogue items and calculates the total.
5. The server creates a PayPal Sandbox checkout.
6. The buyer approves the checkout in PayPal Sandbox.
7. The application server checks the PayPal result, including final status and expected payment details.
8. The application reports verification and persistence outcomes separately.
9. The AI assistant can explain known evidence and suggest next steps, but cannot change the verified payment state.

## What makes PayProof AI different

- **Evidence-led decisions:** payment state comes from server-side provider verification, not a model's opinion.
- **Human-in-the-loop order intake:** AI proposes; the seller confirms.
- **Deterministic money logic:** catalogue prices and totals are calculated by application code.
- **Safe handling of uncertainty:** missing, pending, or conflicting evidence is not presented as successful payment.
- **Useful AI, bounded authority:** language understanding helps with order intake and explanations without controlling financial decisions.
- **A practical seller workflow:** order intake, checkout, payment evidence, and exception understanding are brought together.

## Technology

- Next.js 15
- React 19
- TypeScript
- PayPal Orders API — Sandbox environment
- Supabase — server-side persistence integration
- Groq — structured order extraction and evidence explanations
- Vercel — deployment and hosting

The AI provider is used for language tasks. PayPal verification and payment-state decisions remain deterministic server-side application responsibilities.

## Live demo

**Application (sign-in enabled):** https://payproof-5jgb7rn9d-naom6083-2980.vercel.app/

The hosted project is a hackathon prototype and uses PayPal Sandbox. Use synthetic/demo records for exploratory pages. Do not enter real customer payment information or expect real-money processing.

For a guided walkthrough, see [JUDGE_GUIDE.md](JUDGE_GUIDE.md). For the recommended narration and sequence, see [DEMO_SCRIPT.md](DEMO_SCRIPT.md).

## Judge quick start

1. Open the [live application](https://payproof-5jgb7rn9d-naom6083-2980.vercel.app/).
2. Follow the [Judge Testing Guide](JUDGE_GUIDE.md) for the current sign-in and Sandbox checkout flow.
3. Use a dedicated PayPal Sandbox buyer account for checkout approval. Never use a personal PayPal account or share developer secrets.
4. Inspect the server-verified payment result and distinguish it from the separate database persistence result.
5. Explore the clearly labelled sample exception and AI explanation scenarios.
6. Use the [Final Test Checklist](TEST_PLAN.md) to understand the scenarios and expected safe behaviour.

**Credentials:** do not publish app passwords, PayPal Sandbox buyer passwords, PayPal client secrets, Supabase service-role keys, AI-provider keys, or reviewer tokens in this public repository, README, screenshots, or public Devpost description. Provide any temporary judge credentials only through an approved private channel, if the judging process requires them. Rotate temporary credentials after the event.

## AI use and safeguards

AI is used for:
- Extracting a proposed order draft from unstructured customer text.
- Explaining known fields in selected payment-evidence scenarios.
- Translating technical or operational evidence into understandable next steps.

AI is not used to:
- Verify that money was received.
- Set authoritative catalogue prices or calculate trusted totals.
- Invent PayPal transaction IDs, capture records, or payment evidence.
- Change payment status or bypass provider verification.
- Trigger fulfilment, refunds, payouts, or other financial actions.

Model output is treated as untrusted input, validated, and presented as advisory. A model outage must not turn into a false payment success.

## Security, privacy, and demo boundaries

- PayPal and AI-provider credentials remain server-side environment variables.
- Supabase service credentials must remain server-side and must never use a `NEXT_PUBLIC_` prefix.
- The repository contains placeholders only in `.env.example`.
- PayPal Sandbox and synthetic data are used for the hackathon demonstration.
- A browser redirect is a prompt to verify, not proof of payment.
- Do not use the prototype to process real customer funds.
- The current sample operations pages are clearly labelled; they must not be mistaken for a private, owner-scoped production order-history system.
- Before production use, complete a security and privacy review, including account-scoped authorisation, webhook strategy, rate limits, retries, monitoring, retention, and operational controls.

## Run locally

### Requirements

- Node.js 20 or another supported Node.js release
- npm
- A PayPal Developer account with a Sandbox REST app
- A Supabase project for persistence testing
- A Groq API key for AI features

### 1. Install

```bash
npm install
```

### 2. Configure environment

Create `.env.local` in the repository root, next to `package.json`. Copy the variable names from `.env.example` and supply your own private values.

```env
PAYPAL_CLIENT_ID=your_sandbox_client_id
PAYPAL_CLIENT_SECRET=your_sandbox_client_secret
PAYPAL_BASE_URL=https://api-m.sandbox.paypal.com
APP_URL=http://localhost:3000

SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_server_side_service_role_key

GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=openai/gpt-oss-20b
```

Do not commit `.env.local`. Do not put secrets in client-side variables. Do not use PayPal Live credentials for the hackathon demo.

### 3. Start

```bash
npm run dev
```

Open http://localhost:3000.

### 4. Verify locally

```bash
npm run lint
npm run build
```

Use a PayPal Sandbox buyer to approve a test checkout. Check the application verification result and independently inspect the expected Supabase records. Verification and persistence are separate outcomes: a verified payment does not, by itself, prove that a database write succeeded.

## Repository guide

| File | Purpose |
|---|---|
| [scope.md](scope.md) | Product scope, boundaries, and acceptance criteria |
| [prd.md](prd.md) | Product requirements and user scenarios |
| [spec.md](spec.md) | Technical architecture, state model, and test design |
| [JUDGE_GUIDE.md](JUDGE_GUIDE.md) | Judge-facing instructions and safe demo walkthrough |
| [DEMO_SCRIPT.md](DEMO_SCRIPT.md) | Concise video/demo narration |
| [TEST_PLAN.md](TEST_PLAN.md) | Final manual verification checklist |
| [.env.example](.env.example) | Environment variable names with placeholders |
| [LICENSE](LICENSE) | MIT open-source licence |

## Current scope and honest limitations

PayProof AI is a **hackathon prototype**, not a production payment processor, wallet, accounting platform, or fraud-detection service. It uses PayPal Sandbox rather than live transactions. Sample exception/reconciliation scenarios are synthetic or illustrative unless a screen explicitly shows a verified Sandbox transaction.

The project includes server-side PayPal integration, AI endpoints, and Supabase persistence code. The maintainer should demonstrate the complete checkout and independently verify persistence in the deployed environment before describing that exact run as successful. Do not infer production readiness from a successful build or a working UI.

Production deployment would require further security, privacy, reliability, and operational work, including owner-scoped access controls, webhook verification where used, rate limiting, retry/idempotency review, monitoring, and incident handling.

## Hackathon evaluation focus

The project is presented to make the following strengths easy to evaluate:

1. **Technological implementation:** a real application workflow connecting order intake, PayPal Sandbox checkout, server-side verification, persistence integration, and AI assistance.
2. **Design:** a focused payment-operations workspace with clear evidence, statuses, and next actions.
3. **Potential impact:** fewer manual handoffs and a lower risk of acting on incomplete payment information for small sellers.
4. **Innovation:** AI is deliberately constrained to language tasks while deterministic verification controls payment state.
5. **Presentation:** a short, reproducible walkthrough that shows the workflow, the evidence, the safeguards, and the limitations.

No outcome, score, or prize placement is guaranteed. The best demonstration is specific, honest, and reproducible.

## Licence

Released under the [MIT License](LICENSE).
