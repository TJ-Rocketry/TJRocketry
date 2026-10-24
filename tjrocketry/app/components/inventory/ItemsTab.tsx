"use client";
import { Fragment, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Pencil, Search, Settings2 } from "lucide-react";
import { api } from "@/lib/api-client";
import { formatMoment } from "@/lib/dates";
import { Item, LOG_LABELS, LogEntry, personName, since } from "./types";

export default function ItemsTab({
  items,
  categories,
  userId,
  staff,
  onTake,
  onEdit,
  onChanged,
  onManageCategories,
}: {
  items: Item[];
  categories: string[];
  userId: number;
  staff: boolean;
  onTake: (item: Item, asRequest: boolean) => void;
  onEdit: (item: Item) => void;
  onChanged: (message?: string) => void;
  onManageCategories: () => void;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [history, setHistory] = useState<Record<number, LogEntry[] | "error">>({});
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState("");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(i =>
      (category === "All" || (category === "None" ? !i.category : i.category === category)) &&
      (!q || [i.name, i.subCategory, i.location, i.category].some(v => v?.toLowerCase().includes(q))),
    );
  }, [items, query, category]);

  const loadHistory = async (itemId: number) => {
    try {
      const { logs } = await api<{ logs: LogEntry[] }>(`/api/inventory/${itemId}`);
      setHistory(h => ({ ...h, [itemId]: logs }));
    } catch {
      setHistory(h => ({ ...h, [itemId]: "error" }));
    }
  };

  const toggle = (item: Item) => {
    if (expanded === item.id) return setExpanded(null);
    setExpanded(item.id);
    loadHistory(item.id);
  };

  const act = async (busyId: number, itemId: number, run: () => Promise<unknown>, message: string) => {
    setBusy(busyId);
    setError("");
    try {
      await run();
      onChanged(message);
      loadHistory(itemId);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const returnCheckout = (checkoutId: number, item: Item) =>
    act(checkoutId, item.id, () => api(`/api/inventory/checkouts/${checkoutId}`, { method: "PATCH" }), `Returned ${item.name}.`);

  const archive = (item: Item) => {
    if (!confirm(`Remove "${item.name}" from the inventory? Its history is kept.`)) return;
    act(item.id, item.id, () => api(`/api/inventory/${item.id}`, { method: "DELETE" }), `Removed ${item.name}.`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
          <input className="field pl-8" placeholder="Search items, groups, locations…" value={query} onChange={e => setQuery(e.target.value)} />
        </div>
        {(categories.length > 0 || staff) && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            {(categories.length > 0 ? ["All", ...categories, "None"] : []).map(c => (
              <button key={c} onClick={() => setCategory(c)}
                className={`py-1 border-b-2 transition-colors ${category === c ? "border-accent" : "border-transparent text-muted hover:text-foreground"}`}>
                {c === "None" ? "Uncategorized" : c}
              </button>
            ))}
            {staff && (
              <button onClick={onManageCategories} className="inline-flex items-center gap-1 py-1 text-muted hover:text-foreground">
                <Settings2 className="w-3.5 h-3.5" /> {categories.length ? "Edit categories" : "Add categories"}
              </button>
            )}
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line text-xs text-muted">
              <th className="p-3 w-8" />
              <th className="p-3 font-medium">Item</th>
              <th className="p-3 font-medium hidden md:table-cell">Category</th>
              <th className="p-3 font-medium hidden sm:table-cell">Location</th>
              <th className="p-3 font-medium">Available</th>
              <th className="p-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visible.map(item => {
              const open = expanded === item.id;
              const needsRequest = item.highValue && !staff;
              const log = history[item.id];
              return (
                <Fragment key={item.id}>
                  <tr className="border-b border-line">
                    <td className="p-3">
                      <button onClick={() => toggle(item)} aria-label={open ? "Hide details" : "Show details"} className="text-muted hover:text-foreground">
                        {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                    </td>
                    <td className="p-3">
                      <button onClick={() => toggle(item)} className="text-left">
                        <span className="font-medium">{item.name}</span>
                        <span className="block text-xs text-muted">
                          {[item.subCategory, item.type === "consumable" ? "Consumable" : null, item.highValue ? "Needs approval" : null]
                            .filter(Boolean).join(" · ")}
                          <span className="sm:hidden">{item.subCategory || item.highValue ? " · " : ""}{item.location}</span>
                        </span>
                      </button>
                    </td>
                    <td className="p-3 text-muted hidden md:table-cell">{item.category || "—"}</td>
                    <td className="p-3 text-muted hidden sm:table-cell">{item.location}</td>
                    <td className="p-3 whitespace-nowrap">
                      <span className={item.available === 0 ? "text-red-400" : ""}>{item.available}</span>
                      {item.type === "reusable" && <span className="text-muted"> / {item.quantity}</span>}
                    </td>
                    <td className="p-3">
                      <div className="flex justify-end items-center gap-2">
                        {needsRequest ? (
                          <button className="btn btn-sm" disabled={item.myPendingRequest || item.quantity === 0} onClick={() => onTake(item, true)}>
                            {item.myPendingRequest ? "Requested" : "Request"}
                          </button>
                        ) : (
                          <button className="btn btn-sm" disabled={item.available === 0} onClick={() => onTake(item, false)}>
                            {item.type === "consumable" ? "Take" : "Check out"}
                          </button>
                        )}
                        {staff && (
                          <button onClick={() => onEdit(item)} aria-label={`Edit ${item.name}`} className="p-1 text-muted hover:text-foreground">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {open && (
                    <tr className="border-b border-line">
                      <td />
                      <td colSpan={5} className="p-3 pb-5">
                        <div className="grid md:grid-cols-2 gap-6">
                          <div>
                            <h3 className="text-xs text-muted mb-2">Checked out to</h3>
                            {item.type === "consumable" ? (
                              <p className="text-muted">Consumable — taken items aren&apos;t returned.</p>
                            ) : item.holders.length === 0 ? (
                              <p className="text-muted">Nobody has this right now.</p>
                            ) : (
                              <ul className="space-y-2">
                                {item.holders.map(h => (
                                  <li key={h.id} className="flex items-start justify-between gap-3">
                                    <div>
                                      <span>{personName(h.user)}</span>
                                      <span className="text-muted"> · {h.quantity}× · since {formatMoment(h.checkedOutAt)} ({since(h.checkedOutAt)})</span>
                                      {h.note && <span className="block text-xs text-muted">{h.note}</span>}
                                    </div>
                                    {(staff || h.user.id === userId) && (
                                      <button className="btn btn-sm shrink-0" disabled={busy === h.id} onClick={() => returnCheckout(h.id, item)}>
                                        Return
                                      </button>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            )}
                            {item.notes && (
                              <>
                                <h3 className="text-xs text-muted mt-5 mb-1">Notes</h3>
                                <p className="whitespace-pre-wrap">{item.notes}</p>
                              </>
                            )}
                            {staff && (
                              <button className="btn btn-sm btn-danger mt-5" disabled={busy === item.id} onClick={() => archive(item)}>
                                Remove item
                              </button>
                            )}
                          </div>
                          <div>
                            <h3 className="text-xs text-muted mb-2">Recent history</h3>
                            {log === undefined ? (
                              <p className="text-muted">Loading…</p>
                            ) : log === "error" ? (
                              <p className="text-red-400">Couldn&apos;t load history.</p>
                            ) : log.length === 0 ? (
                              <p className="text-muted">No activity yet.</p>
                            ) : (
                              <ul className="space-y-1.5">
                                {log.slice(0, 12).map(l => (
                                  <li key={l.id} className="flex justify-between gap-3">
                                    <span>
                                      {personName(l.user)} <span className="text-muted">{(LOG_LABELS[l.type] ?? l.type).toLowerCase()}</span>
                                      {l.change !== 0 && <span className="text-muted"> {Math.abs(l.change)}</span>}
                                    </span>
                                    <span className="text-muted whitespace-nowrap">{formatMoment(l.timestamp)}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {visible.length === 0 && (
              <tr>
                <td colSpan={6} className="p-10 text-center text-muted">
                  {items.length === 0 ? "No items yet." : "No items match your search."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
