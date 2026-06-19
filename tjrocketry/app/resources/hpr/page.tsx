"use client";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function HPRPage() {
  const { user, authenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!authenticated || !user)) router.push("/");
  }, [loading, authenticated, user, router]);

  if (loading || !user) return <div className="pt-32 text-center text-white">Loading...</div>;

  return (
    <div className="pt-24 min-h-screen bg-neutral-900 text-white">
      <div className="max-w-4xl mx-auto px-4 mt-8">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/resources" className="text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold">HPR Information</h1>
        </div>

        <div className="bg-neutral-800 border border-neutral-700 p-8 text-center">
          <p className="text-gray-400">High Power Rocketry resources coming soon.</p>
          <p className="text-sm text-gray-500 mt-2">Check back for certification guides, level requirements, and safety information.</p>
        </div>
      </div>
    </div>
  );
}
