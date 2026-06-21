"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { Users } from "lucide-react";
import UsersTab from "@/app/components/admin/UsersTab";
import AttendanceTab from "@/app/components/admin/AttendanceTab";
import TeamsTab from "@/app/components/admin/TeamsTab";
import SettingsTab from "@/app/components/admin/SettingsTab";
import { UserType, AttendanceBlockType, TeamType, TeamMemberType } from "@/app/components/admin/types";

export default function AdminPage() {
  const { user, authenticated, loading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<UserType[]>([]);
  const [blocks, setBlocks] = useState<AttendanceBlockType[]>([]);
  const [fetching, setFetching] = useState(true);
  const [activeTab, setActiveTab] = useState<"users" | "attendance" | "teams" | "settings">("users");
  const [teams, setTeams] = useState<TeamType[]>([]);
  const [teamMembers, setTeamMembers] = useState<Record<number, TeamMemberType[]>>({});

  useEffect(() => {
    if (!loading) {
      if (!authenticated || !user || !user.roles.includes("admin")) {
        router.push("/");
      } else {
        fetchUsers();
        fetchBlocks();
        fetchTeams();
      }
    }
  }, [loading, authenticated, user, router]);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const fetchBlocks = async () => {
    try {
      const res = await fetch("/api/attendance/blocks");
      if (res.ok) {
        const data = await res.json();
        setBlocks(data.blocks);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setFetching(false);
    }
  };

  const fetchTeams = async () => {
    try {
      const res = await fetch("/api/teams");
      if (res.ok) {
        const data = await res.json();
        setTeams(data.teams);
        data.teams.forEach((t: TeamType) => fetchMembers(t.id));
      }
    } catch (error) {
      console.error(error);
    }
  };

  const fetchMembers = async (teamId: number) => {
    try {
      const res = await fetch(`/api/teams/${teamId}/members`);
      if (res.ok) {
        const data = await res.json();
        setTeamMembers(prev => ({ ...prev, [teamId]: data.members }));
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleRoleToggle = async (userId: number, role: string, currentRoles: string[]) => {
    const newRoles = currentRoles.includes(role)
      ? currentRoles.filter(r => r !== role)
      : [...currentRoles, role];

    setUsers(users.map(u => u.id === userId ? { ...u, roles: newRoles } : u));

    try {
      await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: userId, roles: newRoles }),
      });
    } catch (error) {
      console.error(error);
      fetchUsers();
    }
  };

  const handleCreateBlock = async (type: string, date: string, code: string) => {
    const res = await fetch("/api/attendance/blocks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blockType: type, date, code }),
    });
    if (!res.ok) throw new Error("Failed to create block");
    fetchBlocks();
  };

  const handleDeleteBlock = async (blockId: number) => {
    await fetch(`/api/attendance/blocks?id=${blockId}`, { method: "DELETE" });
    fetchBlocks();
  };

  const handleExportCSV = (blockId?: number) => {
    const url = blockId ? `/api/attendance/export?blockId=${blockId}` : "/api/attendance/export";
    window.open(url, "_blank");
  };

  const handleAddTeam = async () => {
    const res = await fetch("/api/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "New Team" }),
    });
    if (res.ok) fetchTeams();
  };

  const handleSaveTeam = async (id: number, name: string, arcId: string) => {
    await fetch(`/api/teams/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() || "Unnamed", arcId: arcId.trim() || null }),
    });
    fetchTeams();
  };

  const handleDeleteTeam = async (id: number) => {
    if (!confirm("Delete this team and all its members?")) return;
    await fetch(`/api/teams/${id}`, { method: "DELETE" });
    fetchTeams();
  };

  const handleAddMember = async (teamId: number, userId: number, role: string) => {
    const res = await fetch(`/api/teams/${teamId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, role }),
    });
    if (res.ok) fetchMembers(teamId);
  };

  const handleRemoveMember = async (teamId: number, memberId: number) => {
    await fetch(`/api/teams/${teamId}/members?memberId=${memberId}`, { method: "DELETE" });
    fetchMembers(teamId);
  };

  if (loading || fetching) {
    return <div className="pt-32 text-center text-white">Loading Admin Dashboard...</div>;
  }

  if (!user?.roles.includes("admin")) return null;

  return (
    <div className="pt-24 min-h-screen bg-neutral-900 text-white flex flex-col items-center pb-12">
      <div className="max-w-6xl w-full px-4 mt-8">
        <h1 className="text-2xl font-bold mb-8">Admin</h1>

        <div className="flex gap-4 mb-8">
          {(["users", "attendance", "teams", "settings"] as const).map(tab => (
            <button key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm border capitalize ${activeTab === tab ? "border-white text-white" : "border-neutral-600 text-gray-400"}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === "users" && (
          <UsersTab users={users} onRoleToggle={handleRoleToggle} />
        )}

        {activeTab === "attendance" && (
          <AttendanceTab
            blocks={blocks}
            onCreateBlock={handleCreateBlock}
            onDeleteBlock={handleDeleteBlock}
            onExportCSV={handleExportCSV}
          />
        )}

        {activeTab === "teams" && (
          <TeamsTab
            users={users}
            teams={teams}
            teamMembers={teamMembers}
            onAddTeam={handleAddTeam}
            onSaveTeam={handleSaveTeam}
            onDeleteTeam={handleDeleteTeam}
            onAddMember={handleAddMember}
            onRemoveMember={handleRemoveMember}
          />
        )}

        {activeTab === "settings" && <SettingsTab />}
      </div>
    </div>
  );
}
