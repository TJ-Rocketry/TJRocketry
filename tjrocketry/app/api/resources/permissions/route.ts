import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { filePermissions } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const fileId = searchParams.get("fileId");

  if (!fileId) {
    return NextResponse.json({ error: "Missing fileId" }, { status: 400 });
  }

  try {
    const perms = await db
      .select()
      .from(filePermissions)
      .where(eq(filePermissions.fileId, Number(fileId)));
    return NextResponse.json({ permissions: perms });
  } catch {
    return NextResponse.json({ error: "Failed to fetch permissions" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.roles.some(r => ["admin", "sponsor", "officer"].includes(r))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { fileId, accessTypes, teamIds } = await req.json();

    if (!fileId || !accessTypes || !Array.isArray(accessTypes) || accessTypes.length === 0) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Replace all permissions for this file
    await db.delete(filePermissions).where(eq(filePermissions.fileId, Number(fileId)));

    const entries: { fileId: number; accessType: string; teamId: number | null }[] = [];

    for (const accessType of accessTypes) {
      if (accessType === "team" && teamIds?.length) {
        for (const teamId of teamIds) {
          entries.push({ fileId: Number(fileId), accessType, teamId: Number(teamId) });
        }
      } else if (accessType !== "team") {
        entries.push({ fileId: Number(fileId), accessType, teamId: null });
      }
    }

    if (entries.length === 0) {
      await db.insert(filePermissions).values({ fileId: Number(fileId), accessType: "everyone", teamId: null });
    } else {
      await db.insert(filePermissions).values(entries);
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to set permission" }, { status: 500 });
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
      return NextResponse.json({ error: "Missing permission id" }, { status: 400 });
    }

    await db.delete(filePermissions).where(eq(filePermissions.id, Number(id)));

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete permission" }, { status: 500 });
  }
}
