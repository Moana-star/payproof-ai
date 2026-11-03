# Judge Readiness — Persistent Reconciliation Branch

This file describes the current feature branch. For the full judge walkthrough and evaluation rubric, use the [Judge Guide on the default branch](https://github.com/Moana-star/payproof-ai/blob/main/JUDGE_GUIDE.md).

## Current branch

- Branch: `feat/persistent-user-scoped-reconciliation`
- Pull request: [#8](https://github.com/Moana-star/payproof-ai/pull/8)
- Preview: https://payproof-papycsaha-naom6083-2980.vercel.app/
- Current branch head before this documentation update: `434be149c2a3f1bf9b0b994e0baee19cc18604c3`

## Feature scope

- Supabase Auth bearer-session verification for private reconciliation routes.
- Owner-scoped statement imports, PayPal evidence, ledger entries and audit events.
- CSV validation and duplicate detection.
- Exact reference, amount and currency matching against eligible server-verified PayPal Sandbox captures.
- Human review is required; matching does not auto-approve or post.
- Approved entries can be posted to the persistent internal application ledger.
- Duplicate posting is guarded.
- PayPal evidence export is account-scoped and is not represented as bank settlement proof.

## Verification already recorded

- The preview deployment for the branch head `434be14` reached READY.
- A database verification query confirmed six PayProof-generated PayPal evidence rows matched their corresponding server-verified Sandbox captures on exact reference, amount and currency.
- All six remained `matched_pending_review`; the ledger entry count was zero at the time of that check.
- No reviewer approval or ledger posting was performed during that verification.

This was a consistency check against PayProof's own saved provider records. It was not independent bank-statement reconciliation and does not establish that every workflow path has passed.

## Required before merge or production claims

- [ ] Complete a fresh end-to-end Sandbox checkout on the exact latest preview.
- [ ] Verify two separate test accounts cannot read or mutate one another's records.
- [ ] Exercise mismatch, duplicate import, duplicate post, rejected review and provider-failure paths.
- [ ] Confirm Supabase migrations and row-level security policies in the target project.
- [ ] Confirm GitHub Actions and Vercel checks for the latest commit.
- [ ] Keep Sandbox, synthetic data and internal-ledger limitations visible in the demo.

## Demo safety

Never use real payment credentials or real customer/banking data. A PayPal capture is provider-side evidence, not bank settlement. The internal ledger is not a bank or external accounting ledger. AI remains advisory.
