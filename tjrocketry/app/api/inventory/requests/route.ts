import { NextRequest, NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  checkoutRequests,
  inventoryItems,
  notifications,
  users,
} from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const requests = await db.query.checkoutRequests.findMany({
      orderBy: desc(checkoutRequests.createdAt),
      with: {
        user: { columns: { name: true, username: true, id: true } },
        item: { columns: { name: true, category: true, subCategory: true } },
        approver: { columns: { name: true } },
      },
    });
    return NextResponse.json({ requests });
  } catch {
    return NextResponse.json({ error: "Failed to fetch requests" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { itemId, quantity } = await req.json();
    if (!itemId || !quantity) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const [item] = await db
      .select()
      .from(inventoryItems)
      .where(eq(inventoryItems.id, itemId))
      .limit(1);
    if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });
    if (item.quantity < quantity) return NextResponse.json({ error: "Insufficient quantity" }, { status: 400 });

    const [request] = await db
      .insert(checkoutRequests)
      .values({ itemId, userId: user.id, quantity, status: "pending", updatedAt: new Date() })
      .returning();

    const roleUsers = await db
      .select()
      .from(users)
      .where(sql`${users.roles} && ARRAY['admin','sponsor','officer']::text[]`);

    for (const admin of roleUsers) {
      await db.insert(notifications).values({
        userId: admin.id,
        title: "Checkout Request",
        message: `${user.name || user.username} requested ${quantity}x ${item.name}`,
        link: "/inventory/requests",
      });
    }

    return NextResponse.json({ request });
  } catch {
    return NextResponse.json({ error: "Failed to create request" }, { status: 500 });
  }
}
