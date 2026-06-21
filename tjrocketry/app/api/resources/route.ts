import { NextRequest, NextResponse } from "next/server";
import { eq, and, desc, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { resourceFiles, filePermissions } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") || "digital_files";
  const parentId = searchParams.get("parentId");
  const id = searchParams.get("id");

  try {
    if (id) {
      const [file] = await db
        .select()
        .from(resourceFiles)
        .where(eq(resourceFiles.id, Number(id)));
      if (!file) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      const perms = await db
        .select()
        .from(filePermissions)
        .where(eq(filePermissions.fileId, file.id));
      return NextResponse.json({ file, permissions: perms });
    }

    const conditions = [eq(resourceFiles.category, category)];
    if (parentId === null) {
      conditions.push(isNull(resourceFiles.parentId));
    } else if (parentId) {
      conditions.push(eq(resourceFiles.parentId, Number(parentId)));
    }

    const files = await db
      .select()
      .from(resourceFiles)
      .where(and(...conditions))
      .orderBy(desc(resourceFiles.isFolder), resourceFiles.name);

    return NextResponse.json({ files });
  } catch {
    return NextResponse.json({ error: "Failed to fetch files" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.roles.some(r => ["admin", "sponsor", "officer"].includes(r))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { action, name, description, fileUrl, fileSize, category, subCategory, parentId } = body;

    if (action === "folder") {
      if (!name) {
        return NextResponse.json({ error: "Folder name required" }, { status: 400 });
      }
      const [folder] = await db
        .insert(resourceFiles)
        .values({
          name,
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
  } catch {
    return NextResponse.json({ error: "Failed to create file" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.roles.some(r => ["admin", "sponsor", "officer"].includes(r))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { id, action, ...fields } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    if (action === "rename") {
      if (!fields.name) {
        return NextResponse.json({ error: "Name required" }, { status: 400 });
      }
      const [file] = await db
        .update(resourceFiles)
        .set({ name: fields.name })
        .where(eq(resourceFiles.id, Number(id)))
        .returning();
      return NextResponse.json({ success: true, file });
    }

    if (action === "move") {
      const [file] = await db
        .update(resourceFiles)
        .set({ parentId: fields.parentId || null })
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
        ...(fields.parentId !== undefined && { parentId: fields.parentId }),
      })
      .where(eq(resourceFiles.id, Number(id)))
      .returning();

    return NextResponse.json({ success: true, file });
  } catch {
    return NextResponse.json({ error: "Failed to update file" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.roles.some(r => ["admin", "sponsor", "officer"].includes(r))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const fileId = Number(id);

    const [file] = await db
      .select()
      .from(resourceFiles)
      .where(eq(resourceFiles.id, fileId));

    if (!file) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Recursively delete children if folder
    if (file.isFolder) {
      await deleteFolderRecursive(fileId);
    }

    await db.delete(resourceFiles).where(eq(resourceFiles.id, fileId));

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete file" }, { status: 500 });
  }
}

async function deleteFolderRecursive(folderId: number) {
  const children = await db
    .select()
    .from(resourceFiles)
    .where(eq(resourceFiles.parentId, folderId));

  for (const child of children) {
    if (child.isFolder) {
      await deleteFolderRecursive(child.id);
    }
    await db.delete(resourceFiles).where(eq(resourceFiles.id, child.id));
  }
}
