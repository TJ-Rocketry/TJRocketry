"use client";

export type TabDef<T extends string> = { key: T; label: string; badge?: number };

export default function Tabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: TabDef<T>[];
  active: T;
  onChange: (key: T) => void;
}) {
  return (
    <div className="flex gap-1 border-b border-line mb-8 overflow-x-auto">
      {tabs.map(t => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`-mb-px px-3 py-2 text-sm whitespace-nowrap border-b-2 transition-colors ${
            active === t.key ? "border-accent text-foreground" : "border-transparent text-muted hover:text-foreground"
          }`}
        >
          {t.label}
          {!!t.badge && (
            <span className="ml-1.5 inline-flex min-w-4 h-4 px-1 items-center justify-center text-[10px] font-semibold bg-accent text-background">
              {t.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
