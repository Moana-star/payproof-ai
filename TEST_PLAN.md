# Verification Plan

**Latest application preview:** [Open PayProof AI](https://payproof-8m20ueg9r-naom6083-2980.vercel.app)

A passing build does not prove that PayPal, Supabase, AI extraction or reconciliation has passed end-to-end testing. Keep all test credentials local. Never paste passwords, access tokens, PayPal buyer credentials or server secrets into chat, GitHub issues, logs or source control.

## Local checks

```bash
npm install
npm run lint
npm run build
npm run test:smoke -- http://127.0.0.1:3000
```

The smoke suite checks public route availability, unauthenticated API boundaries and the synthetic-only public preview.

## Exact judging-preview PayPal Sandbox test

Use a dedicated PayProof QA account and a PayPal Sandbox buyer. Sign into the same QA account in the browser before opening the PayPal approval link so the return page has the correct session.

```bash
export PAYPROOF_BASE_URL="https://payproof-8m20ueg9r-naom6083-2980.vercel.app"
export SUPABASE_URL="https://ylswydogvrffzojwnakx.supabase.co"
export SUPABASE_PUBLIC_KEY="<your Supabase publishable key>"
export PAYPROOF_TEST_USER_EMAIL="qa-account@example.com"
read -s -p "QA account password: " PAYPROOF_TEST_USER_PASSWORD
export PAYPROOF_TEST_USER_PASSWORD
npm run test:paypal-sandbox -- create
```

The helper creates a server-priced Sandbox order and prints the PayPal approval URL. Open it in the browser profile where the same PayProof account is signed in, approve with a PayPal Sandbox buyer, and confirm PayPal returns to `/checkout/return`. The page must automatically verify without a manual refresh and show the saved paid order in that same workspace.

Then run:

```bash
npm run test:paypal-sandbox -- verify "<PAYPAL_ORDER_ID>"
```

Expected: PayPal reports a completed capture; expected and captured amount/currency match; the server saves the order and it appears as paid in the same signed-in workspace. Also test buyer cancellation and confirm the order remains unpaid. Never use a real PayPal account or real-money credentials.

## End-to-end reconciliation workflow test

Use a dedicated signed-in QA account with at least one completed, persisted PayPal Sandbox capture. This test imports two clearly marked QA rows referencing that capture, then exercises duplicate import, matching, rejection, approval, ledger posting, idempotent reposting and audit verification.

```bash
export PAYPROOF_BASE_URL="https://payproof-8m20ueg9r-naom6083-2980.vercel.app"
export SUPABASE_URL="https://ylswydogvrffzojwnakx.supabase.co"
export SUPABASE_PUBLIC_KEY="<your Supabase publishable key>"
export PAYPROOF_TEST_USER_EMAIL="qa-account@example.com"
read -s -p "QA account password: " PAYPROOF_TEST_USER_PASSWORD
export PAYPROOF_TEST_USER_PASSWORD
npm run test:reconciliation
```

The test intentionally leaves two `PPQA-` statement rows (one rejected, one posted) and one internal ledger entry in that dedicated QA account so the reviewer can inspect the persistent audit trail. Do not run it in an account containing real operational records.

## Two-account isolation test

Use two different Supabase accounts. Account A must have at least one saved order and one statement row; Account B may be empty. The script authenticates each account locally and tests both private reads and cross-account mutations.

```bash
export PAYPROOF_BASE_URL="https://payproof-8m20ueg9r-naom6083-2980.vercel.app"
export SUPABASE_URL="https://ylswydogvrffzojwnakx.supabase.co"
export SUPABASE_PUBLIC_KEY="<your Supabase publishable key>"
export PAYPROOF_TEST_USER_A_EMAIL="account-a@example.com"
read -s -p "Account A password: " PAYPROOF_TEST_USER_A_PASSWORD
export PAYPROOF_TEST_USER_A_PASSWORD
export PAYPROOF_TEST_USER_B_EMAIL="account-b@example.com"
read -s -p "Account B password: " PAYPROOF_TEST_USER_B_PASSWORD
export PAYPROOF_TEST_USER_B_PASSWORD
npm run test:security
```

Expected: both identities are distinct; private order, statement, audit and ledger responses do not overlap; Account B receives 404 when attempting to verify Account A's PayPal order or review its statement row; and Account B cannot post that row. The script does not mutate Account A's records. If an account uses Google-only sign-in, set its short-lived `PAYPROOF_TEST_USER_A_TOKEN` or `PAYPROOF_TEST_USER_B_TOKEN` locally instead of email/password.

## Verified database checks

On 4 November 2026, the connected Supabase database was checked directly:

- The authenticated owner saw 9 owned orders under RLS; a different simulated user UUID saw 0.
- Direct order writes by `anon` and `authenticated` were revoked. Authenticated SELECT remains owner-scoped; the server-side `service_role` retains the write permissions required by API routes.
- Authenticated direct Data API access is not granted for statement rows, payment events, ledger entries or reconciliation audit. Those records are accessed through authenticated server routes with explicit owner filters.
- All 6 existing private statement rows were confirmed as exact pending-review candidates against their linked paid, server-verified orders.
- A duplicate-import database dry-run inserted 0 duplicate rows for an existing owner/transaction pair.
- Rollback-only rejection and approval/post tests confirmed audit and ledger behavior without leaving test records behind.
- A unique constraint on `ledger_entries.order_id` now prevents two different statement rows from posting the same verified PayPal order/capture. A rollback-only test confirmed the second row is rejected and no test ledger entry persists.
- A second rollback-only test confirmed reposting the same statement row returns the same ledger entry ID with `already_posted=true`, while creating no second entry.
- Supabase migrations `20261104141800_prevent_duplicate_order_ledger_entries` and `20261104142429_fix_idempotent_ledger_reposts` are applied and verified.
- PayPal requests are hard-locked to the PayPal Sandbox endpoint; a non-Sandbox `PAYPAL_BASE_URL` override is rejected.

The READY Vercel preview serves application commit `2ad41db48d60c1afa5470d9825d9df1d892ecf33`. GitHub Actions passed lint, build, production-server startup and public/security smoke checks on commit `d9242f3c22415b265bd5b55a71da537fbc97c208`. The integration helpers were linted and included in the successful build, but their credential-dependent end-to-end runs are still outstanding. Vercel has rate-limited further preview builds; the READY preview remains on application commit `2ad41db48d60c1afa5470d9825d9df1d892ecf33`. The later changes are QA scripts, documentation and database migrations; the database migrations have been applied and verified in Supabase.

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

## Evidence boundary

Matching PayProof's own PayPal evidence CSV against its saved verified captures is a consistency check. It is not independent bank reconciliation. A genuine bank-exported CSV is required to demonstrate matching against an independent bank statement.

## Record each test

Record date/time and timezone, commit SHA, deployment URL, environment, test account type (never passwords or tokens), steps, expected and actual results, pass/fail/blocked/not-tested status, and redacted evidence.

## Current Supabase Auth plan limitation

The connected Supabase organization is on the Free plan. Supabase documents leaked-password protection as a Pro-plan-and-above feature, so the current `auth_leaked_password_protection` advisor warning cannot be cleared on this plan. Do not claim this control is enabled. Enabling it requires an owner-approved paid-plan upgrade. Stronger password requirements do not replace breached-password screening.

## Limitations

Sandbox only; no real-money processing. PayPal capture is not bank settlement. The internal ledger is not a bank or external accounting system. AI is advisory. Production use requires additional security, privacy, reliability, webhook, monitoring and operational review.
