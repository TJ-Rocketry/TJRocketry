export type DriveFile = {
  id: number;
  name: string;
  description: string | null;
  fileUrl: string | null;
  fileSize: number | null;
  isFolder: boolean;
  parentId: number | null;
  createdAt: string;
  ownerName: string | null;
};

export type FolderRef = { id: number | null; name: string };

export type Kind = "folder" | "image" | "pdf" | "video" | "cad" | "doc" | "sheet" | "archive" | "code" | "file";

const EXT: Record<string, Kind> = {
  png: "image", jpg: "image", jpeg: "image", gif: "image", svg: "image", webp: "image",
  pdf: "pdf",
  mp4: "video", mov: "video", webm: "video",
  stl: "cad", step: "cad", stp: "cad", dxf: "cad", f3d: "cad", ork: "cad", rkt: "cad", "3mf": "cad", obj: "cad",
  doc: "doc", docx: "doc", txt: "doc", md: "doc",
  xls: "sheet", xlsx: "sheet", csv: "sheet",
  zip: "archive", rar: "archive", "7z": "archive", tar: "archive", gz: "archive",
  py: "code", js: "code", ts: "code", java: "code", cpp: "code", c: "code", h: "code", ino: "code", html: "code", css: "code",
};

export function kindOf(file: Pick<DriveFile, "name" | "isFolder">): Kind {
  if (file.isFolder) return "folder";
  return EXT[file.name.split(".").pop()?.toLowerCase() ?? ""] ?? "file";
}

export function formatSize(bytes: number | null) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function formatModified(value: string) {
  const d = new Date(value);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", ...(sameYear ? {} : { year: "numeric" }) });
}

export function downloadUrl(file: DriveFile) {
  if (!file.fileUrl) return "#";
  const sep = file.fileUrl.includes("?") ? "&" : "?";
  return `${file.fileUrl}${sep}download=${encodeURIComponent(file.name)}`;
}
