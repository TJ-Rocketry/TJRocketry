"use client";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle, XCircle, Loader2 } from "lucide-react";

type CheckoutRequest = {
  id: number;
  quantity: number;
  status: string;
  createdAt: string;
  user: { name: string | null; username: string | null };
  item: { name: string; category: string; subCategory: string };
  approver: { name: string } | null;
};

export default function RequestsPage() {
  const { user, authenticated, loading } = useAuth();
  const router = useRouter();
  const [requests, setRequests] = useState<CheckoutRequest[]>([]);
  const [fetching, setFetching] = useState(true);
  const [processing, setProcessing] = useState<number | null>(null);

  useEffect(() => {
    if (!loading) {
      if (!authenticated || !user) router.push("/");
      else if (!user.roles.some(r => ["admin", "sponsor", "officer"].includes(r))) router.push("/inventory");
      else fetchRequests();
    }
  }, [loading, authenticated, user, router]);

  const fetchRequests = async () => {
    try {
      const res = await fetch("/api/inventory/requests");
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setFetching(false);
    }
  };

  const handleAction = async (id: number, status: "approved" | "rejected") => {
    setProcessing(id);
    try {
      const res = await fetch(`/api/inventory/requests/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) fetchRequests();
    } catch (error) {
      console.error(error);
    } finally {
      setProcessing(null);
    }
  };

  if (loading || fetching) return <div className="pt-32 text-center text-white">Loading...</div>;

  const pending = requests.filter(r => r.status === "pending");
  const history = requests.filter(r => r.status !== "pending");

  return (
    <div className="pt-24 min-h-screen bg-neutral-900 text-white">
      <div className="max-w-4xl mx-auto px-4 mt-8">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/inventory" className="text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold">Checkout Requests</h1>
        </div>

        <h2 className="text-lg font-semibold mb-3">Pending ({pending.length})</h2>
        {pending.length === 0 ? (
          <p className="text-neutral-400 mb-8">No pending requests.</p>
        ) : (
          <div className="space-y-3 mb-8">
            {pending.map(req => (
              <div key={req.id} className="bg-neutral-800 border border-neutral-700 p-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-white">{req.item.name}</p>
                  <p className="text-sm text-gray-400">
                    {req.user.name || req.user.username} requested {req.quantity}x
                    <span className="text-xs text-gray-500 ml-2">{req.item.category} / {req.item.subCategory}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleAction(req.id, "approved")}
                    disabled={processing === req.id}
                    className="flex items-center gap-1 px-2 py-1 text-xs font-medium border border-green-600 text-green-400 hover:bg-green-900/30 transition-colors"
                  >
                    {processing === req.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                    Approve
                  </button>
                  <button
                    onClick={() => handleAction(req.id, "rejected")}
                    disabled={processing === req.id}
                    className="flex items-center gap-1 px-2 py-1 text-xs font-medium border border-red-600 text-red-400 hover:bg-red-900/30 transition-colors"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <h2 className="text-lg font-semibold mb-3">History</h2>
        {history.length === 0 ? (
          <p className="text-neutral-400">No history yet.</p>
        ) : (
          <div className="space-y-2">
            {history.map(req => (
              <div key={req.id} className="bg-neutral-800/50 border border-neutral-700/50 p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm text-white">{req.item.name} ({req.quantity}x)</p>
                  <p className="text-xs text-gray-500">{req.user.name || req.user.username}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium px-2 py-0.5 border ${
                    req.status === "approved" ? "border-green-600 text-green-400" : "border-red-600 text-red-400"
                  }`}>
                    {req.status}
                  </span>
                  {req.approver && <span className="text-xs text-gray-500">by {req.approver.name}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
