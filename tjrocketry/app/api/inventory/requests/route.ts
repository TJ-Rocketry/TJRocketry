import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const requests = await prisma.checkoutRequest.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { name: true, username: true, id: true } },
        item: { select: { name: true, category: true, subCategory: true } },
        approver: { select: { name: true } },
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

    const item = await prisma.inventoryItem.findUnique({ where: { id: itemId } });
    if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });
    if (item.quantity < quantity) return NextResponse.json({ error: "Insufficient quantity" }, { status: 400 });

    const request = await prisma.checkoutRequest.create({
      data: { itemId, userId: user.id, quantity, status: "pending" },
    });

    const roleUsers = await prisma.user.findMany({
      where: { roles: { hasSome: ["admin", "sponsor", "officer"] } },
    });

    for (const admin of roleUsers) {
      await prisma.notification.create({
        data: {
          userId: admin.id,
          title: "Checkout Request",
          message: `${user.name || user.username} requested ${quantity}x ${item.name}`,
          link: "/inventory/requests",
        },
      });
    }

    return NextResponse.json({ request });
  } catch {
    return NextResponse.json({ error: "Failed to create request" }, { status: 500 });
  }
}
