import { NextRequest, NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { resourceFiles } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");

  try {
    const where = category ? { category } : {};
    const files = await db
      .select()
      .from(resourceFiles)
      .where(category ? eq(resourceFiles.category, category) : undefined)
      .orderBy(desc(resourceFiles.createdAt));
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
    const { name, description, fileUrl, fileSize, category, subCategory } = await req.json();
    if (!name || !fileUrl || !category) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const [file] = await db
      .insert(resourceFiles)
      .values({ name, description, fileUrl, fileSize: fileSize ? Number(fileSize) : null, category, subCategory })
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
    const { id, name, description, fileUrl, fileSize, category, subCategory } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const [file] = await db
      .update(resourceFiles)
      .set({
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(fileUrl !== undefined && { fileUrl }),
        ...(fileSize !== undefined && { fileSize: fileSize ? Number(fileSize) : null }),
        ...(category !== undefined && { category }),
        ...(subCategory !== undefined && { subCategory }),
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

    await db.delete(resourceFiles).where(eq(resourceFiles.id, Number(id)));

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete file" }, { status: 500 });
  }
}
