import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const itemId = searchParams.get("itemId");

    const where = itemId ? { itemId: parseInt(itemId) } : {};

    const logs = await prisma.inventoryLog.findMany({
      where,
      orderBy: { timestamp: "desc" },
      take: 100,
      include: { user: { select: { name: true, username: true } }, item: { select: { name: true } } },
    });

    return NextResponse.json({ logs });
  } catch {
    return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { itemId, change, type } = await req.json();
    if (!itemId || change === undefined || !type) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const item = await prisma.inventoryItem.findUnique({ where: { id: itemId } });
    if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });

    if (item.type === "consumable" && change < 0) {
      return NextResponse.json({ error: "Consumables cannot be checked out" }, { status: 400 });
    }

    if (item.highValue && change < 0) {
      return NextResponse.json({ error: "High value items require a checkout request" }, { status: 400 });
    }

    if (item.quantity + change < 0) {
      return NextResponse.json({ error: "Insufficient quantity" }, { status: 400 });
    }

    await prisma.inventoryItem.update({
      where: { id: itemId },
      data: { quantity: item.quantity + change },
    });

    const log = await prisma.inventoryLog.create({
      data: { itemId, userId: user.id, change, type },
    });

    return NextResponse.json({ log });
  } catch {
    return NextResponse.json({ error: "Failed to process log" }, { status: 500 });
  }
}
