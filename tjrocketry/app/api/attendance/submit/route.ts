import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { attendanceBlocks, attendanceRecords } from "@/lib/db/schema";
import { getCurrentUser, isStaff } from "@/lib/auth";
import { dayKey, todayET } from "@/lib/dates";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { blockId, code } = await request.json();
    if (!blockId || typeof code !== "string" || !code.trim()) {
      return NextResponse.json({ error: "Enter the attendance code" }, { status: 400 });
    }

    const [block] = await db
      .select()
      .from(attendanceBlocks)
      .where(eq(attendanceBlocks.id, Number(blockId)))
      .limit(1);
    if (!block) {
      return NextResponse.json({ error: "Block not found" }, { status: 404 });
    }

    const staff = isStaff(user.roles);
    if (!staff && block.isClosed) {
      return NextResponse.json({ error: "This block is closed" }, { status: 400 });
    }
    if (!staff && dayKey(block.date) !== todayET()) {
      return NextResponse.json({ error: "You can only check in on the day of the block" }, { status: 400 });
    }
    if (block.code.trim().toLowerCase() !== code.trim().toLowerCase()) {
      return NextResponse.json({ error: "Invalid code" }, { status: 400 });
    }

    // The unique (blockId, userId) index makes double-submits a no-op.
    const [record] = await db
      .insert(attendanceRecords)
      .values({ blockId: block.id, userId: user.id })
      .onConflictDoNothing()
      .returning();

    if (!record) {
      return NextResponse.json({ error: "Already marked present" }, { status: 400 });
    }
    return NextResponse.json({ success: true, record });
  } catch (error) {
    console.error("Failed to submit attendance:", error);
    return NextResponse.json({ error: "Failed to submit attendance" }, { status: 500 });
  }
}
