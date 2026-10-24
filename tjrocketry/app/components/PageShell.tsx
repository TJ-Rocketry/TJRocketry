import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function PageShell({
  title,
  description,
  actions,
  back,
  loading,
  children,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  back?: { href: string; label: string };
  loading?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="page">
      <div className="max-w-6xl mx-auto">
        {back && (
          <Link href={back.href} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground mb-3">
            <ArrowLeft className="w-3.5 h-3.5" /> {back.label}
          </Link>
        )}
        <header className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">{title}</h1>
            {description && <p className="text-muted mt-1.5 max-w-2xl">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
        {loading ? <p className="text-muted">Loading…</p> : children}
      </div>
    </div>
  );
}
