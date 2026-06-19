"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Download } from "lucide-react";

type UserType = {
  id: number;
  ionId: string;
  name: string | null;
  email: string | null;
  username: string | null;
  classYear: string | null;
  roles: string[];
};

type AttendanceBlockType = {
  id: number;
  blockType: string;
  date: string;
  code: string;
  createdAt: string;
  _count?: { records: number };
};

const AVAILABLE_ROLES = ["admin", "sponsor", "officer", "ARCmember", "BOTRmember", "user"];
const BLOCK_TYPES = ["A Block", "B Block"];

export default function AdminPage() {
  const { user, authenticated, loading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<UserType[]>([]);
  const [blocks, setBlocks] = useState<AttendanceBlockType[]>([]);
  const [fetching, setFetching] = useState(true);
  const [activeTab, setActiveTab] = useState<"users" | "attendance">("users");
  const [newBlockType, setNewBlockType] = useState("A Block");
  const [newBlockDate, setNewBlockDate] = useState("");
  const [newBlockCode, setNewBlockCode] = useState("");
  const [blockError, setBlockError] = useState("");

  useEffect(() => {
    if (!loading) {
      if (!authenticated || !user || !user.roles.includes("admin")) {
        router.push("/");
      } else {
        fetchUsers();
        fetchBlocks();
        if (!newBlockDate) {
          setNewBlockDate(new Date().toISOString().split("T")[0]);
        }
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

  const handleCreateBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setBlockError("");

    if (!newBlockCode.trim()) {
      setBlockError("Code is required");
      return;
    }

    try {
      const res = await fetch("/api/attendance/blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blockType: newBlockType,
          date: newBlockDate,
          code: newBlockCode.trim(),
        }),
      });

      if (res.ok) {
        setNewBlockCode("");
        fetchBlocks();
      } else {
        setBlockError("Failed to create block");
      }
    } catch (error) {
      setBlockError("Failed to create block");
    }
  };

  const handleDeleteBlock = async (blockId: number) => {
    try {
      const res = await fetch(`/api/attendance/blocks?id=${blockId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchBlocks();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleExportCSV = async (blockId?: number) => {
    const url = blockId
      ? `/api/attendance/export?blockId=${blockId}`
      : "/api/attendance/export";
    window.open(url, "_blank");
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric", year: "numeric" });
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
          <button
            onClick={() => setActiveTab("users")}
            className={`px-4 py-2 text-sm border ${activeTab === "users" ? "border-white text-white" : "border-neutral-600 text-gray-400"}`}
          >
            Users
          </button>
          <button
            onClick={() => setActiveTab("attendance")}
            className={`px-4 py-2 text-sm border ${activeTab === "attendance" ? "border-white text-white" : "border-neutral-600 text-gray-400"}`}
          >
            Attendance
          </button>
        </div>
        
        {activeTab === "users" ? (
          <div className="border border-neutral-700">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-neutral-700">
                    <th className="p-3 text-xs text-gray-400 font-medium">ID</th>
                    <th className="p-3 text-xs text-gray-400 font-medium">Name</th>
                    <th className="p-3 text-xs text-gray-400 font-medium">Email</th>
                    <th className="p-3 text-xs text-gray-400 font-medium">Roles</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td className="p-3">
                        <span className="text-sm text-gray-400">#{u.id}</span>
                        <span className="text-xs text-gray-600 ml-1">{u.ionId}</span>
                      </td>
                      <td className="p-3">
                        <div className="text-sm">{u.name || "N/A"}</div>
                        <div className="text-xs text-gray-500">{u.username || "N/A"}</div>
                      </td>
                      <td className="p-3 text-sm text-gray-400">{u.email || "N/A"}</td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {AVAILABLE_ROLES.map(role => {
                            const hasRole = u.roles.includes(role);
                            return (
                              <button
                                key={role}
                                onClick={() => handleRoleToggle(u.id, role, u.roles)}
                                className={`px-2 py-0.5 text-xs border ${
                                  hasRole ? "border-white text-white" : "border-neutral-600 text-gray-500"
                                }`}
                              >
                                {role}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="border border-neutral-700 p-4">
              <h2 className="text-sm font-medium mb-3">Create Block</h2>
              <form onSubmit={handleCreateBlock} className="flex flex-wrap gap-3 items-end">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Type</label>
                  <select
                    value={newBlockType}
                    onChange={(e) => setNewBlockType(e.target.value)}
                    className="bg-transparent border border-neutral-600 px-2 py-1.5 text-white text-sm"
                  >
                    {BLOCK_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Date</label>
                  <input
                    type="date"
                    value={newBlockDate}
                    onChange={(e) => setNewBlockDate(e.target.value)}
                    className="bg-transparent border border-neutral-600 px-2 py-1.5 text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Code</label>
                  <input
                    type="text"
                    value={newBlockCode}
                    onChange={(e) => setNewBlockCode(e.target.value)}
                    placeholder="Enter code..."
                    className="bg-transparent border border-neutral-600 px-2 py-1.5 text-white text-sm"
                  />
                </div>
                <button type="submit" className="px-3 py-1.5 text-sm border border-white text-white hover:bg-white hover:text-neutral-900 transition-colors">
                  Create
                </button>
              </form>
              {blockError && <p className="text-red-400 text-xs mt-2">{blockError}</p>}
            </div>

            <div className="border border-neutral-700">
              <div className="p-3 border-b border-neutral-700 flex justify-between items-center">
                <h2 className="text-sm font-medium">Blocks</h2>
                <button onClick={() => handleExportCSV()} className="flex items-center gap-1 px-2 py-1 text-xs border border-neutral-600 text-gray-400 hover:text-white transition-colors">
                  <Download className="w-3 h-3" />
                  Export All
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-neutral-700">
                      <th className="p-3 text-xs text-gray-400 font-medium">Type</th>
                      <th className="p-3 text-xs text-gray-400 font-medium">Date</th>
                      <th className="p-3 text-xs text-gray-400 font-medium">Code</th>
                      <th className="p-3 text-xs text-gray-400 font-medium">Present</th>
                      <th className="p-3 text-xs text-gray-400 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800">
                    {blocks.map((block) => (
                      <tr key={block.id}>
                        <td className="p-3 text-sm">{block.blockType}</td>
                        <td className="p-3 text-sm text-gray-400">{formatDate(block.date)}</td>
                        <td className="p-3 text-sm font-mono text-gray-400">{block.code}</td>
                        <td className="p-3 text-sm">{block._count?.records || 0}</td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            <button onClick={() => handleExportCSV(block.id)} className="flex items-center gap-1 px-2 py-1 text-xs border border-neutral-600 text-gray-400 hover:text-white transition-colors">
                              <Download className="w-3 h-3" />
                              CSV
                            </button>
                            <button onClick={() => handleDeleteBlock(block.id)} className="flex items-center gap-1 px-2 py-1 text-xs border border-neutral-600 text-gray-400 hover:text-white transition-colors">
                              <Trash2 className="w-3 h-3" />
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {blocks.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-gray-500 text-sm">
                          No blocks created yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
