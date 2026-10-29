# PayPal AI Hackathon — Submission Draft

## Project name

**PayProof AI**

## Tagline

**Know what was paid. Understand what needs attention.**

## Short description

PayProof AI helps small online sellers turn customer messages into reviewable order drafts, verify PayPal Sandbox payments server-side, and reconcile statement records through human-approved evidence matching. Its core principle is that AI can assist with language and explanations, but payment status must come from verified transaction data.

## Problem

Small sellers often coordinate orders through chat while checking payments separately. This fragmented workflow makes it easy to re-enter order details, miss discrepancies, or act on a customer claim before a payment has actually been verified.

## Solution

PayProof AI combines structured AI-assisted order intake, deterministic catalogue pricing, PayPal Sandbox checkout and server-side verification, Supabase persistence, evidence explanations, CSV reconciliation, reviewer approval, an internal demo ledger, and an audit trail. The AI proposes details and explains supplied evidence; application code controls prices and payment-state transitions. Reconciliation matches exact reference, amount, and currency against eligible verified Sandbox captures, and it never auto-posts.

## What makes it different

- **Evidence before confidence:** a customer message or AI response is never treated as proof of payment.
- **Human-in-the-loop controls:** sellers review AI-extracted details and reviewers approve reconciliation before internal ledger posting.
- **Traceable decisions:** the prototype records reconciliation imports, evaluations, approvals, and posting events.
- **Safe failure behavior:** ambiguous or conflicting information should remain in review instead of being silently treated as paid.

## Technology

Next.js, React, TypeScript, PayPal Sandbox REST APIs, Supabase, and Groq-backed structured extraction/explanation.

## Demo and source

- **Hosted demo:** https://payproof-ai-git-feat-persistent-order-storage-naom6083-2980.vercel.app/
- **Source code:** https://github.com/Moana-star/payproof-ai
- **Demo script:** [DEMO_SCRIPT.md](DEMO_SCRIPT.md)

## Important scope note

This is a hackathon prototype, not a production payment or accounting system. The payment flow uses PayPal Sandbox. The reconciliation example uses simulated statement data and an internal demo ledger; there is no live bank feed or external accounting write. AI explanations currently use explicitly labelled synthetic evidence scenarios. Do not remove this disclosure from the public submission.

## Final submission gate

Before submitting, verify that the exact public demo build has working AI order intake and AI explanation; complete a fresh Sandbox verification and independently confirm the saved database records; test a safe failure path; confirm the public source and license; upload a public demo video under three minutes; and test every link in the submission form.
