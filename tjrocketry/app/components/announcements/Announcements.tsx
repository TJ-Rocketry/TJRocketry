"use client";
import { useCallback, useEffect, useState } from "react";
import { ChevronDown, Megaphone } from "lucide-react";
import { api } from "@/lib/api-client";
import Modal from "@/app/components/Modal";
import AnnouncementBody from "./AnnouncementBody";
import AnnouncementsManager, { Announcement } from "./AnnouncementsManager";

export default function Announcements({ canManage }: { canManage: boolean }) {
  const [items, setItems] = useState<Announcement[]>([]);
  const [openId, setOpenId] = useState<number | null>(null);
  const [managing, setManaging] = useState(false);

  const load = useCallback(async () => {
    try {
      const { announcements } = await api<{ announcements: Announcement[] }>("/api/announcements");
      setItems(announcements);
      if (announcements.length === 1) setOpenId(announcements[0].id);
    } catch {
      setItems([]);
    }
  }, []);

  useEffect(() => { queueMicrotask(() => { void load(); }); }, [load]);

  if (!items.length && !canManage) return null;

  return (
    <section aria-label="Announcements">
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title">Announcements</h2>
        {canManage && (
          <button className="btn" onClick={() => setManaging(true)}>
            <Megaphone className="w-4 h-4" /> Manage
          </button>
        )}
      </div>
      {items.length === 0 ? (
        <p className="text-muted">No announcements right now.</p>
      ) : (
        <div className="divide-y divide-line border-y border-line">
          {items.map(item => {
            const open = openId === item.id;
            return (
              <article key={item.id} className="py-4">
                <button type="button" onClick={() => setOpenId(open ? null : item.id)} aria-expanded={open}
                  className="flex w-full items-start justify-between gap-3 text-left">
                  <span className="min-w-0">
                    <span className="block font-semibold">{item.title}</span>
                    {!open && (
                      <span className="mt-1 block truncate text-sm text-muted">
                        {item.body.replace(/^## .*/gm, "").trim().split("\n")[0]}
                      </span>
                    )}
                  </span>
                  <ChevronDown className={`mt-0.5 h-5 w-5 shrink-0 text-accent transition-transform ${open ? "rotate-180" : ""}`} />
                </button>
                {open && <div className="mt-4"><AnnouncementBody body={item.body} /></div>}
              </article>
            );
          })}
        </div>
      )}
      {managing && (
        <Modal title="Announcements" subtitle="Members see these on their dashboard during the time window." wide onClose={() => setManaging(false)}>
          <AnnouncementsManager onChanged={load} />
        </Modal>
      )}
    </section>
  );
}
