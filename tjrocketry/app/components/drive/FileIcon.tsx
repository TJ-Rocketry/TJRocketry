import {
  Folder, FileText, FileImage, FileVideo, FileArchive, FileCode, FileSpreadsheet, File, Box,
} from "lucide-react";
import { Kind } from "./types";

const ICONS: Record<Kind, { Icon: typeof File; color: string }> = {
  folder: { Icon: Folder, color: "text-accent" },
  image: { Icon: FileImage, color: "text-sky-400" },
  pdf: { Icon: FileText, color: "text-red-400" },
  video: { Icon: FileVideo, color: "text-purple-400" },
  cad: { Icon: Box, color: "text-emerald-400" },
  doc: { Icon: FileText, color: "text-blue-400" },
  sheet: { Icon: FileSpreadsheet, color: "text-green-400" },
  archive: { Icon: FileArchive, color: "text-yellow-400" },
  code: { Icon: FileCode, color: "text-orange-400" },
  file: { Icon: File, color: "text-muted" },
};

export default function FileIcon({ kind, className = "w-5 h-5" }: { kind: Kind; className?: string }) {
  const { Icon, color } = ICONS[kind];
  return <Icon className={`${className} ${color} shrink-0`} fill={kind === "folder" ? "currentColor" : "none"} fillOpacity={kind === "folder" ? 0.25 : 0} />;
}
