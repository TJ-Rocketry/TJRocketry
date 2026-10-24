import PageShell from "@/app/components/PageShell";

export default function ApplyPage() {
  return (
    <PageShell
      title="Join TJ Rocketry"
      description="Applications are currently open for the upcoming season. We're looking for passionate students to join our engineering teams."
    >
      <section className="max-w-2xl">
        <h2 className="section-title mb-3">Application form</h2>
        <p className="text-muted mb-6">Please fill out the form below to apply for membership.</p>
        <button className="btn btn-primary px-6 py-2.5">Start application</button>
      </section>
    </PageShell>
  );
}
