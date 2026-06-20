import { NextResponse } from "next/server";
import { eq, gte, desc, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, attendanceBlocks, attendanceRecords } from "@/lib/db/schema";
import { getCurrentUserIonId, checkAdminSponsorOrOfficerAccess } from "@/lib/auth";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const adminView = searchParams.get("admin");

  const isRoleUser = await checkAdminSponsorOrOfficerAccess();

  if (adminView === "true") {
    if (!isRoleUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
  }

  const targetDate = date || new Date().toISOString().split("T")[0];

  if (isRoleUser) {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const blocks = await db
      .select()
      .from(attendanceBlocks)
      .where(gte(attendanceBlocks.date, weekAgo))
      .orderBy(desc(attendanceBlocks.date));

    if (adminView === "true") {
      return NextResponse.json({ blocks, date: targetDate });
    }

    const ionId = await getCurrentUserIonId();
    if (!ionId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [user] = await db.select().from(users).where(eq(users.ionId, ionId)).limit(1);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const records = await db
      .select({ blockId: attendanceRecords.blockId })
      .from(attendanceRecords)
      .where(eq(attendanceRecords.userId, user.id));

    const submittedBlockIds = new Set(records.map((r) => r.blockId));

    const blocksWithStatus = blocks.map((block) => ({
      ...block,
      submitted: submittedBlockIds.has(block.id),
    }));

    return NextResponse.json({ blocks: blocksWithStatus, date: targetDate });
  }

  const blocks = await db
    .select()
    .from(attendanceBlocks)
    .where(
      and(
        eq(attendanceBlocks.date, new Date(targetDate)),
        eq(attendanceBlocks.isClosed, false),
      ),
    )
    .orderBy(attendanceBlocks.createdAt);

  const ionId = await getCurrentUserIonId();
  if (!ionId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [user] = await db.select().from(users).where(eq(users.ionId, ionId)).limit(1);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const records = await db
    .select({ blockId: attendanceRecords.blockId })
    .from(attendanceRecords)
    .innerJoin(attendanceBlocks, eq(attendanceRecords.blockId, attendanceBlocks.id))
    .where(
      and(
        eq(attendanceRecords.userId, user.id),
        eq(attendanceBlocks.date, new Date(targetDate)),
      ),
    );

  const submittedBlockIds = new Set(records.map((r) => r.blockId));

  const blocksWithStatus = blocks.map((block) => ({
    ...block,
    submitted: submittedBlockIds.has(block.id),
  }));

  return NextResponse.json({ blocks: blocksWithStatus, date: targetDate });
}
