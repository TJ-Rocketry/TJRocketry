"use client";
import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Download, Folder, HardDrive } from "lucide-react";
import Modal from "@/app/components/Modal";
import { api } from "@/lib/api-client";
import { DriveFile, downloadUrl, kindOf } from "./types";

type FolderRow = { id: number; name: string; parentId: number | null };

export function MoveDialog({
  items,
  currentFolder,
  onClose,
  onMove,
}: {
  items: DriveFile[];
  currentFolder: number | null;
  onClose: () => void;
  onMove: (destination: number | null) => void;
}) {
  const [folders, setFolders] = useState<FolderRow[] | null>(null);
  const [target, setTarget] = useState<number | null>(currentFolder);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  useEffect(() => {
    api<{ folders: FolderRow[] }>("/api/resources?category=digital_files&folders=1")
      .then(d => setFolders(d.folders))
      .catch(() => setFolders([]));
  }, []);

  const moving = useMemo(() => new Set(items.map(i => i.id)), [items]);
  const children = (parent: number | null) => (folders ?? []).filter(f => f.parentId === parent && !moving.has(f.id));

  const row = (f: FolderRow, depth: number): React.ReactNode => {
    const kids = children(f.id);
    const open = expanded.has(f.id);
    return (
      <div key={f.id}>
        <div
          className={`flex items-center gap-1 py-1.5 pr-2 cursor-pointer text-sm ${target === f.id ? "bg-white/10" : "hover:bg-white/5"}`}
          style={{ paddingLeft: 8 + depth * 16 }}
          onClick={() => setTarget(f.id)}
          onDoubleClick={() => onMove(f.id)}
        >
          <button
            onClick={e => { e.stopPropagation(); setExpanded(s => { const n = new Set(s); if (n.has(f.id)) n.delete(f.id); else n.add(f.id); return n; }); }}
            className={`p-0.5 text-muted ${kids.length ? "" : "invisible"}`}
            aria-label={open ? "Collapse" : "Expand"}
          >
            <ChevronRight className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-90" : ""}`} />
          </button>
          <Folder className="w-4 h-4 text-accent" fill="currentColor" fillOpacity={0.25} />
          <span className="truncate">{f.name}</span>
        </div>
        {open && kids.map(k => row(k, depth + 1))}
      </div>
    );
  };

  return (
    <Modal title={`Move ${items.length === 1 ? `"${items[0].name}"` : `${items.length} items`}`} onClose={onClose}>
      <div className="border border-line max-h-80 overflow-y-auto py-1">
        <div
          className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer text-sm ${target === null ? "bg-white/10" : "hover:bg-white/5"}`}
          onClick={() => setTarget(null)}
          onDoubleClick={() => onMove(null)}
        >
          <HardDrive className="w-4 h-4 text-muted" /> Digital Files
        </div>
        {folders === null ? <p className="px-3 py-2 text-sm text-muted">Loading…</p> : children(null).map(f => row(f, 1))}
      </div>
      <div className="flex justify-end gap-2 mt-5">
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" disabled={target === currentFolder} onClick={() => onMove(target)}>Move here</button>
      </div>
    </Modal>
  );
}

const ACCESS = [
  { key: "everyone", label: "Everyone signed in" },
  { key: "arc", label: "ARC members" },
  { key: "sli", label: "SLI members" },
  { key: "officers", label: "Officers" },
  { key: "admin", label: "Admins" },
  { key: "team", label: "Specific teams" },
];

export function PermissionsDialog({ item, onClose }: { item: DriveFile; onClose: () => void }) {
  const [types, setTypes] = useState<string[] | null>(null);
  const [teamIds, setTeamIds] = useState<number[]>([]);
  const [teams, setTeams] = useState<{ id: number; name: string }[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      api<{ teams: { id: number; name: string }[] }>("/api/teams"),
      api<{ permissions: { accessType: string; teamId: number | null }[] }>(`/api/resources/permissions?fileId=${item.id}`),
    ])
      .then(([t, p]) => {
        setTeams(t.teams);
        setTypes(p.permissions.length ? [...new Set(p.permissions.map(x => x.accessType))] : ["everyone"]);
        setTeamIds(p.permissions.filter(x => x.teamId).map(x => x.teamId!));
      })
      .catch(err => setError(err.message));
  }, [item.id]);

  const toggle = (key: string) => setTypes(t => (t!.includes(key) ? t!.filter(x => x !== key) : [...t!, key]));

  const save = async () => {
    try {
      await api("/api/resources/permissions", {
        method: "POST",
        json: { fileId: item.id, accessTypes: types?.length ? types : ["everyone"], teamIds },
      });
      onClose();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <Modal title="Who can see this?" subtitle={item.name} onClose={onClose}>
      {types === null ? (
        <p className="text-sm text-muted">{error || "Loading…"}</p>
      ) : (
        <div className="space-y-2">
          {ACCESS.map(a => (
            <label key={a.key} className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" className="accent-accent" checked={types.includes(a.key)} onChange={() => toggle(a.key)} />
              {a.label}
            </label>
          ))}
          {types.includes("team") && (
            <div className="ml-6 pl-3 border-l border-line space-y-1.5">
              {teams.map(t => (
                <label key={t.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" className="accent-accent" checked={teamIds.includes(t.id)}
                    onChange={() => setTeamIds(ids => (ids.includes(t.id) ? ids.filter(i => i !== t.id) : [...ids, t.id]))} />
                  {t.name}
                </label>
              ))}
              {teams.length === 0 && <p className="text-sm text-muted">No teams yet.</p>}
            </div>
          )}
          <p className="text-xs text-muted pt-2">Officers and admins can always see everything. Folder access also applies to what&apos;s inside.</p>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex justify-end gap-2 pt-3">
            <button className="btn" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={save}>Save</button>
          </div>
        </div>
      )}
    </Modal>
  );
}

export function PreviewDialog({ file, onClose }: { file: DriveFile; onClose: () => void }) {
  const kind = kindOf(file);
  return (
    <Modal title={file.name} wide onClose={onClose}>
      <div className="flex items-center justify-center min-h-[40vh]">
        {kind === "image" && file.fileUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={file.fileUrl} alt={file.name} className="max-h-[70vh] max-w-full object-contain" />
        ) : kind === "pdf" && file.fileUrl ? (
          <iframe src={file.fileUrl} title={file.name} className="w-full h-[70vh] bg-white" />
        ) : kind === "video" && file.fileUrl ? (
          <video src={file.fileUrl} controls className="max-h-[70vh] max-w-full" />
        ) : (
          <p className="text-muted">No preview for this file type.</p>
        )}
      </div>
      <div className="flex justify-end mt-4">
        <a href={downloadUrl(file)} className="btn btn-primary"><Download className="w-4 h-4" /> Download</a>
      </div>
    </Modal>
  );
}
