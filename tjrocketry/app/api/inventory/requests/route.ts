import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { checkoutRequests, inventoryItems, notifications, users } from "@/lib/db/schema";
import { getCurrentUser, isMember, isStaff } from "@/lib/auth";
import { cleanText, parseQuantity } from "@/lib/inventory";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !isMember(user.roles)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const requests = await db.query.checkoutRequests.findMany({
      where: isStaff(user.roles) ? undefined : eq(checkoutRequests.userId, user.id),
      orderBy: desc(checkoutRequests.createdAt),
      limit: 200,
      with: {
        user: { columns: { id: true, name: true, username: true } },
        item: { columns: { id: true, name: true, category: true, type: true } },
        approver: { columns: { name: true } },
      },
    });
    return NextResponse.json({ requests });
  } catch (error) {
    console.error("Failed to fetch requests:", error);
    return NextResponse.json({ error: "Failed to fetch requests" }, { status: 500 });
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

    const [item] = await db
      .select()
      .from(inventoryItems)
      .where(and(eq(inventoryItems.id, itemId), isNull(inventoryItems.archivedAt)))
      .limit(1);
    if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });
    if (item.quantity < quantity) {
      return NextResponse.json({ error: `The club only has ${item.quantity}` }, { status: 400 });
    }

    const [existing] = await db
      .select({ id: checkoutRequests.id })
      .from(checkoutRequests)
      .where(and(
        eq(checkoutRequests.itemId, itemId),
        eq(checkoutRequests.userId, user.id),
        eq(checkoutRequests.status, "pending"),
      ))
      .limit(1);
    if (existing) {
      return NextResponse.json({ error: "You already have a pending request for this item" }, { status: 400 });
    }

    const [request] = await db
      .insert(checkoutRequests)
      .values({ itemId, userId: user.id, quantity, note: cleanText(body.note), status: "pending" })
      .returning();

    const staff = await db
      .select({ id: users.id })
      .from(users)
      .where(sql`${users.roles} && ARRAY['admin','sponsor','officer']::text[]`);
    if (staff.length) {
      await db.insert(notifications).values(staff.map(s => ({
        userId: s.id,
        title: "Checkout request",
        message: `${user.name || user.username} requested ${quantity}× ${item.name}`,
        link: "/inventory?tab=requests",
      })));
    }

    return NextResponse.json({ request });
  } catch (error) {
    console.error("Failed to create request:", error);
    return NextResponse.json({ error: "Failed to create request" }, { status: 500 });
  }
}
