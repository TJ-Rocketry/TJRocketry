"use client";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, FileArchive, ExternalLink, Calendar as CalendarIcon, MapPin, Clock } from "lucide-react";

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

  if (loading || !user) return <div className="pt-32 text-center text-white">Loading...</div>;

  const today = new Date();
  const nextMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  const daysInMonth = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0).getDate();
  const firstDay = nextMonth.getDay();
  const monthName = nextMonth.toLocaleString("default", { month: "long", year: "numeric" });

  const calendarDays: (number | null)[] = Array.from({ length: firstDay }, () => null);
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d);

  const launchDates = new Set(
    launches
      .filter(l => {
        const d = new Date(l.date);
        return d.getMonth() === nextMonth.getMonth() && d.getFullYear() === nextMonth.getFullYear();
      })
      .map(l => new Date(l.date).getDate().toString())
  );

  const nextLaunch = launches
    .filter(l => new Date(l.date) >= new Date(new Date().toISOString().split("T")[0]))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0] || null;

  return (
    <div className="pt-24 min-h-screen bg-neutral-900 text-white">
      <div className="max-w-5xl mx-auto px-4 mt-8">
        <h1 className="text-2xl font-bold mb-6">Resources</h1>

        <div className="bg-neutral-800 border border-neutral-700 p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <CalendarIcon className="w-5 h-5 text-gray-400" />
            <h2 className="text-lg font-semibold">Launch Schedule</h2>
          </div>

          <div className="text-sm text-gray-400 mb-4">
            {nextLaunch ? (
              <div>
                <span className="text-white font-medium">Next Launch: </span>
                {nextLaunch.title} &middot; {new Date(nextLaunch.date).toLocaleDateString("en-US", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                {nextLaunch.startTime && <span className="ml-2"><Clock className="w-3 h-3 inline mr-1" />{nextLaunch.startTime}{nextLaunch.endTime && ` – ${nextLaunch.endTime}`}</span>}
                {nextLaunch.location && <span className="ml-2"><MapPin className="w-3 h-3 inline mr-1" />{nextLaunch.location}</span>}
              </div>
            ) : (
              <span>TBD - Check back for updates</span>
            )}
          </div>

          <div className="grid grid-cols-7 gap-1 text-center">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
              <div key={d} className="text-xs text-gray-500 font-medium py-1">{d}</div>
            ))}
            {calendarDays.map((day, i) => (
              <div key={i}
                className={`text-sm py-1.5 relative ${
                  day === null ? "" :
                  day === today.getDate() && nextMonth.getMonth() === today.getMonth() && nextMonth.getFullYear() === today.getFullYear()
                    ? "bg-white text-neutral-900 font-semibold" : "text-gray-300"
                }`}
              >
                {day || ""}
                {day && launchDates.has(day.toString()) && (
                  <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-400 rounded-full" />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {sections.map(sec => (
            <Link
              key={sec.key}
              href={`/resources/${sec.key}`}
              className="group bg-neutral-800 border border-neutral-700 overflow-hidden hover:border-white/30 transition-all"
            >
              <div className="h-40 overflow-hidden">
                <img
                  src={sec.image}
                  alt={sec.label}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <sec.icon className="w-5 h-5 text-gray-300" />
                  <h2 className="text-lg font-semibold">{sec.label}</h2>
                </div>
                <p className="text-sm text-gray-400">{sec.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
