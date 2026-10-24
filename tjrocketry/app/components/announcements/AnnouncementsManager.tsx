"use client";
import { useCallback, useEffect, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { api } from "@/lib/api-client";
import { formatMoment } from "@/lib/dates";
import AnnouncementBody from "./AnnouncementBody";

export type Announcement = { id: number; title: string; body: string; startsAt: string; endsAt: string };

function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const blank = () => {
  const now = new Date();
  return { id: 0, title: "", body: "", startsAt: toLocalInput(now), endsAt: toLocalInput(new Date(now.getTime() + 7 * 86400000)) };
};

function status(a: Announcement) {
  const now = Date.now();
  if (new Date(a.endsAt).getTime() <= now) return { label: "Ended", className: "text-muted" };
  if (new Date(a.startsAt).getTime() > now) return { label: "Scheduled", className: "text-accent" };
  return { label: "Live", className: "text-green-400" };
}

export default function AnnouncementsManager({ onChanged }: { onChanged?: () => void }) {
  const [items, setItems] = useState<Announcement[] | null>(null);
  const [form, setForm] = useState(blank);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setItems((await api<{ announcements: Announcement[] }>("/api/announcements?manage=1")).announcements);
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);

  useEffect(() => { queueMicrotask(() => { void load(); }); }, [load]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api("/api/announcements", {
        method: form.id ? "PUT" : "POST",
        json: { ...form, startsAt: new Date(form.startsAt).toISOString(), endsAt: new Date(form.endsAt).toISOString() },
      });
      setForm(blank());
      await load();
      onChanged?.();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (a: Announcement) => {
    if (!confirm(`Delete "${a.title}"?`)) return;
    try {
      await api(`/api/announcements?id=${a.id}`, { method: "DELETE" });
      await load();
      onChanged?.();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="space-y-8">
      <form onSubmit={save} className="space-y-3">
        <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Title" className="field" />
        <textarea required value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} rows={5} className="field resize-y"
          placeholder={"Message\n\nStart a line with ## for a heading. Links like https://… or [text](https://…) work."} />
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className="label">Show from</span>
            <input required type="datetime-local" value={form.startsAt} onChange={e => setForm(f => ({ ...f, startsAt: e.target.value }))} className="field w-auto" />
          </label>
          <label className="text-sm">
            <span className="label">Until</span>
            <input required type="datetime-local" value={form.endsAt} onChange={e => setForm(f => ({ ...f, endsAt: e.target.value }))} className="field w-auto" />
          </label>
          <button disabled={saving} className="btn btn-primary">{saving ? "Saving…" : form.id ? "Save changes" : "Post"}</button>
          {form.id !== 0 && <button type="button" className="btn" onClick={() => setForm(blank())}>Cancel edit</button>}
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
      </form>

      <div className="divide-y divide-line border-t border-line">
        {items === null ? (
          <p className="py-4 text-sm text-muted">Loading…</p>
        ) : items.length === 0 ? (
          <p className="py-4 text-sm text-muted">No announcements yet.</p>
        ) : (
          items.map(a => {
            const s = status(a);
            return (
              <div key={a.id} className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold">{a.title}</h3>
                    <p className="text-xs text-muted mt-0.5">
                      <span className={s.className}>{s.label}</span> · {formatMoment(a.startsAt)} – {formatMoment(a.endsAt)}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button className="p-1 text-muted hover:text-foreground" aria-label={`Edit ${a.title}`}
                      onClick={() => setForm({ id: a.id, title: a.title, body: a.body, startsAt: toLocalInput(new Date(a.startsAt)), endsAt: toLocalInput(new Date(a.endsAt)) })}>
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button className="p-1 text-muted hover:text-red-400" aria-label={`Delete ${a.title}`} onClick={() => remove(a)}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-3"><AnnouncementBody body={a.body} /></div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
