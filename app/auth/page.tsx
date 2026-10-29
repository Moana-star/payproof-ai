"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [name, setName] = useState("");
  const [workspace, setWorkspace] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError(""); setMessage("");
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setError("Sign-in is not configured yet. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in Vercel, then redeploy.");
      setBusy(false); return;
    }
    try {
      if (mode === "signup") {
        if (name.trim().length < 2) throw new Error("Enter your name (at least 2 characters).");
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { display_name: name.trim(), workspace_name: workspace.trim() || "My workspace" },
            emailRedirectTo: `${window.location.origin}/auth`
          }
        });
        if (signUpError) throw signUpError;
        if (data.session) {
          window.location.assign("/");
          return;
        }
        setMessage("Account created. Check your email for the confirmation link, then return here to sign in.");
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (signInError) throw signInError;
        window.location.assign("/");
        return;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Authentication failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return <main className="auth-shell">
    <section className="auth-card">
      <Link className="brand auth-brand" href="/" aria-label="PayProof AI home"><span className="brand-mark">P<span>✓</span></span><span className="brand-name">payproof<span>ai</span></span></Link>
      <p className="eyebrow">YOUR PAYMENT WORKSPACE</p>
      <h1>{mode === "signup" ? "Create your workspace" : "Welcome back"}</h1>
      <p className="auth-intro">{mode === "signup" ? "Create an account to save your own orders and see your name in your workspace." : "Sign in to continue to your personal PayProof AI workspace."}</p>
      <form onSubmit={submit} className="auth-form">
        {mode === "signup" && <>
          <label htmlFor="display-name">Your name</label>
          <input id="display-name" autoComplete="name" value={name} onChange={e => setName(e.target.value)} required minLength={2} maxLength={80} placeholder="e.g. Moana Kenagwa" />
          <label htmlFor="workspace-name">Workspace name <span>(optional)</span></label>
          <input id="workspace-name" value={workspace} onChange={e => setWorkspace(e.target.value)} maxLength={80} placeholder="e.g. Moana's store" />
        </>}
        <label htmlFor="email">Email address</label>
        <input id="email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com" />
        <label htmlFor="password">Password</label>
        <input id="password" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} value={password} onChange={e => setPassword(e.target.value)} required minLength={8} placeholder="At least 8 characters" />
        {error && <p className="auth-error" role="alert">{error}</p>}
        {message && <p className="auth-success" role="status">{message}</p>}
        <button className="primary-button auth-submit" type="submit" disabled={busy}>{busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"} <span>→</span></button>
      </form>
      <p className="auth-switch">{mode === "signup" ? "Already have an account?" : "New to PayProof AI?"} <button type="button" onClick={() => { setMode(mode === "signup" ? "signin" : "signup"); setError(""); setMessage(""); }}>{mode === "signup" ? "Sign in" : "Create an account"}</button></p>
      <p className="auth-footnote">Sandbox mode only. PayProof AI never treats a screenshot as proof of payment.</p>
      <Link className="auth-back-link" href="/">← Explore the public demo</Link>
    </section>
  </main>;
}
