import { NextRequest, NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { inventoryItems, inventoryLogs } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const itemId = searchParams.get("itemId");

    const where = itemId ? { itemId: parseInt(itemId) } : {};

    const logs = await db.query.inventoryLogs.findMany({
      where: itemId ? eq(inventoryLogs.itemId, parseInt(itemId)) : undefined,
      orderBy: desc(inventoryLogs.timestamp),
      limit: 100,
      with: {
        user: { columns: { name: true, username: true } },
        item: { columns: { name: true } },
      },
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

    const [item] = await db
      .select()
      .from(inventoryItems)
      .where(eq(inventoryItems.id, itemId))
      .limit(1);
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

    await db
      .update(inventoryItems)
      .set({ quantity: item.quantity + change, updatedAt: new Date() })
      .where(eq(inventoryItems.id, itemId));

    const [log] = await db
      .insert(inventoryLogs)
      .values({ itemId, userId: user.id, change, type })
      .returning();

    return NextResponse.json({ log });
  } catch {
    return NextResponse.json({ error: "Failed to process log" }, { status: 500 });
  }
}
