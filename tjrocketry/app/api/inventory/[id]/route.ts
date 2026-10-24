import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { inventoryItems, inventoryLogs } from "@/lib/db/schema";
import { getCurrentUser, isMember, isStaff } from "@/lib/auth";
import { InventoryError, categoryNames, lockItem, outstanding, parseItem } from "@/lib/inventory";

type Params = { params: Promise<{ id: string }> };

// GET — one item's full history (who took it, when, and when it came back)
export async function GET(_req: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user || !isMember(user.roles)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  try {
    const logs = await db.query.inventoryLogs.findMany({
      where: eq(inventoryLogs.itemId, Number(id)),
      orderBy: desc(inventoryLogs.timestamp),
      limit: 50,
      with: { user: { columns: { name: true, username: true } } },
    });
    return NextResponse.json({ logs });
  } catch (error) {
    console.error("Failed to fetch item history:", error);
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user || !isStaff(user.roles)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  try {
    const parsed = parseItem(await req.json(), await categoryNames());
    if (!parsed.values) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const values = parsed.values;

    const item = await db.transaction(async tx => {
      const existing = await lockItem(tx, Number(id));
      if (existing.type === "reusable" || values.type === "reusable") {
        const out = await outstanding(tx, existing.id);
        if (out > 0 && values.type !== existing.type) {
          throw new InventoryError("Return all checked-out units before changing the item type");
        }
        if (values.type === "reusable" && values.quantity < out) {
          throw new InventoryError(`${out} are checked out — quantity can't go below that`);
        }
      }

      const [updated] = await tx
        .update(inventoryItems)
        .set({ ...values, updatedAt: new Date() })
        .where(eq(inventoryItems.id, existing.id))
        .returning();

      const diff = values.quantity - existing.quantity;
      if (diff !== 0) {
        await tx.insert(inventoryLogs).values({
          itemId: existing.id,
          userId: user.id,
          change: diff,
          type: diff > 0 ? "restock" : "adjust",
        });
      }
      return updated;
    });

    return NextResponse.json({ item });
  } catch (error) {
    if (error instanceof InventoryError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Failed to update item:", error);
    return NextResponse.json({ error: "Failed to update item" }, { status: 500 });
  }
}

// DELETE — archive the item. Its history stays, so past check-outs remain traceable.
export async function DELETE(_req: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user || !isStaff(user.roles)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  try {
    await db.transaction(async tx => {
      const item = await lockItem(tx, Number(id));
      const out = await outstanding(tx, item.id);
      if (out > 0) throw new InventoryError(`${out} still checked out — get them returned first`);
      await tx
        .update(inventoryItems)
        .set({ archivedAt: new Date(), updatedAt: new Date() })
        .where(eq(inventoryItems.id, item.id));
      await tx.insert(inventoryLogs).values({ itemId: item.id, userId: user.id, change: 0, type: "archive" });
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof InventoryError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Failed to delete item:", error);
    return NextResponse.json({ error: "Failed to delete item" }, { status: 500 });
  }
}
