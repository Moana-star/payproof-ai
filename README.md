# PayProof AI

**Evidence first. AI explains the record. Verified payment data decides.**

PayProof AI is an evidence-led payment operations prototype for small online sellers. It connects AI-assisted order intake, PayPal Sandbox checkout, server-side payment verification, payment evidence and human-reviewed reconciliation.

> AI may organise and explain information. Only server-side provider verification can establish the application's payment status. A screenshot, customer claim, AI response or browser redirect is not payment proof.

## Open the project

- **Stable application:** https://payproof-ai-beta.vercel.app/
- **This branch's preview:** https://payproof-papycsaha-naom6083-2980.vercel.app/
- **Implementation PR:** https://github.com/Moana-star/payproof-ai/pull/8
- **Judge guide:** https://github.com/Moana-star/payproof-ai/blob/main/JUDGE_GUIDE.md
- **Demo script:** https://github.com/Moana-star/payproof-ai/blob/main/DEMO_SCRIPT.md
- **Verification plan:** https://github.com/Moana-star/payproof-ai/blob/main/TEST_PLAN.md
- **Security policy:** https://github.com/Moana-star/payproof-ai/blob/main/SECURITY.md

The persistent reconciliation work in this branch is a preview under review; it is not yet the stable application release.

## What this branch adds

- Authenticated Supabase sessions for private reconciliation operations.
- User-scoped statement rows, PayPal evidence, ledger entries and audit events.
- CSV import with validation and duplicate detection.
- Exact matching against eligible server-verified PayPal Sandbox captures using reference, amount and currency.
- Human approval before posting to the persistent internal ledger.
- Duplicate-post protection and audit events for import, matching, review and posting.
- A signed-in user's PayPal evidence CSV export.
- Clear separation between private account records and the public synthetic judge sample.

## Judge workflow

1. Sign in to the branch preview.
2. Open Reconciliation and load the private workspace.
3. Import a statement CSV or inspect the clearly labelled sample.
4. Run matching and inspect the exact reference, amount and currency match reason.
5. Confirm the candidate remains pending until a human reviewer approves it.
6. Post an approved candidate only when you intend to create a test ledger entry.
7. Inspect the audit trail.

## Trust boundaries

- PayPal Sandbox only; no real-money processing.
- A PayPal capture is provider-side evidence, not proof of bank settlement.
- PayProof-generated evidence matched against PayProof's own captures is a consistency check, not independent bank reconciliation.
- The internal ledger is an application record, not a bank ledger or external accounting integration.
- AI is advisory and cannot verify payment, approve a reconciliation candidate or execute financial actions.
- Use synthetic test data. Never publish secrets or real customer information.

## Local development

Requires Node.js 20+, npm, PayPal Sandbox credentials, a Supabase project and a Groq API key for the corresponding features.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Run checks:

```bash
npm run lint
npm run build
npm run test:smoke -- http://127.0.0.1:3000
```

Use your own private values in `.env.local`. Never commit secrets or use live PayPal credentials for the hackathon demo.

## Stack

Next.js 15 · React 19 · TypeScript · PayPal Orders API (Sandbox) · Supabase Auth/Database · Groq AI · Vercel

## License

MIT — see [LICENSE](LICENSE).
