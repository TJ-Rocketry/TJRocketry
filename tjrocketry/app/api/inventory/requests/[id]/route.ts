import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  checkoutRequests,
  inventoryItems,
  inventoryLogs,
  notifications,
} from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || !user.roles.some(r => ["admin", "sponsor", "officer"].includes(r))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const { status } = await req.json();
    if (!["approved", "rejected"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const [request] = await db.query.checkoutRequests.findMany({
      where: eq(checkoutRequests.id, parseInt(id)),
      with: { item: true },
      limit: 1,
    });

    if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (request.status !== "pending") return NextResponse.json({ error: "Already processed" }, { status: 400 });

    const [updated] = await db
      .update(checkoutRequests)
      .set({ status, approvedBy: user.id, updatedAt: new Date() })
      .where(eq(checkoutRequests.id, parseInt(id)))
      .returning();

    if (status === "approved") {
      await db
        .update(inventoryItems)
        .set({ quantity: request.item!.quantity - request.quantity, updatedAt: new Date() })
        .where(eq(inventoryItems.id, request.itemId));

      await db.insert(inventoryLogs).values({
        itemId: request.itemId,
        userId: user.id,
        change: -request.quantity,
        type: "checkout",
      });
    }

    await db.insert(notifications).values({
      userId: request.userId,
      title: status === "approved" ? "Checkout Approved" : "Checkout Rejected",
      message: status === "approved"
        ? `Your request for ${request.quantity}x ${request.item!.name} was approved by ${user.name || "an officer"}`
        : `Your request for ${request.quantity}x ${request.item!.name} was rejected`,
      link: "/inventory",
    });

    return NextResponse.json({ request: updated });
  } catch {
    return NextResponse.json({ error: "Failed to update request" }, { status: 500 });
  }
}
