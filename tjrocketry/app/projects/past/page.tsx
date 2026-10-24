import PageShell from "@/app/components/PageShell";

const pastProjects = [
  { year: "2024-2025", name: "TARC Finals", achievement: "Top 20 National Rank" },
  { year: "2023-2024", name: "TARC Finals", achievement: "National Finalist" },
  { year: "2022-2023", name: "Battle of the Rockets", achievement: "Competition Finalist" },
];

export default function PastProjectsPage() {
  return (
    <PageShell title="Past Projects">
      <ul className="divide-y divide-line border-y border-line max-w-3xl">
        {pastProjects.map(p => (
          <li key={p.year + p.name} className="py-4 flex items-baseline justify-between gap-4">
            <div>
              <h2 className="font-semibold">{p.name}</h2>
              <p className="text-sm text-muted">{p.achievement}</p>
            </div>
            <span className="text-sm text-muted">{p.year}</span>
          </li>
        ))}
      </ul>
    </PageShell>
  );
}
