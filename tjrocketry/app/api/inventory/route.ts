import { NextRequest, NextResponse } from "next/server";
import { eq, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { inventoryItems, inventoryLogs } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const where = category ? { category } : {};
    const items = await db
      .select()
      .from(inventoryItems)
      .where(category ? eq(inventoryItems.category, category) : undefined)
      .orderBy(asc(inventoryItems.subCategory), asc(inventoryItems.name));
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

    const [item] = await db
      .insert(inventoryItems)
      .values({
        name,
        location,
        type,
        quantity: quantity || 0,
        highValue: highValue || false,
        category,
        subCategory,
        imageUrl,
        updatedAt: new Date(),
      })
      .returning();

    if (quantity > 0) {
      await db.insert(inventoryLogs).values({
        itemId: item.id,
        userId: user.id,
        change: quantity,
        type: "set",
      });
    }

    return NextResponse.json({ item });
  } catch {
    return NextResponse.json({ error: "Failed to create item" }, { status: 500 });
  }
}
