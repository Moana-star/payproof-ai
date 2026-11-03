"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function ForgotPasswordPage() {
  const [email,setEmail]=useState("");
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const [error,setError]=useState("");
  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    const supabase=getSupabaseBrowserClient();
    if(!supabase){setError("Password recovery is not configured. Check the Supabase environment variables.");setBusy(false);return;}
    const {error:resetError}=await supabase.auth.resetPasswordForEmail(email.trim(),{redirectTo:`${window.location.origin}/auth/reset-password`});
    if(resetError)setError(resetError.message);
    else setMessage("If an account exists for this email, a password-reset link has been sent. Check your inbox.");
    setBusy(false);
  }
  return <main className="auth-shell"><section className="auth-card">
    <Link className="brand auth-brand" href="/"><span className="brand-mark">P<span>✓</span></span><span className="brand-name">payproof<span>ai</span></span></Link>
    <p className="eyebrow">ACCOUNT RECOVERY</p><h1>Forgot password?</h1>
    <p className="auth-intro">Enter the email address linked to your account and we’ll send you a secure reset link.</p>
    <form className="auth-form" onSubmit={submit}>
      <label htmlFor="recovery-email">Email address</label><input id="recovery-email" type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="you@example.com"/>
      {error&&<p className="auth-error" role="alert">{error}</p>}{message&&<p className="auth-success" role="status">{message}</p>}
      <button className="primary-button auth-submit" type="submit" disabled={busy}>{busy?"Sending…":"Send reset link"} <span>→</span></button>
    </form><Link className="auth-back-link" href="/auth">← Back to sign in</Link>
  </section></main>;
}
