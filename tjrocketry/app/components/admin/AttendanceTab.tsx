"use client";
import { useState } from "react";
import { Download, Trash2 } from "lucide-react";
import { AttendanceBlockType } from "./types";

const BLOCK_TYPES = ["A Block", "B Block"];

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("en-US", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

export default function AttendanceTab({
  blocks,
  onCreateBlock,
  onDeleteBlock,
  onExportCSV,
}: {
  blocks: AttendanceBlockType[];
  onCreateBlock: (type: string, date: string, code: string) => Promise<void>;
  onDeleteBlock: (id: number) => void;
  onExportCSV: (id?: number) => void;
}) {
  const [type, setType] = useState("A Block");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    if (!code.trim()) { setErr("Code is required"); return; }
    await onCreateBlock(type, date, code.trim());
    setCode("");
  };

  return (
    <div className="space-y-6">
      <div className="border border-neutral-700 p-4">
        <h2 className="text-sm font-medium mb-3">Create Block</h2>
        <form onSubmit={submit} className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Type</label>
            <select value={type} onChange={e => setType(e.target.value)}
              className="bg-transparent border border-neutral-600 px-2 py-1.5 text-white text-sm">
              {BLOCK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="bg-transparent border border-neutral-600 px-2 py-1.5 text-white text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Code</label>
            <input type="text" value={code} onChange={e => setCode(e.target.value)}
              placeholder="Enter code..."
              className="bg-transparent border border-neutral-600 px-2 py-1.5 text-white text-sm" />
          </div>
          <button type="submit"
            className="px-3 py-1.5 text-sm border border-white text-white hover:bg-white hover:text-neutral-900 transition-colors">
            Create
          </button>
        </form>
        {err && <p className="text-red-400 text-xs mt-2">{err}</p>}
      </div>

      <div className="border border-neutral-700">
        <div className="p-3 border-b border-neutral-700 flex justify-between items-center">
          <h2 className="text-sm font-medium">Blocks</h2>
          <button onClick={() => onExportCSV()}
            className="flex items-center gap-1 px-2 py-1 text-xs border border-neutral-600 text-gray-400 hover:text-white transition-colors">
            <Download className="w-3 h-3" /> Export All
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-700">
                <th className="p-3 text-xs text-gray-400 font-medium">Type</th>
                <th className="p-3 text-xs text-gray-400 font-medium">Date</th>
                <th className="p-3 text-xs text-gray-400 font-medium">Code</th>
                <th className="p-3 text-xs text-gray-400 font-medium">Present</th>
                <th className="p-3 text-xs text-gray-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {blocks.map(b => (
                <tr key={b.id}>
                  <td className="p-3 text-sm">{b.blockType}</td>
                  <td className="p-3 text-sm text-gray-400">{fmtDate(b.date)}</td>
                  <td className="p-3 text-sm font-mono text-gray-400">{b.code}</td>
                  <td className="p-3 text-sm">{b._count?.records || 0}</td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <button onClick={() => onExportCSV(b.id)}
                        className="flex items-center gap-1 px-2 py-1 text-xs border border-neutral-600 text-gray-400 hover:text-white transition-colors">
                        <Download className="w-3 h-3" /> CSV
                      </button>
                      <button onClick={() => onDeleteBlock(b.id)}
                        className="flex items-center gap-1 px-2 py-1 text-xs border border-neutral-600 text-gray-400 hover:text-white transition-colors">
                        <Trash2 className="w-3 h-3" /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {blocks.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500 text-sm">No blocks created yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
