"use client";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function SupportPage() {
  return (
    <div className="pt-24 min-h-screen bg-neutral-900 text-white">
      <div className="max-w-4xl mx-auto px-4 mt-8 pb-24">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/" className="text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-3xl font-bold">Support</h1>
        </div>

        <p className="text-gray-300 leading-relaxed mb-8">
          Support TJ Rocketry by donating or getting involved. Your contributions help us purchase materials,
          motors, and cover competition costs.
        </p>

        <div className="bg-neutral-900 border border-neutral-600 p-8 text-center">
          <h2 className="text-xl font-semibold mb-4">Donate</h2>
          <p className="text-neutral-400 mb-6">Donations can be made via check or through our fundraising page.</p>
          <div className="inline-block px-8 py-3 border border-white text-white hover:bg-white hover:text-neutral-900 transition-colors">
            Donate Now
          </div>
        </div>
      </div>
    </div>
  );
}
