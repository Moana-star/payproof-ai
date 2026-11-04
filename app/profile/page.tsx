"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { AccountAvatar } from "@/components/account-avatar";

async function prepareProfileImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  try {
    const side = Math.min(bitmap.width, bitmap.height);
    const sourceX = (bitmap.width - side) / 2;
    const sourceY = (bitmap.height - side) / 2;
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Your browser could not prepare this image. Try another photo.");
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(bitmap, sourceX, sourceY, side, side, 0, 0, 512, 512);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.86));
    if (!blob) throw new Error("Your photo could not be resized. Please try a JPG or PNG image.");
    return blob;
  } finally {
    bitmap.close();
  }
}

export default function ProfilePage() {
  const router = useRouter();
  const photoInput = useRef<HTMLInputElement>(null);
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
    setMessage("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setAvatarError("Please choose a JPG, PNG or WebP image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError("This photo is larger than 5 MB. Choose a smaller image.");
      return;
    }
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !userId) {
      setAvatarError("Please sign in again before uploading a photo.");
      return;
    }

    setUploadingAvatar(true);
    try {
      const compressed = await prepareProfileImage(file);
      if (compressed.size > 2.8 * 1024 * 1024) {
        throw new Error("The resized photo is still too large. Please choose another image.");
      }
      const extension = compressed.type === "image/webp" ? "webp" : compressed.type === "image/jpeg" ? "jpg" : "png";
      const path = `${userId}/profile-${Date.now()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, compressed, { upsert: false, cacheControl: "31536000", contentType: compressed.type });
      if (uploadError) {
        if (uploadError.message.toLowerCase().includes("row-level security")) {
          throw new Error("Photo upload is blocked by the avatar storage permission. Please contact the workspace administrator.");
        }
        throw uploadError;
      }

      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = data.publicUrl;
      const { error: updateError } = await supabase.auth.updateUser({ data: { avatar_url: url } });
      if (updateError) {
        await supabase.storage.from("avatars").remove([path]);
        throw updateError;
      }

      setAvatarUrl(url);
      setMessage("Your profile photo has been saved and will appear in the workspace account menu.");
    } catch (e) {
      setAvatarError(e instanceof Error ? e.message : "The photo could not be uploaded. Please try again.");
    } finally {
      setUploadingAvatar(false);
    }
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
          Update how your name, photo and workspace appear in PayProof AI. Your account&apos;s orders stay separate from other users.
        </p>

        {loading ? (
          <p>Loading your profile…</p>
        ) : (
          <form className="auth-form" onSubmit={saveProfile}>
            <div className="profile-photo-control">
              <AccountAvatar name={name} imageUrl={avatarUrl} size={96} />
              <div className="profile-photo-copy">
                <strong>Profile photo</strong>
                <p id="profile-photo-help">Choose a JPG, PNG or WebP image up to 5 MB. We automatically crop it to a clear 512 × 512 square.</p>
                <button
                  className="secondary-button profile-upload-label"
                  type="button"
                  onClick={() => photoInput.current?.click()}
                  disabled={uploadingAvatar}
                >
                  {uploadingAvatar ? "Uploading photo…" : avatarUrl ? "Change photo" : "＋ Upload profile photo"}
                </button>
                <input
                  ref={photoInput}
                  id="profile-photo"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  aria-label="Choose a profile photo"
                  aria-describedby="profile-photo-help"
                  disabled={uploadingAvatar}
                  onChange={event => {
                    void uploadAvatar(event.currentTarget.files?.[0]);
                    event.currentTarget.value = "";
                  }}
                />
              </div>
            </div>
            {avatarError && <p className="auth-error" role="alert">{avatarError}</p>}
            {email && <>
              <label htmlFor="profile-email">Account email</label>
              <input id="profile-email" type="email" value={email} disabled />
            </>}

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
