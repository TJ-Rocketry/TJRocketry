import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { attendanceBlocks, attendanceRecords } from "@/lib/db/schema";
import { getCurrentUser, isStaff } from "@/lib/auth";
import { todayET } from "@/lib/dates";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const date = todayET();
  try {
    const blocks = await db
      .select({
        id: attendanceBlocks.id,
        blockType: attendanceBlocks.blockType,
        date: attendanceBlocks.date,
        isClosed: attendanceBlocks.isClosed,
      })
      .from(attendanceBlocks)
      .where(and(
        eq(attendanceBlocks.date, new Date(date)),
        ...(isStaff(user.roles) ? [] : [eq(attendanceBlocks.isClosed, false)]),
      ))
      .orderBy(attendanceBlocks.blockType);

    const mine = await db
      .select({ blockId: attendanceRecords.blockId })
      .from(attendanceRecords)
      .where(eq(attendanceRecords.userId, user.id));
    const submitted = new Set(mine.map(r => r.blockId));

    return NextResponse.json({ blocks: blocks.map(b => ({ ...b, submitted: submitted.has(b.id) })), date });
  } catch (error) {
    console.error("Failed to fetch attendance blocks:", error);
    return NextResponse.json({ error: "Failed to fetch blocks" }, { status: 500 });
  }
}
