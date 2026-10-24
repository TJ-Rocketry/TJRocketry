import { NextRequest, NextResponse } from "next/server";
import { eq, gte, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { launchEvents } from "@/lib/db/schema";
import { getCurrentUser, isStaff } from "@/lib/auth";
import { todayET } from "@/lib/dates";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

// GET — upcoming launches (today onward), soonest first
export async function GET() {
  try {
    const launches = await db
      .select()
      .from(launchEvents)
      .where(gte(launchEvents.date, new Date(todayET())))
      .orderBy(asc(launchEvents.date), asc(launchEvents.startTime))
      .limit(20);
    return NextResponse.json({ launches });
  } catch (error) {
    console.error("Failed to fetch launches:", error);
    return NextResponse.json({ error: "Failed to fetch launches" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !isStaff(user.roles)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const title = str(body.title);
    if (!title || !DATE_RE.test(body.date ?? "")) {
      return NextResponse.json({ error: "Title and date are required" }, { status: 400 });
    }

    const [launch] = await db
      .insert(launchEvents)
      .values({
        title,
        date: new Date(body.date),
        startTime: str(body.startTime),
        endTime: str(body.endTime),
        notes: str(body.notes),
        location: str(body.location),
      })
      .returning();

    return NextResponse.json({ success: true, launch });
  } catch (error) {
    console.error("Failed to create launch:", error);
    return NextResponse.json({ error: "Failed to create launch" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !isStaff(user.roles)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const title = str(body.title);
    if (!body.id || !title || !DATE_RE.test(body.date ?? "")) {
      return NextResponse.json({ error: "Title and date are required" }, { status: 400 });
    }

    const [launch] = await db
      .update(launchEvents)
      .set({
        title,
        date: new Date(body.date),
        startTime: str(body.startTime),
        endTime: str(body.endTime),
        notes: str(body.notes),
        location: str(body.location),
      })
      .where(eq(launchEvents.id, Number(body.id)))
      .returning();

    if (!launch) return NextResponse.json({ error: "Launch not found" }, { status: 404 });
    return NextResponse.json({ success: true, launch });
  } catch (error) {
    console.error("Failed to update launch:", error);
    return NextResponse.json({ error: "Failed to update launch" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !isStaff(user.roles)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    await db.delete(launchEvents).where(eq(launchEvents.id, Number(id)));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete launch:", error);
    return NextResponse.json({ error: "Failed to delete launch" }, { status: 500 });
  }
}
