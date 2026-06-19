"use client";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function SponsorsPage() {
  return (
    <div className="pt-24 min-h-screen bg-neutral-900 text-white">
      <div className="max-w-4xl mx-auto px-4 mt-8 pb-24">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/" className="text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-3xl font-bold">Sponsors</h1>
        </div>

        <p className="text-gray-300 leading-relaxed mb-8">
          We thank our sponsors for their generous support. If you&apos;re interested in sponsoring TJ Rocketry,
          please reach out to us.
        </p>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-neutral-900 border border-neutral-700 p-8 flex items-center justify-center h-40">
            <p className="text-neutral-500 text-lg font-semibold">Your Logo Here</p>
          </div>
          <div className="bg-neutral-900 border border-neutral-700 p-8 flex items-center justify-center h-40">
            <p className="text-neutral-500 text-lg font-semibold">Your Logo Here</p>
          </div>
        </div>
      </div>
    </div>
  );
}
