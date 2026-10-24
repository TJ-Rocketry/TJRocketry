import { NextRequest, NextResponse } from "next/server";
import { desc, eq, isNull, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { inventoryCheckouts } from "@/lib/db/schema";
import { getCurrentUser, isMember, isStaff } from "@/lib/auth";
import { InventoryError, cleanText, lockItem, parseQuantity, takeFromStock } from "@/lib/inventory";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !isMember(user.roles)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const scope = searchParams.get("scope") === "all" && isStaff(user.roles) ? "all" : "mine";
  const includeReturned = searchParams.get("status") === "all";

  try {
    const conditions = [];
    if (scope === "mine") conditions.push(eq(inventoryCheckouts.userId, user.id));
    if (!includeReturned) conditions.push(isNull(inventoryCheckouts.returnedAt));

    const checkouts = await db.query.inventoryCheckouts.findMany({
      where: conditions.length ? and(...conditions) : undefined,
      orderBy: desc(inventoryCheckouts.checkedOutAt),
      limit: 200,
      with: {
        item: { columns: { id: true, name: true, category: true, location: true } },
        user: { columns: { id: true, name: true, username: true } },
        approvedBy: { columns: { name: true } },
        returnedBy: { columns: { name: true } },
      },
    });
    return NextResponse.json({ checkouts });
  } catch (error) {
    console.error("Failed to fetch checkouts:", error);
    return NextResponse.json({ error: "Failed to fetch checkouts" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !isMember(user.roles)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const itemId = Number(body.itemId);
    const quantity = parseQuantity(body.quantity);
    if (!itemId || !quantity) {
      return NextResponse.json({ error: "Pick an item and a quantity" }, { status: 400 });
    }

    const result = await db.transaction(async tx => {
      const item = await lockItem(tx, itemId);
      if (item.highValue && !isStaff(user.roles)) {
        throw new InventoryError("This item needs an officer's approval — send a request instead");
      }
      return takeFromStock(tx, { itemId, userId: user.id, quantity, note: cleanText(body.note) });
    });

    return NextResponse.json({ success: true, checkout: result.checkout });
  } catch (error) {
    if (error instanceof InventoryError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Failed to check out item:", error);
    return NextResponse.json({ error: "Failed to check out item" }, { status: 500 });
  }
}
