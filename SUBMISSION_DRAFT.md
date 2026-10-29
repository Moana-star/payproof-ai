# PayPal AI Hackathon — Submission Draft

Use this as the source of truth when completing the Devpost form. Keep the scope disclosure intact, and replace the video placeholder only after the public video is uploaded and watched end-to-end.

## Project name

**PayProof AI**

## Tagline

**Know what was paid. Understand what needs attention.**

## Short description

PayProof AI helps small online sellers turn customer messages into reviewable order drafts, verify PayPal Sandbox payments on the server, and reconcile payment evidence through a human-approved workflow. AI assists with language—not payment decisions. Verified transaction data, deterministic checks, and human review govern what happens next.

## The problem

Small sellers often receive orders through chat while checking payment status in a separate system. Re-entering details creates avoidable work, and a customer claim or misleading screenshot can be mistaken for a completed payment. Sellers need a clearer path from order request to payment evidence and a traceable reconciliation decision.

## The solution

PayProof AI brings those steps into one operations workflow:

1. **Turn messages into a draft.** AI extracts order details and flags missing or ambiguous information for seller review.
2. **Keep prices deterministic.** Application code validates supported catalogue items and calculates totals; the model does not set trusted prices.
3. **Verify before marking paid.** The server checks PayPal Sandbox capture status and expected transaction details instead of trusting a browser redirect, screenshot, or AI answer.
4. **Keep evidence reviewable.** Saved order/payment records and evidence explanations help the seller understand what is known and what still needs attention.
5. **Reconcile with human control.** A simulated statement CSV is matched against eligible verified Sandbox captures by reference, amount, and currency. A reviewer must approve a match before it can be posted to the internal demo ledger.
6. **Record the workflow.** Reconciliation actions are represented in an audit trail for review.

## What makes it different

- **Evidence before confidence:** AI-generated text and customer claims are never payment proof.
- **Clear separation of responsibilities:** AI drafts and explains; application logic validates prices and payment state; a person reviews exceptions and approves reconciliation.
- **Explainable exceptions:** unmatched or inconsistent evidence should be reviewed rather than silently accepted.
- **A practical merchant workflow:** order intake, payment evidence, reconciliation, and audit history are presented together rather than as disconnected demos.

## Use of AI

Groq-backed structured extraction helps turn natural-language order messages into a reviewable draft. AI explanations are advisory and use explicitly labelled synthetic evidence scenarios. Model output cannot independently mark an order paid, set a trusted price, bypass PayPal verification, or approve a ledger posting. Catalogue validation, totals, payment checks, and posting controls remain application responsibilities.

## Technology

Next.js, React, TypeScript, PayPal Sandbox REST APIs, Supabase, and Groq-backed structured extraction/explanation.

## Links

- **Hosted preview:** https://payproof-ai-git-feat-judge-ready-evidence-7cb616-naom6083-2980.vercel.app/
- **Payment evidence page:** https://payproof-ai-git-feat-judge-ready-evidence-7cb616-naom6083-2980.vercel.app/payments
- **Source code:** https://github.com/Moana-star/payproof-ai
- **Demo script:** [DEMO_SCRIPT.md](DEMO_SCRIPT.md)
- **Judge-readiness checklist:** [JUDGE_READINESS.md](JUDGE_READINESS.md)
- **Demo video:** [Add the public YouTube link after recording and checking the final video]

## Impact

The prototype explores how small sellers could reduce repetitive order entry and make payment decisions easier to review. By separating AI assistance from payment verification and requiring a human approval step for reconciliation, it demonstrates a safer workflow pattern for merchant operations. Any time savings or fraud reduction would need to be measured in real-world testing; this submission does not claim those outcomes have already been proven.

## Scope and limitations — keep this disclosure

This is a hackathon prototype, not a production payment or accounting system. Payments use PayPal Sandbox and do not move real money. The reconciliation example uses simulated statement data and posts only to an internal demo ledger; there is no live bank feed or external accounting write. The AI assistant currently explains explicitly labelled synthetic evidence scenarios rather than privately retrieved live customer transactions. The hosted dashboard includes labelled sample records. Production use would require further authentication and authorization, webhook verification, reliability work, privacy controls, monitoring, and security review.

## Suggested judge walkthrough

Use the deployed version and show only actions that work live:

- Start with the problem and the evidence-first rule.
- Show AI-assisted order intake and seller review.
- Show a completed Sandbox capture with its saved verification evidence, if a fresh run succeeds.
- Show the clearly labelled simulated reconciliation row, reviewer approval, internal demo-ledger entry, and audit event.
- Close by explaining what is real in the prototype and what is simulated.

If a live integration fails during rehearsal, fix it or clearly demonstrate the safe fallback. Do not edit the video to imply a transaction or action succeeded when it did not.

## Final submission gate

- [ ] Run a fresh PayPal Sandbox checkout on the exact public Preview and confirm the saved order, capture reference, verification timestamp, and payment event in Supabase.
- [ ] Test one incomplete/cancelled payment and confirm it is not marked paid.
- [ ] Confirm AI intake works on the deployed Preview; show seller review and catalogue-owned pricing.
- [ ] Confirm reconciliation distinguishes an exact match from a mismatch/duplicate and requires reviewer approval.
- [ ] Confirm the public repository, README, license, demo URL, and video URL open without sign-in.
- [ ] Record a public YouTube demo under 3:00; watch the exported video end-to-end and verify audio, legibility, privacy, and claims.
- [ ] Complete all required Devpost fields and verify the final submission after saving.

A READY deployment or passing build is not proof that every end-to-end integration has passed. Submit only claims that the deployed demo can demonstrate.
