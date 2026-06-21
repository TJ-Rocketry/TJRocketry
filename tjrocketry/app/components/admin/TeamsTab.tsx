"use client";
import { useState, useRef, useEffect } from "react";
import { Plus, Trash2, X, Shield } from "lucide-react";
import { UserType, TeamType, TeamMemberType } from "./types";
import InlineEdit from "@/app/components/InlineEdit";

export default function TeamsTab({
  users: allUsers,
  teams,
  teamMembers,
  onAddTeam,
  onSaveTeam,
  onDeleteTeam,
  onAddMember,
  onRemoveMember,
}: {
  users: UserType[];
  teams: TeamType[];
  teamMembers: Record<number, TeamMemberType[]>;
  onAddTeam: () => Promise<void>;
  onSaveTeam: (id: number, name: string, arcId: string) => Promise<void>;
  onDeleteTeam: (id: number) => void;
  onAddMember: (teamId: number, userId: number, role: string) => Promise<void>;
  onRemoveMember: (teamId: number, memberId: number) => void;
}) {
  const [editing, setEditing] = useState<{ teamId: number; field: "name" | "arc"; value: string } | null>(null);
  const [dropdown, setDropdown] = useState<{
    teamId: number;
    role: "captain" | "member";
    rect: DOMRect;
    query: string;
  } | null>(null);
  const ddRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (ddRef.current && !ddRef.current.contains(e.target as Node)) {
        setDropdown(null);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  return (
    <div className="border border-neutral-700 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-neutral-700 bg-neutral-900">
        <h2 className="text-sm font-semibold">Teams</h2>
        <button onClick={onAddTeam}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-neutral-600 text-gray-300 hover:text-white hover:border-white transition-colors">
          <Plus className="w-3.5 h-3.5" /> New Team
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-neutral-800 text-[11px] text-gray-500 uppercase tracking-wider">
              <th className="px-4 py-2 font-medium">Team Name</th>
              <th className="px-4 py-2 font-medium">ARC ID</th>
              <th className="px-4 py-2 font-medium">Captains</th>
              <th className="px-4 py-2 font-medium">Members</th>
              <th className="px-4 py-2 font-medium w-12"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800">
            {teams.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-500">
                  No teams yet. Click &quot;New Team&quot; to create one.
                </td>
              </tr>
            ) : (
              teams.map(team => {
                const members = teamMembers[team.id] || [];
                const captains = members.filter(m => m.role === "captain");
                const regulars = members.filter(m => m.role === "member");
                const exclude = members.map(m => m.userId);

                const openDropdown = (e: React.MouseEvent, role: "captain" | "member") => {
                  setDropdown({ teamId: team.id, role, rect: e.currentTarget.getBoundingClientRect(), query: "" });
                };

                return (
                  <tr key={team.id} className="hover:bg-neutral-800/30 transition-colors">
                    <td className="px-4 py-2.5">
                      <InlineEdit
                        value={team.name}
                        editing={editing?.teamId === team.id && editing.field === "name"}
                        editValue={editing?.value ?? ""}
                        onStart={() => setEditing({ teamId: team.id, field: "name", value: team.name })}
                        onChange={v => setEditing(p => p ? { ...p, value: v } : null)}
                        onSave={v => { onSaveTeam(team.id, v, team.arcId || ""); setEditing(null); }}
                        onCancel={() => setEditing(null)}
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <InlineEdit
                        value={team.arcId || "—"}
                        dim
                        editing={editing?.teamId === team.id && editing.field === "arc"}
                        editValue={editing?.value ?? ""}
                        onStart={() => setEditing({ teamId: team.id, field: "arc", value: team.arcId || "" })}
                        onChange={v => setEditing(p => p ? { ...p, value: v } : null)}
                        onSave={v => { onSaveTeam(team.id, team.name, v); setEditing(null); }}
                        onCancel={() => setEditing(null)}
                        placeholder="ARC ID"
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1 flex-wrap min-h-[32px]">
                        {captains.map(m => (
                          <span key={m.id}
                            className="inline-flex items-center gap-0.5 px-2 py-0.5 text-xs border text-neutral-400">
                            {m.name || m.username || `#${m.userId}`}
                            <button onClick={() => onRemoveMember(team.id, m.id)}
                              className="text-yellow-600 hover:text-yellow-400 ml-0.5"><X className="w-2.5 h-2.5" /></button>
                          </span>
                        ))}
                        <button onClick={e => openDropdown(e, "captain")}
                          className="inline-flex items-center justify-center w-6 h-6 text-xs text-gray-500 border border-dashed border-neutral-700 hover:border-white hover:text-white transition-colors">
                          +
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1 flex-wrap min-h-[32px]">
                        {regulars.map(m => (
                          <span key={m.id}
                            className="inline-flex items-center gap-0.5 px-2 py-0.5 text-xs border border-neutral-600 text-gray-300">
                            {m.name || m.username || `#${m.userId}`}
                            <button onClick={() => onRemoveMember(team.id, m.id)}
                              className="text-gray-600 hover:text-red-400 ml-0.5"><X className="w-2.5 h-2.5" /></button>
                          </span>
                        ))}
                        <button onClick={e => openDropdown(e, "member")}
                          className="inline-flex items-center justify-center w-6 h-6 text-xs text-gray-500 border border-dashed border-neutral-700 hover:border-white hover:text-white transition-colors">
                          +
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <button onClick={() => onDeleteTeam(team.id)}
                        className="p-1 text-gray-600 hover:text-red-400 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {dropdown && (
        <MemberDropdown
          ddRef={ddRef}
          rect={dropdown.rect}
          query={dropdown.query}
          setQuery={q => setDropdown(p => p ? { ...p, query: q } : null)}
          results={(() => {
            if (!dropdown.query) return [];
            const members = teamMembers[dropdown.teamId] || [];
            const exclude = members.map(m => m.userId);
            return allUsers.filter(u =>
              (u.name || u.username || "").toLowerCase().includes(dropdown.query.toLowerCase()) && !exclude.includes(u.id)
            ).slice(0, 5);
          })()}
          onPick={u => {
            onAddMember(dropdown.teamId, u.id, dropdown.role);
            setDropdown(null);
          }}
          onClose={() => setDropdown(null)}
        />
      )}
    </div>
  );
}

function MemberDropdown({
  ddRef,
  rect,
  query,
  setQuery,
  results,
  onPick,
  onClose,
}: {
  ddRef: React.RefObject<HTMLDivElement | null>;
  rect: DOMRect;
  query: string;
  setQuery: (q: string) => void;
  results: UserType[];
  onPick: (u: UserType) => void;
  onClose: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  return (
    <div ref={ddRef}
      style={{ position: "fixed", left: rect.left, top: rect.bottom + 4, minWidth: 180 }}
      className="z-50 bg-neutral-800 border border-neutral-700 shadow-xl">
      <input ref={inputRef} type="text" value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Type name..."
        onKeyDown={e => { if (e.key === "Escape") onClose(); }}
        className="w-full bg-neutral-900 border-b border-neutral-700 px-3 py-2 text-sm text-white outline-none placeholder-gray-500" />
      <div className="max-h-48 overflow-y-auto">
        {results.map(u => (
          <button key={u.id}
            onClick={() => onPick(u)}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-300 hover:bg-neutral-700 text-left">
            {u.name || u.username || `#${u.id}`}
          </button>
        ))}
        {query && results.length === 0 && (
          <span className="block px-3 py-2 text-xs text-gray-600">No users</span>
        )}
      </div>
    </div>
  );
}
