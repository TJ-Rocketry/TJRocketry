import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { inventoryItems, inventoryLogs } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || !user.roles.some(r => ["admin", "sponsor", "officer"].includes(r))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const { name, location, type, quantity, highValue, category, subCategory, imageUrl } = await req.json();

    const [existing] = await db
      .select()
      .from(inventoryItems)
      .where(eq(inventoryItems.id, parseInt(id)))
      .limit(1);
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const [item] = await db
      .update(inventoryItems)
      .set({ name, location, type, quantity, highValue, category, subCategory, imageUrl, updatedAt: new Date() })
      .where(eq(inventoryItems.id, parseInt(id)))
      .returning();

    if (quantity !== undefined && quantity !== existing.quantity) {
      const diff = quantity - existing.quantity;
      await db.insert(inventoryLogs).values({
        itemId: item.id,
        userId: user.id,
        change: diff,
        type: "set",
      });
    }

    return NextResponse.json({ item });
  } catch {
    return NextResponse.json({ error: "Failed to update item" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || !user.roles.some(r => ["admin", "sponsor", "officer"].includes(r))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { id } = await params;
    await db.delete(inventoryItems).where(eq(inventoryItems.id, parseInt(id)));
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete item" }, { status: 500 });
  }
}
