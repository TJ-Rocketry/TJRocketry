import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getCurrentUser, isStaff } from "@/lib/auth";

const MAX_BIO = 1200;

// PUT — officers edit the bio shown on the public About page
export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isStaff(user.roles)) return NextResponse.json({ error: "Officers only" }, { status: 403 });

  try {
    const body = await request.json();
    const set: { bio?: string | null; position?: string | null } = {};
    if (body.bio !== undefined) {
      const text = typeof body.bio === "string" ? body.bio.trim().slice(0, MAX_BIO) : "";
      set.bio = text || null;
    }
    if (body.position !== undefined) {
      const title = typeof body.position === "string" ? body.position.trim().slice(0, 60) : "";
      set.position = title || null;
    }
    if (Object.keys(set).length === 0) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    await db.update(users).set(set).where(eq(users.id, user.id));
    return NextResponse.json({ success: true, ...set });
  } catch (error) {
    console.error("Failed to update profile:", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
