"use client";
import { useEffect, useState } from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import PageShell from "@/app/components/PageShell";

type Officer = { id: number; name: string; position: string | null; bio: string | null; pfpUrl: string | null };

function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

function Photo({ officer }: { officer: Officer }) {
  if (officer.pfpUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={officer.pfpUrl} alt={officer.name} className="w-full aspect-square object-cover" />;
  }
  return (
    <div className="w-full aspect-square flex items-center justify-center text-5xl font-semibold text-muted select-none border-b border-line">
      {initials(officer.name)}
    </div>
  );
}

export default function AboutPage() {
  const [officers, setOfficers] = useState<Officer[] | null>(null);
  const [open, setOpen] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetch("/api/public/officers")
      .then(r => (r.ok ? r.json() : { officers: [] }))
      .then(d => setOfficers(d.officers || []))
      .catch(() => setOfficers([]));
  }, []);

  const toggle = (id: number) =>
    setOpen(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <PageShell title="About Us">
      <div className="max-w-3xl space-y-5 leading-relaxed">
        <p>
          TJ Rocketry is one of the most accomplished high school rocketry teams in the nation, based at
          Thomas Jefferson High School for Science and Technology in Alexandria, Virginia.
        </p>
        <p>
          We compete in the American Rocketry Challenge (TARC) and the NASA Student Launch Initiative,
          designing, building, and flying high-powered rockets. Our team is composed of talented students
          passionate about aerospace engineering, computer science, and hands-on fabrication.
        </p>
        <p>
          Our mission is to provide students with real-world engineering experience through the design,
          construction, and flight of model and high-power rockets, fostering teamwork, innovation,
          and a love for aerospace.
        </p>
      </div>

      <section className="mt-16">
        <h2 className="section-title">Officers</h2>
        {officers === null ? (
          <p className="text-muted mt-6">Loading…</p>
        ) : officers.length === 0 ? (
          <p className="text-muted mt-6">Officer profiles are coming soon.</p>
        ) : (
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {officers.map(o => {
              const isOpen = open.has(o.id);
              const Icon = isOpen ? Minimize2 : Maximize2;
              const bio = o.bio || `${o.name} serves as ${o.position || "an officer"} for TJ Rocketry.`;
              return (
                <div
                  key={o.id}
                  role="button"
                  tabIndex={0}
                  aria-expanded={isOpen}
                  aria-label={`${isOpen ? "Collapse" : "Expand"} ${o.name}`}
                  onClick={() => toggle(o.id)}
                  onKeyDown={e => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggle(o.id);
                    }
                  }}
                  className={`relative border border-line overflow-hidden cursor-pointer transition-colors hover:border-foreground ${
                    isOpen ? "col-span-2 sm:col-span-3 lg:col-span-4 flex flex-col sm:flex-row" : ""
                  }`}
                >
                  <Icon className="absolute top-2 right-2 w-4 h-4 text-white drop-shadow pointer-events-none" />
                  <div className={isOpen ? "sm:w-60 shrink-0" : ""}>
                    <Photo officer={o} />
                    <div className="px-3 py-2.5 text-center border-t border-line">
                      <p className="font-medium">{o.name}</p>
                      <p className="text-sm text-accent">{o.position || "Officer"}</p>
                    </div>
                  </div>
                  {isOpen && (
                    <div className="flex-1 p-6">
                      <h3 className="text-2xl font-semibold">{o.name}</h3>
                      <p className="text-accent">{o.position || "Officer"}</p>
                      <p className="mt-4 leading-relaxed whitespace-pre-line">{bio}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </PageShell>
  );
}
