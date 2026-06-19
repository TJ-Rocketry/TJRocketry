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
    const { name, location, type, quantity, highValue, category, subCategory, imageUrl } = await req.json();

    const existing = await prisma.inventoryItem.findUnique({ where: { id: parseInt(id) } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const item = await prisma.inventoryItem.update({
      where: { id: parseInt(id) },
      data: { name, location, type, quantity, highValue, category, subCategory, imageUrl },
    });

    if (quantity !== undefined && quantity !== existing.quantity) {
      const diff = quantity - existing.quantity;
      await prisma.inventoryLog.create({
        data: { itemId: item.id, userId: user.id, change: diff, type: "set" },
      });
    }

    return NextResponse.json({ item });
  } catch {
    return NextResponse.json({ error: "Failed to update item" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || !user.roles.some(r => ["admin", "sponsor", "officer"].includes(r))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { id } = await params;
    await prisma.inventoryItem.delete({ where: { id: parseInt(id) } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete item" }, { status: 500 });
  }
}
