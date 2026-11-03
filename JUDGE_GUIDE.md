# PayProof AI — Judge Guide

This guide is the recommended route for evaluating the project. It distinguishes the stable deployed application from work that is still in a pull request.

## Start here

| Resource | Link | What it represents |
|---|---|---|
| Stable application | https://payproof-ai-beta.vercel.app/ | Currently deployed core PayProof AI workflow |
| Reconciliation feature preview | https://payproof-papycsaha-naom6083-2980.vercel.app/ | Latest preview for PR #8; includes authenticated persistent reconciliation work |
| Source repository | https://github.com/Moana-star/payproof-ai | Source, docs, CI and history |
| Feature PR | https://github.com/Moana-star/payproof-ai/pull/8 | Reviewable implementation and change history |

**Important:** The reconciliation preview is not the stable production deployment. Use the feature PR and preview to inspect the newer account-scoped workflow. Do not infer that a preview-only feature is already merged or released.

## What problem is being addressed?

Small sellers may receive orders through chat but track payment status in a separate provider dashboard. This creates manual work and a risk of treating a customer's claim, a screenshot or a browser redirect as proof of payment.

PayProof AI connects order intake, checkout, provider verification and evidence review around one trust boundary:

> AI may organise and explain information. Only deterministic server-side checks against the payment provider can establish the application's payment status.

## Suggested evaluation path

### 1. Understand the dashboard

Open the stable application and inspect the overview. Notice the distinction between sample records, pending items and verified payment evidence. Do not treat illustrative dashboard records as real customer transactions.

### 2. Try AI-assisted order intake

- Open the order-intake workflow.
- Paste a simple test message, for example: `Hi, I would like 2 Coffee gift sets, please.`
- Review the proposed product and quantity.
- Confirm or correct the draft before checkout.

Evaluate whether the application makes uncertainty visible. AI output should not set catalogue prices, calculate the trusted total or mark an order paid.

### 3. Inspect checkout and verification

- Use a dedicated PayPal Sandbox buyer account.
- Complete a Sandbox checkout if credentials and test funds are available.
- Inspect the server-reported result and saved order/payment evidence.
- Distinguish provider verification from successful persistence: they are separate outcomes.

A browser redirect, screenshot or customer message is not payment proof. Do not use personal PayPal accounts or real-money credentials.

### 4. Inspect AI explanations

Ask the assistant to explain a known order or payment state. Compare the answer with the structured evidence shown in the application.

The assistant is advisory. It must not create a transaction identifier, override a failed verification, change a payment status or execute a financial action.

### 5. Inspect persistent reconciliation (PR #8 preview)

This workflow is in the feature branch and requires a signed-in account.

- Sign in to the PR preview.
- Open Reconciliation and load the private workspace.
- Import an original statement CSV when available, or use the clearly labelled sample only to understand the interface.
- Run matching. A candidate requires exact reference, amount and currency alignment with an eligible server-verified PayPal capture.
- Inspect the match reason and evidence.
- Approve or reject as a human reviewer.
- Post only an approved candidate to the internal ledger.
- Inspect the audit trail.

Matching must not auto-approve or post. Duplicate posting is guarded. The internal ledger is an application record, not a bank ledger.

**Evidence boundary:** Importing PayProof's own PayPal evidence CSV and matching it against PayProof's saved captures demonstrates consistency between provider evidence and the application's records. It is not independent proof of bank settlement. A real bank export is needed to demonstrate matching against a bank statement.

## What to evaluate

| Evaluation area | What to inspect | Strong evidence |
|---|---|---|
| Technical implementation | Order extraction, catalogue validation, PayPal API flow, server verification, persistence | Reproducible successful and failed/pending paths |
| Design and usability | Order review, payment states, evidence visibility, exceptions | A reviewer can understand what happened and what action is safe |
| Potential impact | Manual handoffs and unverified payment claims | A concrete seller workflow, not unsupported savings claims |
| Innovation | Bounded AI + deterministic verification + human review | AI is useful without being granted payment authority |
| Presentation | Demo sequence and limitations | Clear narration, working links and accurate Sandbox labels |

## What is implemented versus what still needs proof

- The deployed core application demonstrates the order-intake and PayPal Sandbox workflow.
- PR #8 contains the newer authenticated, user-scoped reconciliation and persistent internal ledger work.
- A successful build or a visible UI is not, by itself, proof that every integration path has passed end-to-end testing.
- Before treating any scenario as passed, verify it on the exact deployed commit and record the result.

## Safety and privacy

- Use Sandbox accounts and synthetic examples.
- Do not enter real card details, real customer personal information or production payment credentials.
- Never publish API keys, passwords, Supabase service-role keys, reviewer tokens or private environment values.
- Do not interpret a PayPal capture as bank settlement.
- Do not interpret an internal ledger post as a transfer of funds or an external accounting write.

## Reproducibility checklist

- [ ] Confirm the deployment URL and commit/preview being evaluated.
- [ ] Check the sign-in flow before testing private features.
- [ ] Complete a new Sandbox order, if Sandbox buyer access is available.
- [ ] Verify the provider result and the saved record independently.
- [ ] Try a pending, failed or mismatched scenario where available.
- [ ] Confirm AI explanations do not change authoritative state.
- [ ] For PR #8, confirm a match stays pending until human approval.
- [ ] Confirm ledger posting is explicit and appears in the audit trail.
- [ ] Keep synthetic samples clearly labelled.
- [ ] Record any unavailable integration as not tested rather than passed.

## Maintainer note

This is a hackathon prototype, not a production payment processor, wallet, bank feed, certified accounting ledger or fraud-detection service. The project intentionally prefers a visible unresolved state over an unsupported success claim.
