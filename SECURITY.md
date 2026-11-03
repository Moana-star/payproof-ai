# Security Policy

## Scope

PayProof AI is a hackathon prototype that uses PayPal Sandbox and may use Supabase and an AI provider. It is not approved for real-money processing or production financial data.

## Reporting a vulnerability

Please do not publish exploitable vulnerabilities, credentials, personal data or sensitive logs in a public issue. Use GitHub's private vulnerability reporting feature if it is enabled for this repository. Otherwise contact the repository maintainer privately through the contact channel on the GitHub profile.

Include:
- A concise description and affected route/file
- Reproduction steps using synthetic data
- Potential impact
- A suggested mitigation, if known

Do not include secrets or real customer/payment information in the report.

## Secret handling

- Keep `.env.local` and all environment files containing real values out of Git.
- Keep PayPal client secrets, Supabase service-role keys, AI-provider keys and reviewer tokens server-side.
- Never expose server secrets through `NEXT_PUBLIC_*` variables.
- Use PayPal Sandbox credentials and synthetic test data for hackathon demonstrations.
- Rotate any credential that may have been exposed.

## Trust and data boundaries

- A browser redirect, screenshot, customer message or AI response is not proof of payment.
- Payment status must come from server-side verification against the configured provider.
- AI output is untrusted input and must be validated before use.
- Human review is required for uncertain reconciliation candidates.
- The internal ledger is an application record, not a bank or external accounting ledger.

## Supported environment

The project is a prototype. Before production use, complete an independent security and privacy review, validate webhook signatures where applicable, review authorization and row-level security, add rate limiting and monitoring, define retention and incident procedures, and test recovery and idempotency.
