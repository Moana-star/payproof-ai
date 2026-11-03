# Verification Plan

A passing build does not prove that PayPal, Supabase, AI extraction or reconciliation has passed end-to-end testing.

## Local checks

```bash
npm install
npm run lint
npm run build
npm run test:smoke -- http://127.0.0.1:3000
```

The smoke suite checks public route availability, unauthenticated API boundaries and the synthetic-only public preview. It does not replace signed-in account isolation, AI-provider or PayPal Sandbox tests.

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
- [ ] A second test account cannot read or mutate the first account's data.
- [ ] Approve a valid candidate as the signed-in reviewer.
- [ ] Post only an approved candidate to the internal ledger.
- [ ] Retry posting and verify duplicate entries are prevented.
- [ ] Inspect import, matching, review and posting audit events.
- [ ] Confirm exported PayPal evidence is labelled provider-side evidence.

## Evidence boundary

Matching PayProof's own PayPal evidence CSV against its saved verified captures is a consistency check. It is not independent bank reconciliation. A genuine bank-exported CSV is required to demonstrate matching against an independent bank statement.

## Record each test

Record date/time and timezone, commit SHA, deployment URL, environment, test account type (never passwords or tokens), steps, expected and actual results, pass/fail/blocked/not-tested status, and redacted evidence.

## Limitations

Sandbox only; no real-money processing. PayPal capture is not bank settlement. The internal ledger is not a bank or external accounting system. AI is advisory. Production use requires additional security, privacy, reliability, webhook, monitoring and operational review.
