# PayProof AI

**Evidence first. AI explains the record. Verified payment data decides.**

PayProof AI is an evidence-led payment operations prototype for small online sellers. It connects customer order intake, PayPal Sandbox checkout, server-side payment verification and reviewable payment evidence. Its guiding rule is simple: **AI can organise and explain information, but it cannot declare that money was received.**

<p align="center">
  <a href="https://payproof-ai-beta.vercel.app/"><strong>Open the live application</strong></a>
  ·
  <a href="https://github.com/Moana-star/payproof-ai/blob/main/JUDGE_GUIDE.md">Judge guide</a>
  ·
  <a href="https://github.com/Moana-star/payproof-ai/blob/main/DEMO_SCRIPT.md">Demo script</a>
</p>

> **Hackathon environment:** The deployed application uses PayPal Sandbox. It is a prototype, not a live-money payment processor, bank integration, fraud-detection service or production accounting system. Use test accounts and synthetic data only.

## The problem

Small sellers often receive order details in chat while payment updates live elsewhere. They must manually re-enter product and quantity information, create checkout requests, confirm payment and explain what happened when records do not agree. A customer message, screenshot or checkout redirect can be mistaken for proof of payment.

PayProof AI brings the workflow into one reviewable place and makes the source of each decision visible.

## What PayProof AI does

| Workflow | What the application does | Trust boundary |
|---|---|---|
| Order intake | Uses AI to propose structured details from a customer message | A seller reviews and confirms the draft |
| Pricing | Validates catalogue items and calculates totals in application code | Model output does not set trusted prices |
| Checkout | Creates a PayPal Sandbox checkout for a confirmed order | Sandbox only; no real-money processing |
| Verification | Checks the provider transaction server-side before recording a paid state | A redirect or success screen alone is not proof |
| Payment evidence | Shows transaction identifiers, status and verification details | Evidence must be tied to a server-verified record |
| AI explanations | Summarises recorded facts and suggests next steps | Advisory only; cannot change payment status |

### Current release and active work

