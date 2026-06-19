"use client";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const pastProjects = [
  { year: "2024-2025", name: "TARC Finals", achievement: "Top 20 National Rank" },
  { year: "2023-2024", name: "TARC Finals", achievement: "National Finalist" },
  { year: "2022-2023", name: "Battle of the Rockets", achievement: "Competition Finalist" },
];

export default function PastProjectsPage() {
  return (
    <div className="pt-24 min-h-screen bg-neutral-900 text-white">
      <div className="max-w-4xl mx-auto px-4 mt-8 pb-24">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/" className="text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-3xl font-bold">Past Projects</h1>
        </div>

        <div className="space-y-4">
          {pastProjects.map((p, i) => (
            <div key={i} className="bg-neutral-800 border border-white/10 rounded-xl p-5">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-lg font-semibold">{p.name}</h2>
                <span className="text-sm text-gray-500">{p.year}</span>
              </div>
              <p className="text-gray-400 text-sm">{p.achievement}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
