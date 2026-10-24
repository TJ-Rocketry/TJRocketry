"use client";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { UserType } from "./types";

const ROLES = ["admin", "sponsor", "officer", "ARCmember", "BOTRmember", "user"];

export default function UsersTab({
  users,
  onRoleToggle,
  onPositionSave,
}: {
  users: UserType[];
  onRoleToggle: (userId: number, role: string, currentRoles: string[]) => void;
  onPositionSave: (userId: number, position: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [drafts, setDrafts] = useState<Record<number, string>>({});

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(u =>
      [u.name, u.username, u.email, ...u.roles].some(v => v?.toLowerCase().includes(q)),
    );
  }, [users, query]);

  const savePosition = (u: UserType) => {
    const draft = drafts[u.id];
    if (draft === undefined || draft.trim() === (u.position ?? "")) return;
    onPositionSave(u.id, draft);
  };

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
        <input className="field pl-8" placeholder="Search name, email, role…" value={query} onChange={e => setQuery(e.target.value)} />
      </div>
      <div className="border border-line overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line text-xs text-muted">
              <th className="p-3 font-medium">ID</th>
              <th className="p-3 font-medium">Name</th>
              <th className="p-3 font-medium hidden md:table-cell">Email</th>
              <th className="p-3 font-medium">Officer position</th>
              <th className="p-3 font-medium">Roles</th>
            </tr>
          </thead>
          <tbody>
            {visible.map(u => {
              const isOfficer = u.roles.includes("officer");
              return (
                <tr key={u.id} className="border-b border-line last:border-0">
                  <td className="p-3 text-muted font-mono">{u.id}</td>
                  <td className="p-3">
                    <div>{u.name || "—"}</div>
                    <div className="text-xs text-muted font-mono">{u.username || "—"}</div>
                  </td>
                  <td className="p-3 text-muted hidden md:table-cell">{u.email || "—"}</td>
                  <td className="p-3">
                    {isOfficer ? (
                      <input
                        className="field py-1 min-w-36"
                        placeholder="e.g. Captain"
                        value={drafts[u.id] ?? u.position ?? ""}
                        onChange={e => setDrafts(d => ({ ...d, [u.id]: e.target.value }))}
                        onBlur={() => savePosition(u)}
                        onKeyDown={e => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                      />
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {ROLES.map(role => {
                        const active = u.roles.includes(role);
                        return (
                          <button
                            key={role}
                            onClick={() => onRoleToggle(u.id, role, u.roles)}
                            aria-pressed={active}
                            className={`px-2 py-0.5 text-xs border transition-colors ${
                              active ? "border-foreground text-foreground" : "border-line text-muted hover:text-foreground"
                            }`}
                          >
                            {role}
                          </button>
                        );
                      })}
                    </div>
                  </td>
                </tr>
              );
            })}
            {visible.length === 0 && (
              <tr><td colSpan={5} className="p-8 text-center text-muted">No users match.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
