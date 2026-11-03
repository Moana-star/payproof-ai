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
          <p>The public sample workspace supports a complete synthetic review flow, including CSV import, matching, approval or rejection, and local demo-ledger posting. These actions stay in the browser session. Live reconciliation uses a separate private reviewer token; never share it publicly.</p>
        </div>
      </div>
      <ReconciliationConsole />
    </WorkspaceLayout>
  );
}
