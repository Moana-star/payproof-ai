export const EXPECTED_REFERENCE = "PAYPROOF-DEMO-COFFEE-01";
export const EXPECTED_AMOUNT = "24.50";
export const EXPECTED_CURRENCY = "USD";

export type PayPalOrderEvidence = {
  id?: string;
  status?: string;
  purchase_units?: Array<{
    reference_id?: string;
    custom_id?: string;
    payments?: {
      captures?: Array<{
        id?: string;
        status?: string;
        amount?: { value?: string; currency_code?: string };
      }>;
    };
  }>;
};

export function evaluatePaymentEvidence(order: PayPalOrderEvidence, requestedOrderId: string) {
  const unit = order.purchase_units?.[0];
  const capture = unit?.payments?.captures?.[0];
  const checks = {
    orderIdMatches: order.id === requestedOrderId,
    orderCompleted: order.status === "COMPLETED",
    capturePresent: Boolean(capture?.id),
    captureCompleted: capture?.status === "COMPLETED",
    amountMatches: capture?.amount?.value === EXPECTED_AMOUNT,
    currencyMatches: capture?.amount?.currency_code === EXPECTED_CURRENCY,
    referenceMatches: unit?.reference_id === EXPECTED_REFERENCE && unit?.custom_id === EXPECTED_REFERENCE
  };
  const verified = Object.values(checks).every(Boolean);
  const failedChecks = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([name]) => name);

  return { verified, checks, failedChecks, unit, capture };
}
