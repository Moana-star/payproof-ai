# PayProof AI — Project Scope

## Product goal

Build a trustworthy, demo-ready payment operations assistant for small online sellers, with PayPal Sandbox as a core workflow and AI used only where language understanding adds value.

## Primary user

A small online seller who receives customer orders through messages and needs a clearer way to create orders, collect payment, and understand payment status.

## Problem statement

Order details often arrive as unstructured text. Sellers then have to re-enter information, find the related checkout, and answer payment questions. This creates avoidable effort and increases the risk of acting on incomplete or misleading evidence.

## MVP user journey

1. Seller pastes a customer order message.
2. AI proposes structured fields (items, quantities, delivery notes, and unresolved questions).
3. Seller reviews and confirms the draft. Missing or ambiguous fields must be flagged, not guessed.
4. Application code validates the order and calculates the total using explicit prices.
5. Seller creates a PayPal Sandbox checkout.
6. Server verifies the resulting PayPal transaction state using PayPal's documented API.
7. Dashboard displays the verified state and the timestamp/source of the latest verification.
8. If a payment is pending, failed, or unclear, the assistant summarises only the recorded facts and offers safe next steps.

## In scope

- Responsive seller dashboard
- Synthetic demo products and configurable prices
- Draft order extraction with human confirmation
- Deterministic price and total calculations
- PayPal Sandbox order creation and capture/status verification
- Explicit payment states: draft, awaiting payment, processing, paid, failed, and review required
- AI-generated summaries grounded in structured application data
- Helpful empty, loading, error, and retry states
- Unit tests for business rules and payment-state transitions
- Setup guide, architecture notes, and short demo script

## Out of scope for the first version

- Real-money production transactions
- Automated refunds or payouts
- Holding or moving customer funds
- Unverified screenshot or receipt OCR as proof of payment
- Automatic fulfilment based only on AI output
- Full accounting, inventory, tax, or shipping integrations
- Multi-tenant enterprise permissions unless the core MVP is stable

## Non-negotiable trust boundaries

- AI does not determine whether money was received.
- Client-side success screens do not independently prove payment.
- The server must verify transaction details with PayPal before recording a paid state.
- Amount, currency, order reference, and transaction status must be checked.
- If data conflicts or verification fails, show **Review required** rather than assuming success.
- Secrets stay server-side and out of source control.
- Sandbox and synthetic data only during the hackathon build.

## MVP acceptance criteria

- A reviewer can run the application using documented setup steps.
- A reviewer can create and review a draft order.
- Order totals are computed by deterministic code and covered by tests.
- A PayPal Sandbox checkout can be created through the application's server-side integration.
- The application does not mark an order paid until server-side verification succeeds.
- Verification errors and mismatched amounts/currencies fail safely.
- AI summaries distinguish verified facts from missing or uncertain information.
- The repository includes an open-source license, clear README, and demo instructions.
- The final submission includes a functional demo URL or complete run instructions, and an honest description of what works.

## Success measures for the demo

- A new user can understand the value within 30 seconds.
- The core order-to-verification path can be demonstrated reliably.
- A deliberately mismatched or unverified payment cannot become paid.
- The interface makes payment evidence and next actions easy to understand.
