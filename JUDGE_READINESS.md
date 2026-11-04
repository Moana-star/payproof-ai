# Judge Readiness — Integrated PayProof AI Preview

This is the integrated feature branch containing authenticated reconciliation from PR #8 and the conversational assistant from PR #9.

## Evaluation links

- **Stable application:** https://payproof-ai-beta.vercel.app/
- **Latest integrated feature preview:** https://payproof-ai-git-feat-chatgpt-style-payproo-068502-naom6083-2980.vercel.app/
- **Reconciliation implementation:** https://github.com/Moana-star/payproof-ai/pull/8
- **Assistant implementation:** https://github.com/Moana-star/payproof-ai/pull/9
- **Source repository:** https://github.com/Moana-star/payproof-ai

The feature preview is not the stable production release. Confirm its latest Vercel deployment is READY and check the commit SHA before recording or sharing it with judges. Do not describe preview-only features as production features until their release gates are completed.

## Product story

PayProof AI helps small online sellers connect chat-based order intake, PayPal checkout, payment verification and reconciliation. AI extracts and explains information; deterministic application logic validates catalogue details and calculates totals; server-side PayPal verification determines payment status; a human reviews reconciliation candidates before internal ledger posting.

## What the integrated preview contains

- AI-assisted customer-message extraction into a reviewable order draft.
- Server-priced PayPal Sandbox checkout.
- Server-side verification of provider status and expected transaction details.
- Payment evidence and exception review.
- Conversational AI assistant with structured Markdown responses.
- Session-scoped assistant conversation history (not saved to the PayProof account).
- Signed-in, owner-scoped reconciliation statement import and exact reference/amount/currency matching.
- Human approval before internal ledger posting, duplicate-post protection and audit events.
- Clearly separated synthetic public demo data and private account records.

## Infrastructure and security checks already inspected

- All six exposed application tables inspected in Supabase have row-level security enabled.
- User-facing policies inspected for owner-scoped tables use the authenticated user's auth.uid() ownership predicate.
- The ledger-posting database function is not SECURITY DEFINER; its transaction revalidates approval, exact reference, amount, currency and verified capture before posting.
- The new-user profile trigger is SECURITY DEFINER with an empty search path and execution restricted to postgres and service_role.
- GitHub Actions and Vercel passed for assistant commit 19fcc3a6ce7b50a15462dc80f2e0dd3223642de0. A subsequent assistant API authentication hardening change is awaiting its own CI and Vercel result.

## Security item to resolve

Supabase's security advisor currently reports **Leaked Password Protection Disabled**. Enable the Auth password-security option before presenting the project as security-hardened. The advisor also reports four unindexed foreign keys and five unused indexes; these are performance observations, not evidence of an access-control failure.

Both AI endpoints—the conversational assistant and AI order extraction—now have server-side Supabase bearer-session checks in the feature branch, and the browser sends the current session token. Verify unauthenticated requests return HTTP 401 on the latest READY preview. Do not claim these checks passed until the deployment and smoke test confirm them.

## Manual release gates — still required

- [ ] Complete a fresh PayPal Sandbox checkout on the exact preview build used for judging.
- [ ] Confirm automatic return verification without refreshing and confirm the saved order appears in the same signed-in workspace.
- [ ] Test cancellation, pending/incomplete payment, provider failure and amount/currency/reference mismatch.
- [ ] Verify two separate test accounts cannot read or mutate one another's orders, statement rows, ledger entries or audit events.
- [ ] Test duplicate CSV import, rejected review, duplicate posting and audit-trail accuracy.
- [ ] Test AI order extraction with clear, ambiguous and unsupported messages.
- [ ] Test the AI assistant while signed in, then confirm unauthenticated API access is rejected.
- [ ] Check the preview at desktop, tablet and mobile widths.
- [ ] Re-run the full judge walkthrough and capture the actual results on the final commit.

## Official video requirement

The hackathon submission requires a **public YouTube demonstration video under three minutes** showing the application functioning. Add its URL to the Devpost submission and verify it opens while signed out. Cassie's separate 30–60 second PayPal-team introduction video is optional and does not replace the required submission video.

Use the demo script to keep the recording within 2:45. Show only flows that have actually passed on the recorded build.

## Evidence boundaries

- PayPal Sandbox capture evidence is provider-side evidence, not proof of bank settlement.
- PayProof-generated PayPal evidence matched against PayProof's own captures is a consistency check, not independent bank reconciliation.
- The persistent ledger is an internal PayProof application record, not a bank ledger or external accounting integration.
- AI is advisory and cannot verify payment, approve a match, post a ledger entry or execute financial actions.
- Use synthetic data and Sandbox credentials only. Never publish secrets or real customer/banking data.
