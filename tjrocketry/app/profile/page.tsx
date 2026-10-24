"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Upload, Loader2 } from "lucide-react";
import { isStaffUser, useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api-client";
import { prepareImage } from "@/lib/image-prep";
import PageShell from "@/app/components/PageShell";

export default function ProfilePage() {
  const { user, authenticated, loading } = useAuth();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [bio, setBio] = useState<string | null>(null);
  const [title, setTitle] = useState<string | null>(null);
  const [pfpUrl, setPfpUrl] = useState<string | null | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    if (!loading && (!authenticated || !user)) router.push("/");
  }, [loading, authenticated, user, router]);

  if (loading || !user) return <PageShell title="Profile" loading />;

  const officer = user.roles.includes("officer");
  const showBio = bio ?? user.bio ?? "";
  const showTitle = title ?? user.position ?? "";
  const photo = pfpUrl === undefined ? user.pfpUrl : pfpUrl;
  const initials = (user.name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  const signOut = async () => {
    await fetch("/api/auth/logout");
    window.location.href = "/";
  };

  const saveBio = async () => {
    setSaving(true);
    setStatus(null);
    try {
      await api("/api/profile", { method: "PUT", json: { bio: showBio, position: showTitle } });
      setStatus({ ok: true, message: "Saved" });
    } catch (err) {
      setStatus({ ok: false, message: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setStatus(null);
    try {
      const fd = new FormData();
      fd.append("file", await prepareImage(file));
      const data = await api<{ pfpUrl: string }>("/api/profile/upload", { method: "POST", body: fd });
      setPfpUrl(data.pfpUrl);
    } catch (err) {
      setStatus({ ok: false, message: (err as Error).message });
    } finally {
      setUploading(false);
    }
  };

  return (
    <PageShell
      title="Profile"
      actions={
        <button onClick={signOut} className="btn btn-danger">
          <LogOut className="w-4 h-4" /> Sign out
        </button>
      }
    >
      <dl className="grid sm:grid-cols-3 gap-6 max-w-3xl">
        <div>
          <dt className="label">Name</dt>
          <dd className="text-lg">{user.name || "—"}</dd>
        </div>
        <div>
          <dt className="label">Username</dt>
          <dd className="text-lg font-mono">{user.username || "—"}</dd>
        </div>
        <div>
          <dt className="label">Class</dt>
          <dd className="text-lg">{user.classYear || "—"}</dd>
        </div>
        <div className="sm:col-span-3">
          <dt className="label">Roles</dt>
          <dd className="flex flex-wrap gap-2 mt-1">
            {user.roles.map(r => (
              <span key={r} className="px-2.5 py-0.5 text-sm border border-line">{r}</span>
            ))}
          </dd>
        </div>
      </dl>

      {(officer || isStaffUser(user)) && (
        <section className="mt-14 border-t border-line pt-10">
          <h2 className="section-title">Officer profile</h2>
          <p className="mt-3 text-sm text-muted">
            {officer
              ? "Your photo and bio appear on the public About page."
              : "Only people with the officer role are shown on the About page."}
          </p>

          <div className="mt-6 flex flex-col sm:flex-row gap-8">
            <div className="shrink-0 w-48">
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo} alt={user.name || ""} className="w-48 h-48 object-cover" />
              ) : (
                <div className="w-48 h-48 border border-line flex items-center justify-center text-5xl font-semibold text-muted">
                  {initials}
                </div>
              )}
              <input ref={fileRef} type="file" accept="image/*,.heic,.heif" hidden onChange={upload} />
              <button onClick={() => fileRef.current?.click()} disabled={uploading} className="btn w-full mt-3">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {uploading ? "Uploading…" : "Upload photo"}
              </button>
            </div>

            <div className="flex-1">
              <label className="label" htmlFor="position">Title</label>
              <input
                id="position"
                value={showTitle}
                onChange={e => { setTitle(e.target.value); setStatus(null); }}
                maxLength={60}
                placeholder="e.g. Captain, Treasurer, Webmaster"
                className="field mb-4"
              />
              <label className="label" htmlFor="bio">Bio</label>
              <textarea
                id="bio"
                value={showBio}
                onChange={e => { setBio(e.target.value); setStatus(null); }}
                rows={7}
                maxLength={1200}
                placeholder="Write a short bio…"
                className="field resize-y"
              />
              <div className="mt-3 flex items-center gap-3">
                <button onClick={saveBio} disabled={saving} className="btn btn-primary">{saving ? "Saving…" : "Save"}</button>
                {status && <span className={`text-sm ${status.ok ? "text-green-400" : "text-red-400"}`}>{status.message}</span>}
              </div>
            </div>
          </div>
        </section>
      )}
    </PageShell>
  );
}
