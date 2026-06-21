"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { ChevronDown, User as UserIcon, Menu, X } from "lucide-react";
import NotificationPanel from "./NotificationPanel";

export default function InternalNavbar() {
  const { user } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mobileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileMenuOpen]);

  if (!user) return null;

  const isAdmin = user.roles.includes("admin");

  const handleSignOut = async () => {
    setDropdownOpen(false);
    await fetch("/api/auth/logout");
    window.location.href = "/";
    setTimeout(() => window.location.reload(), 500);
  };

  const navLinks = [
    { href: "/home", label: "Home" },
    { href: "/inventory", label: "Inventory" },
    { href: "/resources", label: "Resources" },
    { href: "/teams", label: "Teams" },
  ];

  return (
    <nav className="fixed w-full z-50 bg-neutral-900 border-b border-white/10 h-16">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 h-full flex items-center justify-between">
        <Link href="/home" className="flex items-center group shrink-0">
          <div className="p-1.5 transition-transform group-hover:scale-110">
            <img 
              src="/images/logo.png" 
              className="w-10 h-10 invert brightness-0 mix-blend-screen" 
              alt="TJ Rocketry" 
            />
          </div>
          <span style={{ fontFamily: "sans-serif", fontWeight: 500 }} className="text-white text-xl tracking-tighter hidden sm:inline">
            TJRocketry
          </span>          
        </Link>

        <div className="hidden md:flex items-center gap-6">
          {navLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-gray-300 hover:text-white transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-4">
            <NotificationPanel />
          </div>
          <div className="hidden md:flex items-center gap-4 relative" ref={dropdownRef}>
            <button 
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <UserIcon className="w-5 h-5 text-white" />
              <span className="text-white font-medium text-sm">{user.name || "Member"}</span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 top-12 mt-2 w-48 bg-neutral-800 shadow-xl border border-white/10 overflow-hidden py-1">
                <Link 
                  href="/profile"
                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-200 hover:bg-neutral-700 hover:text-white transition-colors"
                  onClick={() => setDropdownOpen(false)}
                >
                  Profile
                </Link>
                {isAdmin && (
                  <Link 
                    href="/admin"
                    className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-neutral-700 transition-colors"
                    onClick={() => setDropdownOpen(false)}
                  >
                    Admin
                  </Link>
                )}
                <button 
                  onClick={handleSignOut}
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-400 hover:bg-neutral-700 hover:text-red-300 transition-colors"
                >
                  Sign Out
                </button>
              </div>
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
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-3 px-3 py-3 text-sm text-gray-200 hover:bg-neutral-800 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <hr className="border-white/10 my-2" />
            <Link
              href="/profile"
              className="flex items-center gap-3 px-3 py-3 text-sm text-gray-200 hover:bg-neutral-800 transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Profile
            </Link>
            {isAdmin && (
              <Link
                href="/admin"
                className="flex items-center gap-3 px-3 py-3 text-sm  hover:bg-neutral-800 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Admin
              </Link>
            )}
            <button
              onClick={handleSignOut}
              className="flex items-center gap-3 w-full px-3 py-3 text-sm text-red-400 hover:bg-neutral-800 transition-colors"
            >
              Sign Out
            </button>
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
