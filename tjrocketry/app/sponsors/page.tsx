import PageShell from "@/app/components/PageShell";

export default function SponsorsPage() {
  return (
    <PageShell
      title="Sponsors"
      description="We thank our sponsors for their generous support. If you're interested in sponsoring TJ Rocketry, please reach out to us."
    >
      <div className="grid sm:grid-cols-2 gap-6">
        {[0, 1].map(i => (
          <div key={i} className="border border-dashed border-line h-40 flex items-center justify-center">
            <p className="text-muted">Your logo here</p>
          </div>
        ))}
      </div>
    </PageShell>
  );
}
