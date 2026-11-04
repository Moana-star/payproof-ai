# PayProof AI

**Evidence first. AI explains the record. Verified payment data decides.**

PayProof AI is an evidence-led payment-operations prototype for small online sellers. It connects AI-assisted order intake, PayPal Sandbox checkout, server-side payment verification, payment evidence and human-reviewed reconciliation.

> AI may organise and explain information. Only server-side provider verification can establish the application's payment status. A screenshot, customer claim, AI response or browser redirect is not payment proof.

## Open the project

- **Stable application:** https://payproof-ai-beta.vercel.app/
- **Latest integrated feature preview:** https://payproof-ai-git-feat-chatgpt-style-payproo-068502-naom6083-2980.vercel.app/
- **Reconciliation implementation:** https://github.com/Moana-star/payproof-ai/pull/8
- **Conversational assistant:** https://github.com/Moana-star/payproof-ai/pull/9
- **Judge readiness and release gates:** [JUDGE_READINESS.md](JUDGE_READINESS.md)
- **Demo script:** [DEMO_SCRIPT.md](DEMO_SCRIPT.md)
- **Verification plan:** [TEST_PLAN.md](TEST_PLAN.md)
- **Two-account isolation test:** [scripts/security-integration-test.mjs](scripts/security-integration-test.mjs)
- **PayPal Sandbox checkout test:** [scripts/paypal-sandbox-checkout-test.mjs](scripts/paypal-sandbox-checkout-test.mjs)
- **Security policy:** [SECURITY.md](SECURITY.md)

The integrated feature preview contains the newer reconciliation and assistant work. It is separate from the stable production deployment. Confirm the latest preview deployment is READY and check the commit SHA before judging or recording.

## Product workflow

1. A seller supplies a customer message.
2. AI proposes a structured order draft for human review.
3. Application code validates the supported catalogue and calculates the trusted total.
4. PayPal Sandbox handles checkout.
5. The server verifies provider status and expected transaction details before the application records a paid state.
6. The assistant explains workflows and supplied evidence but cannot change authoritative payment state.
7. Statement rows are matched using exact reference, amount and currency. A human approves a valid candidate before it is posted to the internal ledger and audit trail.

## What the feature preview adds

- Authenticated Supabase sessions for private reconciliation operations, AI order extraction and the AI assistant API.
- User-scoped statement rows, PayPal evidence, ledger entries and audit events.
- CSV import with validation and duplicate detection.
- Exact matching against eligible server-verified PayPal Sandbox captures.
- Human approval before posting to the persistent internal ledger.
- Duplicate-post protection and audit events for import, matching, review and posting.
- A signed-in user's PayPal evidence CSV export.
- Conversational assistant with structured responses and session-scoped chat history.
- Clearly separated private account records and public synthetic judge examples.

## Trust boundaries

- PayPal Sandbox only; no real-money processing.
- A PayPal capture is provider-side evidence, not proof of bank settlement.
- PayProof-generated evidence matched against PayProof's own captures is a consistency check, not independent bank reconciliation.
- The internal ledger is an application record, not a bank ledger or external accounting integration.
- AI is advisory and cannot verify payment, approve a reconciliation candidate or execute financial actions.
- Use synthetic test data. Never publish secrets or real customer information.

## Local development

Requires Node.js 20+, npm, PayPal Sandbox credentials, a Supabase project and a Groq API key for the corresponding features.

Run npm install, copy .env.example to .env.local, then run npm run dev.

Run checks with npm run lint, npm run build, and npm run test:smoke -- http://127.0.0.1:3000. For a signed-in two-account isolation test, configure the local variables documented in TEST_PLAN.md and run npm run test:security. For an exact-preview PayPal Sandbox buyer-approval test, run npm run test:paypal-sandbox -- create, approve the generated URL with a Sandbox buyer, then run npm run test:paypal-sandbox -- verify <PAYPAL_ORDER_ID>.

Use your own private values in .env.local. Never commit secrets or use live PayPal credentials for the hackathon demo.

## Stack

Next.js 15 · React 19 · TypeScript · PayPal Orders API (Sandbox) · Supabase Auth/Database · Groq AI · Vercel

## Submission video

The official submission requires a public YouTube demonstration video under three minutes showing the application functioning. Cassie's separate 30–60 second PayPal-team introduction video is optional. See DEMO_SCRIPT.md.

## License

MIT — see LICENSE.
