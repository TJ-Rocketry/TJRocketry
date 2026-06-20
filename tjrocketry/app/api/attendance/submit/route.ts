import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, attendanceBlocks, attendanceRecords } from "@/lib/db/schema";
import { getCurrentUserIonId } from "@/lib/auth";

export async function POST(request: Request) {
  const ionId = await getCurrentUserIonId();
  if (!ionId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { blockId, code } = await request.json();

    if (!blockId || !code) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const [block] = await db
      .select()
      .from(attendanceBlocks)
      .where(eq(attendanceBlocks.id, Number(blockId)))
      .limit(1);

    if (!block) {
      return NextResponse.json({ error: "Block not found" }, { status: 404 });
    }

    if (block.isClosed) {
      const [user] = await db.select().from(users).where(eq(users.ionId, ionId)).limit(1);
      if (!user || !user.roles.some((r: string) => ["admin", "sponsor", "officer"].includes(r))) {
        return NextResponse.json({ error: "Block is closed" }, { status: 400 });
      }
    }

    if (block.code !== code) {
      return NextResponse.json({ error: "Invalid code" }, { status: 400 });
    }

    const [user] = await db.select().from(users).where(eq(users.ionId, ionId)).limit(1);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const [existing] = await db
      .select()
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.blockId, Number(blockId)),
          eq(attendanceRecords.userId, user.id),
        ),
      )
      .limit(1);

    if (existing) {
      return NextResponse.json({ error: "Already marked present" }, { status: 400 });
    }

    const [record] = await db
      .insert(attendanceRecords)
      .values({
        blockId: Number(blockId),
        userId: user.id,
      })
      .returning();

    return NextResponse.json({ success: true, record });
  } catch (error) {
    return NextResponse.json({ error: "Failed to submit attendance" }, { status: 500 });
  }
}