- **Live application:** [payproof-ai-beta.vercel.app](https://payproof-ai-beta.vercel.app/) — use this for the currently deployed core workflow.
- **Integrated feature preview:** [open the latest assistant + reconciliation preview](https://payproof-ai-git-feat-chatgpt-style-payproo-068502-naom6083-2980.vercel.app/) — this preview contains the in-progress authenticated, user-scoped statement import, exact matching, human review, internal ledger and audit workflow.
- **Reconciliation PR:** [#8 — Build persistent authenticated reconciliation and ledger posting](https://github.com/Moana-star/payproof-ai/pull/8).
- **Assistant PR:** [#9 — Upgrade PayProof AI assistant to conversational chat](https://github.com/Moana-star/payproof-ai/pull/9). The integrated feature preview includes the conversational assistant and the authenticated reconciliation work; both remain preview-only until manual release checks pass.

Do not assume a feature shown only in the PR preview is already part of the stable deployment. Confirm the latest preview deployment is READY and check its commit SHA before recording or sharing it with judges.

## Judge quick start

1. Open the [live application](https://payproof-ai-beta.vercel.app/).
2. Start with the overview and follow the order-intake workflow.
3. Paste a short sample order message, review the proposed product and quantity, and confirm the order details.
4. Continue to PayPal Sandbox checkout using a dedicated Sandbox buyer account.
5. Inspect the server-reported verification result and the saved payment evidence. Do not treat the browser return URL as proof.
6. Open the AI assistant and ask it to explain a recorded payment state or exception. Check that its answer remains advisory.
7. For the integrated assistant and persistent reconciliation workflow, use the [latest feature preview](https://payproof-ai-git-feat-chatgpt-style-payproo-068502-naom6083-2980.vercel.app/) and follow the [judge guide](JUDGE_GUIDE.md). It requires a signed-in account for private features.

**Do not enter real customer information or real payment credentials.** Never ask the project maintainer to share private credentials in a public issue or repository.

## Why the approach is different

- **Evidence before confidence:** payment state is derived from provider verification, not an AI prediction or screenshot.
- **Human control:** AI proposes; a person reviews order details and reconciliation candidates.
- **Deterministic money logic:** catalogue validation and totals are handled by application code.
- **Safe uncertainty:** pending, missing or conflicting evidence remains unresolved instead of being presented as successful.
- **Traceable operations:** the reconciliation preview records review and ledger actions for later inspection.

## Technical overview

| Layer | Technology | Responsibility |
|---|---|---|
| Web application | Next.js 15, React 19, TypeScript | Dashboard, order workflow and API routes |
| Payment provider | PayPal Orders API — Sandbox | Test checkout and provider transaction lifecycle |
| Persistence and identity | Supabase | Database-backed records and authenticated workspace features in the reconciliation branch |
| AI | Groq API / configured language model | Structured order extraction and evidence explanations |
| Hosting | Vercel | Preview and application deployment |

### High-level flow

```text
Customer message
      |
      v
AI proposes an order draft
      |
      v
Seller reviews and confirms
      |
      v
Application validates catalogue + computes total
      |
      v
PayPal Sandbox checkout
      |
      v
Server verifies provider transaction + expected details
      |
      v
Payment evidence and order status
      |
      v
AI explains recorded facts (advisory only)

Statement CSV -> exact reference/amount/currency matching
              -> human review -> internal ledger + audit trail
                 (persistent workflow in PR #8 preview)
```

## Run locally

### Requirements

- Node.js 20 or a compatible supported release
- npm
- A PayPal Developer account with Sandbox REST credentials
- A Supabase project for persistence features
- A Groq API key for AI-assisted features

### Install

```bash
git clone https://github.com/Moana-star/payproof-ai.git
cd payproof-ai
npm install
```

### Configure environment

Copy `.env.example` to `.env.local` and supply your own private development values. The exact variables are documented in the example file. Use PayPal Sandbox credentials only.

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Quality checks

```bash
npm run lint
npm run build
```

The repository's GitHub Actions workflow runs lint, build and smoke checks for the relevant pull-request workflow.

**Secrets must remain server-side.** Never commit `.env.local`, PayPal client secrets, Supabase service-role keys, Groq keys, reviewer tokens or real user data. Do not prefix server secrets with `NEXT_PUBLIC_`.

## Repository map

| Path | Purpose |
|---|---|
| `app/` | Next.js pages and API routes |
| `components/` | Reusable dashboard and workflow components |
| `lib/` | Payment, order and persistence helpers |
| `public/` | Public demo assets and synthetic sample data |
| `supabase/migrations/` | Database schema changes for supported branches |
| `README.md` | Project overview and setup |
| `JUDGE_GUIDE.md` | How to evaluate the application safely |
| `DEMO_SCRIPT.md` | Short reproducible presentation |
| `TEST_PLAN.md` | Verification scenarios and known test boundaries |
| `SECURITY.md` | Security reporting and secret-handling guidance |
| `CONTRIBUTING.md` | Contribution and pull-request guidance |

## Scope and limitations

PayProof AI is a hackathon prototype. In particular:

- PayPal is configured for Sandbox testing, not live-money processing.
- A PayPal capture confirms provider-side activity; it does not prove that funds have settled in a bank account.
- The internal ledger in the reconciliation preview is an application record, not a bank ledger or external accounting integration.
- CSV matching is not a live bank feed. PayPal evidence exported by PayProof is provider-side evidence, not independent bank settlement proof.
- AI output is not a payment authority, fraud score, accounting opinion or instruction to release goods.
- Production use would require a dedicated security, privacy, reliability and operational review, including webhook verification where applicable, rate limits, monitoring, retention and incident handling.

See [scope.md](scope.md), [prd.md](prd.md) and [spec.md](spec.md) for the product scope and technical intent.

## Required submission video

The official hackathon rules require a public YouTube demonstration video under three minutes showing the application functioning. Add the YouTube URL to the Devpost submission and confirm it opens while signed out. The separate 30–60 second PayPal-team introduction video mentioned in Devpost's email is optional and does not replace the required submission video. See [DEMO_SCRIPT.md](DEMO_SCRIPT.md).

## Hackathon evaluation

The project is designed to make five qualities easy to inspect:

1. **Technical implementation:** a coherent order-to-checkout-to-server-verification path.
2. **Design:** clear payment states, evidence and next actions.
3. **Potential impact:** less manual re-entry and a lower risk of acting on unverified payment claims.
4. **Innovation:** bounded AI assistance combined with deterministic payment verification and human review.
5. **Presentation:** a short, reproducible demo that distinguishes verified Sandbox evidence from synthetic examples.

No score, prize placement or outcome is guaranteed. The strongest submission is a working, reproducible demonstration with honest boundaries.

## Project links

- [Live application](https://payproof-ai-beta.vercel.app/)
- [Source code](https://github.com/Moana-star/payproof-ai)
- [Open reconciliation implementation PR](https://github.com/Moana-star/payproof-ai/pull/8)
- [Latest reconciliation preview](https://payproof-ai-git-feat-chatgpt-style-payproo-068502-naom6083-2980.vercel.app/)

## License

Released under the [MIT License](LICENSE).
