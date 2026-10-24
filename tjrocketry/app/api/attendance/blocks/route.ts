import { NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { attendanceBlocks } from "@/lib/db/schema";
import { checkAdminSponsorOrOfficerAccess } from "@/lib/auth";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseBlock(body: { blockType?: unknown; date?: unknown; code?: unknown }) {
  const blockType = typeof body.blockType === "string" ? body.blockType.trim() : "";
  const date = typeof body.date === "string" ? body.date.split("T")[0] : "";
  const code = typeof body.code === "string" ? body.code.trim() : "";
  if (!blockType || !DATE_RE.test(date) || !code) return null;
  return { blockType, date: new Date(date), code };
}

// GET — every block with its attendees, newest first (staff only)
export async function GET() {
  if (!(await checkAdminSponsorOrOfficerAccess())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const blocks = await db.query.attendanceBlocks.findMany({
      with: {
        records: {
          columns: { id: true, timestamp: true },
          with: { user: { columns: { id: true, name: true, username: true, classYear: true } } },
        },
      },
      orderBy: [desc(attendanceBlocks.date), desc(attendanceBlocks.createdAt)],
    });
    return NextResponse.json({ blocks });
  } catch (error) {
    console.error("Failed to fetch blocks:", error);
    return NextResponse.json({ error: "Failed to fetch blocks" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!(await checkAdminSponsorOrOfficerAccess())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const values = parseBlock(await request.json());
    if (!values) {
      return NextResponse.json({ error: "Block type, date, and code are required" }, { status: 400 });
    }
    const [block] = await db.insert(attendanceBlocks).values(values).returning();
    return NextResponse.json({ success: true, block });
  } catch (error) {
    console.error("Failed to create block:", error);
    return NextResponse.json({ error: "Failed to create block" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  if (!(await checkAdminSponsorOrOfficerAccess())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const values = parseBlock(body);
    if (!body.id || !values) {
      return NextResponse.json({ error: "Block type, date, and code are required" }, { status: 400 });
    }
    const [block] = await db
      .update(attendanceBlocks)
      .set(values)
      .where(eq(attendanceBlocks.id, Number(body.id)))
      .returning();
    if (!block) return NextResponse.json({ error: "Block not found" }, { status: 404 });
    return NextResponse.json({ success: true, block });
  } catch (error) {
    console.error("Failed to update block:", error);
    return NextResponse.json({ error: "Failed to update block" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  if (!(await checkAdminSponsorOrOfficerAccess())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { id, isClosed } = await request.json();
    if (!id || typeof isClosed !== "boolean") {
      return NextResponse.json({ error: "Missing block id or status" }, { status: 400 });
    }
    const [block] = await db
      .update(attendanceBlocks)
      .set({ isClosed })
      .where(eq(attendanceBlocks.id, Number(id)))
      .returning();
    if (!block) return NextResponse.json({ error: "Block not found" }, { status: 404 });
    return NextResponse.json({ success: true, block });
  } catch (error) {
    console.error("Failed to update block:", error);
    return NextResponse.json({ error: "Failed to update block" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!(await checkAdminSponsorOrOfficerAccess())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing block id" }, { status: 400 });
    await db.delete(attendanceBlocks).where(eq(attendanceBlocks.id, Number(id)));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete block:", error);
    return NextResponse.json({ error: "Failed to delete block" }, { status: 500 });
  }
}
