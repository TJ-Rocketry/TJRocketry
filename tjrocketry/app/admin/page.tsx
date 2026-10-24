"use client";
import { useState, useEffect, useCallback } from "react";
import { isAdminUser, useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import Tabs from "@/app/components/Tabs";
import UsersTab from "@/app/components/admin/UsersTab";
import AttendanceManager from "@/app/components/AttendanceManager";
import AnnouncementsManager from "@/app/components/announcements/AnnouncementsManager";
import SettingsTab from "@/app/components/admin/SettingsTab";
import { UserType } from "@/app/components/admin/types";
import PageShell from "@/app/components/PageShell";
import Link from "next/link";

const TABS = ["users", "attendance", "announcements", "settings"] as const;
type Tab = (typeof TABS)[number];

export default function AdminPage() {
  const { user, authenticated, loading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<UserType[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("users");
  const [error, setError] = useState("");

  const isAdmin = isAdminUser(user);

  useEffect(() => {
    const saved = new URLSearchParams(window.location.search).get("tab") || sessionStorage.getItem("admin-tab");
    if (saved && TABS.includes(saved as Tab)) queueMicrotask(() => setActiveTab(saved as Tab));
  }, []);

  const fail = (err: unknown) => setError((err as Error).message);

  const fetchUsers = useCallback(async () => {
    try {
      setUsers((await api<{ users: UserType[] }>("/api/admin/users")).users);
    } catch (err) {
      fail(err);
    }
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!authenticated || !isAdmin) {
      router.push("/");
      return;
    }
    queueMicrotask(() => { void fetchUsers(); });
  }, [loading, authenticated, isAdmin, router, fetchUsers]);

  const handleRoleToggle = async (userId: number, role: string, currentRoles: string[]) => {
    const roles = currentRoles.includes(role) ? currentRoles.filter(r => r !== role) : [...currentRoles, role];
    setUsers(prev => prev.map(u => (u.id === userId ? { ...u, roles } : u)));
    try {
      await api("/api/admin/users", { method: "PUT", json: { id: userId, roles } });
    } catch (err) {
      fail(err);
      fetchUsers();
    }
  };

  const handlePositionSave = async (userId: number, position: string) => {
    setUsers(prev => prev.map(u => (u.id === userId ? { ...u, position: position.trim() || null } : u)));
    try {
      await api("/api/admin/users", { method: "PUT", json: { id: userId, position } });
    } catch (err) {
      fail(err);
      fetchUsers();
    }
  };

  if (loading || !isAdmin) {
    return <PageShell title="Admin" loading />;
  }

  return (
    <PageShell title="Admin" actions={<Link href="/teams" className="btn">Edit teams</Link>}>

        <Tabs
          tabs={TABS.map(t => ({ key: t, label: t[0].toUpperCase() + t.slice(1) }))}
          active={activeTab}
          onChange={tab => {
            setActiveTab(tab);
            sessionStorage.setItem("admin-tab", tab);
          }}
        />

        {error && (
          <p className="mb-4 text-sm text-red-400">
            {error} <button className="underline ml-2" onClick={() => setError("")}>Dismiss</button>
          </p>
        )}

        {activeTab === "users" && (
          <UsersTab users={users} onRoleToggle={handleRoleToggle} onPositionSave={handlePositionSave} />
        )}
        {activeTab === "attendance" && (
          <AttendanceManager />
        )}
        {activeTab === "announcements" && (
          <AnnouncementsManager />
        )}
        {activeTab === "settings" && <SettingsTab />}
    </PageShell>
  );
}
