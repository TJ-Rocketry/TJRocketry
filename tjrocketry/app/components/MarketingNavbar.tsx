"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { LogIn, Menu, X } from "lucide-react";

const marketingLinks = [
  { href: "/about", label: "About" },
  { href: "/projects/current", label: "Projects" },
  { href: "/sponsors", label: "Sponsors" },
  { href: "/support", label: "Support" },
];

export default function MarketingNavbar() {
  const { loading, authenticated } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileMenuOpen]);

  return (
    <nav className={`fixed w-full z-50 transition-all duration-300 ease-in-out ${
      scrolled 
        ? "bg-neutral-900 backdrop-blur-md border-b border-white/10" 
        : "bg-transparent"
    }`}>
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12">
        <div className={`flex items-center justify-between transition-all duration-300 ${scrolled ? "h-16" : "h-20"}`}>
          <Link href="/" className="flex items-center group">
            <div className="p-1.5 transition-transform group-hover:scale-110">
              <img 
                src="/images/logo.png" 
                className="w-12 h-12 invert brightness-0 mix-blend-screen" 
                alt="TJ Rocketry" 
              />
            </div>
            <span style={{ fontFamily: "sans-serif", fontWeight: 500 }} className="text-white text-xl tracking-tighter">
              TJRocketry
            </span>          
          </Link>

          <div className="hidden md:flex items-center gap-6">
            {marketingLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-semibold text-gray-300 hover:text-white transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/apply"
              className="text-sm font-semibold text-gray-300 hover:text-white transition-colors"
            >
              Apply
            </Link>

            {!loading && !authenticated && (
              <Link
                href="/api/auth/login"
                className="group relative inline-flex items-center justify-center px-6 py-2 text-sm font-bold text-white transition-all duration-200 rounded-xl hover:bg-neutral-900"
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

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-white hover:text-gray-300 transition-colors"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div
          ref={mobileRef}
          className="md:hidden bg-neutral-900 border-b border-white/10 shadow-xl animate-slideDown"
        >
          <div className="px-4 py-3 space-y-1">
            {marketingLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-3 px-3 py-3 text-sm text-gray-200 hover:bg-neutral-800 rounded-lg transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <hr className="border-white/10 my-2" />
            <Link
              href="/apply"
              className="flex items-center gap-3 px-3 py-3 text-sm text-gray-200 hover:bg-neutral-800 rounded-lg transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Apply
            </Link>
            {!loading && !authenticated && (
              <Link
                href="/api/auth/login"
                className="flex items-center gap-3 px-3 py-3 text-sm text-white font-semibold hover:bg-neutral-800 rounded-lg transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slideDown {
          animation: slideDown 0.2s ease-out;
        }
      `}</style>
    </nav>
  );
}
