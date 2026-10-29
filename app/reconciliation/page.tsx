import { ReconciliationConsole } from "@/components/reconciliation-console";
import { WorkspaceLayout } from "@/components/workspace-layout";

export default function ReconciliationPage() {
  return (
    <WorkspaceLayout
      title="Reconciliation"
      eyebrow="PAYMENT MATCHING & REVIEW"
      description="Import a sample or bank statement CSV, compare references against verified PayPal Sandbox captures, review exceptions, and audit human decisions."
    >
      <div className="ops-info-banner">
        <span className="ops-info-icon">i</span>
        <div>
          <strong>Sandbox and reviewer access</strong>
          <p>Use the sample review for read-only synthetic cases. Live imports and review actions require the private reviewer token configured by the project owner. Never share that token publicly.</p>
        </div>
      </div>
      <ReconciliationConsole />
    </WorkspaceLayout>
  );
}
