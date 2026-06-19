import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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
    const blocks = await prisma.attendanceBlock.findMany({
      where: { date: { gte: weekAgo } },
      orderBy: { date: "desc" },
    });

    if (adminView === "true") {
      return NextResponse.json({ blocks, date: targetDate });
    }

    const ionId = await getCurrentUserIonId();
    if (!ionId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { ionId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const records = await prisma.attendanceRecord.findMany({
      where: { userId: user.id },
      select: { blockId: true },
    });

    const submittedBlockIds = new Set(records.map((r: { blockId: number }) => r.blockId));

    const blocksWithStatus = blocks.map(block => ({
      ...block,
      submitted: submittedBlockIds.has(block.id),
    }));

    return NextResponse.json({ blocks: blocksWithStatus, date: targetDate });
  }

  const blocks = await prisma.attendanceBlock.findMany({
    where: {
      date: new Date(targetDate),
      isClosed: false,
    },
    orderBy: { createdAt: "asc" },
  });

  const ionId = await getCurrentUserIonId();
  if (!ionId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { ionId } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const records = await prisma.attendanceRecord.findMany({
    where: {
      userId: user.id,
      block: {
        date: new Date(targetDate),
      },
    },
    select: {
      blockId: true,
    },
  });

  const submittedBlockIds = new Set(records.map((r: { blockId: number }) => r.blockId));

  const blocksWithStatus = blocks.map(block => ({
    ...block,
    submitted: submittedBlockIds.has(block.id),
  }));

  return NextResponse.json({ blocks: blocksWithStatus, date: targetDate });
}
