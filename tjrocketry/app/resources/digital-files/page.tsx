"use client";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Search, Download, FileText, ArrowUpDown, Plus, Pencil, Trash2, X, Check } from "lucide-react";

type ResourceFile = {
  id: number;
  name: string;
  description: string | null;
  fileUrl: string;
  fileSize: number | null;
  category: string;
  subCategory: string | null;
  createdAt: string;
};

function formatSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DigitalFilesPage() {
  const { user, authenticated, loading } = useAuth();
  const router = useRouter();
  const [files, setFiles] = useState<ResourceFile[]>([]);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "size">("name");
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", description: "", fileUrl: "", fileSize: "", subCategory: "" });
  const isOfficer = user?.roles.some(r => ["admin", "sponsor", "officer"].includes(r));

  useEffect(() => {
    if (!loading && (!authenticated || !user)) router.push("/");
  }, [loading, authenticated, user, router]);

  const fetchFiles = async () => {
    try {
      const res = await fetch("/api/resources?category=digital_files");
      if (res.ok) {
        const data = await res.json();
        setFiles(data.files);
      }
    } catch {}
  };

  useEffect(() => { fetchFiles(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.fileUrl.trim()) return;
    try {
      await fetch("/api/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          description: form.description || null,
          fileUrl: form.fileUrl,
          fileSize: form.fileSize ? parseInt(form.fileSize) : null,
          subCategory: form.subCategory || null,
          category: "digital_files",
        }),
      });
      setForm({ name: "", description: "", fileUrl: "", fileSize: "", subCategory: "" });
      setShowAdd(false);
      fetchFiles();
    } catch {}
  };

  const handleEdit = async (id: number) => {
    try {
      await fetch("/api/resources", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          name: form.name,
          description: form.description || null,
          fileUrl: form.fileUrl,
          fileSize: form.fileSize ? parseInt(form.fileSize) : null,
          subCategory: form.subCategory || null,
          category: "digital_files",
        }),
      });
      setEditingId(null);
      setForm({ name: "", description: "", fileUrl: "", fileSize: "", subCategory: "" });
      fetchFiles();
    } catch {}
  };

  const handleDelete = async (id: number) => {
    try {
      await fetch(`/api/resources?id=${id}`, { method: "DELETE" });
      fetchFiles();
    } catch {}
  };

  if (loading || !user) return <div className="pt-32 text-center text-white">Loading...</div>;

  const filtered = files
    .filter(f => f.name.toLowerCase().includes(search.toLowerCase()) || (f.subCategory || "").toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === "size") return (b.fileSize || 0) - (a.fileSize || 0);
      return a.name.localeCompare(b.name);
    });

  return (
    <div className="pt-24 min-h-screen bg-neutral-900 text-white">
      <div className="max-w-5xl mx-auto px-4 mt-8">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/resources" className="text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold">Digital Files</h1>
          {isOfficer && (
            <button onClick={() => setShowAdd(true)} className="ml-auto p-1.5 text-gray-400 hover:text-white transition-colors" title="Add File">
              <Plus className="w-5 h-5" />
            </button>
          )}
        </div>

        {showAdd && (
          <form onSubmit={handleAdd} className="bg-neutral-800 border border-neutral-700 p-4 mb-6 space-y-3">
            <div className="flex gap-2">
              <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="File name" className="flex-1 bg-transparent border border-neutral-600 px-2 py-1.5 text-white text-sm" required />
              <input type="text" value={form.subCategory} onChange={e => setForm(f => ({ ...f, subCategory: e.target.value }))} placeholder="Category (e.g. Airframe)" className="flex-1 bg-transparent border border-neutral-600 px-2 py-1.5 text-white text-sm" />
            </div>
            <div className="flex gap-2">
              <input type="text" value={form.fileUrl} onChange={e => setForm(f => ({ ...f, fileUrl: e.target.value }))} placeholder="File URL" className="flex-1 bg-transparent border border-neutral-600 px-2 py-1.5 text-white text-sm" required />
              <input type="number" value={form.fileSize} onChange={e => setForm(f => ({ ...f, fileSize: e.target.value }))} placeholder="Size in bytes" className="w-32 bg-transparent border border-neutral-600 px-2 py-1.5 text-white text-sm" />
            </div>
            <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description (optional)" className="w-full bg-transparent border border-neutral-600 px-2 py-1.5 text-white text-sm" />
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowAdd(false)} className="px-3 py-1.5 text-sm text-gray-400 hover:text-white">Cancel</button>
              <button type="submit" className="px-3 py-1.5 text-sm border border-white text-white hover:bg-white hover:text-neutral-900">Add</button>
            </div>
          </form>
        )}

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search files..."
              className="w-full bg-transparent border border-neutral-600 pl-10 pr-3 py-2 text-white text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-gray-500" />
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent border border-neutral-600 px-2 py-1.5 text-white text-sm">
              <option value="name">Alphabetical</option>
              <option value="size">File Size</option>
            </select>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((file) => (
            <div key={file.id} className="bg-neutral-800 border border-neutral-700 p-4 hover:border-white/30 transition-all group">
              <div className="flex items-start justify-between mb-2">
                <FileText className="w-8 h-8 text-gray-400 shrink-0" />
                {isOfficer && (
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setEditingId(file.id); setForm({ name: file.name, description: file.description || "", fileUrl: file.fileUrl, fileSize: file.fileSize?.toString() || "", subCategory: file.subCategory || "" }); }} className="p-1 text-gray-400 hover:text-white" title="Edit"><Pencil className="w-3 h-3" /></button>
                    <button onClick={() => handleDelete(file.id)} className="p-1 text-gray-400 hover:text-red-400" title="Delete"><Trash2 className="w-3 h-3" /></button>
                  </div>
                )}
              </div>
              {editingId === file.id ? (
                <div className="space-y-2">
                  <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full bg-transparent border border-neutral-600 px-2 py-1 text-white text-sm" />
                  <input type="text" value={form.fileUrl} onChange={e => setForm(f => ({ ...f, fileUrl: e.target.value }))} className="w-full bg-transparent border border-neutral-600 px-2 py-1 text-white text-sm" />
                  <div className="flex gap-1">
                    <button onClick={() => handleEdit(file.id)} className="p-1 text-green-400 hover:text-green-300"><Check className="w-4 h-4" /></button>
                    <button onClick={() => setEditingId(null)} className="p-1 text-gray-400 hover:text-white"><X className="w-4 h-4" /></button>
                  </div>
                </div>
              ) : (
                <>
                  <h3 className="font-medium text-sm text-white mb-1">{file.name}</h3>
                  {file.description && <p className="text-xs text-gray-500 mb-3">{file.description}</p>}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">{formatSize(file.fileSize)}{file.subCategory ? ` · ${file.subCategory}` : ""}</span>
                    <a href={file.fileUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 text-gray-400 hover:text-white transition-colors" title="Download">
                      <Download className="w-4 h-4" />
                    </a>
                  </div>
                </>
              )}
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-gray-400 col-span-full text-center py-8">No files found.</p>
          )}
        </div>
      </div>
    </div>
  );
}
