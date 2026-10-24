import PageShell from "@/app/components/PageShell";

const projects = [
  {
    name: "TARC 2025-2026",
    sub: "Team America Rocketry Challenge",
    body: "Designing and building competition rockets for the world's largest student rocketry contest. Our teams are working on achieving precise altitude and duration targets.",
  },
  {
    name: "NASA Student Launch Initiative",
    sub: "2026-2027 Season",
    body: "A year-long NASA program to design, build, and fly a high-powered rocket with a scientific payload.",
  },
];

export default function CurrentProjectsPage() {
  return (
    <PageShell title="Current Projects">
      <div className="space-y-10 max-w-3xl">
        {projects.map(p => (
          <section key={p.name}>
            <h2 className="section-title">{p.name}</h2>
            <p className="text-sm text-muted mt-2">{p.sub}</p>
            <p className="mt-3 leading-relaxed">{p.body}</p>
          </section>
        ))}
      </div>
    </PageShell>
  );
}
