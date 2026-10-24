"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { formatMoment } from "@/lib/dates";
import { Checkout, Request, personName, since } from "./types";

const STATUS_STYLES: Record<Request["status"], string> = {
  pending: "text-accent",
  approved: "text-green-400",
  rejected: "text-red-400",
  cancelled: "text-muted",
};

export default function CheckoutsTab({
  scope,
  refreshKey,
  onChanged,
}: {
  scope: "mine" | "all";
  refreshKey: number;
  onChanged: (message?: string) => void;
}) {
  const [checkouts, setCheckouts] = useState<Checkout[] | null>(null);
  const [requests, setRequests] = useState<Request[]>([]);
  const [showReturned, setShowReturned] = useState(false);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams({ scope, status: showReturned ? "all" : "open" });
      const [c, r] = await Promise.all([
        api<{ checkouts: Checkout[] }>(`/api/inventory/checkouts?${params}`),
        scope === "mine" ? api<{ requests: Request[] }>("/api/inventory/requests") : Promise.resolve({ requests: [] }),
      ]);
      setCheckouts(c.checkouts);
      setRequests(r.requests);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [scope, showReturned]);

  useEffect(() => { queueMicrotask(() => { void load(); }); }, [load, refreshKey]);

  const run = async (id: number, url: string, init: Parameters<typeof api>[1], message: string) => {
    setBusy(id);
    setError("");
    try {
      await api(url, init);
      onChanged(message);
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  if (!checkouts) return <p className="text-muted text-sm">{error || "Loading…"}</p>;

  const pending = requests.filter(r => r.status === "pending");

  return (
    <div className="space-y-8">
      {error && <p className="text-sm text-red-400">{error}</p>}

      {scope === "mine" && pending.length > 0 && (
        <section>
          <h2 className="text-sm font-medium mb-2">Waiting for approval</h2>
          <div className="divide-y divide-line border-y border-line">
            {pending.map(r => (
              <div key={r.id} className="p-3 flex items-center justify-between gap-3 text-sm">
                <div>
                  {r.quantity}× {r.item.name}
                  <span className="block text-xs text-muted">Requested {formatMoment(r.createdAt)}</span>
                </div>
                <button className="btn btn-sm" disabled={busy === r.id}
                  onClick={() => run(r.id, `/api/inventory/requests/${r.id}`, { method: "PUT", json: { status: "cancelled" } }, "Request cancelled.")}>
                  Cancel
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-medium">{scope === "mine" ? "Checked out to you" : "Everything checked out"}</h2>
          <label className="flex items-center gap-2 text-xs text-muted cursor-pointer">
            <input type="checkbox" className="accent-accent" checked={showReturned} onChange={e => setShowReturned(e.target.checked)} />
            Show returned
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs text-muted">
                <th className="p-3 font-medium">Item</th>
                {scope === "all" && <th className="p-3 font-medium">Who</th>}
                <th className="p-3 font-medium">Qty</th>
                <th className="p-3 font-medium">Checked out</th>
                <th className="p-3 font-medium hidden sm:table-cell">Note</th>
                <th className="p-3 font-medium text-right">{showReturned ? "Returned" : ""}</th>
              </tr>
            </thead>
            <tbody>
              {checkouts.map(c => (
                <tr key={c.id} className="border-b border-line last:border-0">
                  <td className="p-3">
                    {c.item.name}
                    <span className="block text-xs text-muted">{c.item.location}</span>
                  </td>
                  {scope === "all" && <td className="p-3">{personName(c.user)}</td>}
                  <td className="p-3">{c.quantity}</td>
                  <td className="p-3 whitespace-nowrap">
                    {formatMoment(c.checkedOutAt)}
                    <span className="block text-xs text-muted">
                      {c.returnedAt ? "" : `${since(c.checkedOutAt)}`}
                      {c.approvedBy?.name ? `${c.returnedAt ? "" : " · "}approved by ${c.approvedBy.name}` : ""}
                    </span>
                  </td>
                  <td className="p-3 text-muted hidden sm:table-cell">{c.note || "—"}</td>
                  <td className="p-3 text-right whitespace-nowrap">
                    {c.returnedAt ? (
                      <span className="text-muted">
                        {formatMoment(c.returnedAt)}
                        {c.returnedBy?.name && c.returnedBy.name !== c.user.name && (
                          <span className="block text-xs">by {c.returnedBy.name}</span>
                        )}
                      </span>
                    ) : (
                      <button className="btn btn-sm" disabled={busy === c.id}
                        onClick={() => run(c.id, `/api/inventory/checkouts/${c.id}`, { method: "PATCH" }, `Returned ${c.item.name}.`)}>
                        Return
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {checkouts.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-muted">
                    {scope === "mine" ? "You don't have anything checked out." : "Nothing is checked out."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {scope === "mine" && requests.some(r => r.status !== "pending") && (
        <section>
          <h2 className="text-sm font-medium mb-2">Past requests</h2>
          <div className="divide-y divide-line border-y border-line">
            {requests.filter(r => r.status !== "pending").slice(0, 20).map(r => (
              <div key={r.id} className="p-3 flex items-center justify-between gap-3 text-sm">
                <span>{r.quantity}× {r.item.name}</span>
                <span className={`text-xs ${STATUS_STYLES[r.status]}`}>
                  {r.status}{r.approver?.name && r.status !== "cancelled" ? ` by ${r.approver.name}` : ""}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
