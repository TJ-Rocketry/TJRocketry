import { NextRequest, NextResponse } from "next/server";
import { eq, and, desc, isNull, inArray, ilike } from "drizzle-orm";
import { db } from "@/lib/db";
import { resourceFiles, filePermissions, teamMembers, users } from "@/lib/db/schema";
import { getCurrentUser, isStaff, type CurrentUser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

type Perm = { fileId: number; accessType: string; teamId: number | null };

const fileColumns = {
  id: resourceFiles.id,
  name: resourceFiles.name,
  description: resourceFiles.description,
  fileUrl: resourceFiles.fileUrl,
  fileSize: resourceFiles.fileSize,
  category: resourceFiles.category,
  subCategory: resourceFiles.subCategory,
  isFolder: resourceFiles.isFolder,
  parentId: resourceFiles.parentId,
  uploadedById: resourceFiles.uploadedById,
  createdAt: resourceFiles.createdAt,
  ownerName: users.name,
};

async function visibilityChecker(user: CurrentUser) {
  if (isStaff(user.roles)) return () => true;
  const myTeams = new Set(
    (await db.select({ teamId: teamMembers.teamId }).from(teamMembers).where(eq(teamMembers.userId, user.id)))
      .map(t => t.teamId),
  );
  return (perms: Perm[]) =>
    perms.length === 0 ||
    perms.some(p =>
      p.accessType === "everyone" ||
      (p.accessType === "arc" && user.roles.includes("ARCmember")) ||
      (p.accessType === "team" && p.teamId !== null && myTeams.has(p.teamId)),
    );
}

async function permsFor(ids: number[]) {
  const byFile = new Map<number, Perm[]>(ids.map(id => [id, []]));
  if (ids.length === 0) return byFile;
  const rows = await db.select().from(filePermissions).where(inArray(filePermissions.fileId, ids));
  for (const r of rows) byFile.get(r.fileId)?.push(r);
  return byFile;
}

async function ancestry(fileId: number) {
  const chain: { id: number; name: string; parentId: number | null }[] = [];
  let current: number | null = fileId;
  for (let depth = 0; current !== null && depth < 50; depth++) {
    const [row] = await db
      .select({ id: resourceFiles.id, name: resourceFiles.name, parentId: resourceFiles.parentId })
      .from(resourceFiles)
      .where(eq(resourceFiles.id, current));
    if (!row) break;
    chain.unshift(row);
    current = row.parentId;
  }
  return chain;
}

async function canReach(fileId: number, canSee: (p: Perm[]) => boolean) {
  const chain = await ancestry(fileId);
  if (chain.length === 0) return false;
  const perms = await permsFor(chain.map(c => c.id));
  return chain.every(c => canSee(perms.get(c.id)!));
}

function storagePath(fileUrl: string | null) {
  const marker = "/storage/v1/object/public/resources/";
  const i = fileUrl?.indexOf(marker) ?? -1;
  return i >= 0 ? decodeURIComponent(fileUrl!.slice(i + marker.length)) : null;
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") || "digital_files";
  const parentId = searchParams.get("parentId");
  const id = searchParams.get("id");
  const q = searchParams.get("q")?.trim();

  try {
    const canSee = await visibilityChecker(user);

    if (id) {
      const [file] = await db.select().from(resourceFiles).where(eq(resourceFiles.id, Number(id)));
      if (!file || !(await canReach(file.id, canSee))) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      const permissions = (await permsFor([file.id])).get(file.id);
      const path = (await ancestry(file.id)).map(({ id, name }) => ({ id, name }));
      return NextResponse.json({ file, permissions, path });
    }

    if (searchParams.get("folders")) {
      const folders = await db
        .select({ id: resourceFiles.id, name: resourceFiles.name, parentId: resourceFiles.parentId })
        .from(resourceFiles)
        .where(and(eq(resourceFiles.category, category), eq(resourceFiles.isFolder, true)))
        .orderBy(resourceFiles.name);
      const perms = await permsFor(folders.map(f => f.id));
      return NextResponse.json({ folders: folders.filter(f => canSee(perms.get(f.id)!)) });
    }

    if (q) {
      const matches = await db
        .select(fileColumns)
        .from(resourceFiles)
        .leftJoin(users, eq(resourceFiles.uploadedById, users.id))
        .where(and(eq(resourceFiles.category, category), ilike(resourceFiles.name, `%${q.replace(/[%_\\]/g, "\\$&")}%`)))
        .orderBy(desc(resourceFiles.isFolder), resourceFiles.name)
        .limit(100);
      const visible = [];
      for (const f of matches) if (await canReach(f.id, canSee)) visible.push(f);
      return NextResponse.json({ files: visible });
    }

    if (parentId && !(await canReach(Number(parentId), canSee))) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const files = await db
      .select(fileColumns)
      .from(resourceFiles)
      .leftJoin(users, eq(resourceFiles.uploadedById, users.id))
      .where(and(
        eq(resourceFiles.category, category),
        parentId ? eq(resourceFiles.parentId, Number(parentId)) : isNull(resourceFiles.parentId),
      ))
      .orderBy(desc(resourceFiles.isFolder), resourceFiles.name);

    const perms = await permsFor(files.map(f => f.id));
    return NextResponse.json({ files: files.filter(f => canSee(perms.get(f.id)!)) });
  } catch (error) {
    console.error("Failed to fetch files:", error);
    return NextResponse.json({ error: "Failed to fetch files" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !isStaff(user.roles)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { action, name, description, fileUrl, fileSize, category, subCategory, parentId } = body;

    if (action === "folder") {
      const folderName = typeof name === "string" ? name.trim() : "";
      if (!folderName) return NextResponse.json({ error: "Folder name required" }, { status: 400 });
      const [folder] = await db
        .insert(resourceFiles)
        .values({
          name: folderName,
          category: category || "digital_files",
          isFolder: true,
          parentId: parentId || null,
          uploadedById: user.id,
        })
        .returning();
      return NextResponse.json({ success: true, file: folder });
    }

    if (!name || !fileUrl || !category) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const [file] = await db
      .insert(resourceFiles)
      .values({
        name,
        description,
        fileUrl,
        fileSize: fileSize ? Number(fileSize) : null,
        category,
        subCategory,
        parentId: parentId || null,
        uploadedById: user.id,
      })
      .returning();

    return NextResponse.json({ success: true, file });
  } catch (error) {
    console.error("Failed to create file:", error);
    return NextResponse.json({ error: "Failed to create file" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !isStaff(user.roles)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { id, ids, action, ...fields } = body;

    if (action === "move") {
      const targets: number[] = (Array.isArray(ids) ? ids : [id]).map(Number).filter(Boolean);
      const destination = fields.parentId ? Number(fields.parentId) : null;
      if (targets.length === 0) return NextResponse.json({ error: "Nothing to move" }, { status: 400 });
      if (destination) {
        const chain = (await ancestry(destination)).map(c => c.id);
        if (targets.some(t => chain.includes(t))) {
          return NextResponse.json({ error: "Can't move a folder into itself" }, { status: 400 });
        }
      }
      await db.update(resourceFiles).set({ parentId: destination }).where(inArray(resourceFiles.id, targets));
      return NextResponse.json({ success: true });
    }

    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    if (action === "rename") {
      const newName = typeof fields.name === "string" ? fields.name.trim() : "";
      if (!newName) return NextResponse.json({ error: "Name required" }, { status: 400 });
      const [file] = await db
        .update(resourceFiles)
        .set({ name: newName })
        .where(eq(resourceFiles.id, Number(id)))
        .returning();
      return NextResponse.json({ success: true, file });
    }

    const [file] = await db
      .update(resourceFiles)
      .set({
        ...(fields.name !== undefined && { name: fields.name }),
        ...(fields.description !== undefined && { description: fields.description }),
        ...(fields.fileUrl !== undefined && { fileUrl: fields.fileUrl }),
        ...(fields.fileSize !== undefined && { fileSize: fields.fileSize ? Number(fields.fileSize) : null }),
        ...(fields.category !== undefined && { category: fields.category }),
        ...(fields.subCategory !== undefined && { subCategory: fields.subCategory }),
      })
      .where(eq(resourceFiles.id, Number(id)))
      .returning();

    return NextResponse.json({ success: true, file });
  } catch (error) {
    console.error("Failed to update file:", error);
    return NextResponse.json({ error: "Failed to update file" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !isStaff(user.roles)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const ids = (searchParams.get("ids") ?? searchParams.get("id") ?? "")
      .split(",").map(Number).filter(Boolean);
    if (ids.length === 0) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const doomed: { id: number; fileUrl: string | null }[] = [];
    let frontier = ids;
    while (frontier.length) {
      const rows = await db
        .select({ id: resourceFiles.id, fileUrl: resourceFiles.fileUrl, isFolder: resourceFiles.isFolder })
        .from(resourceFiles)
        .where(inArray(resourceFiles.id, frontier));
      doomed.push(...rows);
      const folders = rows.filter(r => r.isFolder).map(r => r.id);
      frontier = folders.length
        ? (await db.select({ id: resourceFiles.id }).from(resourceFiles).where(inArray(resourceFiles.parentId, folders))).map(r => r.id)
        : [];
    }

    await db.delete(resourceFiles).where(inArray(resourceFiles.id, doomed.map(d => d.id)));

    const paths = doomed.map(d => storagePath(d.fileUrl)).filter((p): p is string => !!p);
    if (paths.length) {
      const { error } = await getSupabaseAdmin().storage.from("resources").remove(paths);
      if (error) console.error("Failed to remove stored files:", error);
    }

    return NextResponse.json({ success: true, deleted: doomed.length });
  } catch (error) {
    console.error("Failed to delete file:", error);
    return NextResponse.json({ error: "Failed to delete file" }, { status: 500 });
  }
}
