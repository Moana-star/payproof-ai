# PayProof AI — Product Requirements

## 1. Summary

PayProof AI helps small sellers turn incoming order messages into reviewed order drafts, use PayPal Sandbox for checkout, and understand payment status from verified transaction data. It is an operational tool, not a wallet or payment processor.

## 2. Product principles

- **Trust before automation:** payment status must come from verified PayPal data.
- **Human control:** AI proposes; the seller confirms.
- **Clarity over complexity:** show what happened, what evidence supports it, and what to do next.
- **Honest uncertainty:** missing or conflicting information must be visible.
- **Secure by default:** server-side secrets, minimal stored data, sandbox-first development.

## 3. User stories and requirements

### Order intake
- As a seller, I can paste a customer order message and request a structured draft.
- The system returns fields with explicit unknowns rather than inventing quantities, prices, or delivery details.
- I can edit and confirm the draft before it becomes an order.
- AI output is schema-validated and treated as untrusted input.

### Pricing
- As a seller, I can review line items, quantities, currency, and prices.
- The system computes line totals and order totals in application code using safe decimal/minor-unit handling.
- The server validates submitted quantities and price identifiers; the browser cannot set a trusted total by itself.

### PayPal checkout and verification
- As a seller, I can create a PayPal Sandbox checkout for a confirmed order.
- The server creates the PayPal order using server-side credentials.
- Capture and verification follow PayPal's documented lifecycle.
- Before showing paid, the server checks the returned transaction against the expected order, amount, currency, and final status.
- Repeated requests are handled safely where applicable, and capture attempts do not create duplicate local orders.
- A mismatch, timeout, or ambiguous result produces a review-needed state, not a paid state.

### Investigation
- As a seller, I can ask for an explanation of an order's current status.
- The explanation is grounded in structured facts already recorded by the application.
- The assistant must not claim a payment succeeded unless verified state says it did.
- Recommendations are advisory and cannot trigger a refund, fulfilment, or other financial action in the MVP.

### Dashboard
- As a seller, I can distinguish draft, awaiting payment, processing, paid, failed, and review-required orders.
- I can see the last verification time and a concise reason when an order needs attention.
- Loading, empty, offline, and error states provide useful next steps.

## 4. Non-functional requirements

- Responsive on mobile and desktop.
- Clear keyboard focus and accessible labels.
- Server-side validation on all mutation routes.
- Secrets never exposed to client bundles or logs.
- No sensitive payment credentials or card data stored by this app.
- Useful error handling without leaking secrets or raw provider responses.
- Automated tests for calculations, input validation, and state transitions.
- A reproducible setup guide and demo data.

## 5. AI requirements

AI is used for language tasks only:
1. Extract a draft from unstructured order text.
2. Summarise known payment/order events in plain language.

AI must not:
- Set or calculate authoritative prices.
- Decide whether a payment is paid.
- Generate transaction identifiers as though they were real.
- Execute financial actions.
- Hide missing evidence or contradictions.

AI responses must use a constrained schema, pass validation, and show a clear fallback when the model is unavailable.

## 6. Demo scenarios

1. **Happy path:** message → reviewed draft → checkout → verified sandbox payment → paid status.
2. **Missing details:** extraction marks missing quantity/address detail for seller review.
3. **Payment not completed:** order remains awaiting payment.
4. **Amount/currency mismatch:** order moves to review required; it is never marked paid.
5. **Provider/model error:** app shows a recoverable error and preserves the draft.
6. **Untrusted claim:** a customer says “I paid” but no verified transaction exists; status remains unpaid/review required.

## 7. Hackathon readiness checklist

- PayPal integration is central to the demonstrated workflow.
- AI adds a clear, bounded benefit beyond a generic chatbot.
- A live demo or complete setup instructions are available.
- Public source repository includes an open-source license.
- Demo uses sandbox credentials and synthetic data.
- Video and project description explain the problem, product, technical choices, safeguards, and working features accurately.
