"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Crown, Plus, Trash2, X } from "lucide-react";
import { isAdminUser, useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api-client";
import PageShell from "@/app/components/PageShell";

type Member = {
  id: number;
  userId: number;
  role: string;
  name: string | null;
  username: string | null;
};

type Team = {
  id: number;
  name: string;
  arcId?: string | null;
  members: Member[];
};

type Person = { id: number; name: string | null; username: string | null };

const display = (p: { name: string | null; username: string | null }) => p.name || p.username || "Member";

function AddPerson({
  people,
  exclude,
  label,
  onPick,
}: {
  people: Person[];
  exclude: Set<number>;
  label: string;
  onPick: (person: Person) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const q = query.trim().toLowerCase();
  const results = q
    ? people.filter(p => !exclude.has(p.id) && [p.name, p.username].some(v => v?.toLowerCase().includes(q))).slice(0, 6)
    : [];

  const pick = (p: Person) => {
    onPick(p);
    setQuery("");
  };

  return (
    <div className="relative" ref={ref}>
      <input
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={e => {
          if (e.key === "Enter" && results[0]) { e.preventDefault(); pick(results[0]); }
          if (e.key === "Escape") setOpen(false);
        }}
        placeholder={label}
        aria-label={label}
        className="w-full bg-transparent text-sm py-1 outline-none border-b border-line focus:border-foreground placeholder:text-muted"
      />
      {open && q && (
        <div className="absolute left-0 right-0 top-full mt-1 z-20 bg-background border border-line">
          {results.map(p => (
            <button key={p.id} onMouseDown={e => e.preventDefault()} onClick={() => pick(p)}
              className="block w-full text-left px-3 py-2 text-sm hover:bg-white/5">
              {display(p)}
              {p.name && p.username && <span className="text-muted"> · {p.username}</span>}
            </button>
          ))}
          {results.length === 0 && <p className="px-3 py-2 text-sm text-muted">No one matches.</p>}
        </div>
      )}
    </div>
  );
}

function EditableText({
  value,
  placeholder,
  onSave,
  className,
}: {
  value: string;
  placeholder: string;
  onSave: (v: string) => void;
  className?: string;
}) {
  const [draft, setDraft] = useState(value);
  return (
    <input
      value={draft}
      placeholder={placeholder}
      aria-label={placeholder}
      onChange={e => setDraft(e.target.value)}
      onBlur={() => draft.trim() !== value && onSave(draft.trim())}
      onKeyDown={e => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        if (e.key === "Escape") { setDraft(value); (e.target as HTMLInputElement).blur(); }
      }}
      className={`bg-transparent outline-none border-b border-transparent hover:border-line focus:border-foreground w-full ${className ?? ""}`}
    />
  );
}

export default function TeamsPage() {
  const { user, authenticated, loading } = useAuth();
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [teamSelectionDate, setTeamSelectionDate] = useState<string | null>(null);
  const [error, setError] = useState("");

  const admin = isAdminUser(user);
  const isArc = !!user?.roles.some(r => ["admin", "sponsor", "officer", "ARCmember"].includes(r));

  const load = useCallback(async () => {
    try {
      const url = authenticated && isArc ? "/api/teams" : "/api/public/teams";
      setTeams((await api<{ teams: Team[] }>(url)).teams);
    } catch (err) {
      setError((err as Error).message);
      setTeams([]);
    }
  }, [authenticated, isArc]);

  useEffect(() => {
    if (loading) return;
    queueMicrotask(() => { void load(); });
    api<{ settings: Record<string, string | null> }>("/api/public/settings")
      .then(d => setTeamSelectionDate(d.settings?.teamSelectionDate || null))
      .catch(() => {});
    if (admin) {
      api<{ users: Person[] }>("/api/admin/users").then(d => setPeople(d.users)).catch(() => {});
    }
  }, [loading, admin, load]);

  const teamOf = useMemo(() => {
    const map = new Map<number, string>();
    teams?.forEach(t => t.members.forEach(m => map.set(m.userId, t.name)));
    return map;
  }, [teams]);

  const run = async (fn: () => Promise<unknown>) => {
    setError("");
    try {
      await fn();
    } catch (err) {
      setError((err as Error).message);
    }
    load();
  };

  const saveTeam = (team: Team, patch: { name?: string; arcId?: string }) =>
    run(() => api(`/api/teams/${team.id}`, {
      method: "PUT",
      json: { name: patch.name ?? team.name, arcId: (patch.arcId ?? team.arcId ?? "") || null },
    }));

  const addMember = (team: Team, person: Person, role: "captain" | "member") => {
    const elsewhere = teamOf.get(person.id);
    if (elsewhere && elsewhere !== team.name && !confirm(`${display(person)} is already on ${elsewhere}. Add them here too?`)) return;
    run(() => api(`/api/teams/${team.id}/members`, { method: "POST", json: { userId: person.id, role } }));
  };

  const beforeSelection = !!teamSelectionDate && new Date() < new Date(teamSelectionDate);

  const memberList = (team: Team, role: "captain" | "member", canEdit: boolean) => {
    const list = team.members.filter(m => (role === "captain" ? m.role === "captain" : m.role !== "captain"));
    return (
      <div>
        <p className="text-xs text-muted mb-1.5">{role === "captain" ? "Captains" : "Members"}</p>
        {list.length === 0 && !admin && <p className="text-sm text-muted">None yet.</p>}
        <ul className="space-y-1">
          {list.map(m => (
            <li key={m.id} className="group flex items-center justify-between gap-2 text-sm">
              <span className={user?.id === m.userId ? "text-accent" : ""}>{display(m)}</span>
              {canEdit && (
                <span className="flex items-center gap-1 opacity-60 group-hover:opacity-100">
                  <button
                    onClick={() => run(() => api(`/api/teams/${team.id}/members`, { method: "PUT", json: { memberId: m.id, role: role === "captain" ? "member" : "captain" } }))}
                    title={role === "captain" ? "Make member" : "Make captain"}
                    aria-label={role === "captain" ? `Make ${display(m)} a member` : `Make ${display(m)} a captain`}
                    className="p-1 text-muted hover:text-accent"
                  >
                    <Crown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => run(() => api(`/api/teams/${team.id}/members?memberId=${m.id}`, { method: "DELETE" }))}
                    aria-label={`Remove ${display(m)}`}
                    className="p-1 text-muted hover:text-red-400"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              )}
            </li>
          ))}
        </ul>
        {canEdit && (
          <div className="mt-2">
            <AddPerson
              people={people}
              exclude={new Set(team.members.map(m => m.userId))}
              label={role === "captain" ? "+ Add captain" : "+ Add member"}
              onPick={p => addMember(team, p, role)}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <PageShell
      title={isArc ? "Teams" : "Our Teams"}
      description={admin ? "Click a team name or ARC ID to edit it. Type in a list to add people." : undefined}
      actions={admin && (
        <button className="btn btn-primary" onClick={() => run(() => api("/api/teams", { method: "POST", json: { name: "New Team" } }))}>
          <Plus className="w-4 h-4" /> New team
        </button>
      )}
    >
        {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

        {teams === null ? (
          <p className="text-muted text-sm">Loading…</p>
        ) : beforeSelection && !isArc ? (
          <p>
            Teams for the American Rocketry Challenge haven&apos;t been selected yet. To apply, visit the{" "}
            <Link href="/apply" className="underline hover:text-accent">application page</Link>.
          </p>
        ) : teams.length === 0 ? (
          <p className="text-muted text-sm">No teams yet.</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-x-10 gap-y-12">
            {teams.map(team => {
              const captain = !!user && team.members.some(m => m.userId === user.id && m.role === "captain");
              const canRename = admin || captain;
              return (
                <section key={team.id}>
                  <div className="flex items-start justify-between gap-3 border-b border-line pb-2 mb-4">
                    <div className="flex-1 min-w-0">
                      {canRename ? (
                        <EditableText key={`n${team.name}`} value={team.name} placeholder="Team name" className="text-lg font-semibold"
                          onSave={name => name && saveTeam(team, { name })} />
                      ) : (
                        <h2 className="text-lg font-semibold">{team.name}</h2>
                      )}
                      {isArc && (canRename ? (
                        <EditableText key={`a${team.arcId}`} value={team.arcId ?? ""} placeholder="ARC ID" className="text-sm text-muted"
                          onSave={arcId => saveTeam(team, { arcId })} />
                      ) : team.arcId ? (
                        <p className="text-sm text-muted">ARC ID {team.arcId}</p>
                      ) : null)}
                    </div>
                    {admin && (
                      <button
                        onClick={() => confirm(`Delete ${team.name} and its roster?`) && run(() => api(`/api/teams/${team.id}`, { method: "DELETE" }))}
                        aria-label={`Delete ${team.name}`}
                        className="p-1 text-muted hover:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    {memberList(team, "captain", admin)}
                    {memberList(team, "member", admin)}
                  </div>
                </section>
              );
            })}
          </div>
        )}
    </PageShell>
  );
}
