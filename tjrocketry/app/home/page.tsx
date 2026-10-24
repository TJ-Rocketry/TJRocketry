"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Plus, X, Clock, MapPin, Check } from "lucide-react";
import { isMemberUser, isStaffUser, useAuth } from "@/hooks/useAuth";
import AttendanceManager from "@/app/components/AttendanceManager";
import PageShell from "@/app/components/PageShell";
import Announcements from "@/app/components/announcements/Announcements";
import { api } from "@/lib/api-client";
import { formatDay, formatMoment, todayET } from "@/lib/dates";

type AttendanceBlock = {
  id: number;
  blockType: string;
  date: string;
  isClosed: boolean;
  submitted: boolean;
};

type LaunchEvent = {
  id: number;
  title: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  notes: string | null;
  location: string | null;
};

type MyCheckout = { id: number; quantity: number; checkedOutAt: string; item: { name: string } };

const EMPTY_LAUNCH = { title: "", date: "", startTime: "", endTime: "", notes: "", location: "" };

function formatTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  if (Number.isNaN(h)) return t;
  return new Date(Date.UTC(2000, 0, 1, h, m || 0)).toLocaleTimeString("en-US", { timeZone: "UTC", hour: "numeric", minute: "2-digit" });
}

export default function HomePage() {
  const { user, authenticated, loading } = useAuth();
  const router = useRouter();
  const staff = isStaffUser(user);

  const [blocks, setBlocks] = useState<AttendanceBlock[] | null>(null);
  const [launches, setLaunches] = useState<LaunchEvent[]>([]);
  const [myItems, setMyItems] = useState<MyCheckout[]>([]);
  const [codes, setCodes] = useState<Record<number, string>>({});
  const [results, setResults] = useState<Record<number, { ok: boolean; message: string }>>({});
  const [submitting, setSubmitting] = useState<number | null>(null);
  const [launchForm, setLaunchForm] = useState<typeof EMPTY_LAUNCH | null>(null);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (loading) return;
    if (!authenticated || !user) router.push("/");
    else if (!isMemberUser(user)) router.push("/apply");
  }, [loading, authenticated, user, router]);

  const fetchBlocks = useCallback(async () => {
    try {
      setBlocks((await api<{ blocks: AttendanceBlock[] }>("/api/attendance/today")).blocks);
    } catch {
      setBlocks([]);
    }
  }, []);

  const fetchLaunches = useCallback(async () => {
    try {
      setLaunches((await api<{ launches: LaunchEvent[] }>("/api/launches")).launches);
    } catch {
      setLaunches([]);
    }
  }, []);

  useEffect(() => {
    if (isMemberUser(user)) fetchBlocks();
  }, [user, fetchBlocks]);

  useEffect(() => {
    if (!isMemberUser(user)) return;
    fetchLaunches();
    api<{ checkouts: MyCheckout[] }>("/api/inventory/checkouts")
      .then(d => setMyItems(d.checkouts))
      .catch(() => setMyItems([]));
  }, [user, fetchLaunches]);

  const submitCode = async (blockId: number) => {
    const code = codes[blockId]?.trim();
    if (!code) return;
    setSubmitting(blockId);
    try {
      await api("/api/attendance/submit", { method: "POST", json: { blockId, code } });
      setResults(r => ({ ...r, [blockId]: { ok: true, message: "Marked present" } }));
      setBlocks(prev => prev?.map(b => (b.id === blockId ? { ...b, submitted: true } : b)) ?? null);
      setCodes(c => ({ ...c, [blockId]: "" }));
    } catch (err) {
      setResults(r => ({ ...r, [blockId]: { ok: false, message: (err as Error).message } }));
    } finally {
      setSubmitting(null);
    }
  };

  const saveLaunch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!launchForm) return;
    setFormError("");
    try {
      await api("/api/launches", { method: "POST", json: launchForm });
      setLaunchForm(null);
      fetchLaunches();
    } catch (err) {
      setFormError((err as Error).message);
    }
  };

  const deleteLaunch = async (launch: LaunchEvent) => {
    if (!confirm(`Delete "${launch.title}"?`)) return;
    try {
      await api(`/api/launches?id=${launch.id}`, { method: "DELETE" });
    } catch (err) {
      alert((err as Error).message);
    }
    fetchLaunches();
  };

  if (loading || !user || !isMemberUser(user)) {
    return <PageShell title="Dashboard" loading />;
  }

  const today = todayET();

  return (
    <PageShell title={`Welcome${user.name ? `, ${user.name.split(" ")[0]}` : ""}`} description={formatDay(`${today}T00:00:00Z`)}>
      <div className="space-y-12">
        <Announcements canManage={staff} />


        <section>
          <h2 className="section-title mb-4">Attendance</h2>
          {blocks === null ? (
            <p className="text-muted">Loading…</p>
          ) : blocks.length === 0 ? (
            <p className="text-muted">No attendance blocks open right now.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {blocks.map(block => (
                <div key={block.id} className="border border-line p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-medium">{block.blockType} <span className="text-muted font-normal">· {formatDay(block.date)}</span></span>
                    {block.isClosed && <span className="text-xs text-muted">Closed</span>}
                  </div>
                  {block.submitted ? (
                    <p className="text-green-400 text-sm flex items-center gap-1.5"><Check className="w-4 h-4" /> Marked present</p>
                  ) : (
                    <form onSubmit={e => { e.preventDefault(); submitCode(block.id); }} className="flex gap-2">
                      <input
                        type="text"
                        value={codes[block.id] || ""}
                        onChange={e => setCodes(c => ({ ...c, [block.id]: e.target.value }))}
                        placeholder="Enter code"
                        aria-label={`${block.blockType} code`}
                        className="field"
                        autoComplete="off"
                      />
                      <button type="submit" disabled={submitting === block.id || !codes[block.id]?.trim()} className="btn btn-primary shrink-0">
                        {submitting === block.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit"}
                      </button>
                    </form>
                  )}
                  {!block.submitted && results[block.id] && (
                    <p className={`text-sm mt-2 ${results[block.id].ok ? "text-green-400" : "text-red-400"}`}>{results[block.id].message}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {staff && (
          <section>
            <h2 className="section-title mb-4">Manage blocks</h2>
            <AttendanceManager onChanged={fetchBlocks} />
          </section>
        )}

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">Upcoming launches</h2>
            {staff && (
              <button onClick={() => { setFormError(""); setLaunchForm({ ...EMPTY_LAUNCH, date: today }); }} className="btn" title="Add launch">
                <Plus className="w-4 h-4" /> Launch
              </button>
            )}
          </div>

          {launchForm && (
            <form onSubmit={saveLaunch} className="border border-line p-3 mb-4 space-y-3">
              <div className="flex flex-wrap gap-2">
                <input type="text" value={launchForm.title} onChange={e => setLaunchForm({ ...launchForm, title: e.target.value })}
                  placeholder="Title" className="field flex-1 min-w-40" required />
                <input type="date" value={launchForm.date} onChange={e => setLaunchForm({ ...launchForm, date: e.target.value })} className="field w-auto" required />
              </div>
              <div className="flex flex-wrap gap-2">
                <input type="time" value={launchForm.startTime} onChange={e => setLaunchForm({ ...launchForm, startTime: e.target.value })} className="field flex-1 w-auto" aria-label="Start time" />
                <input type="time" value={launchForm.endTime} onChange={e => setLaunchForm({ ...launchForm, endTime: e.target.value })} className="field flex-1 w-auto" aria-label="End time" />
                <input type="text" value={launchForm.location} onChange={e => setLaunchForm({ ...launchForm, location: e.target.value })} placeholder="Location" className="field flex-1 min-w-40" />
              </div>
              <textarea value={launchForm.notes} onChange={e => setLaunchForm({ ...launchForm, notes: e.target.value })} placeholder="Notes" className="field resize-none" rows={2} />
              {formError && <p className="text-red-400 text-sm">{formError}</p>}
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setLaunchForm(null)} className="btn">Cancel</button>
                <button type="submit" className="btn btn-primary">Add launch</button>
              </div>
            </form>
          )}

          {launches.length === 0 ? (
            <p className="text-muted">No upcoming launches.</p>
          ) : (
            <div className="divide-y divide-line">
              {launches.slice(0, 5).map(launch => (
                <div key={launch.id} className="py-3 first:pt-0 last:pb-0 flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{launch.title}</p>
                    <p className="text-sm text-muted mt-0.5 flex flex-wrap gap-x-3">
                      <span>{formatDay(launch.date)}</span>
                      {(launch.startTime || launch.endTime) && (
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {[launch.startTime, launch.endTime].filter(Boolean).map(t => formatTime(t!)).join(" – ")}
                        </span>
                      )}
                      {launch.location && <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{launch.location}</span>}
                    </p>
                    {launch.notes && <p className="text-sm mt-1">{launch.notes}</p>}
                  </div>
                  {staff && (
                    <button onClick={() => deleteLaunch(launch)} aria-label={`Delete ${launch.title}`} className="p-1 text-muted hover:text-red-400">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">Your items</h2>
            <Link href="/inventory?tab=mine" className="text-sm text-muted hover:text-foreground">Open inventory →</Link>
          </div>
          {myItems.length === 0 ? (
            <p className="text-muted">You don&apos;t have anything checked out.</p>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {myItems.map(c => (
                <li key={c.id} className="py-2 first:pt-0 last:pb-0 flex justify-between gap-3">
                  <span>{c.quantity}× {c.item.name}</span>
                  <span className="text-muted">since {formatMoment(c.checkedOutAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </PageShell>
  );
}
