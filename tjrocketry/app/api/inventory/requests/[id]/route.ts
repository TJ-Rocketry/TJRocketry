import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { checkoutRequests, inventoryItems, notifications } from "@/lib/db/schema";
import { getCurrentUser, isStaff } from "@/lib/auth";
import { InventoryError, takeFromStock } from "@/lib/inventory";

// PUT — officers approve/reject; the requester can cancel their own pending request.
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    const { status } = await req.json();
    if (!["approved", "rejected", "cancelled"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const updated = await db.transaction(async tx => {
      const [request] = await tx
        .select()
        .from(checkoutRequests)
        .where(eq(checkoutRequests.id, Number(id)))
        .for("update");
      if (!request) throw new InventoryError("Request not found", 404);
      if (request.status !== "pending") throw new InventoryError("This request was already handled");

      if (status === "cancelled") {
        if (request.userId !== user.id) throw new InventoryError("Unauthorized", 403);
      } else if (!isStaff(user.roles)) {
        throw new InventoryError("Unauthorized", 403);
      }

      let itemName = "";
      if (status === "approved") {
        const { item } = await takeFromStock(tx, {
          itemId: request.itemId,
          userId: request.userId,
          quantity: request.quantity,
          note: request.note,
          approvedById: user.id,
          actorId: user.id,
        });
        itemName = item.name;
      } else {
        const [item] = await tx.select({ name: inventoryItems.name }).from(inventoryItems).where(eq(inventoryItems.id, request.itemId));
        itemName = item?.name ?? "item";
      }

      const [row] = await tx
        .update(checkoutRequests)
        .set({
          status,
          approvedBy: status === "cancelled" ? null : user.id,
          decidedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(checkoutRequests.id, request.id))
        .returning();

      if (status !== "cancelled") {
        await tx.insert(notifications).values({
          userId: request.userId,
          title: status === "approved" ? "Checkout approved" : "Checkout rejected",
          message: status === "approved"
            ? `${user.name || "An officer"} approved ${request.quantity}× ${itemName}. It's checked out to you now.`
            : `Your request for ${request.quantity}× ${itemName} was rejected.`,
          link: "/inventory?tab=mine",
        });
      }
      return row;
    });

    return NextResponse.json({ request: updated });
  } catch (error) {
    if (error instanceof InventoryError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Failed to update request:", error);
    return NextResponse.json({ error: "Failed to update request" }, { status: 500 });
  }
}
