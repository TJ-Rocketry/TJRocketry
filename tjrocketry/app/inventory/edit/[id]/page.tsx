"use client";
import { useAuth } from "@/hooks/useAuth";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function EditItemPage() {
  const { user, authenticated, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const [form, setForm] = useState({
    name: "", location: "", type: "reusable", quantity: 0, highValue: false,
    category: "Airframe", subCategory: "",
  });
  const [fetching, setFetching] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!authenticated || !user) router.push("/");
      else if (!user.roles.some(r => ["admin", "sponsor", "officer"].includes(r))) router.push("/inventory");
    }
  }, [loading, authenticated, user, router]);

  useEffect(() => {
    if (params.id) fetchItem();
  }, [params.id]);

  const fetchItem = async () => {
    try {
      const res = await fetch(`/api/inventory?category=`);
      if (res.ok) {
        const data = await res.json();
        const item = data.items.find((i: any) => i.id === parseInt(params.id as string));
        if (item) {
          setForm({
            name: item.name,
            location: item.location,
            type: item.type,
            quantity: item.quantity,
            highValue: item.highValue,
            category: item.category,
            subCategory: item.subCategory,
          });
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setFetching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`/api/inventory/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) router.push("/inventory");
    } catch (error) {
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || fetching || !user) return <div className="pt-32 text-center text-white">Loading...</div>;

  return (
    <div className="pt-24 min-h-screen bg-neutral-900 text-white">
      <div className="max-w-lg mx-auto px-4 mt-8">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/inventory" className="text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold">Edit Item</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Name</label>
            <input type="text" value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
              className="w-full bg-transparent border border-neutral-600 px-2 py-1.5 text-white text-sm" required />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Location</label>
            <input type="text" value={form.location} onChange={(e) => setForm(p => ({ ...p, location: e.target.value }))}
              className="w-full bg-transparent border border-neutral-600 px-2 py-1.5 text-white text-sm" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Type</label>
              <select value={form.type} onChange={(e) => setForm(p => ({ ...p, type: e.target.value }))}
                className="w-full bg-transparent border border-neutral-600 px-2 py-1.5 text-white text-sm">
                <option value="reusable">Reusable</option>
                <option value="consumable">Consumable</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Quantity</label>
              <input type="number" min={0} value={form.quantity}
                onChange={(e) => setForm(p => ({ ...p, quantity: parseInt(e.target.value) || 0 }))}
                className="w-full bg-transparent border border-neutral-600 px-2 py-1.5 text-white text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Category</label>
              <select value={form.category} onChange={(e) => setForm(p => ({ ...p, category: e.target.value }))}
                className="w-full bg-transparent border border-neutral-600 px-2 py-1.5 text-white text-sm">
                <option value="Airframe">Airframe</option>
                <option value="Motors">Motors</option>
                <option value="Altimeters">Altimeters</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Sub Category</label>
              <input type="text" value={form.subCategory}
                onChange={(e) => setForm(p => ({ ...p, subCategory: e.target.value }))}
                className="w-full bg-transparent border border-neutral-600 px-2 py-1.5 text-white text-sm" required />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="highValue" checked={form.highValue}
              onChange={(e) => setForm(p => ({ ...p, highValue: e.target.checked }))}
              className="border border-neutral-600 bg-transparent" />
            <label htmlFor="highValue" className="text-sm text-gray-400">High Value Item</label>
          </div>
          <button type="submit" disabled={submitting}
            className="w-full py-2 border border-white text-white hover:bg-white hover:text-neutral-900 transition-colors disabled:opacity-50">
            {submitting ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </div>
    </div>
  );
}
