import { ReconciliationConsole } from "@/components/reconciliation-console";
import { WorkspaceLayout } from "@/components/workspace-layout";

export default function ReconciliationPage() {
  return (
    <WorkspaceLayout
      title="Reconciliation"
      eyebrow="PAYMENT MATCHING & REVIEW"
      description="Import a genuine bank or PayPal transaction export, match it against server-verified PayPal captures, review every decision, and post approved entries to your internal ledger."
    >
      <div className="ops-info-banner">
        <span className="ops-info-icon">i</span>
        <div>
          <strong>Sandbox evidence · Real statement required</strong>
          <p>The public sample workspace is synthetic and is only for demonstrating the review controls. Your private workspace uses your signed-in account and does not need a reviewer token. To perform a genuine reconciliation, export the corresponding transaction from PayPal or your bank and import that original CSV here. PayProof AI will not invent a bank transaction or treat a PayPal capture as proof that a bank statement has settled.</p>
        </div>
      </div>
      <ReconciliationConsole />
    </WorkspaceLayout>
  );
}
