import { NextRequest, NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { launchEvents } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const launches = await db
      .select()
      .from(launchEvents)
      .orderBy(desc(launchEvents.date))
      .limit(10);
    return NextResponse.json({ launches });
  } catch {
    return NextResponse.json({ error: "Failed to fetch launches" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.roles.some(r => ["admin", "sponsor", "officer"].includes(r))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { title, date, startTime, endTime, notes, location } = await req.json();
    if (!title || !date) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const [launch] = await db
      .insert(launchEvents)
      .values({
        title,
        date: new Date(date),
        startTime: startTime || null,
        endTime: endTime || null,
        notes: notes || null,
        location: location || null,
      })
      .returning();

    return NextResponse.json({ success: true, launch });
  } catch (e: any) {
    return NextResponse.json({ error: "Failed to create launch", details: e?.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.roles.some(r => ["admin", "sponsor", "officer"].includes(r))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { id, title, date, startTime, endTime, notes, location } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const [launch] = await db
      .update(launchEvents)
      .set({
        ...(title && { title }),
        ...(date && { date: new Date(date) }),
        ...(startTime !== undefined && { startTime }),
        ...(endTime !== undefined && { endTime }),
        ...(notes !== undefined && { notes }),
        ...(location !== undefined && { location }),
      })
      .where(eq(launchEvents.id, Number(id)))
      .returning();

    return NextResponse.json({ success: true, launch });
  } catch {
    return NextResponse.json({ error: "Failed to update launch" }, { status: 500 });
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

    await db.delete(launchEvents).where(eq(launchEvents.id, Number(id)));

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete launch" }, { status: 500 });
  }
}
