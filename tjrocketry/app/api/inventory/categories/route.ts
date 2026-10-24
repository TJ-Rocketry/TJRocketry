import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { inventoryCategories, inventoryItems } from "@/lib/db/schema";
import { getCurrentUser, isStaff } from "@/lib/auth";
import { cleanText } from "@/lib/inventory";

async function requireStaff() {
  const user = await getCurrentUser();
  return user && isStaff(user.roles) ? user : null;
}

function isDuplicate(error: unknown) {
  return (error as { code?: string; cause?: { code?: string } })?.cause?.code === "23505"
    || (error as { code?: string })?.code === "23505";
}

export async function POST(req: NextRequest) {
  if (!(await requireStaff())) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  try {
    const name = cleanText((await req.json()).name, 60);
    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
    const [category] = await db.insert(inventoryCategories).values({ name }).returning();
    return NextResponse.json({ category });
  } catch (error) {
    if (isDuplicate(error)) return NextResponse.json({ error: "That category already exists" }, { status: 400 });
    console.error("Failed to create category:", error);
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  if (!(await requireStaff())) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  try {
    const body = await req.json();
    const from = cleanText(body.from, 60);
    const to = cleanText(body.to, 60);
    if (!from || !to) return NextResponse.json({ error: "Name is required" }, { status: 400 });
    await db.transaction(async tx => {
      await tx.update(inventoryCategories).set({ name: to }).where(eq(inventoryCategories.name, from));
      await tx.update(inventoryItems).set({ category: to }).where(eq(inventoryItems.category, from));
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (isDuplicate(error)) return NextResponse.json({ error: "That category already exists" }, { status: 400 });
    console.error("Failed to rename category:", error);
    return NextResponse.json({ error: "Failed to rename category" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!(await requireStaff())) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  try {
    const name = new URL(req.url).searchParams.get("name");
    if (!name) return NextResponse.json({ error: "Missing name" }, { status: 400 });
    await db.transaction(async tx => {
      await tx.update(inventoryItems).set({ category: null }).where(eq(inventoryItems.category, name));
      await tx.delete(inventoryCategories).where(eq(inventoryCategories.name, name));
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete category:", error);
    return NextResponse.json({ error: "Failed to delete category" }, { status: 500 });
  }
}
