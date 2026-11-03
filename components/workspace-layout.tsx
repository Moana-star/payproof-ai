import Link from "next/link";
import { useState } from "react";
import type { ReactNode } from "react";

const navigation = [
  { href: "/", icon: "▦", label: "Overview" },
  { href: "/payments", icon: "▤", label: "Payment evidence" },
  { href: "/reconciliation", icon: "⇄", label: "Reconciliation" },
  { href: "/assistant", icon: "✳", label: "AI assistant" },
  { href: "/exceptions", icon: "!", label: "Exception review" },
  { href: "/audit", icon: "↗", label: "Audit trail" },
  { href: "/customers", icon: "♙", label: "Customers" },
  { href: "/shipping", icon: "▣", label: "Shipping" },
  { href: "/analytics", icon: "▥", label: "Analytics" },
  { href: "/reports", icon: "▤", label: "Reports" },
  { href: "/invoices", icon: "▧", label: "Invoices" }
];

const activeRoute: Record<string, string> = {
  "Payment evidence": "/payments",
  "Reconciliation": "/reconciliation",
  "AI payment assistant": "/assistant",
  "Exception review": "/exceptions",
  "Audit trail": "/audit",
  "Customers": "/customers",
  "Shipping": "/shipping",
  "Analytics": "/analytics",
  "Reports": "/reports",
  "Invoices": "/invoices"
};

export function WorkspaceLayout({ title, eyebrow, description, children }: {
  title: string;
  eyebrow: string;
  description: string;
  children: ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <main className="ops-shell">

      <style jsx global>{`
        .ops-sidebar { display: none !important; }
        .ops-topbar { position: relative; display: flex; align-items: center; gap: 16px; }
        .ops-menu-wrap { position: relative; flex: 0 0 auto; z-index: 80; }
        .ops-menu-trigger { width: 44px; height: 44px; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 5px; border: 1px solid #dfe4ed; border-radius: 12px; background: #fff; cursor: pointer; }
        .ops-menu-trigger span { width: 19px; height: 2px; border-radius: 3px; background: #17233b; }
        .ops-menu-trigger:hover { border-color: #a9b5ca; background: #f8faff; }
        .ops-menu-trigger:focus-visible, .ops-menu-item:focus-visible { outline: 3px solid #8ba8ff; outline-offset: 3px; }
        .ops-menu-panel { position: absolute; top: calc(100% + 10px); left: 0; width: min(320px, calc(100vw - 28px)); max-height: min(76vh, 620px); overflow-y: auto; padding: 12px; border: 1px solid #e3e8f0; border-radius: 16px; background: #fff; box-shadow: 0 18px 50px rgba(20, 35, 65, .18); }
        .ops-menu-heading { display: grid; gap: 3px; padding: 8px 10px 12px; border-bottom: 1px solid #edf0f5; margin-bottom: 7px; }
        .ops-menu-heading strong { color: #17233b; font-size: 14px; }
        .ops-menu-heading span { color: #78849a; font-size: 11px; }
        .ops-menu-panel nav { display: grid; gap: 3px; }
        .ops-menu-item { display: flex; align-items: center; gap: 11px; min-height: 42px; padding: 9px 11px; border-radius: 10px; color: #48556d; text-decoration: none; font-size: 13px; font-weight: 600; }
        .ops-menu-item > span { width: 22px; text-align: center; color: #63769b; font-size: 17px; }
        .ops-menu-item:hover, .ops-menu-item.is-active { color: #263f82; background: #f0f4ff; }
        .ops-menu-item.is-active > span { color: #315bd1; }
        .ops-menu-footer { display: flex; gap: 10px; align-items: flex-start; margin-top: 9px; padding: 12px 10px 5px; border-top: 1px solid #edf0f5; color: #1e8b69; }
        .ops-menu-footer div { display: grid; gap: 3px; }
        .ops-menu-footer strong { color: #26344c; font-size: 12px; }
        .ops-menu-footer small { color: #78849a; font-size: 10px; line-height: 1.45; }
        @media (max-width: 640px) { .ops-topbar { flex-wrap: wrap; } .ops-menu-panel { position: fixed; top: 76px; left: 14px; } }
      `}</style>
      <section className="ops-main">
        <header className="ops-topbar">
          <div className="ops-menu-wrap">
            <button type="button" className="ops-menu-trigger" aria-label={menuOpen ? "Close workspace menu" : "Open workspace menu"} aria-expanded={menuOpen} aria-controls="ops-workspace-menu" onClick={() => setMenuOpen((open) => !open)}>
              <span /><span /><span />
            </button>
            {menuOpen && <div className="ops-menu-panel" id="ops-workspace-menu">
              <div className="ops-menu-heading"><strong>Workspace menu</strong><span>Navigate PayProof AI</span></div>
              <nav aria-label="Workspace navigation">
                {navigation.map((item) => (
                  <Link key={item.href} className={item.href === (activeRoute[title] || "/") ? "ops-menu-item is-active" : "ops-menu-item"} href={item.href} onClick={() => setMenuOpen(false)}>
                    <span aria-hidden="true">{item.icon}</span>{item.label}
                  </Link>
                ))}
              </nav>
              <div className="ops-menu-footer"><span>✓</span><div><strong>Evidence first</strong><small>AI explains the record. Verified payment data decides.</small></div></div>
            </div>}
          </div>
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
