# Verification Plan

A passing build does not prove that PayPal, Supabase, AI extraction or reconciliation has passed end-to-end testing.

## Local checks

```bash
npm install
npm run lint
npm run build
npm run test:smoke -- http://127.0.0.1:3000
```

The smoke suite checks public route availability, unauthenticated API boundaries and the synthetic-only public preview. The two-account integration suite checks private API isolation and cross-account mutation rejection. The PayPal Sandbox helper creates a real Sandbox order and verifies a completed capture after buyer approval. Neither suite should be described as passed until it has been run against the exact judging deployment.

## Exact judging-preview PayPal Sandbox test

Use a dedicated PayPal Sandbox buyer and a dedicated signed-in PayProof test account. Set the base URL to the exact READY judging preview and obtain the access token locally from that signed-in session. Never paste access tokens, passwords, client secrets or buyer credentials into chat, issues, logs or source control.

```bash
export PAYPROOF_BASE_URL="https://payproof-a75ejx7sf-naom6083-2980.vercel.app"
export PAYPROOF_TEST_USER_TOKEN="<short-lived access token for the signed-in test account>"
npm run test:paypal-sandbox -- create
```

Open the printed approval URL in the same browser profile where the test account is signed in, approve with a PayPal Sandbox buyer, and confirm PayPal returns to `/checkout/return`. The page must automatically verify without a manual refresh. Then run:

```bash
npm run test:paypal-sandbox -- verify "<PAYPAL_ORDER_ID>"
```

Expected: PayPal reports a completed capture; expected and captured amount/currency match; the order is saved and visible as paid in the same signed-in workspace. Also test buyer cancellation and confirm the order remains unpaid. Do not use a real PayPal account or real-money credentials.

## Two-account isolation test

Create or use two different Supabase test accounts. Sign into each account separately and copy each short-lived access token locally; do not send either token to anyone. The first account must have at least one saved order and one statement row. The second account can be empty.

```bash
export SUPABASE_URL="<project URL>"
export SUPABASE_PUBLIC_KEY="<publishable key>"
export PAYPROOF_TEST_USER_A_TOKEN="<account A access token>"
export PAYPROOF_TEST_USER_B_TOKEN="<account B access token>"
npm run test:security
```

Expected: both identities are distinct; private order, statement, audit and ledger responses do not overlap; account B receives 404 when attempting to capture account A's PayPal order or review its statement row; and account B cannot post that row. The script does not mutate account A's records.

## Verified database checks

On 4 November 2026, the connected Supabase database was checked directly:
- The authenticated owner saw 9 owned orders under RLS; a different simulated UUID saw 0.
- Direct order writes by `anon` and `authenticated` were revoked. Authenticated SELECT remains owner-scoped. Server-side `service_role` retains write permissions.
- All 6 existing owner-scoped statement rows were confirmed as exact pending-review candidates against their linked paid, verified orders.
- A duplicate import dry-run inserted 0 duplicates for an existing owner/transaction pair.
- A rejection dry-run wrote the rejected state and audit event inside a transaction; rollback restored the original pending-review state and removed the test audit event.
- An approval/post dry-run created exactly one ledger entry; a second post was rejected; rollback left no persistent test entry.
- PayPal requests are hard-locked to the PayPal Sandbox endpoint; a non-Sandbox `PAYPAL_BASE_URL` override is rejected.
- Direct authenticated Data API access is not granted for statement rows, payment events, ledger entries or reconciliation audit. The app's server routes apply explicit owner filters.

The latest code commit `2ad41db48d60c1afa5470d9825d9df1d892ecf33` passed GitHub Actions lint, build and public/security smoke checks and has a READY Vercel preview. These database dry-runs do not replace the two-real-account API integration test. Run it after creating a second test account.

## Core workflow

| Scenario | Expected result |
|---|---|
| Clear customer order message | AI proposes a reviewable draft |
| Missing or ambiguous details | Missing information is surfaced; no guessing |
| Unsupported catalogue item | Checkout is blocked |
| Valid order | Application code computes trusted totals |
| Sandbox payment completed | Server verifies provider status and expected details |
| Buyer cancels | Order is not marked paid |
| Pending/incomplete payment | Remains pending/review required |
| Amount, currency or reference mismatch | No paid state; exception/review required |
| Provider failure | Safe error/retry; no false success |
| Repeated confirmation | No duplicate local paid record |
| AI provider unavailable | Safe fallback; no fabricated payment result |

## Authenticated reconciliation

- [ ] Sign in with a test account and load its private workspace.
- [ ] Import a valid statement CSV.
- [ ] Re-import the same file and verify duplicate rows are not duplicated.
- [ ] Run matching against the same owner's eligible verified PayPal captures.
- [ ] Exact reference + amount + currency yields pending human review, not approval.
- [ ] Mismatches remain exceptions/unmatched.
- [ ] Run `npm run test:security` with two different account tokens; retain redacted output as evidence.
- [ ] Approve a valid candidate as the signed-in reviewer.
- [ ] Post only an approved candidate to the internal ledger.
- [ ] Retry posting and verify duplicate entries are prevented.
- [ ] Inspect import, matching, review and posting audit events.
- [ ] Confirm exported PayPal evidence is labelled provider-side evidence.

## Evidence boundary

Matching PayProof's own PayPal evidence CSV against its saved verified captures is a consistency check. It is not independent bank reconciliation. A genuine bank-exported CSV is required to demonstrate matching against an independent bank statement.

## Record each test

Record date/time and timezone, commit SHA, deployment URL, environment, test account type (never passwords or tokens), steps, expected and actual results, pass/fail/blocked/not-tested status, and redacted evidence.

## Current Supabase Auth plan limitation

The connected Supabase organization is on the Free plan. Supabase documents leaked-password protection as a Pro-plan-and-above feature, so the current `auth_leaked_password_protection` advisor warning cannot be cleared on this plan. Do not claim this control is enabled. Enabling it requires an owner-approved plan upgrade; do not upgrade or incur charges without explicit approval. The project can still be tested with strong password requirements supported by the current Auth plan, but those settings do not replace breached-password screening.

## Limitations

Sandbox only; no real-money processing. PayPal capture is not bank settlement. The internal ledger is not a bank or external accounting system. AI is advisory. Production use requires additional security, privacy, reliability, webhook, monitoring and operational review.
