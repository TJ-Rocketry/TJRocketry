"use client";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import React, { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft, Search, FolderPlus, Folder, FileText,
  MoreVertical, Download, Pencil, Trash2, Shield, X, Check,
  ChevronRight, Grid3X3, List, FileUp
} from "lucide-react";

type ResourceFile = {
  id: number;
  name: string;
  description: string | null;
  fileUrl: string | null;
  fileSize: number | null;
  category: string;
  subCategory: string | null;
  isFolder: boolean;
  parentId: number | null;
  uploadedById: number | null;
  createdAt: string;
};

type FilePermission = {
  id: number;
  fileId: number;
  accessType: string;
  teamId: number | null;
};

type Team = {
  id: number;
  name: string;
};

type Breadcrumb = { id: number | null; name: string };

function formatSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase();
  if (["pdf"].includes(ext || "")) return "pdf";
  if (["png", "jpg", "jpeg", "gif", "svg", "webp"].includes(ext || "")) return "image";
  if (["doc", "docx"].includes(ext || "")) return "doc";
  if (["xls", "xlsx", "csv"].includes(ext || "")) return "sheet";
  if (["zip", "rar", "7z", "tar", "gz"].includes(ext || "")) return "archive";
  if (["py", "js", "ts", "java", "cpp", "c", "h", "html", "css"].includes(ext || "")) return "code";
  return "file";
}

