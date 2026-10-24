"use client";
import { useState } from "react";
import Modal from "@/app/components/Modal";
import { api } from "@/lib/api-client";
import { Item } from "./types";

export default function TakeDialog({
  item,
  asRequest,
  onClose,
  onDone,
}: {
  item: Item;
  asRequest: boolean;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const max = asRequest ? item.quantity : item.available;
  const [quantity, setQuantity] = useState("1");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const verb = asRequest ? "Request" : item.type === "consumable" ? "Take" : "Check out";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api(asRequest ? "/api/inventory/requests" : "/api/inventory/checkouts", {
        method: "POST",
        json: { itemId: item.id, quantity: Number(quantity), note },
      });
      onDone(
        asRequest
          ? `Requested ${quantity}× ${item.name}. An officer will review it.`
          : item.type === "consumable"
            ? `Took ${quantity}× ${item.name}.`
            : `Checked out ${quantity}× ${item.name}. Return it from "My items" when you're done.`,
      );
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={`${verb} ${item.name}`} subtitle={`${item.location} · ${item.available} available`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        {asRequest && (
          <p className="text-sm text-muted">This item needs an officer&apos;s approval. Once approved, it&apos;s checked out to you.</p>
        )}
        <div>
          <label className="label" htmlFor="take-qty">Quantity</label>
          <input id="take-qty" className="field" type="number" min={1} max={max} value={quantity}
            onChange={e => setQuantity(e.target.value)} required autoFocus />
        </div>
        <div>
          <label className="label" htmlFor="take-note">What&apos;s it for? <span className="opacity-70">(optional)</span></label>
          <input id="take-note" className="field" value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Team 2 rocket build" />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn">Cancel</button>
          <button type="submit" disabled={saving} className="btn btn-primary">{saving ? "Saving…" : verb}</button>
        </div>
      </form>
    </Modal>
  );
}
