"use client";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { User as UserIcon, LogOut } from "lucide-react";

export default function ProfilePage() {
  const { user, authenticated, loading } = useAuth();
  const router = useRouter();

  if (loading) {
    return <div className="pt-32 text-center text-white">Loading...</div>;
  }

  if (!authenticated || !user) {
    router.push("/");
    return null;
  }

  const handleSignOut = async () => {
    await fetch("/api/auth/logout");
    window.location.href = "/";
    setTimeout(() => window.location.reload(), 500);
  };

  return (
    <div className="pt-24 min-h-screen bg-neutral-900 text-white  flex flex-col items-center">
      <div className="max-w-4xl w-full px-4 mt-8">
        <h1 className="">Profile</h1>
        
        <div className="bg-neutral-900 rounded p-8">

          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">Name</h3>
              <p className="text-lg">{user.name}</p>
            </div>

            {user.username && (
              <div>
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">Username</h3>
                <p className="text-lg font-mono">{user.username}</p>
              </div>
            )}

            {user.classYear && (
              <div>
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">Class</h3>
                <p className="text-lg">{user.classYear}</p>
              </div>
            )}

          </div>
          
          <div className="mt-8">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Your Roles</h3>
            <div className="flex flex-wrap gap-2">
              {user.roles.map(role => (
                <span key={role} className="px-3 py-1 bg-neutral-800 border border-white/10 rounded-full text-sm">
                  {role}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-white/10">
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-red-400 text-neutral-900 hover:bg-red-500/10 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
