import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { inventoryCheckouts, inventoryLogs } from "@/lib/db/schema";
import { getCurrentUser, isStaff } from "@/lib/auth";

// PATCH — return a checked-out item. The borrower or any officer can do this.
export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    const result = await db.transaction(async tx => {
      const [checkout] = await tx
        .select()
        .from(inventoryCheckouts)
        .where(eq(inventoryCheckouts.id, Number(id)))
        .for("update");
      if (!checkout) return { status: 404, error: "Check-out not found" };
      if (checkout.userId !== user.id && !isStaff(user.roles)) return { status: 403, error: "Unauthorized" };
      if (checkout.returnedAt) return { status: 400, error: "Already returned" };

      const [updated] = await tx
        .update(inventoryCheckouts)
        .set({ returnedAt: new Date(), returnedById: user.id })
        .where(eq(inventoryCheckouts.id, checkout.id))
        .returning();
      await tx.insert(inventoryLogs).values({
        itemId: checkout.itemId,
        userId: user.id,
        change: checkout.quantity,
        type: "return",
        checkoutId: checkout.id,
      });
      return { status: 200, checkout: updated };
    });

    if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ success: true, checkout: result.checkout });
  } catch (error) {
    console.error("Failed to return item:", error);
    return NextResponse.json({ error: "Failed to return item" }, { status: 500 });
  }
}
