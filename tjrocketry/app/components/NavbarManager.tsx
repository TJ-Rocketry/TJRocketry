"use client";
import { useAuth } from "@/hooks/useAuth";
import MarketingNavbar from "./MarketingNavbar";
import InternalNavbar from "./InternalNavbar";

export default function NavbarManager() {
  const { user, authenticated, loading } = useAuth();

  if (loading) {
    return <div className="h-20 bg-transparent w-full fixed z-50"></div>;
  }

  if (!authenticated || !user) {
    return <MarketingNavbar />;
  }

  return <InternalNavbar />;
}
