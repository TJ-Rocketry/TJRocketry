"use client";
import { useAuth } from "@/hooks/useAuth";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Minus, Loader2, Edit3, Trash2 } from "lucide-react";

type InventoryItem = {
  id: number;
  name: string;
  location: string;
  type: string;
  quantity: number;
  highValue: boolean;
  category: string;
  subCategory: string;
  imageUrl: string | null;
};

export default function CategoryPage() {
  const { user, authenticated, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const category = typeof params.category === "string" ? params.category.charAt(0).toUpperCase() + params.category.slice(1) : "";
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [fetching, setFetching] = useState(true);
  const [processing, setProcessing] = useState<number | null>(null);
  const [isOfficer, setIsOfficer] = useState(false);
  const [showRequest, setShowRequest] = useState<{ itemId: number; name: string } | null>(null);
  const [requestQty, setRequestQty] = useState(1);

  const validCategories = ["Airframe", "Motors", "Altimeters"];

  useEffect(() => {
    if (!loading) {
      if (!authenticated || !user) router.push("/");
      else {
        const memberRoles = ["admin", "sponsor", "officer", "ARCmember", "BOTRmember"];
        if (!user.roles.some(r => memberRoles.includes(r))) router.push("/apply");
        setIsOfficer(user.roles.some(r => ["admin", "sponsor", "officer"].includes(r)));
      }
    }
  }, [loading, authenticated, user, router]);

  useEffect(() => {
    if (category && validCategories.includes(category)) fetchItems();
    else if (category) setFetching(false);
  }, [category]);

  const fetchItems = async () => {
    try {
      const res = await fetch(`/api/inventory?category=${category}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setFetching(false);
    }
  };

  const handleCheckout = async (itemId: number, itemName: string, highValue: boolean) => {
    if (highValue) {
      setShowRequest({ itemId, name: itemName });
      return;
    }
    setProcessing(itemId);
    try {
      const res = await fetch("/api/inventory/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, change: -1, type: "checkout" }),
      });
      if (res.ok) fetchItems();
    } catch (error) {
      console.error(error);
    } finally {
      setProcessing(null);
    }
  };

  const handleCheckin = async (itemId: number) => {
    setProcessing(itemId);
    try {
      const res = await fetch("/api/inventory/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, change: 1, type: "checkin" }),
      });
      if (res.ok) fetchItems();
    } catch (error) {
      console.error(error);
    } finally {
      setProcessing(null);
    }
  };

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showRequest) return;
    try {
      const res = await fetch("/api/inventory/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: showRequest.itemId, quantity: requestQty }),
      });
      if (res.ok) {
        setShowRequest(null);
        setRequestQty(1);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async (itemId: number) => {
    try {
      const res = await fetch(`/api/inventory/${itemId}`, { method: "DELETE" });
      if (res.ok) fetchItems();
    } catch (error) {
      console.error(error);
    }
  };

  if (loading || fetching) return <div className="pt-32 text-center text-white">Loading...</div>;
  if (!validCategories.includes(category)) return <div className="pt-32 text-center text-white">Invalid category</div>;

  const subCategories = [...new Set(items.map(i => i.subCategory))].sort();

  return (
    <div className="pt-24 min-h-screen bg-neutral-900 text-white">
      <div className="max-w-6xl mx-auto px-4 mt-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/inventory" className="text-gray-400 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold">{category}</h1>
              <p className="text-gray-400 text-sm mt-1">{items.length} items</p>
            </div>
          </div>
        </div>

        {items.length === 0 ? (
          <p className="text-neutral-400">No items in this category.</p>
        ) : (
          <div className="space-y-8">
            {subCategories.map(sub => {
              const subItems = items.filter(i => i.subCategory === sub);
              return (
                <div key={sub}>
                  <h2 className="text-lg font-semibold text-gray-300 mb-3 border-b border-neutral-700 pb-2">{sub}</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="text-xs text-gray-500 uppercase tracking-wider">
                          <th className="p-3 font-medium">Item</th>
                          <th className="p-3 font-medium hidden sm:table-cell">Location</th>
                          <th className="p-3 font-medium hidden sm:table-cell">Type</th>
                          <th className="p-3 font-medium">Stock</th>
                          <th className="p-3 font-medium"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-800">
                        {subItems.map(item => (
                          <tr key={item.id} className="hover:bg-neutral-800/30 transition-colors">
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                {item.imageUrl && (
                                  <img src={item.imageUrl} alt="" className="w-8 h-8 object-cover" />
                                )}
                                <div>
                                  <span className="text-white text-sm font-medium">{item.name}</span>
                                  {item.highValue && (
                                    <span className="ml-2 px-1.5 py-0.5 text-[10px] font-semibold border border-yellow-600 text-yellow-400">High Value</span>
                                  )}
                                  <span className="block sm:hidden text-xs text-gray-500 mt-0.5">{item.location} &middot; {item.type}</span>
                                </div>
                              </div>
                            </td>
                            <td className="p-3 text-sm text-gray-400 hidden sm:table-cell">{item.location}</td>
                            <td className="p-3 hidden sm:table-cell">
                              <span className={`text-xs font-medium px-2 py-0.5 border ${
                                item.type === "consumable" ? "border-blue-600 text-blue-400" : "border-green-600 text-green-400"
                              }`}>
                                {item.type}
                              </span>
                            </td>
                            <td className="p-3">
                              <span className={`text-sm font-mono ${item.quantity <= 0 ? "text-red-400" : "text-white"}`}>
                                {item.quantity}
                              </span>
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-1.5">
                                {item.quantity > 0 && (
                                  <button
                                    onClick={() => handleCheckout(item.id, item.name, item.highValue)}
                                    disabled={processing === item.id}
                                    className={`px-2.5 py-1 text-xs font-medium border transition-colors ${
                                      item.highValue
                                        ? "border-yellow-600 text-yellow-400 hover:bg-yellow-900/30"
                                        : "border-red-600 text-red-400 hover:bg-red-900/30"
                                    }`}
                                  >
                                    {processing === item.id ? <Loader2 className="w-3 h-3 animate-spin" /> : item.highValue ? "Request" : "Check Out"}
                                  </button>
                                )}
                                {item.type === "reusable" && (
                                  <button
                                    onClick={() => handleCheckin(item.id)}
                                    disabled={processing === item.id}
                                    className="px-2.5 py-1 text-xs font-medium border border-green-600 text-green-400 hover:bg-green-900/30 transition-colors"
                                  >
                                    Check In
                                  </button>
                                )}
                                {isOfficer && (
                                  <>
                                    <Link
                                      href={`/inventory/edit/${item.id}`}
                                      className="p-1 text-gray-500 hover:text-white transition-colors"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </Link>
                                    <button
                                      onClick={() => handleDelete(item.id)}
                                      className="p-1 text-gray-500 hover:text-red-400 transition-colors"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {showRequest && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <form onSubmit={handleRequest} className="bg-neutral-800 border border-neutral-700 p-6 w-full max-w-sm mx-4">
              <h3 className="text-lg font-semibold mb-1">Request Item</h3>
              <p className="text-sm text-gray-400 mb-4">{showRequest.name}</p>
              <label className="block text-sm text-gray-400 mb-1">Quantity</label>
              <input
                type="number"
                min={1}
                value={requestQty}
                onChange={(e) => setRequestQty(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full bg-transparent border border-neutral-600 px-2 py-1.5 text-white text-sm mb-4"
              />
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowRequest(null)} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Cancel</button>
                <button type="submit" className="px-3 py-1.5 text-sm border border-white text-white hover:bg-white hover:text-neutral-900 transition-colors">Submit Request</button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
