# PayProof AI — Verification Plan

This document separates code-level checks from live integration tests. A passing build does not prove that PayPal, Supabase persistence, AI extraction or reconciliation has passed end-to-end testing.

## Local checks

Run from the repository root:

```bash
npm install
npm run lint
npm run build
```

For the authenticated reconciliation feature branch, the branch's CI workflow also runs the smoke suite:

```bash
npm run test:smoke -- http://127.0.0.1:3000
```

The smoke suite checks public route availability, unauthenticated API boundaries and the synthetic-only public preview. It does not replace a real signed-in account test, AI-provider test or PayPal Sandbox transaction.

## AI endpoint access checks

- [ ] Unauthenticated POST to /api/orders/extract returns HTTP 401.
- [ ] Unauthenticated POST to /api/assistant/chat returns HTTP 401.
- [ ] Signed-in browser requests include the current Supabase bearer token.
- [ ] Signed-in AI extraction produces a reviewable draft and never saves an order or marks payment verified.
- [ ] Signed-in assistant responses remain advisory and do not claim access to live account records unless those records are explicitly supplied.

## Core workflow scenarios

| Scenario | Expected safe result | Evidence to capture |
|---|---|---|
| Valid customer order message | AI proposes a reviewable draft | Input message and proposed fields |
| Missing/ambiguous quantity or product | Missing information is visible; seller must review | Draft state and validation message |
| Unsupported catalogue item | Checkout is blocked | Validation response |
| Valid order | Application computes the trusted total | Catalogue item, quantity and total |
| PayPal Sandbox approval | Server verifies final provider state and expected details | Provider status, order/capture reference, amount, currency and timestamp |
| Buyer cancels checkout | Order is not marked paid | Cancel state |
| Payment pending or incomplete | Remains pending/review required | Provider status and UI state |
| Amount/currency/reference mismatch | Payment is not marked paid; review is required | Mismatch details |
| Provider/API failure | Safe error or retry state; no false success | Response and server logs without secrets |
| Repeated capture/confirmation request | No duplicate local paid record | Stable order/capture identifiers and database rows |
| AI provider unavailable | Safe fallback; no fabricated payment result | Error state and preserved order data |

## Authenticated workspace scenarios (feature branch / PR #8)

- [ ] Create or sign in to a test account.
- [ ] Confirm the signed-in user's workspace loads.
- [ ] Import a statement CSV with valid transaction ID, positive amount, three-letter currency and reference.
- [ ] Import the same file again and verify duplicate rows are not duplicated.
- [ ] Run matching against the same user's eligible server-verified PayPal captures.
- [ ] Confirm exact reference + amount + currency produces a pending-review candidate, not automatic approval.
- [ ] Confirm amount, currency or reference mismatch remains an exception/unmatched row.
- [ ] Confirm a different user's records are not visible or mutable from this account.
- [ ] Approve a valid candidate as the signed-in reviewer.
- [ ] Post only an approved candidate to the internal ledger.
- [ ] Retry posting and verify duplicate ledger entries are prevented.
- [ ] Inspect audit events for import, matching, review and posting.
- [ ] Confirm a PayPal evidence CSV is labelled provider-side evidence, not bank settlement proof.

## Reconciliation evidence boundary

A PayProof-generated PayPal evidence CSV matched against PayProof's own verified captures is a consistency check against the application's provider records. It is not independent bank reconciliation.

To demonstrate matching against an independent bank statement, use a genuine bank-exported CSV containing corresponding transaction references, amounts and currencies. Do not upload sensitive or personal banking data to a public demo.

## Test result recording

For every scenario record:

- Date and time (with timezone)
- Commit SHA and deployment URL
- Environment (local, preview, Sandbox)
- Test account type (never record passwords or tokens)
- Steps performed
- Expected result
- Actual result
- Pass / fail / blocked / not tested
- Redacted evidence or logs

Do not mark a test passed based only on a code review, successful deployment, screenshot, or the presence of a UI control.

## Known limitations

- PayPal Sandbox is not live-money processing.
- A provider capture does not prove bank settlement.
- The internal ledger is not a bank ledger or external accounting integration.
- AI outputs are advisory and may be unavailable or require correction.
- Full production readiness requires additional security, privacy, reliability, webhook, monitoring and operational work.
