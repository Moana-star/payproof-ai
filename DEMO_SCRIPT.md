# PayProof AI — 2:55 Demo Script

**Target runtime:** 2 minutes 40 seconds to 2 minutes 55 seconds  
**Live application:** https://payproof-ai-beta.vercel.app/

Record the actual deployed application in a clean browser window. Use only a dedicated PayPal Sandbox buyer account. Never show passwords, API keys, client secrets, tokens, personal data, or private dashboard settings.

## 0:00–0:18 — The problem

"Small sellers receive orders in messages, while payment updates live somewhere else. Manually connecting the requested items, expected total, and payment evidence creates delays and can lead to fulfilment before payment is confirmed. PayProof AI brings those checks into one reviewable workflow."

**Show:** public workspace overview. Briefly point out that the dashboard rows are labelled sample data.

## 0:18–0:48 — AI-assisted order intake

"Here, a seller can paste a customer message. AI extracts a proposed order draft, but it does not decide the price or mark anything paid. The seller reviews the details, and application code calculates the trusted total."

**Show:** enter "Please order two coffee gift sets"; prepare the draft; show product and quantity; validate the supported catalogue item.

## 0:48–1:35 — PayPal Sandbox checkout and verification

"From a reviewed order, PayProof AI creates a PayPal Sandbox checkout. After buyer approval, our server retrieves the PayPal order and checks the completed capture, expected catalogue amount, currency, and order reference. The redirect itself is not proof; server-side verification is."

**Show:** the actual PayPal Sandbox approval and return flow. Show the verified result and transaction identifiers only if this exact run completed successfully. Show whether the order was saved separately from whether PayPal verified the capture.

## 1:35–2:08 — AI explains evidence, not authority

"Payment operations also need to explain exceptions. This is a clearly labelled synthetic amount-mismatch scenario: $42 expected and $40 captured. The assistant explains the discrepancy and recommends review. It cannot change payment status, invent evidence, or trigger fulfilment."

**Show:** AI assistant, synthetic mismatch label, expected/captured amounts, and advisory-only result.

## 2:08–2:35 — Human review and reconciliation

"PayProof AI makes uncertainty visible. A possible match is not an approved match, and incomplete evidence stays under review. Sample reconciliation rows are illustrative, not a live bank feed."

**Show:** reconciliation or exception review; point out sample labels and the human-review boundary.

## 2:35–2:55 — Close

"Our principle is simple: evidence first. AI helps people understand the record, while verified payment data decides. PayProof AI is a PayPal Sandbox prototype built to make payment operations clearer and safer for small sellers."

**Show:** product name and live URL.

## Recording checklist

- [ ] Final video is publicly viewable on YouTube and under 3 minutes.
- [ ] Show the actual deployed product, not slides alone.
- [ ] Use a dedicated Sandbox buyer account; never show credentials.
- [ ] Show a genuinely completed Sandbox transaction if describing a successful payment.
- [ ] Show the verification result and persistence result as separate facts.
- [ ] Keep synthetic/illustrative labels visible on sample scenarios.
- [ ] Demonstrate the AI mismatch explanation and its advisory-only boundary.
- [ ] Do not claim that sample reconciliation is a live bank feed or that the public workspace is a private authenticated merchant account.
- [ ] Add the public YouTube URL to the Devpost submission.
