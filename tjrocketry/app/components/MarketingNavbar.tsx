"use client";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { LogIn } from "lucide-react";


export default function MarketingNavbar() {
  const { loading, authenticated } = useAuth();


  return (
    <nav className="fixed w-full z-50 transition-all duration-300 bg-black/10 backdrop-blur-sm border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center group">
            <div className="p-1.5 transition-transform group-hover:scale-110">
              <img src="/images/logo.png" className="w-12 h-12 invert brightness-0" alt="TJ Rocketry" />
            </div>
            <span style={{ fontFamily: "sans-serif", fontWeight: 500 }} className="text-white text-xl tracking-tighter">
              TJRocketry
            </span>          
          </Link>

          <div className="flex items-center gap-6">
            <Link
              href="/home"
              className="text-sm font-semibold text-gray-300 hover:text-white transition-colors"
            >
              Apply
            </Link>

            {!loading && !authenticated && (
              <Link
                href="/api/auth/login"
                className="group relative inline-flex items-center justify-center px-6 py-2 text-sm font-bold  text-white transition-all duration-200 rounded-xl hover:bg-neutral-900"
              >
                <span className="relative flex items-center gap-2">
                  Sign In
                  <LogIn className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </Link>
            )}

            {authenticated && (
              <span className="text-white text-sm font-medium">Authenticated</span>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
