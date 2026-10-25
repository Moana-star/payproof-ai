# PayProof AI

**Know what was paid. Know what needs attention.**

PayProof AI is a payment-operations workspace concept for small online sellers. It brings order-message intake and PayPal checkout verification into one workflow, with a clear boundary between AI suggestions and payment evidence.

> **Core trust rule:** AI can organise and explain information. Only server-side verification against PayPal's transaction API can establish payment status. Screenshots, customer claims, and AI output are not proof of payment.

## The problem

Small sellers often piece together order details from customer messages and payment updates from separate tools. That creates avoidable manual work and a risk of fulfilling an order before payment is confirmed.

## Product workflow

1. **Capture a customer request.** Paste the message into the order-intake panel.
2. **Prepare a reviewable draft.** Suggested product and quantity must be checked by the seller. Ambiguous or missing details should be resolved before confirmation.
3. **Create a PayPal Sandbox checkout.** The server—not the browser—sets the demo amount and creates the PayPal order.
4. **Capture and verify payment.** The server checks PayPal's response and the expected amount, currency, and order reference before reporting a verified result.
5. **Investigate exceptions.** Pending, incomplete, and mismatched payment states should remain visible for human review.

## Planned product capabilities

The complete feature plan and acceptance checklist are documented in **[docs/feature-plan.md](docs/feature-plan.md)**. The target product includes:

- **AI Order Assistant:** Extract a supported product and quantity from a customer message, validate the result, and present it for human review.
- **AI Payment Investigator:** Explain mismatches using server-verified PayPal evidence. AI can summarize evidence but cannot determine payment status.
- **Payment Operations Dashboard:** Show orders, verified payments, pending payments, review-required cases, and recent activity from real persisted records once storage is implemented.
- **PayPal Sandbox Checkout:** Create, approve, capture, and verify a test payment, including negative-path and retry testing.
- **Evidence and Audit Trail:** Record order/payment identifiers, verification checks, timestamps, and review outcomes without storing unnecessary sensitive data.
- **Hackathon-ready quality:** Automated tests, honest documentation, accessible responsive UI, and a concise demo showing both a successful payment and a flagged mismatch.

These are target capabilities, not a claim that every feature is already complete. See the status section below and the feature plan for implementation boundaries and required tests.

## Current implementation status

This is an active prototype. Do not describe it as production-ready.

- [x] Next.js dashboard with clearly labelled illustrative records
- [x] Server-side PayPal OAuth helper and Orders API routes committed
- [x] Fixed-price Sandbox checkout flow and return/cancel screens committed
- [x] Initial server-side checks for captured status, amount, currency, order ID, and expected reference
- [ ] Run a successful end-to-end Sandbox payment with configured credentials
- [x] Add a server-side AI Gateway-compatible extraction route with schema checks and advisory-only output on the feature branch
- [ ] Configure a valid AI Gateway key/model in Vercel and verify live model responses
- [x] Add a dedicated Payment Investigator interface with deterministic order, capture, amount, currency, and trusted-reference checks
- [x] Add eight unit tests covering successful evidence and incomplete, pending, mismatched, and unsuccessful payment cases
- [x] Link the Payment Investigator from the workspace navigation
- [x] Add stable PayPal capture retry request IDs and reject mismatched orders before attempting capture
- [x] Add focused unit tests for deterministic payment-evidence rules
- [ ] Add route-level integration tests and persistent order/event/audit records
- [ ] Verify retry/idempotency behavior and add signed PayPal webhook handling
- [ ] Review production security, access control, rate limiting, and operational monitoring
- [ ] Record a demo showing both successful verification and a mismatch requiring review

A committed integration is not the same as a tested integration. The deterministic payment-rule unit tests, lint, and production build have passed in an isolated test environment. A live end-to-end PayPal Sandbox transaction has not yet been confirmed. The dashboard's sample orders remain illustrative and no production payment processing is claimed.

## Run locally

### Requirements

- Node.js 20 or a compatible supported Node.js release
- npm
- A PayPal Developer account with a **Sandbox** REST app
- VS Code or another code editor

### 1. Install dependencies

Open a terminal in the repository root (the folder containing `package.json`) and run:

```bash
npm install
```

### 2. Add private environment variables

Create a file named `.env.local` in the same folder as `package.json`. Copy the variable names from `.env.example`, then replace the PayPal placeholders with your own Sandbox credentials.

```env
PAYPAL_CLIENT_ID=your_sandbox_client_id
PAYPAL_CLIENT_SECRET=your_sandbox_client_secret
PAYPAL_BASE_URL=https://api-m.sandbox.paypal.com
AI_GATEWAY_API_KEY=your_vercel_ai_gateway_key
AI_MODEL=provider/model-name
APP_URL=http://localhost:3000
```

Do not commit `.env.local`, paste secrets into issues or chat, or use `NEXT_PUBLIC_` for private credentials. The Sandbox API base URL above is for testing, not live payments.

### 3. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 4. Test the checkout

Use **Test PayPal checkout** to create the fixed-price Sandbox order. Approve it with a PayPal Sandbox personal/test buyer account. Return to the app and inspect the server's verification result.

If checkout fails, check that the credentials belong to the Sandbox app, the app has been restarted after changing `.env.local`, and the local server terminal does not show an API error. Never share credential values when asking for help.

### 5. Run quality checks

```bash
npm run test
npm run lint
npm run build
```

Resolve errors before deploying. This README documents the intended workflow; it does not mean these commands or the end-to-end checkout have already passed in every environment.

## AI integration

The order-intake UI calls a server-side AI Gateway-compatible chat-completions endpoint for structured product/quantity extraction and missing-information notes; this is an actual model request, not a local keyword-matching fallback. Configure `AI_GATEWAY_API_KEY` and `AI_MODEL` for the environment being tested before expecting live model responses. The route validates model output against a constrained schema, limits the input length, times out provider requests, and returns advisory suggestions only. If configuration is missing, the provider fails, or the response is invalid, the request fails safely and no order is created. The AI Gateway key/model are not currently confirmed in the Vercel project environment, so live AI operation remains unverified. Sellers must review the result. Price calculation, PayPal calls, and payment-state decisions remain deterministic server-side operations.

Never allow model output to set a price, claim a payment succeeded, or bypass PayPal verification.

## Trust and security principles

1. Keep PayPal client secrets server-side and out of source control.
2. Never treat screenshots, customer messages, or model output as payment evidence.
3. Calculate prices and totals in application code, not with an LLM.
4. Verify payment state against PayPal on the server.
5. Require human review for ambiguous order details.
6. Use Sandbox credentials and synthetic records during development.
7. Treat a browser return URL as a trigger to verify—not proof of payment.
8. Before production use, add appropriate webhook signature verification, idempotency, persistence, access control, rate limiting, and operational logging.

## Demo preparation

See [docs/demo-script.md](docs/demo-script.md) for a short, honest demonstration plan and the checks to complete before recording.

## Project documents

- [Feature plan and delivery checklist](docs/feature-plan.md)
- [Scope](scope.md)
- [Product requirements](prd.md)
- [Technical specification](spec.md)
- [Environment variable template](.env.example)
- [MIT License](LICENSE)

## License

MIT. See [LICENSE](LICENSE).
