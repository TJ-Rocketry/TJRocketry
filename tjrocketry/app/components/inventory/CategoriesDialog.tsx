"use client";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import Modal from "@/app/components/Modal";
import { api } from "@/lib/api-client";

export default function CategoriesDialog({
  categories,
  onClose,
  onChanged,
}: {
  categories: string[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const [name, setName] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  const run = async (fn: () => Promise<unknown>) => {
    setError("");
    try {
      await fn();
      onChanged();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    run(async () => {
      await api("/api/inventory/categories", { method: "POST", json: { name } });
      setName("");
    });
  };

  const rename = (from: string) => {
    const to = drafts[from]?.trim();
    if (!to || to === from) return;
    run(() => api("/api/inventory/categories", { method: "PUT", json: { from, to } }));
  };

  const remove = (category: string) => {
    if (!confirm(`Delete "${category}"? Items in it become uncategorized.`)) return;
    run(() => api(`/api/inventory/categories?name=${encodeURIComponent(category)}`, { method: "DELETE" }));
  };

  return (
    <Modal title="Categories" subtitle="Organize items however makes sense for the club." onClose={onClose}>
      <form onSubmit={add} className="flex gap-2 mb-5">
        <input className="field" placeholder="New category" value={name} onChange={e => setName(e.target.value)} autoFocus />
        <button className="btn btn-primary shrink-0" type="submit">Add</button>
      </form>
      {categories.length === 0 ? (
        <p className="text-sm text-muted">No categories yet.</p>
      ) : (
        <ul className="divide-y divide-line">
          {categories.map(c => (
            <li key={c} className="flex items-center gap-2 py-2">
              <input
                className="flex-1 bg-transparent text-sm outline-none border-b border-transparent focus:border-line py-1"
                value={drafts[c] ?? c}
                onChange={e => setDrafts(d => ({ ...d, [c]: e.target.value }))}
                onBlur={() => rename(c)}
                onKeyDown={e => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                aria-label={`Rename ${c}`}
              />
              <button onClick={() => remove(c)} aria-label={`Delete ${c}`} className="p-1 text-muted hover:text-red-400">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="text-sm text-red-400 mt-3">{error}</p>}
    </Modal>
  );
}
