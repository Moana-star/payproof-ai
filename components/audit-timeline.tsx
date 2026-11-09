"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

type AuditEvent = {
  id: string; type: string; title: string; status: string; actor: string;
  reference: string | null; outcome: string; createdAt: string; orderNumber: string | null;
};

export function AuditTimeline() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [requiresSignIn, setRequiresSignIn] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const supabase = getSupabaseBrowserClient();
      const sessionResult = supabase ? await supabase.auth.getSession() : null;
      const accessToken = sessionResult?.data.session?.access_token;
      if (!accessToken) {
        setRequiresSignIn(true);
        setEvents([]);
        return;
      }
      setRequiresSignIn(false);
      const response = await fetch("/api/audit-events", {
        method: "GET",
        headers: { Authorization: "Bearer " + accessToken },
        cache: "no-store"
      });
      const result = await response.json();
      if (response.status === 401 || result.requiresSignIn) {
        setRequiresSignIn(true);
        setEvents([]);
        return;
      }
      if (!response.ok) throw new Error(result.error || "Audit history could not be loaded.");
      setEvents(Array.isArray(result.events) ? result.events : []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Audit history could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <section className="ops-panel ops-timeline-panel">
      <div className="ops-panel-top">
        <div><span className="ops-panel-symbol violet">↗</span><div><strong>Live audit history</strong><p>Recorded events from your authenticated workspace</p></div></div>
        <button type="button" className="ops-secondary-button" onClick={() => void load()} disabled={loading}>{loading ? "Refreshing…" : "Refresh history"}</button>
      </div>
      {requiresSignIn ? (
        <div className="ops-empty-state">
          <strong>Sign in to view your audit history</strong>
          <p>Payment and reconciliation records are private to the account that created them. No shared sample transactions are shown here.</p>
        </div>
      ) : error ? (
        <div className="ops-empty-state">
          <strong>Audit history unavailable</strong><p>{error}</p>
          <button type="button" className="ops-primary-button" onClick={() => void load()}>Try again</button>
        </div>
      ) : loading ? (
        <div className="ops-empty-state"><strong>Loading account events…</strong><p>Checking your private payment and reconciliation records.</p></div>
      ) : events.length === 0 ? (
        <div className="ops-empty-state">
          <strong>No audit events yet</strong>
          <p>Your account has no recorded order or reconciliation events. Start a PayPal Sandbox checkout while signed in. When PayPal returns, the server will record the order, provider reference, capture attempt, verification and persistence outcome here.</p>
          <p>To create reconciliation events, import a genuine statement CSV, run matching, review an eligible match and explicitly post it to your internal ledger.</p>
        </div>
      ) : (
        <div className="ops-timeline">
          {events.map((item) => (
            <article className="ops-timeline-event" key={item.id}>
              <div className={`ops-timeline-marker ${item.status === "success" ? "green" : item.status === "failed" ? "amber" : "blue"}`}>✓</div>
              <div className="ops-timeline-content">
                <div className="ops-timeline-meta">
                  <span>{new Date(item.createdAt).toLocaleString()}</span>
                  <span className="ops-event-tag">{item.type.replace(/[._]/g, " ").toUpperCase()}</span>
                </div>
                <h3>{item.title}</h3>
                <p>{item.outcome}</p>
                <small>
                  {item.orderNumber ? `Order: ${item.orderNumber} · ` : ""}
                  Actor: {item.actor}
                  {item.reference ? ` · Evidence/reference: ${item.reference}` : ""}
                </small>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
