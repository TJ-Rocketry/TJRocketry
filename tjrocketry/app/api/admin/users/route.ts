import { NextResponse } from "next/server";
import { eq, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { checkAdminAccess } from "@/lib/auth";

const ROLES = ["admin", "sponsor", "officer", "ARCmember", "BOTRmember", "user"];

export async function GET() {
  if (!(await checkAdminAccess())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const allUsers = await db.select().from(users).orderBy(asc(users.id));
    return NextResponse.json({ users: allUsers });
  } catch (error) {
    console.error("Failed to fetch users:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

// PUT — update a user's roles and/or officer position
export async function PUT(request: Request) {
  if (!(await checkAdminAccess())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { id, roles, position } = await request.json();
    if (!id) return NextResponse.json({ error: "Missing user id" }, { status: 400 });

    const set: { roles?: string[]; position?: string | null } = {};
    if (roles !== undefined) {
      if (!Array.isArray(roles) || roles.some(r => !ROLES.includes(r))) {
        return NextResponse.json({ error: "Invalid roles" }, { status: 400 });
      }
      set.roles = roles;
    }
    if (position !== undefined) {
      set.position = typeof position === "string" && position.trim() ? position.trim() : null;
    }
    if (Object.keys(set).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    const [updatedUser] = await db
      .update(users)
      .set(set)
      .where(eq(users.id, Number(id)))
      .returning();

    if (!updatedUser) return NextResponse.json({ error: "User not found" }, { status: 404 });
    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error("Failed to update user:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}
