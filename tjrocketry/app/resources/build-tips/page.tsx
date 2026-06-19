"use client";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronRight, Plus, Pencil, Trash2, X, Check } from "lucide-react";

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

export default function BuildTipsPage() {
  const { user, authenticated, loading } = useAuth();
  const router = useRouter();
  const [videos, setVideos] = useState<ResourceFile[]>([]);
  const [activeStep, setActiveStep] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", fileUrl: "", description: "" });
  const isOfficer = user?.roles.some(r => ["admin", "sponsor", "officer"].includes(r));

  useEffect(() => {
    if (!loading && (!authenticated || !user)) router.push("/");
  }, [loading, authenticated, user, router]);

  const fetchVideos = async () => {
    try {
      const res = await fetch("/api/resources?category=build_tips");
      if (res.ok) {
        const data = await res.json();
        setVideos(data.files);
        if (data.files.length > 0 && !activeStep) setActiveStep(String(data.files[0].id));
      }
    } catch {}
  };

  useEffect(() => { fetchVideos(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.fileUrl.trim()) return;
    try {
      await fetch("/api/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, category: "build_tips" }),
      });
      setForm({ name: "", fileUrl: "", description: "" });
      setShowAdd(false);
      fetchVideos();
    } catch {}
  };

  const handleEdit = async (id: number) => {
    try {
      await fetch("/api/resources", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...form, category: "build_tips" }),
      });
      setEditingId(null);
      setForm({ name: "", fileUrl: "", description: "" });
      fetchVideos();
    } catch {}
  };

  const handleDelete = async (id: number) => {
    try {
      await fetch(`/api/resources?id=${id}`, { method: "DELETE" });
      if (activeStep === String(id)) setActiveStep(videos.length > 1 ? String(videos.find(v => v.id !== id)?.id) : null);
      fetchVideos();
    } catch {}
  };

  if (loading || !user) return <div className="pt-32 text-center text-white">Loading...</div>;

  const currentVideo = videos.find(v => String(v.id) === activeStep);
  const embedUrl = (url: string) => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
    return match ? `https://www.youtube.com/embed/${match[1]}` : url;
  };

  return (
    <div className="pt-24 min-h-screen bg-neutral-900 text-white">
      <div className="max-w-6xl mx-auto px-4 mt-8">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/resources" className="text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold">Build Tips</h1>
          {isOfficer && (
            <button onClick={() => setShowAdd(true)} className="ml-auto p-1.5 text-gray-400 hover:text-white transition-colors" title="Add Video">
              <Plus className="w-5 h-5" />
            </button>
          )}
        </div>

        {showAdd && (
          <form onSubmit={handleAdd} className="bg-neutral-800 border border-neutral-700 p-4 mb-6 space-y-3">
            <div className="flex gap-2">
              <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Step name" className="flex-1 bg-transparent border border-neutral-600 px-2 py-1.5 text-white text-sm" required />
              <input type="text" value={form.fileUrl} onChange={e => setForm(f => ({ ...f, fileUrl: e.target.value }))} placeholder="YouTube URL" className="flex-1 bg-transparent border border-neutral-600 px-2 py-1.5 text-white text-sm" required />
            </div>
            <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description (optional)" className="w-full bg-transparent border border-neutral-600 px-2 py-1.5 text-white text-sm" />
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowAdd(false)} className="px-3 py-1.5 text-sm text-gray-400 hover:text-white">Cancel</button>
              <button type="submit" className="px-3 py-1.5 text-sm border border-white text-white hover:bg-white hover:text-neutral-900">Add</button>
            </div>
          </form>
        )}

        <div className="flex flex-col md:flex-row gap-8">
          <div className="md:w-64 shrink-0">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Progression</h3>
            <div className="space-y-1">
              {videos.map((v, i) => (
                <div key={v.id} className="group flex items-center">
                  <button
                    onClick={() => { setActiveStep(String(v.id)); if (editingId !== v.id) setEditingId(null); }}
                    className={`flex-1 flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${
                      activeStep === String(v.id) && editingId !== v.id
                        ? "bg-neutral-700 text-white"
                        : "text-gray-400 hover:text-white hover:bg-neutral-800"
                    }`}
                  >
                    <span className="text-xs text-gray-500 w-5">{i + 1}.</span>
                    <span className="truncate">{v.name}</span>
                    {activeStep === String(v.id) && editingId !== v.id && <ChevronRight className="w-3.5 h-3.5 ml-auto shrink-0" />}
                  </button>
                  {isOfficer && (
                    <div className="flex items-center gap-0.5 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setEditingId(v.id); setForm({ name: v.name, fileUrl: v.fileUrl, description: v.description || "" }); }} className="p-1 text-gray-400 hover:text-white" title="Edit"><Pencil className="w-3 h-3" /></button>
                      <button onClick={() => handleDelete(v.id)} className="p-1 text-gray-400 hover:text-red-400" title="Delete"><Trash2 className="w-3 h-3" /></button>
                    </div>
                  )}
                </div>
              ))}
              {videos.length === 0 && <p className="text-sm text-gray-500">No videos yet.</p>}
            </div>
          </div>

          <div className="flex-1">
            {editingId !== null && (
              <div className="bg-neutral-800 border border-neutral-700 p-4 mb-4 space-y-3">
                <div className="flex gap-2">
                  <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="flex-1 bg-transparent border border-neutral-600 px-2 py-1.5 text-white text-sm" />
                  <input type="text" value={form.fileUrl} onChange={e => setForm(f => ({ ...f, fileUrl: e.target.value }))} className="flex-1 bg-transparent border border-neutral-600 px-2 py-1.5 text-white text-sm" />
                </div>
                <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="w-full bg-transparent border border-neutral-600 px-2 py-1.5 text-white text-sm" />
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setEditingId(null)} className="p-1.5 text-gray-400 hover:text-white"><X className="w-4 h-4" /></button>
                  <button onClick={() => handleEdit(editingId)} className="p-1.5 text-green-400 hover:text-green-300"><Check className="w-4 h-4" /></button>
                </div>
              </div>
            )}
            {currentVideo && editingId !== Number(currentVideo.id) && (
              <div>
                <h2 className="text-xl font-semibold mb-4">{currentVideo.name}</h2>
                {currentVideo.description && <p className="text-sm text-gray-400 mb-4">{currentVideo.description}</p>}
                <div className="aspect-video bg-neutral-800 overflow-hidden border border-neutral-700">
                  <iframe src={embedUrl(currentVideo.fileUrl)} className="w-full h-full" allowFullScreen title={currentVideo.name} />
                </div>
              </div>
            )}
            {!currentVideo && editingId === null && <p className="text-gray-400">Select a step to view.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
