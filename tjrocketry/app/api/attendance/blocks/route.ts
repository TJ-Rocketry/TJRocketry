import { NextResponse } from "next/server";
import { eq, gte, desc, asc, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { attendanceBlocks, attendanceRecords } from "@/lib/db/schema";
import { checkAdminOrSponsorAccess, checkAdminSponsorOrOfficerAccess } from "@/lib/auth";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const range = searchParams.get("range");

  if (range === "week") {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const blocks = await db.query.attendanceBlocks.findMany({
      where: gte(attendanceBlocks.date, weekAgo),
      with: {
        records: { with: { user: true } },
      },
      orderBy: desc(attendanceBlocks.date),
    });
    return NextResponse.json({ blocks });
  }

  if (date) {
    const blocks = await db.query.attendanceBlocks.findMany({
      where: eq(attendanceBlocks.date, new Date(date)),
      with: {
        records: { with: { user: true } },
      },
      orderBy: desc(attendanceBlocks.createdAt),
    });
    return NextResponse.json({ blocks });
  }

  const blocks = await db.query.attendanceBlocks.findMany({
    with: {
      records: { with: { user: true } },
    },
    orderBy: desc(attendanceBlocks.createdAt),
  });
  return NextResponse.json({ blocks });
}

export async function POST(request: Request) {
  const isAuthorized = await checkAdminOrSponsorAccess();
  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { blockType, date, code } = await request.json();

    if (!blockType || !date || !code) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const [block] = await db
      .insert(attendanceBlocks)
      .values({
        blockType,
        date: new Date(date),
        code,
      })
      .returning();

    return NextResponse.json({ success: true, block });
  } catch (error) {
    console.error("Failed to create block:", error);
    return NextResponse.json({ error: "Failed to create block" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const isAuthorized = await checkAdminOrSponsorAccess();
  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { id, blockType, date, code } = await request.json();

    if (!id || !blockType || !date || !code) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const [block] = await db
      .update(attendanceBlocks)
      .set({
        blockType,
        date: new Date(date),
        code,
      })
      .where(eq(attendanceBlocks.id, Number(id)))
      .returning();

    return NextResponse.json({ success: true, block });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update block" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const isAuthorized = await checkAdminSponsorOrOfficerAccess();
  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing block id" }, { status: 400 });
    }

    await db.delete(attendanceBlocks).where(eq(attendanceBlocks.id, Number(id)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete block:", error);
    return NextResponse.json({ error: "Failed to delete block" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const isAuthorized = await checkAdminSponsorOrOfficerAccess();
  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { id, isClosed } = await request.json();
    if (!id) {
      return NextResponse.json({ error: "Missing block id" }, { status: 400 });
    }

    const [block] = await db
      .update(attendanceBlocks)
      .set({ isClosed })
      .where(eq(attendanceBlocks.id, Number(id)))
      .returning();

    return NextResponse.json({ success: true, block });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update block" }, { status: 500 });
  }
}
