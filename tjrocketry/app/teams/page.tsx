"use client";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Shield } from "lucide-react";
import InlineEdit from "@/app/components/InlineEdit";

type Team = {
  id: number;
  name: string;
  arcId?: string | null;
};

type TeamMember = {
  id: number;
  userId: number;
  role: string;
  name: string | null;
  username: string | null;
};

export default function TeamsPage() {
  const { user, authenticated, loading } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [members, setMembers] = useState<Record<number, TeamMember[]>>({});
  const [editing, setEditing] = useState<{ teamId: number; field: "name" | "arc"; value: string } | null>(null);
  const [teamSelectionDate, setTeamSelectionDate] = useState<string | null>(null);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  const isArc = user?.roles.some(r => ["admin", "sponsor", "officer", "ARCmember"].includes(r));

  const fetchPublic = async () => {
    const res = await fetch("/api/public/teams");
    if (res.ok) {
      const d = await res.json();
      setTeams(d.teams);
      const m: Record<number, TeamMember[]> = {};
      d.teams.forEach((t: any) => { m[t.id] = t.members; });
      setMembers(m);
    }
  };

  const fetchInternal = async () => {
    const res = await fetch("/api/teams");
    if (res.ok) {
      const d = await res.json();
      setTeams(d.teams);
      d.teams.forEach((t: Team) => fetchMembers(t.id));
    }
  };

  const fetchMembers = async (teamId: number) => {
    const res = await fetch(`/api/teams/${teamId}/members`);
    if (res.ok) {
      const d = await res.json();
      setMembers(prev => ({ ...prev, [teamId]: d.members }));
    }
  };

  const fetchSettings = async () => {
    const res = await fetch("/api/public/settings");
    if (res.ok) {
      const d = await res.json();
      setTeamSelectionDate(d.settings?.teamSelectionDate || null);
    }
    setSettingsLoaded(true);
  };

  useEffect(() => {
    if (loading) return;
    fetchSettings();
    if (authenticated && user && isArc) {
      fetchInternal();
    } else {
      fetchPublic();
    }
  }, [loading, authenticated, user]);

  const handleSaveTeam = async (teamId: number, name: string, arcId: string) => {
    if (!name.trim()) return;
    await fetch(`/api/teams/${teamId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), arcId: arcId.trim() || null }),
    });
    setEditing(null);
    fetchInternal();
  };

  const isOnTeam = (teamId: number) => {
    if (!user) return false;
    return (members[teamId] || []).some(m => m.userId === user.id);
  };

  const isTeamCaptain = (teamId: number) => {
    if (!user) return false;
    return (members[teamId] || []).some(m => m.userId === user.id && m.role === "captain");
  };

  const beforeSelection = settingsLoaded && teamSelectionDate && new Date() < new Date(teamSelectionDate);

  return (
    <div className="pt-24 min-h-screen bg-neutral-900 text-white">
      <div className="max-w-4xl mx-auto px-4 mt-8 pb-24">
        <h1 className="text-2xl font-bold mb-8">{isArc ? "Teams" : "Our Teams"}</h1>

        {!settingsLoaded ? (
          <p className="text-gray-500 text-sm">Loading...</p>
        ) : beforeSelection && !isArc ? (
          <div className="border border-neutral-700 p-6">
            <p className="text-neutral-300">
              The teams for the American Rocketry Challenge at TJ have not been selected yet. To apply, visit the{" "}
              <Link href="/apply" className="text-white underline hover:text-blue-400">application page</Link>.
            </p>
          </div>
        ) : teams.length === 0 ? (
          <p className="text-gray-500 text-sm">No teams configured yet.</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {teams.map(team => {
              const teamMems = members[team.id] || [];
              const captains = teamMems.filter(m => m.role === "captain");
              const regulars = teamMems.filter(m => m.role === "member");
              const mine = isOnTeam(team.id);
              const canEdit = isArc || isTeamCaptain(team.id);

              return (
                <div key={team.id}
                  className={`border p-5 transition-colors ${mine ? "border-neutral-500 bg-neutral-800/60" : "border-neutral-700"}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {canEdit ? (
                          <InlineEdit
                            value={team.name}
                            editing={editing?.teamId === team.id && editing.field === "name"}
                            editValue={editing?.value ?? ""}
                            onStart={() => setEditing({ teamId: team.id, field: "name", value: team.name })}
                            onChange={v => setEditing(p => p ? { ...p, value: v } : null)}
                            onSave={v => handleSaveTeam(team.id, v, team.arcId || "")}
                            onCancel={() => setEditing(null)}
                          />
                        ) : (
                          <h2 className="text-lg font-semibold">{team.name}</h2>
                        )}
                      </div>
                      {isArc && team.arcId && (
                        <p className="text-sm text-neutral-400 mt-0.5">ARC ID: {team.arcId}</p>
                      )}
                    </div>
                    {mine && !canEdit && (
                      <span className="text-xs text-neutral-400 flex items-center gap-1 shrink-0"><Shield className="w-3 h-3" />Member</span>
                    )}
                  </div>

                  {captains.length > 0 && (
                    <div className="mb-2">
                      <p className="text-sm text-neutral-400 mb-1">Captains</p>
                      <div className="flex flex-wrap gap-1">
                        {captains.map(m => (
                          <span key={m.id} className="inline-flex items-center gap-1 px-2 py-0.5 text-sm text-neutral-300">
                            {m.name || m.username || `Member`}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {regulars.length > 0 && (
                    <div>
                      <p className="text-sm text-neutral-400 mb-1">Members</p>
                      <div className="flex flex-wrap gap-1">
                        {regulars.map(m => (
                          <span key={m.id} className="inline-flex items-center gap-1 px-2 py-0.5 text-sm text-neutral-300">
                            {m.name || m.username || `Member`}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {teamMems.length === 0 && (
                    <p className="text-sm text-neutral-600">No members assigned yet.</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