export default function DigitalFilesPage() {
  const { user, authenticated, loading } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<ResourceFile[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<number | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([{ id: null, name: "Digital Files" }]);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [menuOpen, setMenuOpen] = useState<number | null>(null);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [permModal, setPermModal] = useState<ResourceFile | null>(null);
  const [permAccessTypes, setPermAccessTypes] = useState<string[]>(["everyone"]);
  const [permTeamIds, setPermTeamIds] = useState<number[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [existingPerms, setExistingPerms] = useState<FilePermission[]>([]);
  const [dragOverId, setDragOverId] = useState<number | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; folderId: number | null } | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadTargetRef = useRef<number | null>(null);
  const createFolderParentRef = useRef<number | null>(null);
  const ctxRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const isOfficer = user?.roles.some(r => ["admin", "sponsor", "officer"].includes(r));

  useEffect(() => {
    if (!loading && (!authenticated || !user)) router.push("/");
  }, [loading, authenticated, user, router]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ctxRef.current && !ctxRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const fetchItems = useCallback(async (folderId: number | null) => {
    try {
      const params = new URLSearchParams({ category: "digital_files" });
      if (folderId !== null) params.set("parentId", String(folderId));
      const res = await fetch(`/api/resources?${params}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.files);
      }
    } catch {}
  }, []);

  const fetchBreadcrumbs = useCallback(async (folderId: number | null) => {
    const crumbs: Breadcrumb[] = [{ id: null, name: "Digital Files" }];
    if (folderId === null) {
      setBreadcrumbs(crumbs);
      return;
    }
    const ids: number[] = [];
    let current = folderId;
    while (current) {
      ids.unshift(current);
      try {
        const res = await fetch(`/api/resources?id=${current}`);
        if (res.ok) {
          const data = await res.json();
          if (data.file?.parentId) {
            current = data.file.parentId;
          } else {
            break;
          }
        } else break;
      } catch { break; }
    }
    for (const id of ids) {
      try {
        const res = await fetch(`/api/resources?id=${id}`);
        if (res.ok) {
          const data = await res.json();
          crumbs.push({ id: data.file.id, name: data.file.name });
        }
      } catch {}
    }
    setBreadcrumbs(crumbs);
  }, []);

  useEffect(() => {
    fetchItems(currentFolderId);
    fetchBreadcrumbs(currentFolderId);
  }, [currentFolderId, fetchItems, fetchBreadcrumbs]);

  const uploadFiles = async (fileList: FileList, parentId: number | null = currentFolderId) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList).filter(f => !f.name.startsWith(".") && !f.webkitRelativePath?.startsWith("."));
    if (files.length === 0) return;
    setIsUploading(true);
    setUploadError(null);
    const isAdmin = user?.roles.includes("admin");
    const maxBytes = isAdmin ? Infinity : 25 * 1024 * 1024;
    const totalBytes = files.reduce((sum, f) => sum + f.size, 0);
    if (totalBytes > maxBytes) {
      setUploadError("Total upload size exceeds 25 MB limit.");
      setIsUploading(false);
      return;
    }
    const errors: string[] = [];
    const skipped: string[] = [];

    // Quick connectivity test
    try {
      const ping = await fetch("/api/resources/upload");
      if (!ping.ok) { errors.push("Upload route unavailable"); }
    } catch (e) {
      errors.push("Upload route unreachable");
    }
    if (errors.length > 0) { setUploadError(errors.join(", ")); setIsUploading(false); return; }

    const formData = new FormData();
    for (const f of files) formData.append("files", f);
    if (parentId !== null) formData.set("parentId", String(parentId));
    formData.set("category", "digital_files");
    try {
      const res = await fetch("/api/resources/upload", { method: "POST", body: formData });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Upload failed" }));
        errors.push(err.error);
      }
    } catch {
      errors.push("Upload failed — try selecting fewer files");
    }
    if (errors.length > 0) setUploadError(errors.join(", "));
    if (errors.length > 0) {
      setUploadError(errors.slice(0, 4).join(", ") + (errors.length > 4 ? ` (+${errors.length - 4} more)` : ""));
    }
    if (skipped.length > 0) console.log("Skipped:", skipped.join(", "));
    fetchItems(currentFolderId);
    setIsUploading(false);
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    const parentId = createFolderParentRef.current;
    createFolderParentRef.current = null;
    try {
      await fetch("/api/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "folder",
          name: newFolderName.trim(),
          parentId: parentId ?? currentFolderId,
          category: "digital_files",
        }),
      });
      setNewFolderName("");
      setShowCreateFolder(false);
      fetchItems(currentFolderId);
    } catch {}
  };

  const handleRename = async (id: number) => {
    if (!renameValue.trim()) return;
    try {
      await fetch("/api/resources", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "rename", name: renameValue.trim() }),
      });
      setRenamingId(null);
      setRenameValue("");
      fetchItems(currentFolderId);
    } catch {}
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this item?")) return;
    try {
      await fetch(`/api/resources?id=${id}`, { method: "DELETE" });
      fetchItems(currentFolderId);
    } catch {}
  };

  const handleMove = async (id: number, newParentId: number | null) => {
    try {
      await fetch("/api/resources", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "move", parentId: newParentId }),
      });
      fetchItems(currentFolderId);
    } catch {}
  };

  const handleSetPermissions = async () => {
    if (!permModal) return;
    try {
      await fetch("/api/resources/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileId: permModal.id,
          accessTypes: permAccessTypes,
          teamIds: permTeamIds,
        }),
      });
      setPermModal(null);
      setPermAccessTypes(["everyone"]);
      setPermTeamIds([]);
    } catch {}
  };

  const openPermModal = async (item: ResourceFile) => {
    setPermModal(item);
    setPermAccessTypes(["everyone"]);
    setPermTeamIds([]);
    try {
      const [teamsRes, permsRes] = await Promise.all([
        fetch("/api/teams"),
        fetch(`/api/resources/permissions?fileId=${item.id}`),
      ]);
      if (teamsRes.ok) {
        const tData = await teamsRes.json();
        setTeams(tData.teams);
      }
      if (permsRes.ok) {
        const pData = await permsRes.json();
        setExistingPerms(pData.permissions);
        if (pData.permissions.length > 0) {
          setPermAccessTypes(pData.permissions.map((p: FilePermission) => p.accessType));
          setPermTeamIds(pData.permissions.filter((p: FilePermission) => p.teamId).map((p: FilePermission) => p.teamId!));
        }
      }
    } catch {}
  };

  const isFileDrag = (e: React.DragEvent) => {
    return e.dataTransfer.types && Array.from(e.dataTransfer.types).includes("Files");
  };

  const handleDragEnter = (e: React.DragEvent) => {
    if (isFileDrag(e)) {
      e.preventDefault();
      setDragActive(true);
    }
  };

  const handleDragStart = (e: React.DragEvent, item: ResourceFile) => {
    e.dataTransfer.setData("text/plain", String(item.id));
    e.dataTransfer.effectAllowed = "move";
  };

  const handleGlobalDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (isFileDrag(e)) {
      e.dataTransfer.dropEffect = "copy";
    }
  };

  const handleGlobalDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    setDragOverId(null);
    const draggedId = Number(e.dataTransfer.getData("text/plain"));
    if (isFileDrag(e) && e.dataTransfer.files.length > 0) {
      await uploadFiles(e.dataTransfer.files, currentFolderId);
    } else if (draggedId && currentFolderId !== null) {
      await handleMove(draggedId, currentFolderId);
    }
  };

  const handleItemDragOver = (e: React.DragEvent, item: ResourceFile) => {
    e.preventDefault();
    e.stopPropagation();
    if (isFileDrag(e)) {
      e.dataTransfer.dropEffect = "copy";
    } else {
      e.dataTransfer.dropEffect = "move";
    }
    if (item.isFolder) setDragOverId(item.id);
  };

  const handleItemDrop = async (e: React.DragEvent, targetFolder: ResourceFile) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setDragOverId(null);
    if (isFileDrag(e) && e.dataTransfer.files.length > 0) {
      await uploadFiles(e.dataTransfer.files, targetFolder.id);
    } else {
      const draggedId = Number(e.dataTransfer.getData("text/plain"));
      if (draggedId && targetFolder.isFolder && draggedId !== targetFolder.id) {
        await handleMove(draggedId, targetFolder.id);
      }
    }
  };

  const handleContextMenu = (e: React.MouseEvent, folderId: number | null = null) => {
    if (!isOfficer) return;
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, folderId });
  };

  const filtered = items.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading || !user) return <div className="pt-32 text-center text-white">Loading...</div>;

  return (
    <div className="pt-24 min-h-screen bg-neutral-900 text-white" ref={pageRef}
      onContextMenu={handleContextMenu}
      onDragEnter={handleDragEnter}
      onDragOver={handleGlobalDragOver}
      onDrop={handleGlobalDrop}
    >
      <div className="max-w-6xl mx-auto px-4 mt-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <Link href="/resources" className="text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-1 text-sm flex-wrap">
            {breadcrumbs.map((crumb, i) => (
              <span key={crumb.id ?? "root"} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="w-3 h-3 text-gray-600" />}
                {i < breadcrumbs.length - 1 ? (
                  <button
                    onClick={() => setCurrentFolderId(crumb.id)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    {crumb.name}
                  </button>
                ) : (
                  <span className="text-white font-medium">{crumb.name}</span>
                )}
              </span>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search..." className="w-48 bg-transparent border border-neutral-600 pl-10 pr-3 py-1.5 text-white text-sm"
              />
            </div>
            <button onClick={() => setViewMode(v => v === "grid" ? "list" : "grid")}
              className="p-1.5 text-gray-400 hover:text-white transition-colors" title="Toggle view">
              {viewMode === "grid" ? <List className="w-4 h-4" /> : <Grid3X3 className="w-4 h-4" />}
            </button>
            {isOfficer && (
              <>
                <button onClick={() => fileInputRef.current?.click()}
                  className="p-1.5 text-gray-400 hover:text-white transition-colors" title="Upload files">
                  <FileUp className="w-4 h-4" />
                </button>
                <input ref={fileInputRef} type="file" multiple className="hidden"
                  onChange={e => {
                    const target = uploadTargetRef.current;
                    uploadFiles(e.target.files as FileList, target);
                    uploadTargetRef.current = null;
                    e.target.value = "";
                  }} />

                <button onClick={() => { setShowCreateFolder(true); setNewFolderName(""); }}
                  className="p-1.5 text-gray-400 hover:text-white transition-colors" title="New folder">
                  <FolderPlus className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Create folder inline form */}
        {showCreateFolder && (
          <div className="flex items-center gap-2 mb-4 bg-neutral-800 border border-neutral-700 px-3 py-2">
            <Folder className="w-5 h-5 text-yellow-500" />
            <input type="text" value={newFolderName} onChange={e => setNewFolderName(e.target.value)}
              placeholder="Folder name" autoFocus className="flex-1 bg-transparent text-white text-sm border-b border-neutral-600 pb-0.5"
              onKeyDown={e => { if (e.key === "Enter") handleCreateFolder(); if (e.key === "Escape") setShowCreateFolder(false); }} />
            <button onClick={handleCreateFolder} className="p-1 text-green-400 hover:text-green-300"><Check className="w-4 h-4" /></button>
            <button onClick={() => setShowCreateFolder(false)} className="p-1 text-gray-400 hover:text-white"><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* Upload indicator */}
        {isUploading && (
          <div className="mb-4 px-3 py-2 bg-blue-900/30 border border-blue-700 text-blue-300 text-sm">
            Uploading files...
          </div>
        )}
        {uploadError && (
          <div className="mb-4 px-3 py-2 bg-red-900/30 border border-red-700 text-red-300 text-sm flex items-center gap-2">
            <span>{uploadError}</span>
            <button onClick={() => setUploadError(null)} className="ml-auto text-red-400 hover:text-white"><X className="w-3 h-3" /></button>
          </div>
        )}

        {/* Files area */}
        {viewMode === "grid" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {filtered.map((item) => (
              <div
                key={item.id}
                draggable
                onDragStart={(e) => handleDragStart(e, item)}
                onDragOver={(e) => handleItemDragOver(e, item)}
                onDragLeave={() => setDragOverId(null)}
                onDrop={(e) => handleItemDrop(e, item)}
                onDoubleClick={() => { if (item.isFolder) setCurrentFolderId(item.id); }}
                onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen(item.id); setMenuPos({ x: e.clientX, y: e.clientY }); }}
                className={`relative group bg-neutral-800 border rounded-lg p-3 cursor-default transition-all
                  ${item.isFolder ? "hover:border-blue-500/50" : "hover:border-white/30"}
                  ${dragOverId === item.id ? "border-blue-500 bg-blue-900/20" : "border-neutral-700"}`}
              >
                <div className="flex items-start justify-between">
                  {item.isFolder ? (
                    <Folder className="w-10 h-10 text-yellow-500" />
                  ) : (
                    <FileIcon name={item.name} />
                  )}
                  {isOfficer && (
                    <div className="relative">
                      <button onClick={(e) => { e.stopPropagation(); if (menuOpen === item.id) { setMenuOpen(null); setMenuPos(null); } else { const r = e.currentTarget.getBoundingClientRect(); setMenuPos({ x: r.right - 160, y: r.bottom }); setMenuOpen(item.id); } }}
                        className="p-0.5 text-gray-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      {(menuOpen === item.id) && (
                        <DropdownMenu
                          item={item}
                          position={menuPos ?? undefined}
                          onClose={() => { setMenuOpen(null); setMenuPos(null); }}
                          onRename={() => { setRenamingId(item.id); setRenameValue(item.name); setMenuOpen(null); }}
                          onDelete={() => handleDelete(item.id)}
                          onPermissions={() => openPermModal(item)}
                          onUploadTo={() => { uploadTargetRef.current = item.id; fileInputRef.current?.click(); setMenuOpen(null); }}
                          onAddSubfolder={() => { createFolderParentRef.current = item.id; setShowCreateFolder(true); setNewFolderName(""); setMenuOpen(null); }}
                        />
                      )}
                    </div>
                  )}
                </div>

                {renamingId === item.id ? (
                  <input type="text" value={renameValue} onChange={e => setRenameValue(e.target.value)}
                    autoFocus className="mt-2 w-full bg-transparent border border-neutral-600 px-1 py-0.5 text-xs text-white"
                    onBlur={() => handleRename(item.id)}
                    onKeyDown={e => { if (e.key === "Enter") handleRename(item.id); if (e.key === "Escape") setRenamingId(null); }} />
                ) : (
                  <button onClick={() => { if (item.isFolder) setCurrentFolderId(item.id); }}
                    className="mt-2 text-xs text-left w-full truncate text-gray-300 hover:text-white">
                    {item.name}
                  </button>
                )}

                {!item.isFolder && (
                  <p className="text-[10px] text-gray-500 mt-0.5">{formatSize(item.fileSize)}</p>
                )}
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="text-gray-500 text-sm col-span-full text-center py-12">
                {isOfficer ? "Drop files anywhere or right-click to upload" : "No files yet."}
              </p>
            )}
          </div>
        ) : (
          <div className="border border-neutral-700 rounded-lg overflow-hidden">
            {filtered.map((item) => (
              <div
                key={item.id}
                draggable
                onDragStart={(e) => handleDragStart(e, item)}
                onDragOver={(e) => handleItemDragOver(e, item)}
                onDragLeave={() => setDragOverId(null)}
                onDrop={(e) => handleItemDrop(e, item)}
                onDoubleClick={() => { if (item.isFolder) setCurrentFolderId(item.id); }}
                onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen(item.id); setMenuPos({ x: e.clientX, y: e.clientY }); }}
                className={`flex items-center gap-3 px-3 py-2 border-b border-neutral-800 last:border-0
                  hover:bg-neutral-800 transition-colors cursor-default
                  ${dragOverId === item.id ? "bg-blue-900/20" : ""}`}
              >
                {item.isFolder ? (
                  <Folder className="w-5 h-5 text-yellow-500 shrink-0" />
                ) : (
                  <FileIcon name={item.name} className="w-5 h-5 shrink-0" />
                )}
                <button onClick={() => { if (item.isFolder) setCurrentFolderId(item.id); }}
                  className="flex-1 text-sm text-left text-gray-300 hover:text-white truncate">
                  {item.name}
                </button>
                {!item.isFolder && (
                  <span className="text-xs text-gray-500 w-20 text-right">{formatSize(item.fileSize)}</span>
                )}
                {isOfficer && (
                  <div className="relative">
                    <button onClick={(e) => { if (menuOpen === item.id) { setMenuOpen(null); setMenuPos(null); } else { const r = e.currentTarget.getBoundingClientRect(); setMenuPos({ x: r.right - 160, y: r.bottom }); setMenuOpen(item.id); } }}
                      className="p-1 text-gray-500 hover:text-white transition-colors">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    {(menuOpen === item.id) && (
                      <DropdownMenu
                        item={item}
                        position={menuPos ?? undefined}
                        onClose={() => { setMenuOpen(null); setMenuPos(null); }}
                        onRename={() => { setRenamingId(item.id); setRenameValue(item.name); setMenuOpen(null); }}
                        onDelete={() => handleDelete(item.id)}
                        onPermissions={() => openPermModal(item)}
                        onUploadTo={() => { uploadTargetRef.current = item.id; fileInputRef.current?.click(); setMenuOpen(null); }}
                        onAddSubfolder={() => { createFolderParentRef.current = item.id; setShowCreateFolder(true); setNewFolderName(""); setMenuOpen(null); }}
                      />
                    )}
                  </div>
                )}
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="text-gray-500 text-sm text-center py-8">No files yet.</p>
            )}
          </div>
        )}

        {/* Permissions Modal */}
        {permModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
            onClick={() => setPermModal(null)}>
            <div className="bg-neutral-800 border border-neutral-700 p-6 w-full max-w-md mx-4"
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-sm">
                  Set Permissions: <span className="text-blue-400">{permModal.name}</span>
                </h3>
                <button onClick={() => setPermModal(null)} className="text-gray-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {existingPerms.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs text-gray-500 mb-2">Current permissions:</p>
                  <div className="flex flex-wrap gap-1">
                    {existingPerms.map(p => (
                      <span key={p.id} className="text-xs px-2 py-0.5 bg-neutral-700 text-gray-300 rounded">
                        {p.accessType}{p.teamId ? ` (team #${p.teamId})` : ""}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2 mb-4">
                <p className="text-xs text-gray-400">Who can access this file? (select all that apply)</p>
                {["everyone", "arc", "sli", "officers", "admin", "team"].map(type => (
                  <label key={type} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" value={type}
                      checked={permAccessTypes.includes(type)}
                      onChange={() => {
                        setPermAccessTypes(prev => {
                          if (prev.includes(type)) return prev.filter(t => t !== type);
                          return [...prev, type];
                        });
                        if (type === "team" && permAccessTypes.includes("team")) {
                          setPermTeamIds([]);
                        }
                      }}
                      className="accent-blue-500" />
                    <span className="text-sm text-gray-300 capitalize">{type}</span>
                  </label>
                ))}
                {permAccessTypes.includes("team") && (
                  <div className="ml-6 mt-2 space-y-1 border-l-2 border-neutral-600 pl-3">
                    <p className="text-xs text-gray-500">Select teams:</p>
                    {teams.map(t => (
                      <label key={t.id} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" value={t.id}
                          checked={permTeamIds.includes(t.id)}
                          onChange={() => {
                            setPermTeamIds(prev =>
                              prev.includes(t.id) ? prev.filter(id => id !== t.id) : [...prev, t.id]
                            );
                          }}
                          className="accent-blue-500" />
                        <span className="text-sm text-gray-300">{t.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <button onClick={() => setPermModal(null)}
                  className="px-3 py-1.5 text-sm text-gray-400 hover:text-white">Cancel</button>
                <button onClick={handleSetPermissions}
                  className="px-3 py-1.5 text-sm border border-white text-white hover:bg-white hover:text-neutral-900">
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Drag overlay */}
        {dragActive && (
          <div className="fixed inset-0 z-50 bg-blue-900/40 flex items-center justify-center pointer-events-none">
            <div className="border-2 border-dashed border-blue-400 bg-neutral-900/80 px-12 py-8 text-center">
              <FileUp className="w-10 h-10 text-blue-400 mx-auto mb-3" />
              <p className="text-lg text-blue-300 font-medium">Drop files anywhere to upload</p>
              <p className="text-sm text-blue-400/60 mt-1">Files will be placed in the current folder</p>
            </div>
          </div>
        )}

        {/* Context Menu */}
        {contextMenu && isOfficer && (
          <div ref={ctxRef}
            style={{ position: "fixed", left: contextMenu.x, top: contextMenu.y, zIndex: 100 }}
            className="w-48 bg-neutral-800 border border-neutral-700 shadow-xl py-1">
            <button onClick={() => {
              uploadTargetRef.current = contextMenu.folderId;
              fileInputRef.current?.click();
              setContextMenu(null);
            }}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-neutral-700 w-full text-left transition-colors">
              <FileUp className="w-4 h-4" /> Upload File
            </button>

            <button onClick={() => {
              createFolderParentRef.current = contextMenu.folderId;
              setShowCreateFolder(true);
              setNewFolderName("");
              setContextMenu(null);
            }}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-neutral-700 w-full text-left transition-colors">
              <Folder className="w-4 h-4" /> Add Folder
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function FileIcon({ name, className }: { name: string; className?: string }) {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  const label = ext === "stl" ? "STL" : ext.slice(0, 4).toUpperCase();
  const type = getFileIcon(name);
  const colors: Record<string, string> = {
    pdf: "bg-red-900/30 text-red-300 border-red-700",
    image: "bg-green-900/30 text-green-300 border-green-700",
    doc: "bg-blue-900/30 text-blue-300 border-blue-700",
    sheet: "bg-emerald-900/30 text-emerald-300 border-emerald-700",
    archive: "bg-orange-900/30 text-orange-300 border-orange-700",
    code: "bg-purple-900/30 text-purple-300 border-purple-700",
  };
  const color = colors[type] || "bg-neutral-800 text-gray-300 border-neutral-600";
  const cls = className || "w-10 h-10";

  if (className) {
    return <FileText className={`${cls} ${color.split(" ").find(c => c.startsWith("text-")) || "text-gray-400"}`} />;
  }

  return (
    <div className={`w-14 h-14 rounded-lg border flex items-center justify-center text-xs font-bold ${color}`}>
      {label}
    </div>
  );
}

function DropdownMenu({ item, position, onClose, onRename, onDelete, onPermissions, onUploadTo, onAddSubfolder }: {
  item: ResourceFile;
  position?: { x: number; y: number };
  onClose: () => void;
  onRename: () => void;
  onDelete: () => void;
  onPermissions: () => void;
  onUploadTo?: () => void;
  onAddSubfolder?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const style: React.CSSProperties = { position: "fixed", left: position?.x ?? 0, top: position?.y ?? 0, zIndex: 100 };

  return (
    <div ref={ref} style={style}
      className="w-40 bg-neutral-800 border border-neutral-700 shadow-xl py-1">
      {!item.isFolder && (
        <a href={item.fileUrl || "#"} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-300 hover:bg-neutral-700 transition-colors"
          onClick={onClose}>
          <Download className="w-3.5 h-3.5" /> Download
        </a>
      )}
      {item.isFolder && onUploadTo && (
        <button onClick={onUploadTo}
          className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-300 hover:bg-neutral-700 w-full text-left transition-colors">
          <FileUp className="w-3.5 h-3.5" /> Upload File
        </button>
      )}
      {item.isFolder && onAddSubfolder && (
        <button onClick={onAddSubfolder}
          className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-300 hover:bg-neutral-700 w-full text-left transition-colors">
          <FolderPlus className="w-3.5 h-3.5" /> Add Folder
        </button>
      )}
      <button onClick={onRename}
        className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-300 hover:bg-neutral-700 w-full text-left transition-colors">
        <Pencil className="w-3.5 h-3.5" /> Rename
      </button>
      <button onClick={onPermissions}
        className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-300 hover:bg-neutral-700 w-full text-left transition-colors">
        <Shield className="w-3.5 h-3.5" /> Permissions
      </button>
      <button onClick={onDelete}
        className="flex items-center gap-2 px-3 py-1.5 text-xs text-red-400 hover:bg-neutral-700 w-full text-left transition-colors">
        <Trash2 className="w-3.5 h-3.5" /> Delete
      </button>
    </div>
  );
}
