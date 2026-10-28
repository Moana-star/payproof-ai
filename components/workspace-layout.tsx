import Link from "next/link";
import type { ReactNode } from "react";

const navigation = [
  { href: "/", icon: "▦", label: "Overview" },
  { href: "/payments", icon: "▤", label: "Payment evidence" },
  { href: "/assistant", icon: "✳", label: "AI assistant" },
  { href: "/exceptions", icon: "!", label: "Exception review" },
  { href: "/audit", icon: "↗", label: "Audit trail" }
];

export function WorkspaceLayout({ title, eyebrow, description, children }: {
  title: string;
  eyebrow: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main className="ops-shell">
      <aside className="ops-sidebar">
        <Link className="ops-brand" href="/" aria-label="PayProof AI overview">
          <span className="ops-brand-mark">P<span>✓</span></span>
          <span className="ops-brand-name">payproof<span>ai</span></span>
        </Link>
        <p className="ops-nav-label">WORKSPACE</p>
        <nav className="ops-nav" aria-label="Workspace navigation">
          {navigation.map((item) => (
            <Link key={item.href} className={item.href === (title === "Payment evidence" ? "/payments" : title === "AI payment assistant" ? "/assistant" : title === "Exception review" ? "/exceptions" : title === "Audit trail" ? "/audit" : "/") ? "ops-nav-item is-active" : "ops-nav-item"} href={item.href}>
              <span className="ops-nav-icon" aria-hidden="true">{item.icon}</span>{item.label}
            </Link>
          ))}
        </nav>
        <div className="ops-sidebar-bottom">
          <div className="ops-trust-card">
            <span className="ops-trust-icon">✓</span>
            <strong>Evidence first</strong>
            <p>AI explains the record. Verified payment data decides.</p>
          </div>
          <div className="ops-mode"><span className="ops-mode-dot" /> Sandbox preview</div>
        </div>
      </aside>
      <section className="ops-main">
        <header className="ops-topbar">
          <div className="ops-breadcrumb"><Link href="/">Workspace</Link><span>/</span>{title}</div>
          <div className="ops-top-actions"><span className="ops-sandbox-pill"><i /> Sandbox mode</span><Link className="ops-checkout-link" href="/">Test PayPal checkout <span>↗</span></Link></div>
        </header>
        <div className="ops-content">
          <div className="ops-page-heading">
            <div><p className="ops-eyebrow">{eyebrow}</p><h1>{title}</h1><p>{description}</p></div>
            <div className="ops-heading-mark" aria-hidden="true"><span>✓</span><i /><b /></div>
          </div>
          {children}
          <footer className="ops-footer"><span>PayProof AI <b>·</b> Know what was paid. Understand what needs attention.</span><span><i /> Sandbox prototype · No real payments</span></footer>
        </div>
      </section>
    </main>
  );
}
