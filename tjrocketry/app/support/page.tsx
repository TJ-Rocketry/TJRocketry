import PageShell from "@/app/components/PageShell";

export default function SupportPage() {
  return (
    <PageShell
      title="Support"
      description="Support TJ Rocketry by donating or getting involved. Your contributions help us purchase materials, motors, and cover competition costs."
    >
      <section className="max-w-2xl">
        <h2 className="section-title mb-3">Donate</h2>
        <p className="text-muted mb-6">Donations can be made via check or through our fundraising page.</p>
        <span className="btn btn-primary px-6 py-2.5">Donate now</span>
      </section>
    </PageShell>
  );
}
