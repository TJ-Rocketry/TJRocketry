"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronRight, Download, Eye, FolderInput, FolderPlus, FolderUp, Grid3X3, List, Loader2, Pencil,
  Plus, Search, Shield, Trash2, Upload, X, ArrowUp, ArrowDown, Check, AlertCircle,
} from "lucide-react";
import { isStaffUser, useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api-client";
import PageShell from "@/app/components/PageShell";
import FileIcon from "@/app/components/drive/FileIcon";
import { MoveDialog, PermissionsDialog, PreviewDialog } from "@/app/components/drive/Dialogs";
import { DriveFile, FolderRef, downloadUrl, formatModified, formatSize, kindOf } from "@/app/components/drive/types";

type SortKey = "name" | "createdAt" | "fileSize";
type UploadItem = { key: string; name: string; progress: number; status: "queued" | "uploading" | "done" | "error"; error?: string };
type Pending = { file: File; relPath: string[] };
type Menu = { x: number; y: number; target: DriveFile | null };

const ROOT: FolderRef = { id: null, name: "Digital Files" };
const PREVIEWABLE = new Set(["image", "pdf", "video"]);
const MAX_PARALLEL = 3;

function readFolderParam() {
  const v = new URLSearchParams(window.location.search).get("folder");
  return v ? Number(v) || null : null;
}

async function entriesToFiles(entry: FileSystemEntry, path: string[] = []): Promise<Pending[]> {
  if (entry.isFile) {
    const file = await new Promise<File>((res, rej) => (entry as FileSystemFileEntry).file(res, rej));
    return [{ file, relPath: path }];
  }
  const reader = (entry as FileSystemDirectoryEntry).createReader();
  const children: FileSystemEntry[] = [];
  for (;;) {
    const batch = await new Promise<FileSystemEntry[]>((res, rej) => reader.readEntries(res, rej));
    if (!batch.length) break;
    children.push(...batch);
  }
  const nested = await Promise.all(children.map(c => entriesToFiles(c, [...path, entry.name])));
  return nested.flat();
}

function uploadOne(file: File, parentId: number | null, onProgress: (p: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const fd = new FormData();
    fd.append("files", file);
    fd.set("category", "digital_files");
    if (parentId !== null) fd.set("parentId", String(parentId));
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/resources/upload");
    xhr.upload.onprogress = e => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve();
      try {
        reject(new Error(JSON.parse(xhr.responseText).error || "Upload failed"));
      } catch {
        reject(new Error(xhr.status === 413 ? "File too large" : "Upload failed"));
      }
    };
    xhr.onerror = () => reject(new Error("Network error"));
    xhr.send(fd);
  });
}

