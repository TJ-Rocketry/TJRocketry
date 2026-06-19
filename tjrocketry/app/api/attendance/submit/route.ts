import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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

    const block = await prisma.attendanceBlock.findUnique({
      where: { id: Number(blockId) },
    });

    if (!block) {
      return NextResponse.json({ error: "Block not found" }, { status: 404 });
    }

    if (block.isClosed) {
      const user = await prisma.user.findUnique({ where: { ionId } });
      if (!user || !user.roles.some((r: string) => ["admin", "sponsor", "officer"].includes(r))) {
        return NextResponse.json({ error: "Block is closed" }, { status: 400 });
      }
    }

    if (block.code !== code) {
      return NextResponse.json({ error: "Invalid code" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { ionId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const existing = await prisma.attendanceRecord.findUnique({
      where: {
        blockId_userId: {
          blockId: Number(blockId),
          userId: user.id,
        },
      },
    });

    if (existing) {
      return NextResponse.json({ error: "Already marked present" }, { status: 400 });
    }

    const record = await prisma.attendanceRecord.create({
      data: {
        blockId: Number(blockId),
        userId: user.id,
      },
    });

    return NextResponse.json({ success: true, record });
  } catch (error) {
    return NextResponse.json({ error: "Failed to submit attendance" }, { status: 500 });
  }
}
