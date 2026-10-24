"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import PageShell from "@/app/components/PageShell";

export default function HPRPage() {
  const { user, authenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!authenticated || !user)) router.push("/");
  }, [loading, authenticated, user, router]);

  return (
    <PageShell title="HPR Information" back={{ href: "/resources", label: "Resources" }} loading={loading || !user}>
      <p>High power rocketry resources coming soon.</p>
      <p className="text-muted mt-2">Check back for certification guides, level requirements, and safety information.</p>
    </PageShell>
  );
}
