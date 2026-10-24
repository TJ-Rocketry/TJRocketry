"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { formatMoment } from "@/lib/dates";
import { LOG_LABELS, LogEntry, personName } from "./types";

export default function ActivityTab({ refreshKey }: { refreshKey: number }) {
  const [logs, setLogs] = useState<LogEntry[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ logs: LogEntry[] }>("/api/inventory/log?limit=200")
      .then(d => setLogs(d.logs))
      .catch(err => setError(err.message));
  }, [refreshKey]);

  if (!logs) return <p className="text-muted text-sm">{error || "Loading…"}</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-line text-xs text-muted">
            <th className="p-3 font-medium">When</th>
            <th className="p-3 font-medium">Who</th>
            <th className="p-3 font-medium">Action</th>
            <th className="p-3 font-medium">Item</th>
            <th className="p-3 font-medium text-right">Change</th>
          </tr>
        </thead>
        <tbody>
          {logs.map(l => (
            <tr key={l.id} className="border-b border-line last:border-0">
              <td className="p-3 text-muted whitespace-nowrap">{formatMoment(l.timestamp)}</td>
              <td className="p-3">{personName(l.user)}</td>
              <td className="p-3">
                {LOG_LABELS[l.type] ?? l.type}
                {l.note && <span className="block text-xs text-muted">{l.note}</span>}
              </td>
              <td className="p-3">{l.item?.name ?? "—"}</td>
              <td className={`p-3 text-right font-mono ${l.change > 0 ? "text-green-400" : l.change < 0 ? "text-red-400" : "text-muted"}`}>
                {l.change > 0 ? `+${l.change}` : l.change || "—"}
              </td>
            </tr>
          ))}
          {logs.length === 0 && (
            <tr><td colSpan={5} className="p-10 text-center text-muted">No activity yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
