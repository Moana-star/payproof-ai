# PayProof AI — Final Verification Checklist

Use this checklist for the final release and judge rehearsal. Mark a test **PASS** only after observing it in the current deployed build. Record the date, environment, and evidence filename. A successful build is not proof that every user journey works.

**Production demo:** https://payproof-ai-beta.vercel.app/  
**Payment environment:** PayPal Sandbox only.

## Result key

- [ ] PASS — observed and evidence captured
- [ ] FAIL — observed defect; record details
- [ ] NOT TESTED — not yet verified in this release

## A. Access and navigation

| Check | Expected result | Result / evidence |
|---|---|---|
| Open live application | HTTPS page loads without a blocking error | |
| Sign-in flow, if required | Valid demo user can access the intended workspace | |
| Protected access | Unauthenticated users cannot access protected user data or mutation actions | |
| Navigation | Main pages and primary actions open the correct destinations | |
| Responsive layout | Key workflows remain usable on desktop and mobile widths | |

## B. Order intake and pricing

| Check | Expected result | Result / evidence |
|---|---|---|
| Simple order message | AI proposes the expected product and quantity | |
| Ambiguous order message | Missing details are surfaced rather than guessed | |
| Draft review | Seller can inspect and correct the proposal | |
| Pricing | Trusted total comes from application-side catalogue logic | |
| Model unavailable | Safe error/fallback; no false order or payment success | |

## C. PayPal Sandbox checkout

| Check | Expected result | Result / evidence |
|---|---|---|
| Create checkout | Server creates a Sandbox order for the reviewed order | |
| Buyer approval | Dedicated Sandbox buyer can approve checkout | |
| Return flow | Buyer returns to the correct application destination | |
| Capture verification | Server confirms provider status and expected order linkage | |
| Amount/currency | Verified amount and currency match expected values | |
| Pending or cancelled | Order is not marked paid | |
| Duplicate/retry | Repeated action does not create an unsafe duplicate or false success | |
| Provider error | Clear recoverable error; no false paid state | |

## D. Persistence and payment evidence

| Check | Expected result | Result / evidence |
|---|---|---|
| Verified payment persistence | Expected order and capture/event records exist in Supabase | |
| Persistence failure | UI distinguishes verified payment from failed database persistence | |
| Evidence view | References, status, amount, currency, and verification details are consistent | |
| Refresh/revisit | Persisted result remains consistent after reload, where persistence is configured | |

## E. AI explanation safety

| Check | Expected result | Result / evidence |
|---|---|---|
| Amount mismatch | Explains discrepancy and recommends review | |
| Missing capture | Does not claim payment succeeded | |
| Completed verified payment | Explanation reflects the verified state supplied to it | |
| Untrusted customer claim | Claim alone does not become proof | |
| Model error | Safe fallback; payment status remains unchanged | |
| Financial action boundary | AI cannot fulfil, refund, pay out, or change authoritative status | |

## F. Reconciliation and exception review

| Check | Expected result | Result / evidence |
|---|---|---|
| Exact reference/amount/currency | Candidate match is identified accurately | |
| Amount mismatch | Exception is visible and not silently matched | |
| Unmatched record | Remains unmatched and reviewable | |
| Duplicate import | Duplicate is detected or safely handled | |
| Human approval | Posting requires the intended reviewer action | |
| Reviewer protection | Protected operations reject missing/invalid authorisation | |
| Audit view | Clearly distinguishes actual recorded events from illustrative examples | |

## G. Security and release hygiene

| Check | Expected result | Result / evidence |
|---|---|---|
| Public repository | No committed secrets or private credentials | |
| Environment template | `.env.example` contains placeholders only | |
| Server-side secrets | Provider secrets are not exposed to browser bundles | |
| Synthetic data | Demo records are clearly labelled | |
| Access isolation | One account cannot read another account's private data, if real user data is enabled | |
| Build and lint | Current release passes `npm run lint` and `npm run build` | |
| Deployment | Current production deployment corresponds to the intended commit | |

## Evidence capture plan

Save screenshots/video captures in a private local folder. Suggested filenames:

1. `01-live-homepage.png`
2. `02-order-intake-draft.png`
3. `03-reviewed-order.png`
4. `04-paypal-sandbox-approval.png`
5. `05-server-verified-payment.png`
6. `06-persistence-confirmation.png`
7. `07-payment-evidence.png`
8. `08-ai-mismatch-explanation.png`
9. `09-reconciliation-review.png`
10. `10-final-overview.png`

Never capture or upload passwords, client secrets, access tokens, reviewer tokens, private customer details, or payment-card data. Use synthetic information only.

## Release decision

Before submission, resolve every failure that affects the core order-to-payment-verification path. If an item cannot be verified, leave it marked NOT TESTED and do not claim it as demonstrated. Keep the final video under three minutes and show only flows that work in the deployed release.
