"use client";

import { FormEvent,useEffect,useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function ResetPasswordPage() {
  const router=useRouter();
  const [password,setPassword]=useState("");
  const [confirm,setConfirm]=useState("");
  const [busy,setBusy]=useState(false);
  const [ready,setReady]=useState(false);
  const [error,setError]=useState("");
  const [message,setMessage]=useState("");
  useEffect(()=>{const supabase=getSupabaseBrowserClient();if(!supabase){setError("Supabase Auth is not configured.");return;}supabase.auth.getSession().then(({data})=>{if(data.session)setReady(true);else setError("This reset link is invalid or has expired. Request a new one.");});},[]);
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setError("");setMessage("");
    if(password.length<8){setError("Use at least 8 characters for your new password.");return;}
    if(password!==confirm){setError("The passwords do not match.");return;}
    const supabase=getSupabaseBrowserClient();if(!supabase){setError("Supabase Auth is not configured.");return;}
    setBusy(true);const {error:updateError}=await supabase.auth.updateUser({password});setBusy(false);
    if(updateError)setError(updateError.message);else{setMessage("Your password has been updated. Redirecting to sign in…");setTimeout(()=>router.replace("/auth"),1200);}
  }
  return <main className="auth-shell"><section className="auth-card">
    <Link className="brand auth-brand" href="/"><span className="brand-mark">P<span>✓</span></span><span className="brand-name">payproof<span>ai</span></span></Link>
    <p className="eyebrow">ACCOUNT RECOVERY</p><h1>Set a new password</h1>
    <p className="auth-intro">Choose a new password for your PayProof AI account.</p>
    {ready?<form className="auth-form" onSubmit={submit}>
      <label htmlFor="new-password">New password</label><input id="new-password" type="password" autoComplete="new-password" minLength={8} value={password} onChange={e=>setPassword(e.target.value)} required/>
      <label htmlFor="confirm-password">Confirm new password</label><input id="confirm-password" type="password" autoComplete="new-password" minLength={8} value={confirm} onChange={e=>setConfirm(e.target.value)} required/>
      {error&&<p className="auth-error" role="alert">{error}</p>}{message&&<p className="auth-success" role="status">{message}</p>}
      <button className="primary-button auth-submit" type="submit" disabled={busy}>{busy?"Updating…":"Update password"} <span>→</span></button>
    </form>:<>{error&&<p className="auth-error" role="alert">{error}</p>}<Link className="auth-back-link" href="/auth/forgot-password">Request another reset link</Link></>}
  </section></main>;
}
