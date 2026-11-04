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

Supabase's security advisor currently reports **Leaked Password Protection Disabled**. The connected Supabase organization is on the Free plan, while Supabase documents this control as Pro-plan-and-above; do not claim it is enabled. Enabling it requires an owner-approved paid-plan upgrade. The advisor also reports four unindexed foreign keys and five unused indexes; these are performance observations, not evidence of an access-control failure.

Both AI endpoints—the conversational assistant and AI order extraction—now have server-side Supabase bearer-session checks in the feature branch, and the browser sends the current session token. Verify unauthenticated requests return HTTP 401 on the latest READY preview. Do not claim these checks passed until the deployment and smoke test confirm them.

## Database checks completed — 4 November 2026

- Orders now have an owner-scoped SELECT policy only. Direct INSERT, UPDATE and DELETE permissions have been revoked from `anon` and `authenticated`; the server-side `service_role` retains the write permissions required by authenticated API routes.
- Verified the orders RLS boundary in a transaction: the existing account saw its 9 owned orders; a different simulated user UUID saw 0. The test transaction was rolled back.
- Verified the database permissions after the change: `authenticated` can SELECT orders but cannot INSERT, UPDATE or DELETE; `anon` cannot SELECT orders.
- Verified all 6 existing private statement rows are exact pending-review candidates against their linked paid, server-verified orders (reference, amount and currency all match).
- Ran a duplicate-import database test: re-importing an existing owner/transaction pair inserted 0 duplicate rows and left the original row intact.
- Ran a rollback-only rejection test: the row changed to rejected and one audit event appeared inside the transaction; rollback restored pending review and left no test audit event.
- Ran a rollback-only approval/post test against an exact verified match: the first posting created exactly one ledger row inside the transaction; a second attempt was rejected; rollback left the statement row pending review and created no persistent ledger row.
- Added a unique constraint on `ledger_entries.order_id`, so two different statement rows cannot post the same verified PayPal order/capture. The posting function returns the existing entry for the same row and rejects a different row for an already-reconciled capture.
- Verified the cross-row duplicate-capture guard in a rollback-only transaction: first row posted once; a second row referencing the same capture was rejected; rollback left zero persistent entries for the test order.
- The PayPal API client is now hard-locked to the PayPal Sandbox endpoint and rejects a deployment override pointing at PayPal Live.
- The database currently has owned records for one account only. The two-real-account API integration test is prepared as `npm run test:security`, but remains unrun until a second test account is supplied.
- The Supabase Data API does not grant authenticated direct access to statement rows, payment events, ledger entries or reconciliation audit; these records are accessed through authenticated server routes with explicit owner filters.

The READY Vercel preview serves application commit `2ad41db48d60c1afa5470d9825d9df1d892ecf33`. GitHub Actions passed ESLint, Next.js build, production-server startup and public/security smoke checks on commit `75a340700e4e1ff605c4e3808064ec670282248c`. The reconciliation workflow and local authentication test helpers were added after that CI run and remain unvalidated by CI. Vercel returned a build-rate-limit failure for further preview builds; do not claim the latest test-helper commits are deployed. The database ledger-uniqueness migration has been applied and verified directly in Supabase.

## Manual release gates — still required

- [ ] Run `npm run test:paypal-sandbox -- create` on the exact preview build, approve with a PayPal Sandbox buyer, confirm automatic return verification, then run the helper's `verify` mode.
- [ ] Confirm automatic return verification without refreshing and confirm the saved order appears in the same signed-in workspace.
- [ ] Test cancellation, pending/incomplete payment, provider failure and amount/currency/reference mismatch.
- [ ] Run `npm run test:security` with two distinct Supabase test-account tokens. The database currently contains owned records for one account only, so create a second test account before claiming the two-account API test passed.
- [ ] Run `npm run test:reconciliation` with a dedicated QA account and a verified Sandbox capture; inspect the two `PPQA-` rows, the single ledger entry and audit trail.
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
