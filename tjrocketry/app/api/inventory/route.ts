import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const where = category ? { category } : {};
    const items = await prisma.inventoryItem.findMany({
      where,
      orderBy: [{ subCategory: "asc" }, { name: "asc" }],
    });
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ error: "Failed to fetch inventory" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.roles.some(r => ["admin", "sponsor", "officer"].includes(r))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { name, location, type, quantity, highValue, category, subCategory, imageUrl } = await req.json();
    if (!name || !location || !type || !category || !subCategory) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const item = await prisma.inventoryItem.create({
      data: { name, location, type, quantity: quantity || 0, highValue: highValue || false, category, subCategory, imageUrl },
    });

    if (quantity > 0) {
      await prisma.inventoryLog.create({
        data: { itemId: item.id, userId: user.id, change: quantity, type: "set" },
      });
    }

    return NextResponse.json({ item });
  } catch {
    return NextResponse.json({ error: "Failed to create item" }, { status: 500 });
  }
}
