# PayProof AI — demo script and release checklist

## Three-minute demo outline

### 0:00–0:25 — State the problem
Small sellers receive order details in messages and payment updates separately. PayProof AI aims to reduce manual work without confusing an AI suggestion with evidence of payment.

### 0:25–1:00 — Show order intake
Paste a sample message such as:

> Hi, could I get 2 coffee gift sets? Please let me know how to pay.

Prepare a draft. Point out any missing details and explain that the seller must review and confirm the draft. Do not describe the current deterministic preview as a live AI model.

### 1:00–2:10 — Show the PayPal Sandbox flow
Click **Test PayPal checkout**. Explain that the server creates a fixed-price Sandbox order; the browser does not choose the amount. Approve the transaction using a Sandbox buyer account, then return to the app.

Only call the payment verified if the app's server-side verification response confirms the expected order, completed capture, amount, and currency. If the transaction fails, show the review state rather than hiding the error.

### 2:10–2:40 — Explain the trust boundary
A customer screenshot or a successful return to the website is not proof of payment. PayPal's server response is the source used for payment verification. AI may help organise a message, but it must not decide that an order is paid.

### 2:40–3:00 — Close with impact
The goal is a clearer workflow for small sellers: less message-to-order retyping, more visible exceptions, and a safer boundary between customer claims and verified payment evidence.

## Before recording or submitting

- [ ] `npm run lint` passes.
- [ ] `npm run build` passes.
- [ ] A complete PayPal Sandbox checkout and capture has been tested successfully.
- [ ] A declined, cancelled, or incomplete checkout does not show as paid.
- [ ] Wrong amount, currency, or order reference is not marked verified.
- [ ] The app clearly labels sample records and Sandbox mode.
- [ ] Any AI feature shown in the video is connected to a real model; otherwise call it a preview.
- [ ] No credentials, buyer passwords, or private account details appear in the recording.
- [ ] README setup steps work from a clean checkout.
- [ ] The demo uses synthetic data and does not imply live-money processing.

## Current limitations to disclose

The first integration uses a fixed-price Sandbox demo order and a narrow verification check. It is not a general-purpose multi-product checkout or a production payment system. Persistent order storage, a verified webhook workflow, comprehensive retry/idempotency handling, automated tests, and a connected AI provider still need implementation and testing.
