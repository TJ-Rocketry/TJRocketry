"use client";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Package, Zap, Cpu } from "lucide-react";

const categories = [
  { key: "Airframe", label: "Airframe",  desc: "Body tubes, nose cones, parachutes, fins", image: "/images/openrocket.png" },
  { key: "Motors", label: "Motors",  desc: "Motor casings, propellant, igniters", image: "/images/botrlaunch.jpg" },
  { key: "Altimeters", label: "Altimeters", desc: "Altimeters, avionics, batteries", image: "/images/assembleandbuild.jpg" },
];

export default function InventoryPage() {
  const { user, authenticated, loading } = useAuth();
  const router = useRouter();
  const [isOfficer, setIsOfficer] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!authenticated || !user) {
        router.push("/");
      } else {
        const memberRoles = ["admin", "sponsor", "officer", "ARCmember", "BOTRmember"];
        const hasMemberRole = user.roles.some(role => memberRoles.includes(role));
        if (!hasMemberRole) router.push("/apply");
        setIsOfficer(user.roles.some(r => ["admin", "sponsor", "officer"].includes(r)));
      }
    }
  }, [loading, authenticated, user, router]);

  if (loading || !user) return <div className="pt-32 text-center text-white">Loading...</div>;

  return (
    <div className="pt-24 min-h-screen bg-neutral-900 text-white">
      <div className="max-w-5xl mx-auto px-4 mt-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Inventory</h1>
            <p className="text-gray-400 text-sm mt-1">Select a category to view items</p>
          </div>
          {isOfficer && (
            <div className="flex items-center gap-3">
              <Link
                href="/inventory/requests"
                className="text-sm text-gray-300 hover:text-white transition-colors border border-neutral-600 px-2 py-1.5"
              >
                Requests
              </Link>
              <Link
                href="/inventory/add"
                className="flex items-center gap-1 text-sm border border-white text-white px-2 py-1.5 hover:bg-white hover:text-neutral-900 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Item
              </Link>
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {categories.map(cat => (
            <Link
              key={cat.key}
              href={`/inventory/${cat.key.toLowerCase()}`}
              className="group bg-neutral-800 border border-neutral-700 overflow-hidden hover:border-white/30 transition-all"
            >
              <div className="h-40 overflow-hidden">
                <img
                  src={cat.image}
                  alt={cat.label}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <h2 className="text-lg font-semibold">{cat.label}</h2>
                </div>
                <p className="text-sm text-gray-400">{cat.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
