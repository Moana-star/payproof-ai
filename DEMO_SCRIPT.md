# PayProof AI — 3-Minute Demo Script

**Target runtime:** 2 minutes 40 seconds to 2 minutes 55 seconds  
**Live application:** https://payproof-ai-beta.vercel.app/

Record a clean browser session. Use only a dedicated app demo account and PayPal Sandbox buyer. Never show passwords, API keys, client secrets, tokens, personal customer data, or private dashboard settings.

## 0:00–0:20 — The problem

"Small sellers often receive orders in messages, while payment updates live somewhere else. Connecting the order, expected amount, and payment evidence manually creates delays and the risk of fulfilling before payment is confirmed. PayProof AI brings those steps into one reviewable workspace."

**Show:** landing/workspace overview.

## 0:20–0:50 — AI-assisted order intake

"Here, a seller can paste a customer message. AI extracts a proposed order draft, but it does not decide the price or mark anything paid. The seller reviews the details, and application code calculates the trusted total."

**Show:** enter a short message such as "Please order two coffee gift sets"; prepare the draft; point out the product and quantity.

## 0:50–1:35 — PayPal Sandbox and verification

"From the reviewed order, the application creates a PayPal Sandbox checkout. After buyer approval, our server checks the provider result and compares the payment against the expected order details. The redirect itself is not proof; server-side verification is."

**Show:** the completed Sandbox checkout and return result. Show the verified status and identifiers only if the test has genuinely completed. Do not imply that a sample record is a real transaction.

## 1:35–2:10 — AI explains evidence, not authority

"Payment operations also need to explain exceptions. Here is a clearly labelled sample amount-mismatch scenario. The assistant explains the difference and recommends review. It cannot change payment status, invent evidence, or trigger fulfilment."

**Show:** sample mismatch and AI explanation. Make the synthetic/demo label visible.

## 2:10–2:35 — Reconciliation and human control

"PayProof AI helps reviewers inspect references, amounts, and currencies. A possible match is not the same as an approved match. Human review remains part of the process."

**Show:** reconciliation or exception review, highlighting the review state and approval boundary.

## 2:35–2:55 — Close

"Our principle is simple: evidence first. AI helps people understand the record, while verified payment data decides. PayProof AI is a PayPal Sandbox hackathon prototype built to make payment operations clearer and safer for small sellers."

**Show:** final overview or product name and live URL.

## Recording checklist

- [ ] Keep the final video under three minutes.
- [ ] Use a stable browser window and readable zoom.
- [ ] Use a dedicated demo account and Sandbox buyer.
- [ ] Show a genuinely completed Sandbox transaction if claiming the happy path.
- [ ] Keep sample scenarios visibly labelled as synthetic.
- [ ] Do not show credentials, tokens, secrets, or personal data.
- [ ] Explain the role of PayPal and the role of AI clearly.
- [ ] Upload to YouTube with visibility set to Public, then add the video URL to the hackathon submission.
