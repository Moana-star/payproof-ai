"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { AccountAvatar } from "@/components/account-avatar";

export default function ProfilePage() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [workspace, setWorkspace] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setError("Supabase Auth is not configured. Add the public Supabase URL and publishable key in Vercel.");
      setLoading(false);
      return;
    }

    let active = true;
    supabase.auth.getUser().then(async ({ data, error: authError }) => {
      if (!active) return;
      if (authError || !data.user) {
        router.replace("/auth");
        return;
      }

      const user = data.user;
      setUserId(user.id);
      setEmail(user.email || "");
      setName(typeof user.user_metadata.display_name === "string" ? user.user_metadata.display_name : typeof user.user_metadata.full_name === "string" ? user.user_metadata.full_name : typeof user.user_metadata.name === "string" ? user.user_metadata.name : "");
      setWorkspace(typeof user.user_metadata.workspace_name === "string" ? user.user_metadata.workspace_name : "My workspace");
      setAvatarUrl(typeof user.user_metadata.avatar_url === "string" ? user.user_metadata.avatar_url : typeof user.user_metadata.picture === "string" ? user.user_metadata.picture : "");

      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name,workspace_name")
        .eq("id", user.id)
        .maybeSingle();

      if (!active) return;
      if (profile) {
        setName(profile.display_name || (typeof user.user_metadata.display_name === "string" ? user.user_metadata.display_name : typeof user.user_metadata.full_name === "string" ? user.user_metadata.full_name : typeof user.user_metadata.name === "string" ? user.user_metadata.name : ""));
        setWorkspace(profile.workspace_name || "My workspace");
      }
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [router]);

  async function uploadAvatar(file: File | undefined) {
    if (!file) return;
    setAvatarError("");
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) { setAvatarError("Choose a JPG, PNG, WebP or GIF image."); return; }
    if (file.size > 3 * 1024 * 1024) { setAvatarError("Choose an image smaller than 3 MB."); return; }
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !userId) { setAvatarError("Please sign in again before uploading a photo."); return; }
    setUploadingAvatar(true);
    try {
      const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const path = `${userId}/profile-${Date.now()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: false, cacheControl: "3600", contentType: file.type });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = data.publicUrl;
      const { error: updateError } = await supabase.auth.updateUser({ data: { avatar_url: url } });
      if (updateError) throw updateError;
      setAvatarUrl(url);
      setMessage("Profile photo updated. It will appear beside your account throughout the workspace.");
    } catch (e) {
      setAvatarError(e instanceof Error ? e.message : "The photo could not be uploaded. Check the avatars storage setup.");
    } finally { setUploadingAvatar(false); }
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    const supabase = getSupabaseBrowserClient();
    if (!supabase || !userId) {
      setError("Please sign in again before saving your profile.");
      setSaving(false);
      return;
    }

    try {
      const cleanName = name.trim();
      const cleanWorkspace = workspace.trim() || "My workspace";
      if (cleanName.length < 2) throw new Error("Your name must be at least 2 characters.");

      const { error: updateError } = await supabase.auth.updateUser({
        data: { display_name: cleanName, workspace_name: cleanWorkspace }
      });
      if (updateError) throw updateError;

      const { error: profileError } = await supabase.from("profiles").upsert({
        id: userId,
        display_name: cleanName,
        workspace_name: cleanWorkspace,
        updated_at: new Date().toISOString()
      });
      if (profileError) throw profileError;

      setMessage("Profile saved. Your dashboard will use this name and workspace.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Your profile could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  async function signOut() {
    await getSupabaseBrowserClient()?.auth.signOut();
    router.replace("/");
  }

  return (
    <main className="auth-shell">
      <section className="auth-card profile-card">
        <Link className="brand auth-brand" href="/">
          <span className="brand-mark">P<span>✓</span></span>
          <span className="brand-name">payproof<span>ai</span></span>
        </Link>
        <p className="eyebrow">ACCOUNT SETTINGS</p>
        <h1>{name.trim().split(/\s+/)[0] ? `${name.trim().split(/\s+/)[0]}’s profile` : "Your profile"}</h1>
        <p className="auth-intro">
          Update how your name and workspace appear in PayProof AI. Your account&apos;s orders stay separate from other users.
        </p>

        {loading ? (
          <p>Loading your profile…</p>
        ) : (
          <form className="auth-form" onSubmit={saveProfile}>
            <div className="profile-photo-control"><AccountAvatar name={name} imageUrl={avatarUrl} size={76} /><div><strong>Profile photo</strong><p>Upload a JPG, PNG, WebP or GIF image up to 3 MB.</p><label className="secondary-button profile-upload-label" htmlFor="profile-photo">{uploadingAvatar ? "Uploading…" : "Choose photo"}</label><input id="profile-photo" type="file" accept="image/*" disabled={uploadingAvatar} onChange={event => { void uploadAvatar(event.target.files?.[0]); event.currentTarget.value = ""; }} /></div></div>
            {avatarError && <p className="auth-error" role="alert">{avatarError}</p>}
            <label htmlFor="profile-email">Account email</label>
            <input id="profile-email" type="email" value={email} disabled />

            <label htmlFor="profile-name">Your name</label>
            <input
              id="profile-name"
              value={name}
              onChange={event => setName(event.target.value)}
              required
              minLength={2}
              maxLength={80}
            />

            <label htmlFor="profile-workspace">Workspace name</label>
            <input
              id="profile-workspace"
              value={workspace}
              onChange={event => setWorkspace(event.target.value)}
              maxLength={80}
              required
            />

            {error && <p className="auth-error" role="alert">{error}</p>}
            {message && <p className="auth-success" role="status">{message}</p>}

            <button className="primary-button auth-submit" type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save profile"} <span>→</span>
            </button>
          </form>
        )}

        <div className="profile-secondary-actions">
          <Link href="/">← Back to workspace</Link>
          <button type="button" onClick={signOut}>Sign out</button>
        </div>
      </section>
    </main>
  );
}