export default function DigitalFilesPage() {
  const { user, authenticated, loading } = useAuth();
  const router = useRouter();
  const staff = isStaffUser(user);

  const [folderId, setFolderId] = useState<number | null>(null);
  const [path, setPath] = useState<FolderRef[]>([ROOT]);
  const [items, setItems] = useState<DriveFile[] | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DriveFile[] | null>(null);
  const [view, setView] = useState<"list" | "grid">("list");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "name", dir: 1 });
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [anchor, setAnchor] = useState<number | null>(null);
  const [renaming, setRenaming] = useState<{ id: number; value: string } | null>(null);
  const [menu, setMenu] = useState<Menu | null>(null);
  const [newMenu, setNewMenu] = useState(false);
  const [newFolder, setNewFolder] = useState<string | null>(null);
  const [moving, setMoving] = useState<DriveFile[] | null>(null);
  const [perms, setPerms] = useState<DriveFile | null>(null);
  const [preview, setPreview] = useState<DriveFile | null>(null);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [dropActive, setDropActive] = useState(false);
  const [dragOver, setDragOver] = useState<number | "root" | null>(null);
  const [error, setError] = useState("");

  const dragDepth = useRef(0);

  useEffect(() => {
    if (!loading && (!authenticated || !user)) router.push("/");
  }, [loading, authenticated, user, router]);

  useEffect(() => {
    queueMicrotask(() => {
      setFolderId(readFolderParam());
      try {
        if (localStorage.getItem("drive-view") === "grid") setView("grid");
      } catch {}
    });
    const onPop = () => setFolderId(readFolderParam());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams({ category: "digital_files" });
      if (folderId !== null) params.set("parentId", String(folderId));
      const [list, info] = await Promise.all([
        api<{ files: DriveFile[] }>(`/api/resources?${params}`),
        folderId !== null ? api<{ path: FolderRef[] }>(`/api/resources?id=${folderId}`) : Promise.resolve({ path: [] }),
      ]);
      setItems(list.files);
      setPath([ROOT, ...info.path]);
      setError("");
    } catch (err) {
      setError((err as Error).message === "Not found" ? "That folder doesn't exist or you don't have access." : (err as Error).message);
      setItems([]);
    }
  }, [folderId]);

  useEffect(() => {
    if (!user) return;
    queueMicrotask(() => { void load(); });
  }, [user, load]);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      queueMicrotask(() => setResults(null));
      return;
    }
    const t = setTimeout(() => {
      api<{ files: DriveFile[] }>(`/api/resources?category=digital_files&q=${encodeURIComponent(q)}`)
        .then(d => setResults(d.files))
        .catch(() => setResults([]));
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  const open = useCallback((id: number | null) => {
    setFolderId(id);
    setSelected(new Set());
    setQuery("");
    setItems(null);
    window.history.pushState(null, "", id === null ? "/resources/digital-files" : `/resources/digital-files?folder=${id}`);
  }, []);

  const shown = useMemo(() => {
    const list = [...(results ?? items ?? [])];
    list.sort((a, b) => {
      if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;
      let cmp: number;
      if (sort.key === "name") cmp = a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" });
      else if (sort.key === "createdAt") cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      else cmp = (a.fileSize ?? 0) - (b.fileSize ?? 0);
      return cmp * sort.dir;
    });
    return list;
  }, [items, results, sort]);

  const selection = shown.filter(f => selected.has(f.id));

  const activate = (f: DriveFile) => {
    if (f.isFolder) open(f.id);
    else if (PREVIEWABLE.has(kindOf(f))) setPreview(f);
    else window.open(downloadUrl(f), "_blank");
  };

  const clickItem = (e: React.MouseEvent, f: DriveFile, index: number) => {
    e.stopPropagation();
    setMenu(null);
    if (e.shiftKey && anchor !== null) {
      const [a, b] = [Math.min(anchor, index), Math.max(anchor, index)];
      setSelected(new Set(shown.slice(a, b + 1).map(x => x.id)));
      return;
    }
    if (e.metaKey || e.ctrlKey) {
      setSelected(s => {
        const n = new Set(s);
        if (n.has(f.id)) n.delete(f.id);
        else n.add(f.id);
        return n;
      });
    } else {
      setSelected(new Set([f.id]));
    }
    setAnchor(index);
  };

  const run = async (fn: () => Promise<unknown>) => {
    setError("");
    try {
      await fn();
    } catch (err) {
      setError((err as Error).message);
    }
    load();
  };

  const remove = (targets: DriveFile[]) => {
    if (!targets.length) return;
    const label = targets.length === 1 ? `"${targets[0].name}"` : `${targets.length} items`;
    const hasFolder = targets.some(t => t.isFolder);
    if (!confirm(`Delete ${label}?${hasFolder ? " Everything inside folders is deleted too." : ""} This can't be undone.`)) return;
    setSelected(new Set());
    run(() => api(`/api/resources?ids=${targets.map(t => t.id).join(",")}`, { method: "DELETE" }));
  };

  const move = (targets: DriveFile[], destination: number | null) => {
    const ids = targets.filter(t => t.id !== destination).map(t => t.id);
    if (!ids.length) return;
    setMoving(null);
    setSelected(new Set());
    run(() => api("/api/resources", { method: "PUT", json: { action: "move", ids, parentId: destination } }));
  };

  const commitRename = () => {
    if (!renaming) return;
    const item = shown.find(f => f.id === renaming.id);
    const name = renaming.value.trim();
    setRenaming(null);
    if (!item || !name || name === item.name) return;
    run(() => api("/api/resources", { method: "PUT", json: { id: item.id, action: "rename", name } }));
  };

  const createFolder = () => {
    const name = newFolder?.trim();
    setNewFolder(null);
    if (!name) return;
    run(() => api("/api/resources", { method: "POST", json: { action: "folder", name, parentId: folderId, category: "digital_files" } }));
  };

  const enqueue = async (pending: Pending[]) => {
    const files = pending.filter(p => !p.file.name.startsWith(".") && p.file.size > 0);
    if (!files.length || !staff) return;
    const base = folderId;
    const keyed = files.map((p, i) => ({ ...p, key: `${Date.now()}-${i}-${p.file.name}` }));
    setUploads(u => [
      ...u.filter(x => x.status !== "done"),
      ...keyed.map(p => ({ key: p.key, name: [...p.relPath, p.file.name].join("/"), progress: 0, status: "queued" as const })),
    ]);
    const patch = (key: string, next: Partial<UploadItem>) => setUploads(u => u.map(x => (x.key === key ? { ...x, ...next } : x)));

    const folders = new Map<string, Promise<number | null>>([["", Promise.resolve(base)]]);
    const ensureFolder = (parts: string[]): Promise<number | null> => {
      const key = parts.join("/");
      if (!folders.has(key)) {
        folders.set(key, ensureFolder(parts.slice(0, -1)).then(async parent => {
          const { file } = await api<{ file: { id: number } }>("/api/resources", {
            method: "POST",
            json: { action: "folder", name: parts[parts.length - 1], parentId: parent, category: "digital_files" },
          });
          return file.id;
        }));
      }
      return folders.get(key)!;
    };

    let next = 0;
    const worker = async () => {
      while (next < keyed.length) {
        const p = keyed[next++];
        patch(p.key, { status: "uploading" });
        try {
          const parent = await ensureFolder(p.relPath);
          await uploadOne(p.file, parent, progress => patch(p.key, { progress }));
          patch(p.key, { status: "done", progress: 1 });
        } catch (err) {
          patch(p.key, { status: "error", error: (err as Error).message });
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(MAX_PARALLEL, keyed.length) }, worker));
    load();
  };

  const onPick = (list: FileList | null, keepPaths: boolean) => {
    if (!list) return;
    enqueue(Array.from(list).map(file => ({
      file,
      relPath: keepPaths && file.webkitRelativePath ? file.webkitRelativePath.split("/").slice(0, -1) : [],
    })));
  };

  const onDropFiles = async (e: React.DragEvent) => {
    e.preventDefault();
    dragDepth.current = 0;
    setDropActive(false);
    if (!staff || !e.dataTransfer.types.includes("Files")) return;
    const entries = Array.from(e.dataTransfer.items)
      .map(i => i.webkitGetAsEntry?.())
      .filter((x): x is FileSystemEntry => !!x);
    if (entries.length) enqueue((await Promise.all(entries.map(en => entriesToFiles(en)))).flat());
    else enqueue(Array.from(e.dataTransfer.files).map(file => ({ file, relPath: [] })));
  };

  const dragItemStart = (e: React.DragEvent, f: DriveFile) => {
    if (!staff) return e.preventDefault();
    const ids = selected.has(f.id) ? [...selected] : [f.id];
    if (!selected.has(f.id)) setSelected(new Set([f.id]));
    e.dataTransfer.setData("application/x-drive-ids", ids.join(","));
    e.dataTransfer.effectAllowed = "move";
  };

  const dropOnFolder = (e: React.DragEvent, destination: number | null) => {
    setDragOver(null);
    const raw = e.dataTransfer.getData("application/x-drive-ids");
    if (!raw) return;
    e.preventDefault();
    e.stopPropagation();
    const ids = raw.split(",").map(Number);
    if (destination !== null && ids.includes(destination)) return;
    move(shown.filter(f => ids.includes(f.id)), destination);
  };

  const folderDropProps = (id: number | null) => staff ? {
    onDragOver: (e: React.DragEvent) => {
      if (e.dataTransfer.types.includes("application/x-drive-ids")) {
        e.preventDefault();
        setDragOver(id ?? "root");
      }
    },
    onDragLeave: () => setDragOver(null),
    onDrop: (e: React.DragEvent) => dropOnFolder(e, id),
  } : {};

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest("input, textarea, select, [role=dialog]")) return;
      if ((e.metaKey || e.ctrlKey) && e.key === "a") {
        e.preventDefault();
        setSelected(new Set(shown.map(f => f.id)));
      } else if (e.key === "Escape") {
        setSelected(new Set());
        setMenu(null);
      } else if ((e.key === "Delete" || e.key === "Backspace") && staff && selection.length) {
        e.preventDefault();
        remove(selection);
      } else if (e.key === "Enter" && selection.length === 1) {
        activate(selection[0]);
      } else if (e.key === "F2" && staff && selection.length === 1) {
        setRenaming({ id: selection[0].id, value: selection[0].name });
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  useEffect(() => {
    if (!menu && !newMenu) return;
    const close = () => { setMenu(null); setNewMenu(false); };
    document.addEventListener("click", close);
    document.addEventListener("scroll", close, true);
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("scroll", close, true);
    };
  }, [menu, newMenu]);

  const openMenu = (e: React.MouseEvent, f: DriveFile | null) => {
    e.preventDefault();
    e.stopPropagation();
    if (f && !selected.has(f.id)) setSelected(new Set([f.id]));
    if (!f && !staff) return;
    setMenu({ x: Math.min(e.clientX, window.innerWidth - 220), y: Math.min(e.clientY, window.innerHeight - 300), target: f });
  };

  if (loading || !user) return <PageShell title="Digital Files" back={{ href: "/resources", label: "Resources" }} loading />;

  const totalActive = uploads.filter(u => u.status === "queued" || u.status === "uploading").length;
  const searching = results !== null;

  const headerSort = (key: SortKey, label: string, className = "") => (
    <th className={`py-2 pr-3 font-medium ${className}`}>
      <button
        className="inline-flex items-center gap-1 hover:text-foreground"
        onClick={() => setSort(s => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : 1 }))}
      >
        {label}
        {sort.key === key && (sort.dir === 1 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
      </button>
    </th>
  );

  const nameCell = (f: DriveFile) =>
    renaming?.id === f.id ? (
      <input
        autoFocus
        value={renaming.value}
        onChange={e => setRenaming({ id: f.id, value: e.target.value })}
        onBlur={commitRename}
        onKeyDown={e => {
          if (e.key === "Enter") commitRename();
          if (e.key === "Escape") setRenaming(null);
        }}
        onClick={e => e.stopPropagation()}
        onFocus={e => {
          const dot = f.isFolder ? -1 : f.name.lastIndexOf(".");
          e.currentTarget.setSelectionRange(0, dot > 0 ? dot : f.name.length);
        }}
        className="field py-0.5"
      />
    ) : (
      <span className="truncate">{f.name}</span>
    );

  const menuButton = (icon: React.ReactNode, label: string, action: () => void, danger = false) => (
    <button
      key={label}
      className={`flex w-full items-center gap-2.5 px-3 py-1.5 hover:bg-white/5 ${danger ? "text-red-400" : ""}`}
      onClick={() => { setMenu(null); setNewMenu(false); action(); }}
    >
      {icon} {label}
    </button>
  );

  const createItems = [
    menuButton(<FolderPlus className="w-4 h-4 text-muted" />, "New folder", () => setNewFolder("")),
    menuButton(<Upload className="w-4 h-4 text-muted" />, "Upload files", () => document.getElementById("drive-files")?.click()),
    menuButton(<FolderUp className="w-4 h-4 text-muted" />, "Upload folder", () => document.getElementById("drive-folder")?.click()),
  ];

  return (
    <PageShell
      title="Digital Files"
      back={{ href: "/resources", label: "Resources" }}
      actions={staff && (
        <div className="relative">
          <button className="btn btn-primary" onClick={e => { e.stopPropagation(); setNewMenu(v => !v); }}>
            <Plus className="w-4 h-4" /> New
          </button>
          {newMenu && (
            <div className="absolute right-0 top-full mt-1 w-48 z-30 bg-background border border-line py-1 text-sm" onClick={e => e.stopPropagation()}>
              {createItems}
            </div>
          )}
          <input id="drive-files" type="file" multiple hidden onChange={e => { onPick(e.target.files, false); e.target.value = ""; }} />
          <input
            id="drive-folder"
            type="file"
            hidden
            {...({ webkitdirectory: "", directory: "" } as Record<string, string>)}
            onChange={e => { onPick(e.target.files, true); e.target.value = ""; }}
          />
        </div>
      )}
    >
      <div
        className="relative min-h-[60vh] select-none"
        onClick={() => { setSelected(new Set()); setMenu(null); }}
        onContextMenu={e => openMenu(e, null)}
        onDragEnter={e => {
          if (!staff || !e.dataTransfer.types.includes("Files")) return;
          dragDepth.current++;
          setDropActive(true);
        }}
        onDragLeave={() => {
          if (--dragDepth.current <= 0) { dragDepth.current = 0; setDropActive(false); }
        }}
        onDragOver={e => e.dataTransfer.types.includes("Files") && e.preventDefault()}
        onDrop={onDropFiles}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <nav className="flex items-center flex-wrap gap-0.5 text-lg min-w-0" aria-label="Folder path">
            {searching ? (
              <span className="font-medium">Search results</span>
            ) : (
              path.map((p, i) => (
                <span key={p.id ?? "root"} className="flex items-center gap-0.5 min-w-0">
                  {i > 0 && <ChevronRight className="w-4 h-4 text-muted shrink-0" />}
                  <button
                    onClick={e => { e.stopPropagation(); if (i < path.length - 1) open(p.id); }}
                    {...folderDropProps(p.id)}
                    className={`px-1.5 py-0.5 truncate max-w-56 ${i === path.length - 1 ? "font-medium" : "text-muted hover:text-foreground"} ${
                      dragOver === (p.id ?? "root") ? "bg-accent/20 outline outline-1 outline-accent" : ""
                    }`}
                  >
                    {p.name}
                  </button>
                </span>
              ))
            )}
          </nav>
          <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search all files" className="field pl-8 w-56" />
              {query && (
                <button onClick={() => setQuery("")} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-foreground">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="flex border border-line">
              {(["list", "grid"] as const).map(v => (
                <button
                  key={v}
                  onClick={() => { setView(v); try { localStorage.setItem("drive-view", v); } catch {} }}
                  aria-label={`${v} view`}
                  aria-pressed={view === v}
                  className={`p-1.5 ${view === v ? "bg-white/10 text-foreground" : "text-muted hover:text-foreground"}`}
                >
                  {v === "list" ? <List className="w-4 h-4" /> : <Grid3X3 className="w-4 h-4" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        {selection.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 mb-3 px-2 py-1.5 bg-white/5 text-sm" onClick={e => e.stopPropagation()}>
            <button onClick={() => setSelected(new Set())} aria-label="Clear selection" className="p-1 text-muted hover:text-foreground"><X className="w-4 h-4" /></button>
            <span className="mr-3">{selection.length} selected</span>
            {selection.every(s => !s.isFolder) && (
              <button className="inline-flex items-center gap-1.5 px-2 py-1 hover:bg-white/10" onClick={() => selection.forEach(s => window.open(downloadUrl(s), "_blank"))}>
                <Download className="w-4 h-4" /> Download
              </button>
            )}
            {staff && (
              <>
                <button className="inline-flex items-center gap-1.5 px-2 py-1 hover:bg-white/10" onClick={() => setMoving(selection)}>
                  <FolderInput className="w-4 h-4" /> Move
                </button>
                {selection.length === 1 && (
                  <>
                    <button className="inline-flex items-center gap-1.5 px-2 py-1 hover:bg-white/10" onClick={() => setRenaming({ id: selection[0].id, value: selection[0].name })}>
                      <Pencil className="w-4 h-4" /> Rename
                    </button>
                    <button className="inline-flex items-center gap-1.5 px-2 py-1 hover:bg-white/10" onClick={() => setPerms(selection[0])}>
                      <Shield className="w-4 h-4" /> Access
                    </button>
                  </>
                )}
                <button className="inline-flex items-center gap-1.5 px-2 py-1 text-red-400 hover:bg-white/10" onClick={() => remove(selection)}>
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
              </>
            )}
          </div>
        )}

        {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

        {newFolder !== null && (
          <div className="mb-3 flex items-center gap-2 max-w-md" onClick={e => e.stopPropagation()}>
            <FileIcon kind="folder" />
            <input
              autoFocus
              value={newFolder}
              placeholder="Folder name"
              onChange={e => setNewFolder(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") createFolder(); if (e.key === "Escape") setNewFolder(null); }}
              className="field"
            />
            <button className="btn btn-primary" onClick={createFolder}>Create</button>
            <button className="btn" onClick={() => setNewFolder(null)}>Cancel</button>
          </div>
        )}

        {(searching ? results : items) === null ? (
          <p className="text-muted py-10 text-center">Loading…</p>
        ) : shown.length === 0 ? (
          <div className="py-20 text-center text-muted">
            <FileIcon kind="folder" className="w-12 h-12 mx-auto mb-3 opacity-60" />
            {searching ? "No files match your search." : staff ? "This folder is empty. Drop files here or use New." : "This folder is empty."}
          </div>
        ) : view === "list" ? (
          <table className="w-full text-left text-sm table-fixed">
            <thead>
              <tr className="border-b border-line text-xs text-muted">
                {headerSort("name", "Name")}
                <th className="py-2 pr-3 font-medium w-40 hidden md:table-cell">Owner</th>
                {headerSort("createdAt", "Added", "w-32 hidden sm:table-cell")}
                {headerSort("fileSize", "Size", "w-24 hidden sm:table-cell")}
              </tr>
            </thead>
            <tbody>
              {shown.map((f, i) => (
                <tr
                  key={f.id}
                  draggable={staff && renaming?.id !== f.id}
                  onDragStart={e => dragItemStart(e, f)}
                  {...(f.isFolder ? folderDropProps(f.id) : {})}
                  onClick={e => clickItem(e, f, i)}
                  onDoubleClick={() => activate(f)}
                  onContextMenu={e => openMenu(e, f)}
                  className={`border-b border-line cursor-default ${selected.has(f.id) ? "bg-accent/15" : "hover:bg-white/5"} ${
                    dragOver === f.id ? "outline outline-1 outline-accent bg-accent/20" : ""
                  }`}
                >
                  <td className="py-2 pr-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileIcon kind={kindOf(f)} />
                      {nameCell(f)}
                    </div>
                  </td>
                  <td className="py-2 pr-3 text-muted truncate hidden md:table-cell">{f.ownerName || "—"}</td>
                  <td className="py-2 pr-3 text-muted hidden sm:table-cell">{formatModified(f.createdAt)}</td>
                  <td className="py-2 pr-3 text-muted hidden sm:table-cell">{f.isFolder ? "—" : formatSize(f.fileSize)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="space-y-6">
            {[true, false].map(folders => {
              const group = shown.filter(f => f.isFolder === folders);
              if (!group.length) return null;
              return (
                <div key={String(folders)}>
                  <h3 className="text-sm text-muted mb-2">{folders ? "Folders" : "Files"}</h3>
                  <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
                    {group.map(f => {
                      const kind = kindOf(f);
                      return (
                        <div
                          key={f.id}
                          draggable={staff && renaming?.id !== f.id}
                          onDragStart={e => dragItemStart(e, f)}
                          {...(f.isFolder ? folderDropProps(f.id) : {})}
                          onClick={e => clickItem(e, f, shown.indexOf(f))}
                          onDoubleClick={() => activate(f)}
                          onContextMenu={e => openMenu(e, f)}
                          className={`border cursor-default overflow-hidden ${
                            selected.has(f.id) ? "border-accent bg-accent/15" : "border-line hover:bg-white/5"
                          } ${dragOver === f.id ? "outline outline-1 outline-accent bg-accent/20" : ""}`}
                        >
                          {!folders && (
                            <div className="h-28 flex items-center justify-center border-b border-line overflow-hidden">
                              {kind === "image" && f.fileUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={f.fileUrl} alt="" loading="lazy" draggable={false} className="w-full h-full object-cover" />
                              ) : (
                                <FileIcon kind={kind} className="w-10 h-10" />
                              )}
                            </div>
                          )}
                          <div className="flex items-center gap-2 px-3 py-2.5 min-w-0 text-sm">
                            <FileIcon kind={kind} className="w-4 h-4" />
                            {nameCell(f)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {dropActive && (
          <div className="absolute inset-0 z-20 border-2 border-dashed border-accent bg-accent/10 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <Upload className="w-10 h-10 text-accent mx-auto mb-2" />
              <p className="font-medium">Drop to upload to {path[path.length - 1].name}</p>
              <p className="text-sm text-muted">Folders keep their structure</p>
            </div>
          </div>
        )}
      </div>

      {menu && (
        <div
          style={{ left: menu.x, top: menu.y }}
          className="fixed z-50 w-52 bg-background border border-line py-1 text-sm shadow-2xl"
          onClick={e => e.stopPropagation()}
          onContextMenu={e => e.preventDefault()}
        >
          {menu.target ? (() => {
            const t = menu.target;
            const targets = selected.size > 1 && selected.has(t.id) ? selection : [t];
            const single = targets.length === 1;
            return (
              <>
                {single && menuButton(
                  t.isFolder ? <FolderInput className="w-4 h-4 text-muted" /> : <Eye className="w-4 h-4 text-muted" />,
                  t.isFolder ? "Open" : PREVIEWABLE.has(kindOf(t)) ? "Preview" : "Open",
                  () => activate(t),
                )}
                {targets.every(x => !x.isFolder) && menuButton(
                  <Download className="w-4 h-4 text-muted" />,
                  single ? "Download" : `Download ${targets.length}`,
                  () => targets.forEach(x => window.open(downloadUrl(x), "_blank")),
                )}
                {staff && (
                  <>
                    <hr className="border-line my-1" />
                    {single && menuButton(<Pencil className="w-4 h-4 text-muted" />, "Rename", () => setRenaming({ id: t.id, value: t.name }))}
                    {menuButton(<FolderInput className="w-4 h-4 text-muted" />, "Move to…", () => setMoving(targets))}
                    {single && menuButton(<Shield className="w-4 h-4 text-muted" />, "Who can see this", () => setPerms(t))}
                    <hr className="border-line my-1" />
                    {menuButton(<Trash2 className="w-4 h-4" />, single ? "Delete" : `Delete ${targets.length}`, () => remove(targets), true)}
                  </>
                )}
              </>
            );
          })() : createItems}
        </div>
      )}

      {uploads.length > 0 && (
        <div className="fixed bottom-4 right-4 z-40 w-80 bg-background border border-line shadow-2xl">
          <div className="flex items-center justify-between px-3 py-2 border-b border-line text-sm">
            <span className="font-medium">
              {totalActive
                ? `Uploading ${totalActive} item${totalActive === 1 ? "" : "s"}…`
                : `${uploads.filter(u => u.status === "done").length} of ${uploads.length} uploaded`}
            </span>
            {!totalActive && (
              <button onClick={() => setUploads([])} aria-label="Close uploads" className="text-muted hover:text-foreground"><X className="w-4 h-4" /></button>
            )}
          </div>
          <ul className="max-h-60 overflow-y-auto text-sm">
            {uploads.map(u => (
              <li key={u.key} className="px-3 py-2 border-b border-line last:border-0">
                <div className="flex items-center gap-2">
                  <FileIcon kind={kindOf({ name: u.name, isFolder: false })} className="w-4 h-4" />
                  <span className="truncate flex-1" title={u.name}>{u.name}</span>
                  {u.status === "done" && <Check className="w-4 h-4 text-green-400" />}
                  {u.status === "uploading" && <Loader2 className="w-4 h-4 animate-spin text-muted" />}
                  {u.status === "error" && <AlertCircle className="w-4 h-4 text-red-400" />}
                </div>
                {u.status === "uploading" && (
                  <div className="h-0.5 bg-line mt-1.5">
                    <div className="h-full bg-accent transition-all" style={{ width: `${Math.round(u.progress * 100)}%` }} />
                  </div>
                )}
                {u.error && <p className="text-xs text-red-400 mt-1">{u.error}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {moving && <MoveDialog items={moving} currentFolder={folderId} onClose={() => setMoving(null)} onMove={dest => move(moving, dest)} />}
      {perms && <PermissionsDialog item={perms} onClose={() => setPerms(null)} />}
      {preview && <PreviewDialog file={preview} onClose={() => setPreview(null)} />}
    </PageShell>
  );
}
