"use client";
import { Fragment, useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Download, Trash2 } from "lucide-react";
import { api } from "@/lib/api-client";
import { formatDay, formatMoment, todayET } from "@/lib/dates";
import { AttendanceBlockType } from "./admin/types";

const BLOCK_TYPES = ["A Block", "B Block"];

const byName = (a: { user: { name: string | null } }, b: { user: { name: string | null } }) =>
  (a.user.name ?? "").localeCompare(b.user.name ?? "");

export default function AttendanceManager({ onChanged }: { onChanged?: () => void }) {
  const [blocks, setBlocks] = useState<AttendanceBlockType[] | null>(null);
  const [type, setType] = useState(BLOCK_TYPES[0]);
  const [date, setDate] = useState(todayET);
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setBlocks((await api<{ blocks: AttendanceBlockType[] }>("/api/attendance/blocks")).blocks);
    } catch (error) {
      setErr((error as Error).message);
    }
  }, []);

  useEffect(() => { queueMicrotask(() => { void load(); }); }, [load]);

  const run = async (fn: () => Promise<unknown>) => {
    setErr("");
    try {
      await fn();
      onChanged?.();
    } catch (error) {
      setErr((error as Error).message);
    }
    load();
  };

  const create = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return setErr("Code is required");
    run(async () => {
      await api("/api/attendance/blocks", { method: "POST", json: { blockType: type, date, code: code.trim() } });
      setCode("");
    });
  };

  const exportCSV = (id?: number) =>
    window.open(id ? `/api/attendance/export?blockId=${id}` : "/api/attendance/export", "_blank");

  return (
    <div className="space-y-4">
      <form onSubmit={create} className="flex flex-wrap gap-2 items-end">
        <select value={type} onChange={e => setType(e.target.value)} className="field w-auto" aria-label="Block">
          {BLOCK_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="field w-auto" aria-label="Date" />
        <input type="text" value={code} onChange={e => setCode(e.target.value)} placeholder="Code" className="field w-36" aria-label="Code" />
        <button type="submit" className="btn btn-primary">Create</button>
        <button type="button" onClick={() => exportCSV()} className="btn">
          <Download className="w-3.5 h-3.5" /> Export all
        </button>
      </form>
      {err && <p className="text-red-400 text-sm">{err}</p>}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line text-xs text-muted">
              <th className="py-2 pr-2 w-6" />
              <th className="py-2 pr-3 font-medium">Block</th>
              <th className="py-2 pr-3 font-medium">Date</th>
              <th className="py-2 pr-3 font-medium">Code</th>
              <th className="py-2 pr-3 font-medium">Present</th>
              <th className="py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {blocks === null && (
              <tr><td colSpan={6} className="py-6 text-center text-muted">Loading…</td></tr>
            )}
            {blocks?.map(b => {
              const open = expanded === b.id;
              const records = [...b.records].sort(byName);
              return (
                <Fragment key={b.id}>
                  <tr className="border-b border-line">
                    <td className="py-2 pr-2">
                      <button
                        onClick={() => setExpanded(open ? null : b.id)}
                        aria-label={open ? "Hide attendees" : "Show attendees"}
                        className="text-muted hover:text-foreground align-middle"
                      >
                        {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                    </td>
                    <td className="py-2 pr-3">
                      {b.blockType}
                      {b.isClosed && <span className="text-muted"> · Closed</span>}
                    </td>
                    <td className="py-2 pr-3 text-muted whitespace-nowrap">{formatDay(b.date)}</td>
                    <td className="py-2 pr-3 font-mono">{b.code}</td>
                    <td className="py-2 pr-3">{records.length}</td>
                    <td className="py-2">
                      <div className="flex gap-2">
                        <button className="btn btn-sm"
                          onClick={() => run(() => api("/api/attendance/blocks", { method: "PATCH", json: { id: b.id, isClosed: !b.isClosed } }))}>
                          {b.isClosed ? "Reopen" : "Close"}
                        </button>
                        <button className="btn btn-sm" onClick={() => exportCSV(b.id)}>
                          <Download className="w-3 h-3" /> CSV
                        </button>
                        <button className="btn btn-sm btn-danger"
                          onClick={() => confirm("Delete this block and its attendance records?") &&
                            run(() => api(`/api/attendance/blocks?id=${b.id}`, { method: "DELETE" }))}>
                          <Trash2 className="w-3 h-3" /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                  {open && (
                    <tr className="border-b border-line">
                      <td />
                      <td colSpan={5} className="py-3">
                        {records.length === 0 ? (
                          <p className="text-muted">No one has marked attendance yet.</p>
                        ) : (
                          <table className="w-full text-left">
                            <thead>
                              <tr className="text-xs text-muted">
                                <th className="py-1 pr-3 font-medium">Name</th>
                                <th className="py-1 pr-3 font-medium">Username</th>
                                <th className="py-1 pr-3 font-medium">Class</th>
                                <th className="py-1 font-medium">Marked at</th>
                              </tr>
                            </thead>
                            <tbody>
                              {records.map(r => (
                                <tr key={r.id} className="border-t border-line">
                                  <td className="py-1.5 pr-3">{r.user.name || "—"}</td>
                                  <td className="py-1.5 pr-3 font-mono text-muted">{r.user.username || "—"}</td>
                                  <td className="py-1.5 pr-3 text-muted">{r.user.classYear || "—"}</td>
                                  <td className="py-1.5 text-muted">{formatMoment(r.timestamp)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {blocks?.length === 0 && (
              <tr><td colSpan={6} className="py-6 text-center text-muted">No blocks yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
