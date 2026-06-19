"use client";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2, Plus, MoreHorizontal, X, Clock, MapPin, Ban } from "lucide-react";

type AttendanceBlock = {
  id: number;
  blockType: string;
  date: string;
  code: string;
  isClosed: boolean;
  submitted: boolean;
};

type LaunchEvent = {
  id: number;
  title: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  notes: string | null;
  location: string | null;
};

const BLOCK_TYPES = ["A Block", "B Block"];

export default function HomePage() {
  const { user, authenticated, loading } = useAuth();
  const router = useRouter();
  const [blocks, setBlocks] = useState<AttendanceBlock[]>([]);
  const [launches, setLaunches] = useState<LaunchEvent[]>([]);
  const [blockDate, setBlockDate] = useState("");
  const [submitting, setSubmitting] = useState<number | null>(null);
  const [codeInputs, setCodeInputs] = useState<Record<number, string>>({});
  const [results, setResults] = useState<Record<number, { success: boolean; message: string }>>({});
  const [isAdmin, setIsAdmin] = useState(false);
  const [canClose, setCanClose] = useState(false);
  const [showAddBlock, setShowAddBlock] = useState(false);
  const [showAddLaunch, setShowAddLaunch] = useState(false);
  const [blockMenu, setBlockMenu] = useState<number | null>(null);
  const [editingBlock, setEditingBlock] = useState<AttendanceBlock | null>(null);
  const [newBlock, setNewBlock] = useState({ blockType: "A Block", date: "", code: "" });
  const [newLaunch, setNewLaunch] = useState({ title: "", date: "", startTime: "", endTime: "", notes: "", location: "" });
  const [blockError, setBlockError] = useState("");
  const [launchError, setLaunchError] = useState("");

  useEffect(() => {
    if (!loading) {
      if (!authenticated || !user) {
        router.push("/");
      } else {
        const memberRoles = ["admin", "sponsor", "officer", "ARCmember", "BOTRmember"];
        const hasMemberRole = user.roles.some(role => memberRoles.includes(role));
        if (!hasMemberRole) {
          router.push("/apply");
        }
        setIsAdmin(user.roles.includes("admin") || user.roles.includes("sponsor"));
        setCanClose(user.roles.includes("admin") || user.roles.includes("sponsor") || user.roles.includes("officer"));
      }
    }
  }, [loading, authenticated, user, router]);

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    setBlockDate(today);
    setNewBlock(prev => ({ ...prev, date: today }));
  }, []);

  useEffect(() => {
    if (blockDate) {
      fetchBlocks();
      fetchLaunches();
    }
  }, [blockDate]);

  const fetchBlocks = async () => {
    try {
      const params = canClose ? `?range=week` : `?date=${blockDate}`;
      const res = await fetch(`/api/attendance/today${params}`);
      if (res.ok) {
        const data = await res.json();
        setBlocks(data.blocks);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const fetchLaunches = async () => {
    try {
      const res = await fetch("/api/launches");
      if (res.ok) {
        const data = await res.json();
        setLaunches(data.launches);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleSubmitCode = async (blockId: number) => {
    const code = codeInputs[blockId];
    if (!code) return;

    setSubmitting(blockId);
    setResults(prev => ({ ...prev, [blockId]: { success: false, message: "" } }));

    try {
      const res = await fetch("/api/attendance/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blockId, code }),
      });

      const data = await res.json();

      if (res.ok) {
        setResults(prev => ({ ...prev, [blockId]: { success: true, message: "Marked present!" } }));
        setBlocks(prev => prev.map(b => b.id === blockId ? { ...b, submitted: true } : b));
        setCodeInputs(prev => ({ ...prev, [blockId]: "" }));
      } else {
        setResults(prev => ({ ...prev, [blockId]: { success: false, message: data.error || "Failed" } }));
      }
    } catch {
      setResults(prev => ({ ...prev, [blockId]: { success: false, message: "Failed to submit" } }));
    } finally {
      setSubmitting(null);
    }
  };

  const handleCreateBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setBlockError("");
    if (!newBlock.code.trim()) {
      setBlockError("Code is required");
      return;
    }
    try {
      const res = await fetch("/api/attendance/blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newBlock),
      });
      if (res.ok) {
        setNewBlock(prev => ({ ...prev, code: "" }));
        setShowAddBlock(false);
        fetchBlocks();
      } else {
        setBlockError("Failed to create block");
      }
    } catch {
      setBlockError("Failed to create block");
    }
  };

  const handleEditBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBlock) return;
    setBlockError("");
    try {
      const res = await fetch("/api/attendance/blocks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingBlock.id,
          blockType: editingBlock.blockType,
          date: editingBlock.date,
          code: editingBlock.code,
        }),
      });
      if (res.ok) {
        setEditingBlock(null);
        fetchBlocks();
      } else {
        setBlockError("Failed to update block");
      }
    } catch {
      setBlockError("Failed to update block");
    }
  };

  const handleDeleteBlock = async (blockId: number) => {
    try {
      const res = await fetch(`/api/attendance/blocks?id=${blockId}`, { method: "DELETE" });
      if (res.ok) {
        setBlockMenu(null);
        fetchBlocks();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleCloseBlock = async (blockId: number) => {
    try {
      const res = await fetch("/api/attendance/blocks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: blockId, isClosed: true }),
      });
      if (res.ok) {
        setBlockMenu(null);
        fetchBlocks();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleReopenBlock = async (blockId: number) => {
    try {
      const res = await fetch("/api/attendance/blocks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: blockId, isClosed: false }),
      });
      if (res.ok) {
        fetchBlocks();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleExportCSV = (blockId?: number) => {
    const url = blockId ? `/api/attendance/export?blockId=${blockId}` : "/api/attendance/export";
    window.open(url, "_blank");
  };

  const handleCreateLaunch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLaunchError("");
    if (!newLaunch.title.trim() || !newLaunch.date) {
      setLaunchError("Title and date are required");
      return;
    }
    try {
      const res = await fetch("/api/launches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newLaunch),
      });
      if (res.ok) {
        setNewLaunch({ title: "", date: "", startTime: "", endTime: "", notes: "", location: "" });
        setShowAddLaunch(false);
        fetchLaunches();
      } else {
        setLaunchError("Failed to create launch");
      }
    } catch {
      setLaunchError("Failed to create launch");
    }
  };

  const handleDeleteLaunch = async (id: number) => {
    try {
      const res = await fetch(`/api/launches?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchLaunches();
      }
    } catch (error) {
      console.error(error);
    }
  };

  if (loading || !user) {
    return <div className="pt-32 text-center text-white">Loading...</div>;
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric", year: "numeric" });
  };

  const isToday = blockDate === new Date().toISOString().split("T")[0];

  const todayBlocks = blocks.filter(b => {
    const d = new Date(b.date).toISOString().split("T")[0];
    return d === blockDate;
  });

  const pastBlocks = canClose && !isToday ? blocks.filter(b => {
    const d = new Date(b.date).toISOString().split("T")[0];
    return d !== blockDate;
  }) : [];

  const upcomingLaunches = launches
    .filter(l => new Date(l.date) >= new Date(new Date().toISOString().split("T")[0]))
    .slice(0, 3);

  return (
    <div className="pt-24 min-h-screen bg-neutral-900 text-white flex flex-col items-center">
      <div className="max-w-4xl w-full px-4 mt-8">
        <h1 className="text-2xl font-bold mb-2">Dashboard</h1>
        <p className="text-gray-400 mb-8">Your roles: {user.roles.join(", ")}</p>

        <div className="bg-neutral-900 border border-neutral-600 p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Attendance</h2>
            <div className="flex items-center gap-3">
              <input
                type="date"
                value={blockDate}
                onChange={(e) => setBlockDate(e.target.value)}
                className="bg-transparent border border-neutral-600 px-3 py-1.5 text-white text-sm"
              />
              {isAdmin && (
                <button
                  onClick={() => setShowAddBlock(true)}
                  className="p-1.5 text-gray-400 hover:text-white transition-colors"
                  title="Add Block"
                >
                  <Plus className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {showAddBlock && (
            <form onSubmit={handleCreateBlock} className="border border-neutral-700 p-3 mb-4 space-y-3">
              <div className="flex gap-2">
                <select
                  value={newBlock.blockType}
                  onChange={(e) => setNewBlock(prev => ({ ...prev, blockType: e.target.value }))}
                  className="bg-transparent border border-neutral-600 px-2 py-1.5 text-white text-sm flex-1"
                >
                  {BLOCK_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                <input
                  type="date"
                  value={newBlock.date}
                  onChange={(e) => setNewBlock(prev => ({ ...prev, date: e.target.value }))}
                  className="bg-transparent border border-neutral-600 px-2 py-1.5 text-white text-sm flex-1"
                />
              </div>
              <input
                type="text"
                value={newBlock.code}
                onChange={(e) => setNewBlock(prev => ({ ...prev, code: e.target.value }))}
                placeholder="Attendance code"
                className="w-full bg-transparent border border-neutral-600 px-2 py-1.5 text-white text-sm"
                required
              />
              {blockError && <p className="text-red-400 text-sm">{blockError}</p>}
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowAddBlock(false)} className="px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors">
                  Cancel
                </button>
                <button type="submit" className="px-3 py-1.5 text-sm border border-white text-white hover:bg-white hover:text-neutral-900 transition-colors">
                  Add Block
                </button>
              </div>
            </form>
          )}

          {editingBlock && (
            <form onSubmit={handleEditBlock} className="border border-neutral-700 p-3 mb-4 space-y-3">
              <div className="flex gap-2">
                <select
                  value={editingBlock.blockType}
                  onChange={(e) => setEditingBlock({ ...editingBlock, blockType: e.target.value })}
                  className="bg-transparent border border-neutral-600 px-2 py-1.5 text-white text-sm flex-1"
                >
                  {BLOCK_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                <input
                  type="date"
                  value={editingBlock.date}
                  onChange={(e) => setEditingBlock({ ...editingBlock, date: e.target.value })}
                  className="bg-transparent border border-neutral-600 px-2 py-1.5 text-white text-sm flex-1"
                />
              </div>
              <input
                type="text"
                value={editingBlock.code}
                onChange={(e) => setEditingBlock({ ...editingBlock, code: e.target.value })}
                placeholder="Attendance code"
                className="w-full bg-transparent border border-neutral-600 px-2 py-1.5 text-white text-sm"
                required
              />
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setEditingBlock(null)} className="px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors">
                  Cancel
                </button>
                <button type="submit" className="px-3 py-1.5 text-sm border border-white text-white hover:bg-white hover:text-neutral-900 transition-colors">
                  Save
                </button>
              </div>
            </form>
          )}

          {todayBlocks.length === 0 && pastBlocks.length === 0 ? (
            <p className="text-neutral-300">No blocks for this date.</p>
          ) : (
            <div className="space-y-4">
              {todayBlocks.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {todayBlocks.map((block) => (
                    <div key={block.id} className="bg-neutral-800 border border-neutral-700">
                      <div className="flex items-center justify-between px-3 pt-2 pb-1 border-b border-neutral-700/50">
                        <span className="text-xs text-gray-400">{formatDate(block.date)}</span>
                        {canClose && (
                          <div className="relative">
                            <button
                              onClick={() => setBlockMenu(blockMenu === block.id ? null : block.id)}
                              className="p-0.5 text-gray-400 hover:text-white transition-colors"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                            {blockMenu === block.id && (
                              <div className="absolute right-0 top-6 w-32 bg-neutral-700 shadow-lg border border-white/10 overflow-hidden py-1 z-10">
                                  {isAdmin && (
                                    <button
                                      onClick={() => { setEditingBlock({ ...block, date: block.date.split("T")[0] }); setBlockMenu(null); }}
                                      className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-gray-200 hover:bg-neutral-600 transition-colors"
                                    >
                                      Edit
                                    </button>
                                  )}
                                  {block.isClosed ? (
                                    <button
                                      onClick={() => { handleReopenBlock(block.id); setBlockMenu(null); }}
                                      className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-green-400 hover:bg-neutral-600 transition-colors"
                                    >
                                      Reopen
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => { handleCloseBlock(block.id); setBlockMenu(null); }}
                                      className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-yellow-400 hover:bg-neutral-600 transition-colors"
                                    >
                                      Close
                                    </button>
                                  )}
                                  <button
                                    onClick={() => { handleDeleteBlock(block.id); }}
                                    className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-red-400 hover:bg-neutral-600 transition-colors"
                                  >
                                    Delete
                                  </button>
                                  <hr className="border-white/10" />
                                  <button
                                    onClick={() => { handleExportCSV(block.id); setBlockMenu(null); }}
                                    className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-gray-200 hover:bg-neutral-600 transition-colors"
                                  >
                                    Export CSV
                                  </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="p-3 pt-2">
                        {block.submitted ? (
                          <p className="text-green-400 text-sm">Attendance marked</p>
                        ) : (
                          <>
                            <div className="flex items-center gap-2 mb-2">
                              {block.isClosed && <Ban className="w-3 h-3 text-yellow-400" />}
                              <button
                                onClick={() => handleSubmitCode(block.id)}
                                disabled={submitting === block.id}
                                className="flex-1 bg-transparent border border-neutral-600 px-4 py-2.5 text-white font-medium text-base transition-colors disabled:opacity-50 flex items-center justify-center gap-2 hover:bg-neutral-800"
                              >
                                {submitting === block.id ? (
                                  <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
                                ) : block.blockType}
                              </button>
                            </div>
                            <input
                              type="text"
                              value={codeInputs[block.id] || ""}
                              onChange={(e) => setCodeInputs(prev => ({ ...prev, [block.id]: e.target.value }))}
                              placeholder="Enter code"
                              className="w-full bg-transparent border-b border-white/20 text-white text-base py-1.5 outline-none focus:border-white/50"
                              onKeyDown={(e) => e.key === "Enter" && handleSubmitCode(block.id)}
                            />
                          </>
                        )}
                        {!block.submitted && results[block.id] && (
                          <p className={`text-sm mt-1.5 ${results[block.id].success ? "text-green-400" : "text-red-400"}`}>
                            {results[block.id].message}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {pastBlocks.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wider">Past Blocks</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {pastBlocks.map((block) => (
                      <div key={block.id} className="bg-neutral-800/70 border border-neutral-700/50 opacity-80">
                        <div className="flex items-center justify-between px-3 pt-2 pb-1 border-b border-neutral-700/50">
                          <span className="text-xs text-gray-400">{formatDate(block.date)}</span>
                          {canClose && (
                            <div className="relative">
                              <button
                                onClick={() => setBlockMenu(blockMenu === block.id ? null : block.id)}
                                className="p-0.5 text-gray-400 hover:text-white transition-colors"
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </button>
                              {blockMenu === block.id && (
                                <div className="absolute right-0 top-6 w-32 bg-neutral-700 shadow-lg border border-white/10 overflow-hidden py-1 z-10">
                                  {isAdmin && (
                                    <button
                                      onClick={() => { setEditingBlock({ ...block, date: block.date.split("T")[0] }); setBlockMenu(null); }}
                                      className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-gray-200 hover:bg-neutral-600 transition-colors"
                                    >
                                      Edit
                                    </button>
                                  )}
                                  {block.isClosed ? (
                                    <button
                                      onClick={() => { handleReopenBlock(block.id); setBlockMenu(null); }}
                                      className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-green-400 hover:bg-neutral-600 transition-colors"
                                    >
                                      Reopen
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => { handleCloseBlock(block.id); setBlockMenu(null); }}
                                      className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-yellow-400 hover:bg-neutral-600 transition-colors"
                                    >
                                      Close
                                    </button>
                                  )}
                                  <button
                                    onClick={() => { handleDeleteBlock(block.id); }}
                                    className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-red-400 hover:bg-neutral-600 transition-colors"
                                  >
                                    Delete
                                  </button>
                                  <hr className="border-white/10" />
                                  <button
                                    onClick={() => { handleExportCSV(block.id); setBlockMenu(null); }}
                                    className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-gray-200 hover:bg-neutral-600 transition-colors"
                                  >
                                    Export CSV
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="p-3 pt-2">
                          {block.submitted ? (
                            <p className="text-green-400/70 text-sm">Attendance marked</p>
                          ) : (
                            <div className="flex items-center gap-2 text-gray-400">
                              {block.isClosed && <Ban className="w-3 h-3 text-yellow-400" />}
                              <span className="font-medium text-sm">{block.blockType}</span>
                              {block.isClosed && <span className="text-xs text-yellow-400">Closed</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bg-neutral-900 border border-neutral-600 p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Upcoming Launches</h2>
            {isAdmin && (
              <button
                onClick={() => setShowAddLaunch(true)}
                className="p-1.5 text-gray-400 hover:text-white transition-colors"
                title="Add Launch"
              >
                <Plus className="w-5 h-5" />
              </button>
            )}
          </div>

          {showAddLaunch && (
            <form onSubmit={handleCreateLaunch} className="border border-neutral-700 p-3 mb-4 space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newLaunch.title}
                  onChange={(e) => setNewLaunch(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Title"
                  className="flex-1 bg-transparent border border-neutral-600 px-2 py-1.5 text-white text-sm"
                  required
                />
                <input
                  type="date"
                  value={newLaunch.date}
                  onChange={(e) => setNewLaunch(prev => ({ ...prev, date: e.target.value }))}
                  className="bg-transparent border border-neutral-600 px-2 py-1.5 text-white text-sm"
                  required
                />
              </div>
              <div className="flex gap-2">
                <input
                  type="time"
                  value={newLaunch.startTime}
                  onChange={(e) => setNewLaunch(prev => ({ ...prev, startTime: e.target.value }))}
                  placeholder="Start time"
                  className="flex-1 bg-transparent border border-neutral-600 px-2 py-1.5 text-white text-sm"
                />
                <input
                  type="time"
                  value={newLaunch.endTime}
                  onChange={(e) => setNewLaunch(prev => ({ ...prev, endTime: e.target.value }))}
                  placeholder="End time"
                  className="flex-1 bg-transparent border border-neutral-600 px-2 py-1.5 text-white text-sm"
                />
                <input
                  type="text"
                  value={newLaunch.location}
                  onChange={(e) => setNewLaunch(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="Location"
                  className="flex-1 bg-transparent border border-neutral-600 px-2 py-1.5 text-white text-sm"
                />
              </div>
              <textarea
                value={newLaunch.notes}
                onChange={(e) => setNewLaunch(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Notes"
                className="w-full bg-transparent border border-neutral-600 px-2 py-1.5 text-white text-sm resize-none"
                rows={2}
              />
              {launchError && <p className="text-red-400 text-sm">{launchError}</p>}
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowAddLaunch(false)} className="px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors">
                  Cancel
                </button>
                <button type="submit" className="px-3 py-1.5 text-sm border border-white text-white hover:bg-white hover:text-neutral-900 transition-colors">
                  Add Launch
                </button>
              </div>
            </form>
          )}

          {upcomingLaunches.length === 0 ? (
            <p className="text-neutral-300">No upcoming launches.</p>
          ) : (
            <div className="space-y-3">
              {upcomingLaunches.map((launch) => (
                <div key={launch.id} className="bg-neutral-800 border border-neutral-700 p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">{launch.title}</span>
                        {canClose && (
                          <button
                            onClick={() => handleDeleteLaunch(launch.id)}
                            className="p-0.5 text-gray-500 hover:text-red-400 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <p className="text-sm text-gray-400 mt-1">
                        {formatDate(launch.date)}
                        {(launch.startTime || launch.endTime) && (
                          <span className="ml-2">
                            <Clock className="w-3 h-3 inline mr-1" />
                            {launch.startTime}{launch.startTime && launch.endTime && " – "}{launch.endTime}
                          </span>
                        )}
                      </p>
                      {launch.location && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          <MapPin className="w-3 h-3 inline mr-1" />
                          {launch.location}
                        </p>
                      )}
                      {launch.notes && (
                        <p className="text-sm text-gray-300 mt-1">{launch.notes}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
