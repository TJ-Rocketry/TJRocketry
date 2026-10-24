import { NextRequest, NextResponse } from "next/server";
import { asc, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { checkoutRequests, inventoryCheckouts, inventoryItems, inventoryLogs } from "@/lib/db/schema";
import { getCurrentUser, isMember, isStaff } from "@/lib/auth";
import { categoryNames, parseItem } from "@/lib/inventory";

// GET — every active item with live availability and who currently has it
export async function GET() {
  const user = await getCurrentUser();
  if (!user || !isMember(user.roles)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const [items, open, pending, categories] = await Promise.all([
      db
        .select()
        .from(inventoryItems)
        .where(isNull(inventoryItems.archivedAt))
        .orderBy(asc(inventoryItems.name)),
      db.query.inventoryCheckouts.findMany({
        where: isNull(inventoryCheckouts.returnedAt),
        orderBy: desc(inventoryCheckouts.checkedOutAt),
        with: { user: { columns: { id: true, name: true, username: true } } },
      }),
      db
        .select({ itemId: checkoutRequests.itemId, userId: checkoutRequests.userId, quantity: checkoutRequests.quantity })
        .from(checkoutRequests)
        .where(eq(checkoutRequests.status, "pending")),
      categoryNames(),
    ]);

    const result = items.map(item => {
      const holders = open.filter(c => c.itemId === item.id);
      const out = holders.reduce((n, c) => n + c.quantity, 0);
      return {
        ...item,
        checkedOut: out,
        available: item.type === "consumable" ? item.quantity : Math.max(0, item.quantity - out),
        holders,
        pendingRequests: pending.filter(p => p.itemId === item.id).length,
        myPendingRequest: pending.some(p => p.itemId === item.id && p.userId === user.id),
      };
    });

    return NextResponse.json({ items: result, categories });
  } catch (error) {
    console.error("Failed to fetch inventory:", error);
    return NextResponse.json({ error: "Failed to fetch inventory" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !isStaff(user.roles)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const parsed = parseItem(await req.json(), await categoryNames());
    if (!parsed.values) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const item = await db.transaction(async tx => {
      const [created] = await tx.insert(inventoryItems).values(parsed.values).returning();
      await tx.insert(inventoryLogs).values({
        itemId: created.id,
        userId: user.id,
        change: created.quantity,
        type: "create",
      });
      return created;
    });

    return NextResponse.json({ item });
  } catch (error) {
    console.error("Failed to create item:", error);
    return NextResponse.json({ error: "Failed to create item" }, { status: 500 });
  }
}
