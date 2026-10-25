# PayProof AI

**Know what was paid. Know what needs attention.**

PayProof AI is a payment-operations workspace for small online sellers. It combines structured order intake, PayPal payment workflows, and AI-assisted explanations so a seller can spend less time piecing together customer messages and payment events.

> **Core trust rule:** AI can organise and explain information. PayPal's verified server-side transaction data—not screenshots, customer claims, or model output—determines payment status.

## Why this matters

Small sellers can lose time switching between order messages, checkout records, and customer questions. PayProof AI aims to bring those tasks into one clear workflow while keeping payment decisions auditable.

## Planned experience

- **Order intake:** turn a customer message into a proposed order draft; the seller reviews it before saving.
- **PayPal checkout:** create a sandbox order through PayPal's supported API flow.
- **Verified status:** retrieve and validate payment state on the server before marking an order paid.
- **Issue investigation:** explain known order and transaction events in plain language, with references to the underlying facts.
- **Operations dashboard:** surface unpaid, completed, and attention-needed orders.

These are planned capabilities, not claims that the integration is already complete.

## Trust and safety principles

1. Never store PayPal client secrets in browser code or commit them to Git.
2. Never treat a screenshot, customer message, or AI-generated response as proof of payment.
3. Calculate prices and totals in deterministic application code, not with an LLM.
4. Validate payment status on the server using PayPal's API and the documented capture/verification flow.
5. Keep AI output advisory; require human review before order details are accepted or changed.
6. Use sandbox credentials and synthetic test data during development.

## Planned stack

- TypeScript and Next.js for the web application and server routes
- PayPal Developer Sandbox for checkout and transaction lifecycle
- An AI provider behind a server-side adapter for structured order extraction and evidence-grounded explanations
- Automated tests for totals, order validation, and payment-state transitions

The exact provider and framework configuration will be recorded as implementation decisions are made.

## Project status

**Stage:** planning and foundation. The repository is public, and implementation has not yet been verified. No production payment processing is claimed.

## Getting started

Setup instructions will be added with the first working application slice. For now, see:

- [Scope](scope.md)
- [Product requirements](prd.md)
- [Technical specification](spec.md)
- [Environment variable template](.env.example)

## Local development and secrets

Never paste real credentials into issues, chat, source files, screenshots, or commits. Copy .env.example to .env.local once the application setup is added, then fill it with your own sandbox credentials. Keep .env.local untracked.

## License

This project is released under the MIT License. See [LICENSE](LICENSE).
