# PayProof AI — Judge Guide

> **LATEST integrated feature preview:** [Open PayProof AI](https://payproof-ai-git-feat-chatgpt-style-payproo-068502-naom6083-2980.vercel.app/)  
> This is the READY feature preview for the conversational assistant and authenticated reconciliation (commit `4db20db9c2d4d5bca94c12ae278395a385b9bd91`). The stable production app is a separate, older release: https://payproof-ai-beta.vercel.app/

This guide separates the stable production application from the integrated feature preview. The preview contains work from PR #8 and PR #9 and must not be mistaken for the production release.

## Start here

| Resource | Link | What it represents |
|---|---|---|
| Stable application | https://payproof-ai-beta.vercel.app/ | Stable core PayProof AI workflow |
| Integrated feature preview | https://payproof-ai-git-feat-chatgpt-style-payproo-068502-naom6083-2980.vercel.app/ | Preview with authenticated reconciliation and conversational assistant |
| Source repository | https://github.com/Moana-star/payproof-ai | Public source, documentation, CI and history |
| Reconciliation PR | https://github.com/Moana-star/payproof-ai/pull/8 | Persistent, owner-scoped reconciliation implementation |
| Assistant PR | https://github.com/Moana-star/payproof-ai/pull/9 | Conversational AI assistant and structured responses |

**Important:** The integrated feature preview is not the stable production deployment. Confirm the latest Vercel deployment is READY and inspect its commit SHA before testing or recording. Preview-only features are not production features until released.

## What problem is being addressed?

Small sellers may receive orders through chat but track payment status in a separate provider dashboard. They must re-enter product and quantity details, initiate checkout, verify payment and investigate mismatched records. A customer claim, screenshot or browser redirect can be mistaken for proof of payment.

PayProof AI connects these steps around one trust boundary:

> AI may organise and explain information. Only deterministic server-side checks against the payment provider can establish the application's payment status.

## Suggested evaluation path

### 1. Understand the dashboard

Open the stable application and inspect the overview. Notice the distinction between sample records, pending items and verified payment evidence. Treat illustrative records as synthetic examples, not real customer transactions.

### 2. Try AI-assisted order intake

- Open the order-intake workflow in the integrated feature preview.
- Sign in with a test account.
- Paste: `Hi, I would like 2 Coffee gift sets, please.`
- Review the proposed product and quantity.
- Confirm or correct the draft before checkout.

AI proposes the draft. The seller reviews it. Application code validates catalogue items and calculates the trusted total; the model does not set prices, totals or payment status.

### 3. Inspect PayPal checkout and verification

- Use a dedicated PayPal Sandbox buyer account.
- Complete a Sandbox checkout if credentials and test funds are available.
- Inspect the server-reported result and saved order/payment evidence.
- Distinguish provider verification from successful persistence; they are separate outcomes.

A browser redirect, screenshot or customer message is not payment proof. Do not use personal PayPal accounts or real-money credentials.

### 4. Inspect the conversational AI assistant

- Open the integrated feature preview and sign in.
- Ask the assistant to explain a synthetic completed, mismatch or pending example.
- Inspect the structured response formatting.

The assistant does not have live account-record access. Its selectable sample contexts are synthetic. It is advisory and cannot create transaction identifiers, override failed verification, change payment status or execute financial actions. Both AI endpoints require a signed-in Supabase bearer session.

### 5. Inspect persistent reconciliation

This workflow is in the integrated feature preview and requires a signed-in account.

- Open Reconciliation and load the private workspace.
- Import an original statement CSV when available, or use clearly labelled synthetic data only to understand the interface.
- Run matching. A candidate requires exact reference, amount and currency alignment with an eligible server-verified PayPal capture.
- Inspect the match reason and evidence.
- Approve or reject as a human reviewer.
- Post only an approved candidate to the internal ledger.
- Inspect the audit trail.

Matching must not auto-approve or post. Duplicate posting is guarded. The internal ledger is an application record, not a bank ledger.

**Evidence boundary:** Importing PayProof's own PayPal evidence CSV and matching it against PayProof's saved captures demonstrates consistency between provider evidence and application records. It is not independent proof of bank settlement. A genuine bank export is needed to demonstrate matching against an independent bank statement.

## What to evaluate

| Criterion | What to inspect | Strong evidence |
|---|---|---|
| Technological implementation | Order extraction, catalogue validation, PayPal API flow, server verification, persistence and AI use | Reproducible successful and failed/pending paths |
| Design | Order review, payment states, evidence visibility, exceptions and navigation | A reviewer can understand what happened and what action is safe |
| Potential impact | Manual handoffs and unverified payment claims | A concrete seller workflow, not unsupported savings claims |
| Innovation | Bounded AI + deterministic verification + human review | AI is useful without being granted payment authority |
| Presentation | Working end-to-end demo, pitch and limitations | Clear narration, accurate Sandbox labels and easy-to-follow flow |

## What is implemented versus what still needs proof

- The stable application demonstrates the core order-to-PayPal-Sandbox workflow.
- PR #8 contains authenticated, owner-scoped reconciliation and persistent internal ledger work.
- PR #9 contains the conversational assistant and authentication checks for the AI endpoints.
- A successful build or visible UI does not prove that every integration path has passed end-to-end testing.
- Before treating a scenario as passed, verify it on the exact deployed commit and record the result.

## Safety and privacy

- Use Sandbox accounts and synthetic examples.
- Do not enter real card details, real customer personal information or production payment credentials.
- Never publish API keys, passwords, Supabase service-role keys, reviewer tokens or private environment values.
- Do not interpret a PayPal capture as bank settlement.
- Do not interpret an internal ledger post as a transfer of funds or an external accounting write.

## Required submission video

The official rules require a **public YouTube demonstration video under three minutes** showing the project working. Add its URL to the Devpost submission and verify it opens while signed out. The separate 30–60 second introduction video mentioned in Cassie's email is optional and does not replace the required submission video. Use [DEMO_SCRIPT.md](DEMO_SCRIPT.md) for the timed walkthrough.

## Reproducibility checklist

- [ ] Confirm the deployment URL and commit SHA.
- [ ] Check sign-in before testing private features.
- [ ] Complete a new Sandbox order, if Sandbox buyer access is available.
- [ ] Verify the provider result and saved record independently.
- [ ] Try a pending, failed or mismatched scenario where available.
- [ ] Confirm AI explanations do not change authoritative state.
- [ ] Confirm unauthenticated requests to both AI endpoints return HTTP 401 on the latest preview.
- [ ] Confirm a reconciliation match stays pending until human approval.
- [ ] Confirm ledger posting is explicit and appears in the audit trail.
- [ ] Keep synthetic samples clearly labelled.
- [ ] Record unavailable integration paths as not tested, not passed.

## Maintainer note

This is a hackathon prototype, not a production payment processor, wallet, bank feed, certified accounting ledger or fraud-detection service. The project intentionally prefers a visible unresolved state over an unsupported success claim.
