"use client";
import { useState, useEffect } from "react";
import { Save } from "lucide-react";

const SETTINGS_FIELDS = [
  { key: "teamSelectionDate", label: "Team Selection Date", type: "date" },
  { key: "tarcApplicationStart", label: "TARC Application Start", type: "date" },
  { key: "tarcApplicationEnd", label: "TARC Application End", type: "date" },
];

export default function SettingsTab() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then(r => r.json())
      .then(d => {
        const s: Record<string, string> = {};
        SETTINGS_FIELDS.forEach(f => { s[f.key] = d.settings?.[f.key] || ""; });
        setSettings(s);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const save = async (key: string) => {
    setSaving(key);
    try {
      await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value: settings[key] || null }),
      });
    } catch (err) {
      console.error(err);
    }
    setSaving(null);
  };

  if (loading) return <p className="text-gray-500 text-sm">Loading settings...</p>;

  return (
    <div className="border border-neutral-700">
      <div className="px-4 py-2.5 border-b border-neutral-700 bg-neutral-800/50">
        <h2 className="text-sm font-semibold">Settings</h2>
      </div>
      <div className="p-4 space-y-4">
        {SETTINGS_FIELDS.map(f => (
          <div key={f.key} className="flex items-center gap-4">
            <label className="text-sm text-gray-400 w-48 shrink-0">{f.label}</label>
            <input type={f.type}
              value={settings[f.key] || ""}
              onChange={e => setSettings(p => ({ ...p, [f.key]: e.target.value }))}
              className="bg-transparent border border-neutral-600 px-2 py-1.5 text-sm text-white flex-1 max-w-48" />
            <button onClick={() => save(f.key)}
              className="flex items-center gap-1 px-2 py-1 text-xs border border-neutral-600 text-gray-400 hover:text-white hover:border-white transition-colors">
              <Save className="w-3 h-3" /> {saving === f.key ? "Saving..." : "Save"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
