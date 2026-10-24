"use client";
import { useState } from "react";
import Modal from "@/app/components/Modal";
import { api } from "@/lib/api-client";
import { Item } from "./types";

type Form = {
  name: string;
  category: string;
  subCategory: string;
  location: string;
  type: "reusable" | "consumable";
  quantity: string;
  highValue: boolean;
  notes: string;
};

export default function ItemForm({
  item,
  categories,
  groups,
  onClose,
  onSaved,
}: {
  item: Item | null;
  categories: string[];
  groups: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Form>({
    name: item?.name ?? "",
    category: item?.category ?? "",
    subCategory: item?.subCategory ?? "",
    location: item?.location ?? "",
    type: item?.type ?? "reusable",
    quantity: String(item?.quantity ?? 1),
    highValue: item?.highValue ?? false,
    notes: item?.notes ?? "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm(f => ({ ...f, [key]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api(item ? `/api/inventory/${item.id}` : "/api/inventory", {
        method: item ? "PUT" : "POST",
        json: { ...form, quantity: Number(form.quantity) },
      });
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={item ? "Edit item" : "Add item"} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label" htmlFor="item-name">Name</label>
          <input id="item-name" className="field" value={form.name} onChange={e => set("name", e.target.value)} required autoFocus />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="item-category">Category</label>
            <select id="item-category" className="field" value={form.category} onChange={e => set("category", e.target.value)}>
              <option value="">None</option>
              {categories.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="item-group">Group <span className="opacity-70">(optional)</span></label>
            <input id="item-group" className="field" list="item-groups" value={form.subCategory}
              onChange={e => set("subCategory", e.target.value)} placeholder="e.g. Body tubes" />
            <datalist id="item-groups">{groups.map(g => <option key={g} value={g} />)}</datalist>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="item-location">Location</label>
          <input id="item-location" className="field" value={form.location} onChange={e => set("location", e.target.value)}
            placeholder="e.g. Cabinet B, top shelf" required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="item-type">Type</label>
            <select id="item-type" className="field" value={form.type} onChange={e => set("type", e.target.value as Form["type"])}>
              <option value="reusable">Reusable (gets returned)</option>
              <option value="consumable">Consumable (gets used up)</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="item-qty">{form.type === "reusable" ? "How many the club owns" : "How many on the shelf"}</label>
            <input id="item-qty" className="field" type="number" min={item?.type === "reusable" ? item.checkedOut : 0}
              value={form.quantity} onChange={e => set("quantity", e.target.value)} required />
          </div>
        </div>
        <label className="flex items-start gap-2 text-sm cursor-pointer">
          <input type="checkbox" className="mt-0.5 accent-accent" checked={form.highValue} onChange={e => set("highValue", e.target.checked)} />
          <span>
            Needs officer approval
            <span className="block text-xs text-muted">Members send a request instead of taking it directly.</span>
          </span>
        </label>
        <div>
          <label className="label" htmlFor="item-notes">Notes <span className="opacity-70">(optional)</span></label>
          <textarea id="item-notes" className="field resize-y" rows={2} value={form.notes} onChange={e => set("notes", e.target.value)} />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn">Cancel</button>
          <button type="submit" disabled={saving} className="btn btn-primary">{saving ? "Saving…" : item ? "Save" : "Add item"}</button>
        </div>
      </form>
    </Modal>
  );
}
