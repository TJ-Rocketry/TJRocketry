import { NextResponse } from "next/server";
import { and, desc, eq, gt, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import { announcements } from "@/lib/db/schema";
import { getCurrentUser, isMember, isStaff } from "@/lib/auth";

function parse(body: Record<string, unknown>) {
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const text = typeof body.body === "string" ? body.body.trim() : "";
  const startsAt = new Date(String(body.startsAt));
  const endsAt = new Date(String(body.endsAt));
  if (!title || !text || Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) {
    return null;
  }
  return { title: title.slice(0, 200), body: text.slice(0, 10000), startsAt, endsAt };
}

const INVALID = "Enter a title, message, and an end time after the start time";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || !isMember(user.roles)) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const manage = new URL(request.url).searchParams.get("manage") === "1";
  if (manage && !isStaff(user.roles)) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const now = new Date();
    const rows = await db
      .select()
      .from(announcements)
      .where(manage ? undefined : and(lte(announcements.startsAt, now), gt(announcements.endsAt, now)))
      .orderBy(desc(announcements.startsAt));
    return NextResponse.json({ announcements: rows });
  } catch (error) {
    console.error("Failed to load announcements:", error);
    return NextResponse.json({ error: "Failed to load announcements" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || !isStaff(user.roles)) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const values = parse(await request.json());
    if (!values) return NextResponse.json({ error: INVALID }, { status: 400 });
    const [announcement] = await db.insert(announcements).values({ ...values, createdById: user.id }).returning();
    return NextResponse.json({ announcement }, { status: 201 });
  } catch (error) {
    console.error("Failed to create announcement:", error);
    return NextResponse.json({ error: "Failed to create announcement" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user || !isStaff(user.roles)) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const body = await request.json();
    const values = parse(body);
    if (!body.id || !values) return NextResponse.json({ error: INVALID }, { status: 400 });
    const [announcement] = await db.update(announcements).set(values).where(eq(announcements.id, Number(body.id))).returning();
    if (!announcement) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ announcement });
  } catch (error) {
    console.error("Failed to update announcement:", error);
    return NextResponse.json({ error: "Failed to update announcement" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user || !isStaff(user.roles)) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  try {
    await db.delete(announcements).where(eq(announcements.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete announcement:", error);
    return NextResponse.json({ error: "Failed to delete announcement" }, { status: 500 });
  }
}
