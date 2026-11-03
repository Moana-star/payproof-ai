# Contributing

Thanks for taking an interest in PayProof AI.

## Before opening a change

1. Read the [README](README.md), [project scope](scope.md) and [security policy](SECURITY.md).
2. Open an issue for a substantial feature or architectural change so the intended behaviour can be discussed.
3. Keep pull requests focused and explain the user problem they solve.
4. Never include credentials, real payment data or personal customer information.

## Development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Add your own PayPal Sandbox, Supabase and AI-provider values to `.env.local`. Do not commit that file.

Before submitting:

```bash
npm run lint
npm run build
```

For branches that include the smoke-test script, also run:

```bash
npm run test:smoke -- http://127.0.0.1:3000
```

## Pull request checklist

- [ ] Explain the problem and the change.
- [ ] Include steps to reproduce and verify.
- [ ] Add or update tests for changed behaviour.
- [ ] Keep payment verification server-side.
- [ ] Do not let AI set trusted prices or authoritative payment status.
- [ ] Preserve human review for uncertain reconciliation.
- [ ] Keep secrets and personal data out of commits, screenshots and logs.
- [ ] Update documentation when setup, behaviour or limitations change.
- [ ] State clearly what was tested and what remains untested.

## Design principles

- Evidence before automation.
- Human review before consequential reconciliation actions.
- Deterministic validation for money and payment state.
- Clear distinction between Sandbox, synthetic examples and live systems.
- No unsupported claims about fraud reduction, time saved or production readiness.
