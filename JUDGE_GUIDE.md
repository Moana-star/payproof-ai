# PayProof AI — Judge Testing Guide

**Live application:** https://payproof-ai-beta.vercel.app/

Welcome. This guide helps you evaluate the public hackathon prototype safely and reproduce its main workflows.

## 1. What to evaluate

PayProof AI helps small online sellers turn customer messages into reviewable order drafts, start PayPal Sandbox checkout, inspect server-verified payment results, and understand payment exceptions with bounded AI assistance.

The core trust boundary is simple: **AI explains; verified payment data decides.** A model response, screenshot, customer message, or browser redirect cannot establish that a payment was received.

## 2. Open the public demo

1. Visit https://payproof-ai-beta.vercel.app/.
2. The public preview opens directly; it does not require an application sign-in for the visible demo workspace.
3. The workspace is a demonstration interface. Its preloaded order counts and dashboard rows are sample/illustrative records, not a private account's live order history.
4. Keep the Sandbox mode indicator visible during testing.

Do not interpret the demo workspace name or sample records as account isolation or authenticated merchant data.

## 3. Try AI-assisted order intake

1. Scroll to **AI order intake**.
2. Enter: "Please order two coffee gift sets."
3. Select **Prepare order draft**.
4. Inspect the proposed product, quantity, missing information, and confidence notes.
5. Review and validate the draft before starting checkout.

**Expected behaviour:** AI proposes structured details. It does not create a paid order, set a trusted price, or verify payment. The server-side catalogue controls product prices and totals.

## 4. Run a PayPal Sandbox checkout

1. Use the **Test PayPal checkout** action in the top bar (or the checkout action exposed after reviewing a supported draft).
2. The application creates a PayPal Sandbox order using the server-side catalogue price and redirects to PayPal.
3. Sign in on PayPal's Sandbox approval page with a dedicated **Sandbox Personal/Buyer** test account.
4. Approve the test payment and return to PayProof AI.
5. Inspect the server response/result for the order reference, PayPal order ID, capture ID, amount, currency, and verification status.
6. Check the persistence result separately. A verified capture and a successfully saved order are two different outcomes.

PayPal Sandbox does not move real money. Never use personal PayPal credentials or real card details. Do not publish Sandbox buyer credentials or developer REST app credentials in this repository, screenshots, or the public Devpost submission.

**Important:** A successful redirect is not proof of payment. The server retrieves the PayPal order and checks the completed order/capture, catalogue-derived amount, currency, and internal reference before returning a verified result. If any check fails, the response remains under review.

## 5. Explore AI evidence explanations

1. Open **AI assistant** from the navigation.
2. Select the clearly labelled synthetic **amount mismatch** scenario.
3. Ask why the payment needs review.
4. Confirm that the explanation identifies the expected amount ($42.00) and captured amount ($40.00), recommends human review, and does not claim the payment is fully matched.

The scenario is synthetic. It is designed to demonstrate the AI safety boundary, not to represent a real PayPal transaction.

## 6. Explore reconciliation and exceptions

Use the reconciliation, payment evidence, and exception-review pages to inspect the sample records. They are labelled as demo/illustrative data. Look for the distinction between:
- A possible match and an approved match.
- A completed capture and incomplete evidence.
- A sample record and a verified transaction from the current Sandbox checkout.

Do not interpret illustrative audit events as a complete production audit log or sample statement rows as a live bank feed.

## 7. Security and prototype boundaries

- PayPal Sandbox only; no live-money processing.
- Use synthetic test data only.
- Never enter personal PayPal credentials or real card details.
- Never request or expose PayPal client secrets, Supabase service-role keys, Groq API keys, or other server secrets.
- The public demo workspace is not a production, owner-scoped merchant account system.
- The reconciliation and exception examples are illustrative; do not treat them as live bank integrations or production ledger posting.
- The prototype is not intended for production merchant operations.

## 8. What to assess

1. **Technological implementation:** PayPal Sandbox checkout, server-side verification, persistence outcome, and bounded AI language tasks.
2. **Design:** clarity of order details, payment status, evidence, sample labels, and next steps.
3. **Potential impact:** helping small sellers avoid acting on incomplete or mismatched payment evidence.
4. **Innovation:** applying AI to language understanding while keeping payment authority deterministic.
5. **Presentation:** whether the happy path, mismatch case, and trust boundary are easy to reproduce and understand.

Thank you for evaluating PayProof AI.
