# PayProof AI — Technical Specification

## 1. Architecture overview

Planned request flow:

Browser UI
→ application server routes
→ domain validation and deterministic business rules
→ PayPal REST API / AI provider adapter
→ normalized result stored for the demo session or database, depending on the implementation stage
→ UI displays state with source and timestamp

External providers are accessed from server-side code only. The browser never receives PayPal client secrets or AI-provider keys.

## 2. Proposed modules

- **Order domain:** validated order draft, line items, currency, totals.
- **Order extraction adapter:** accepts untrusted customer text and returns a constrained draft schema.
- **Pricing service:** computes totals from trusted product/price records.
- **PayPal adapter:** obtains an OAuth access token, creates checkout orders, captures/queries transactions, and normalizes responses.
- **Payment verification service:** checks provider status and expected amount, currency, and order linkage.
- **Investigation service:** produces a short explanation from normalized events and known state.
- **Dashboard UI:** order list, status badges, detail panel, and review-needed reasons.

Implementation may begin with in-memory demo data, but the README must state that limitation. Persistent storage will be added only if it improves the reliability of the MVP and can be tested.

## 3. Payment state model

Allowed local states:

- draft
- awaiting_payment
- processing
- paid
- failed
- review_required

State rules:
- draft → awaiting_payment only after seller confirmation and successful checkout-order creation.
- awaiting_payment → paid only after server-side PayPal verification confirms the expected final state, amount, currency, and order association.
- awaiting_payment → processing when PayPal reports a non-final in-progress state.
- Any amount/currency/order mismatch → review_required.
- Network errors or ambiguous provider responses do not imply success; preserve the prior safe state or use review_required.
- failed must be based on a known provider failure, not inferred from a missing response.
- A client redirect or browser callback alone must never mark an order paid.

## 4. API design (planned)

Routes are illustrative until implemented.

- POST /api/orders/extract — validate input length, call extraction adapter, schema-validate result.
- POST /api/orders — validate seller-confirmed draft and calculate trusted total.
- GET /api/orders — return demo orders.
- GET /api/orders/:id — return order and verification history.
- POST /api/paypal/create-order — create a PayPal Sandbox order for a known local order.
- POST /api/paypal/capture-order — capture or confirm an existing PayPal order and verify the result.
- POST /api/orders/:id/investigate — summarise known state; no financial side effects.

## 5. Data contracts (initial)

Order draft:
- items: array of productId and quantity
- customerNote: optional string
- missingInformation: array of concise strings
- confidenceNotes: optional human-readable uncertainty notes

Authoritative order:
- id: application-generated identifier
- items: validated product IDs and integer quantities
- currency: server-selected supported currency
- amountMinor: integer amount in the currency's minor unit
- status: one of the defined local states
- paypalOrderId: optional provider order ID
- lastVerifiedAt: optional timestamp
- verificationNote: safe, non-secret explanation of the latest check

AI output is never an authoritative source for product prices, totals, transaction IDs, or payment status.

## 6. Security and reliability

- Keep secrets in environment variables and ensure credential-bearing env files are ignored; .env.example contains placeholders only.
- Use server-side PayPal credentials and HTTPS in deployed environments.
- Validate and bound request bodies.
- Use strict schemas for model responses and escape user content in the UI.
- Never log access tokens, client secrets, full customer messages unnecessarily, or raw sensitive provider payloads.
- Handle retries and duplicate requests safely; use idempotency support where documented by the relevant PayPal endpoint.
- Verify webhooks if webhooks are added; validate their signatures using PayPal's supported verification flow.
- Do not trust a webhook payload until its authenticity has been verified.
- Use only synthetic data and sandbox transactions for the hackathon demo.

## 7. Testing plan

Unit tests:
- integer quantity and supported product validation
- totals and currency formatting
- malformed or incomplete extraction results
- each allowed payment-state transition
- amount, currency, and order-reference mismatches
- network failure and ambiguous response handling

Integration/demo tests:
- sandbox order creation
- successful capture and server verification
- approval without capture
- duplicate capture/request handling
- missing credentials and provider outage
- model unavailable fallback

## 8. Open implementation decisions

- Confirm the available PayPal Developer account and Sandbox access.
- Select the AI provider based on account access, reliability, and ease of demo.
- Confirm current PayPal REST Checkout endpoints and required request fields against official docs before coding.
- Decide whether to use a lightweight persistent store or in-memory demo records after the core verification flow is proven.
- Deploy only after environment variables and error paths are tested.
