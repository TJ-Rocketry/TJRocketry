"use client";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function CurrentProjectsPage() {
  return (
    <div className="pt-24 min-h-screen bg-neutral-900 text-white">
      <div className="max-w-5xl mx-auto px-4 mt-8 pb-24">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/" className="text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-3xl font-bold">Current Projects</h1>
        </div>

        <div className="space-y-6">
          <div className=" rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-2">TARC 2025-2026</h2>
            <p className="text-gray-400 text-sm mb-2">Team America Rocketry Challenge</p>
            <p className="text-gray-300 leading-relaxed">
              Designing and building competition rockets for the world&apos;s largest student rocketry contest.
              Our teams are working on achieving precise altitude and duration targets.
            </p>
          </div>

          <div className=" rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-2">NASA Student Launch Initiative</h2>
            <p className="text-gray-400 text-sm mb-2">2026-2027 Season</p>
            <p className="text-gray-300 leading-relaxed">
              A year-long NASA program to design, build, and fly a high-powered rocket with a scientific payload.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
