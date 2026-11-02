# PayProof AI — Judge Testing Guide

**Live application:** https://payproof-ai-beta.vercel.app/

Welcome. This guide is designed to help you evaluate the working hackathon prototype safely and consistently.

## 1. What to evaluate

PayProof AI helps small online sellers turn customer messages into reviewed order drafts, use PayPal Sandbox checkout, inspect payment evidence, and understand exceptions with bounded AI assistance.

The key design decision is that **AI explains; verified payment data decides**. A model response, screenshot, customer message, or browser redirect cannot establish that a payment was received.

## 2. Open the application

1. Visit https://payproof-ai-beta.vercel.app/.
2. If the application presents a sign-in screen, use the judge/demo application account supplied separately by the project maintainer, if one has been provisioned.
3. Do not use another person's personal account. Do not ask the maintainer to publish passwords or tokens in GitHub or Devpost.
4. Navigate the workspace and note which records are labelled sample, synthetic, or illustrative.

If no judge application account has been supplied, contact the maintainer through the official hackathon communication channel for access instructions. Do not attempt to bypass authentication.

## 3. Explore the order-intake workflow

1. Open the AI order-intake area.
2. Enter a simple test message, for example: "Please order two coffee gift sets."
3. Ask the system to prepare an order draft.
4. Inspect the extracted product and quantity.
5. Confirm that the result is presented as a draft for human review, not as a paid order.
6. Check that the application does not allow model output to set an authoritative price or payment status.

**Expected behaviour:** AI proposes structured order details. The seller remains responsible for reviewing and confirming the draft.

## 4. Test PayPal Sandbox checkout

PayPal Sandbox is a test environment. It does not move real money.

1. Start checkout from a confirmed test order in the application.
2. The application should redirect to the PayPal Sandbox approval page.
3. Sign in there with a dedicated **Sandbox Personal/Buyer** test account.
4. Approve the test payment.
5. Return to PayProof AI.
6. Inspect the result shown by the application.

The maintainer should provide the Sandbox buyer username and password through a private, approved channel only if shared judge testing is required. These are separate from personal PayPal credentials and developer REST app credentials. Never publish them in this repository, screenshots, or a public submission.

**What to inspect after returning:**
- The PayPal order reference.
- The capture reference, when a capture has completed.
- The final provider status.
- Expected amount and currency compared with the verified result.
- Whether the application reports database persistence separately from payment verification.

A successful browser redirect is not proof of payment. The server must verify the transaction with PayPal.

## 5. Explore payment evidence and exceptions

Use the clearly labelled sample scenarios to inspect:
- An amount mismatch.
- Missing or incomplete capture evidence.
- A record that needs source confirmation.

**Expected behaviour:** conflicting or incomplete evidence stays in a review state. The application must not describe it as successfully paid merely because an AI explanation sounds confident.

## 6. Evaluate the AI assistant

Choose a supplied sample evidence scenario and request an explanation.

Evaluate whether the assistant:
- Separates known facts from missing information.
- Explains why a record needs attention.
- Recommends a safe next step.
- Avoids inventing transaction IDs or payment confirmations.
- Does not change payment status or initiate a financial action.

AI output is advisory. Deterministic server-side verification remains authoritative.

## 7. Evaluate reconciliation and human review

Explore the reconciliation and exception-review pages using the labelled demo records. Look for:
- Exact reference, amount, and currency comparisons.
- Clear distinctions between a possible match and an approved/postable match.
- A human review step before posting.
- Safe handling of duplicates, mismatches, and unmatched records.

These sample workflows demonstrate the intended review process. Do not interpret synthetic records or illustrative audit events as actual bank transactions or a complete production audit log.

## 8. Security and demo boundaries

- Use Sandbox buyer credentials only for checkout approval.
- Never enter personal PayPal credentials or real card details.
- Never request or expose PayPal client secrets, Supabase service-role keys, Groq keys, reviewer tokens, or application passwords in public.
- Use synthetic test data only.
- The prototype is not intended for live-money processing or production merchant operations.

## 9. What makes a strong evaluation

Please assess the product against the five core dimensions:

1. **Technological implementation:** does the end-to-end flow connect the application, PayPal Sandbox verification, persistence, and AI safely?
2. **Design:** are statuses, evidence, and next steps understandable?
3. **Potential impact:** does the workflow reduce manual work and help sellers avoid premature fulfilment?
4. **Innovation:** is AI applied to a useful language task while payment authority remains deterministic?
5. **Presentation:** can the value and trust model be understood in a short, reproducible demonstration?

Thank you for evaluating PayProof AI.
