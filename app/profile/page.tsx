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
  const [avatarUrl, setAvatarUrl] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
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
      setAvatarUrl(typeof user.user_metadata.avatar_url === "string" ? user.user_metadata.avatar_url : "");
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

  useEffect(() => {
    if (!photo) { setPhotoPreview(""); return; }
    const preview = URL.createObjectURL(photo);
    setPhotoPreview(preview);
    return () => URL.revokeObjectURL(preview);
  }, [photo]);

  function selectPhoto(file?: File) {
    setError(""); setMessage("");
    if (!file) { setPhoto(null); return; }
    if (!file.type.startsWith("image/")) { setError("Choose an image file."); return; }
    if (file.size > 5 * 1024 * 1024) { setError("Choose an image smaller than 5 MB."); return; }
    setPhoto(file);
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true); setError(""); setMessage("");
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !userId) { setError("Please sign in again before saving your profile."); setSaving(false); return; }
    try {
      const cleanName = name.trim();
      const cleanWorkspace = workspace.trim() || "My workspace";
      if (cleanName.length < 2) throw new Error("Your name must be at least 2 characters.");
      let nextAvatarUrl = avatarUrl;
      if (photo) {
        const extension = photo.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = userId + "/profile-" + Date.now() + "." + extension;
        const { error: uploadError } = await supabase.storage.from("avatars").upload(path, photo, { upsert: true, contentType: photo.type });
        if (uploadError) throw new Error("Photo upload failed. Ensure the public avatars storage bucket is configured: " + uploadError.message);
        const { data: publicData } = supabase.storage.from("avatars").getPublicUrl(path);
        nextAvatarUrl = publicData.publicUrl;
      }
      const { error: updateError } = await supabase.auth.updateUser({ data: { display_name: cleanName, workspace_name: cleanWorkspace, avatar_url: nextAvatarUrl } });
      if (updateError) throw updateError;
      setAvatarUrl(nextAvatarUrl);
      setPhoto(null);
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
        <div className="profile-photo-control">
          <div className="profile-photo-preview">{photoPreview || avatarUrl ? <img src={photoPreview || avatarUrl} alt="Profile photo preview" /> : <span>{name.trim().charAt(0).toUpperCase() || "?"}</span>}</div>
          <div><label htmlFor="profile-photo">Profile photo</label><input id="profile-photo" type="file" accept="image/*" onChange={event => selectPhoto(event.target.files?.[0])} /><small>Choose an image up to 5 MB.</small></div>
        </div>
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
