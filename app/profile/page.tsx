"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function ProfilePage() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [workspace, setWorkspace] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) { setError("Supabase Auth is not configured. Add the public Supabase URL and publishable key in Vercel."); setLoading(false); return; }
    let active = true;
    supabase.auth.getUser().then(async ({ data, error: authError }) => {
      if (!active) return;
      if (authError || !data.user) { router.replace("/auth"); return; }
      const user = data.user;
      setUserId(user.id);
      setEmail(user.email || "");
      setName(typeof user.user_metadata.display_name === "string" ? user.user_metadata.display_name : "");
      setWorkspace(typeof user.user_metadata.workspace_name === "string" ? user.user_metadata.workspace_name : "My workspace");
      const { data: profile } = await supabase.from("profiles").select("display_name,workspace_name").eq("id", user.id).maybeSingle();
      if (!active) return;
      if (profile) {
        setName(profile.display_name || (typeof user.user_metadata.display_name === "string" ? user.user_metadata.display_name : ""));
        setWorkspace(profile.workspace_name || "My workspace");
      }
      setLoading(false);
    });
    return () => { active = false; };
  }, [router]);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true); setError(""); setMessage("");
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !userId) { setError("Please sign in again before saving your profile."); setSaving(false); return; }
    try {
      const cleanName = name.trim();
      const cleanWorkspace = workspace.trim() || "My workspace";
      if (cleanName.length < 2) throw new Error("Your name must be at least 2 characters.");
      const { error: updateError } = await supabase.auth.updateUser({ data: { display_name: cleanName, workspace_name: cleanWorkspace } });
      if (updateError) throw updateError;
      const { error: profileError } = await supabase.from("profiles").upsert({ id: userId, display_name: cleanName, workspace_name: cleanWorkspace, updated_at: new Date().toISOString() });
      if (profileError) throw profileError;
      setMessage("Profile saved. Your dashboard will use this name and workspace.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Your profile could not be saved.");
    } finally { setSaving(false); }
  }

  async function signOut() {
    await getSupabaseBrowserClient()?.auth.signOut();
    router.replace("/");
  }

  return <main className="auth-shell">
    <section className="auth-card profile-card">
      <Link className="brand auth-brand" href="/"><span className="brand-mark">P<span>✓</span></span><span className="brand-name">payproof<span>ai</span></span></Link>
      <p className="eyebrow">ACCOUNT SETTINGS</p>
      <h1>Your profile</h1>
      <p className="auth-intro">Update how your name and workspace appear in PayProof AI. Your account&apos;s orders stay separate from other users.</p>
      {loading ? <p>Loading your profile…</p> : <form className="auth-form" onSubmit={saveProfile}>
        <label htmlFor="profile-email">Account email</label>
        <input id="profile-email" type="email" value={email} disabled />
        <label htmlFor="profile-name">Your name</label>
        <input id="profile-name" value={name} onChange={e => setName(e.target.value)} required minLength={2} maxLength={80} />
        <label htmlFor="profile-workspace">Workspace name</label>
        <input id="profile-workspace" value={workspace} onChange={e => setWorkspace(e.target.value)} maxLength={80} required />
        {error && <p className="auth-error" role="alert">{error}</p>}
        {message && <p className="auth-success" role="status">{message}</p>}
        <button className="primary-button auth-submit" type="submit" disabled={saving}>{saving ? "Saving…" : "Save profile"} <span>→</span></button>
      </form>}
      <div className="profile-secondary-actions"><Link href="/">← Back to workspace</Link><button type="button" onClick={signOut}>Sign out</button></div>
    </section>
  </main>;
}
