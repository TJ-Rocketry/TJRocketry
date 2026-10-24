"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { formatMoment } from "@/lib/dates";
import { Request, personName } from "./types";

const STATUS_STYLES: Record<Request["status"], string> = {
  pending: "text-accent",
  approved: "text-green-400",
  rejected: "text-red-400",
  cancelled: "text-muted",
};

export default function RequestsTab({ refreshKey, onChanged }: { refreshKey: number; onChanged: (message?: string) => void }) {
  const [requests, setRequests] = useState<Request[] | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setRequests((await api<{ requests: Request[] }>("/api/inventory/requests")).requests);
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);

  useEffect(() => { queueMicrotask(() => { void load(); }); }, [load, refreshKey]);

  const decide = async (r: Request, status: "approved" | "rejected") => {
    setBusy(r.id);
    setError("");
    try {
      await api(`/api/inventory/requests/${r.id}`, { method: "PUT", json: { status } });
      onChanged(status === "approved" ? `Approved — ${r.item.name} is checked out to ${personName(r.user)}.` : "Request rejected.");
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  if (!requests) return <p className="text-muted text-sm">{error || "Loading…"}</p>;

  const pending = requests.filter(r => r.status === "pending");
  const handled = requests.filter(r => r.status !== "pending");

  return (
    <div className="space-y-8">
      {error && <p className="text-sm text-red-400">{error}</p>}
      <section>
        <h2 className="text-sm font-medium mb-2">Pending ({pending.length})</h2>
        {pending.length === 0 ? (
          <p className="text-sm text-muted">No pending requests.</p>
        ) : (
          <div className="divide-y divide-line border-y border-line">
            {pending.map(r => (
              <div key={r.id} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
                <div>
                  <span className="font-medium">{personName(r.user)}</span> wants {r.quantity}× {r.item.name}
                  <span className="block text-xs text-muted">
                    {formatMoment(r.createdAt)}{r.note ? ` · ${r.note}` : ""}
                  </span>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button className="btn btn-sm btn-primary" disabled={busy === r.id} onClick={() => decide(r, "approved")}>Approve</button>
                  <button className="btn btn-sm btn-danger" disabled={busy === r.id} onClick={() => decide(r, "rejected")}>Reject</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-sm font-medium mb-2">History</h2>
        {handled.length === 0 ? (
          <p className="text-sm text-muted">Nothing yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs text-muted">
                  <th className="p-3 font-medium">Item</th>
                  <th className="p-3 font-medium">Who</th>
                  <th className="p-3 font-medium">Requested</th>
                  <th className="p-3 font-medium">Outcome</th>
                </tr>
              </thead>
              <tbody>
                {handled.map(r => (
                  <tr key={r.id} className="border-b border-line last:border-0">
                    <td className="p-3">{r.quantity}× {r.item.name}</td>
                    <td className="p-3">{personName(r.user)}</td>
                    <td className="p-3 text-muted whitespace-nowrap">{formatMoment(r.createdAt)}</td>
                    <td className="p-3">
                      <span className={STATUS_STYLES[r.status]}>{r.status}</span>
                      {r.approver?.name && r.status !== "cancelled" && <span className="text-muted"> by {r.approver.name}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
