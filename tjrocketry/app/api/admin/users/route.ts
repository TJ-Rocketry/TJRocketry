import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

async function checkAdminAccess() {
  const cookieStore = await cookies();
  const token = cookieStore.get("ion_access_token")?.value;

  if (!token) return false;

  try {
    const profileRes = await fetch("https://ion.tjhsst.edu/api/profile", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!profileRes.ok) return false;
    
    const profileData = await profileRes.json();
    const ionId = String(profileData.id);

    const [user] = await db.select().from(users).where(eq(users.ionId, ionId)).limit(1);
    if (!user || !user.roles.includes("admin")) return false;

    return true;
  } catch (e) {
    console.error("checkAdminAccess error:", e);
    return false;
  }
}

export async function GET() {
  const isAdmin = await checkAdminAccess();
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const allUsers = await db.select().from(users).orderBy(users.id);
    return NextResponse.json({ users: allUsers });
  } catch (error) {
    console.error("Failed to fetch users:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const isAdmin = await checkAdminAccess();
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { id, roles } = await request.json();
    
    if (!id || !Array.isArray(roles)) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    const [updatedUser] = await db
      .update(users)
      .set({ roles })
      .where(eq(users.id, Number(id)))
      .returning();

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error("Failed to update user:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}
