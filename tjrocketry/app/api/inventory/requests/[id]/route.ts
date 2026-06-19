import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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

    const request = await prisma.checkoutRequest.findUnique({
      where: { id: parseInt(id) },
      include: { item: true },
    });

    if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (request.status !== "pending") return NextResponse.json({ error: "Already processed" }, { status: 400 });

    const updated = await prisma.checkoutRequest.update({
      where: { id: parseInt(id) },
      data: { status, approvedBy: user.id },
    });

    if (status === "approved") {
      await prisma.inventoryItem.update({
        where: { id: request.itemId },
        data: { quantity: request.item.quantity - request.quantity },
      });

      await prisma.inventoryLog.create({
        data: { itemId: request.itemId, userId: user.id, change: -request.quantity, type: "checkout" },
      });
    }

    await prisma.notification.create({
      data: {
        userId: request.userId,
        title: status === "approved" ? "Checkout Approved" : "Checkout Rejected",
        message: status === "approved"
          ? `Your request for ${request.quantity}x ${request.item.name} was approved by ${user.name || "an officer"}`
          : `Your request for ${request.quantity}x ${request.item.name} was rejected`,
        link: "/inventory",
      },
    });

    return NextResponse.json({ request: updated });
  } catch {
    return NextResponse.json({ error: "Failed to update request" }, { status: 500 });
  }
}
