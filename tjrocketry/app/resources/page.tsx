"use client";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, FileArchive, ExternalLink, MapPin, Clock, Users } from "lucide-react";
import PageShell from "@/app/components/PageShell";
import { formatDay } from "@/lib/dates";

type LaunchEvent = {
  id: number;
  title: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  notes: string | null;
  location: string | null;
};

const sections = [
  {
    key: "build-tips",
    label: "Build Tips",
    desc: "Master build guide and video tutorials",
    icon: BookOpen,
    image: "/images/assembleandbuild.jpg",
  },
  {
    key: "digital-files",
    label: "Digital Files",
    desc: "STL, DXF, and 3D printing files",
    icon: FileArchive,
    image: "/images/openrocket.png",
  },
  {
    key: "hpr",
    label: "HPR Information",
    desc: "High power rocketry resources",
    icon: ExternalLink,
    image: "/images/botrlaunch.jpg",
  },
  {
    key: "teams",
    label: "Teams",
    desc: "View team rosters and captains",
    icon: Users,
    image: "/images/logo.png",
  },
];

export default function ResourcesPage() {
  const { user, authenticated, loading } = useAuth();
  const router = useRouter();
  const [launches, setLaunches] = useState<LaunchEvent[]>([]);

  useEffect(() => {
    if (!loading) {
      if (!authenticated || !user) router.push("/");
      else {
        const memberRoles = ["admin", "sponsor", "officer", "ARCmember", "BOTRmember"];
        if (!user.roles.some(r => memberRoles.includes(r))) router.push("/apply");
      }
    }
  }, [loading, authenticated, user, router]);

  useEffect(() => {
    fetch("/api/launches")
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data) setLaunches(data.launches); })
      .catch(() => {});
  }, []);

  if (loading || !user) return <PageShell title="Resources" loading />;
  const nextLaunch = launches[0] ?? null;

  return (
    <PageShell title="Resources">
      <section className="mb-10">
        <h2 className="section-title mb-3">Launch schedule</h2>
        {nextLaunch ? (
          <p>
            <span className="font-medium">Next launch:</span> {nextLaunch.title}
            <span className="text-muted">
              {" · "}{formatDay(nextLaunch.date)}
              {nextLaunch.startTime && <> · <Clock className="w-3 h-3 inline -mt-0.5" /> {nextLaunch.startTime}{nextLaunch.endTime && ` – ${nextLaunch.endTime}`}</>}
              {nextLaunch.location && <> · <MapPin className="w-3 h-3 inline -mt-0.5" /> {nextLaunch.location}</>}
            </span>
          </p>
        ) : (
          <p className="text-muted">TBD — check back for updates.</p>
        )}
      </section>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {sections.map(sec => (
          <Link
            key={sec.key}
            href={sec.key === "teams" ? "/teams" : `/resources/${sec.key}`}
            className="group border border-line overflow-hidden hover:border-foreground transition-colors"
          >
            <div className="h-36 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={sec.image} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
            </div>
            <div className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <sec.icon className="w-4 h-4" />
                <h2 className="font-semibold">{sec.label}</h2>
              </div>
              <p className="text-sm text-muted">{sec.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </PageShell>
  );
}
