import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { teamMembers, users } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth";

async function isTeamCaptain(userId: number, teamId: number): Promise<boolean> {
  const member = await db
    .select()
    .from(teamMembers)
    .where(and(
      eq(teamMembers.teamId, teamId),
      eq(teamMembers.userId, userId),
      eq(teamMembers.role, "captain"),
    ))
    .limit(1);
  return member.length > 0;
}

async function canViewTeam(userId: number, teamId: number, roles: string[]): Promise<boolean> {
  if (roles.some(r => ["admin", "sponsor", "officer", "ARCmember"].includes(r))) return true;
  const member = await db
    .select()
    .from(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)))
    .limit(1);
  return member.length > 0;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const teamId = Number(id);

    if (!(await canViewTeam(user.id, teamId, user.roles))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const members = await db
      .select({
        id: teamMembers.id,
        teamId: teamMembers.teamId,
        userId: teamMembers.userId,
        role: teamMembers.role,
        name: users.name,
        username: users.username,
      })
      .from(teamMembers)
      .leftJoin(users, eq(teamMembers.userId, users.id))
      .where(eq(teamMembers.teamId, teamId));

    return NextResponse.json({ members });
  } catch (err) {
    console.error("GET /api/teams/[id]/members error:", err);
    return NextResponse.json({ error: "Failed to fetch members" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || !user.roles.includes("admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const { userId, role } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const [member] = await db
      .insert(teamMembers)
      .values({
        teamId: Number(id),
        userId: Number(userId),
        role: role || "member",
      })
      .returning();

    return NextResponse.json({ success: true, member });
  } catch (err) {
    console.error("POST /api/teams/[id]/members error:", err);
    return NextResponse.json({ error: "Failed to add member" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || !user.roles.includes("admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const memberId = searchParams.get("memberId");
    const userId = searchParams.get("userId");

    if (memberId) {
      await db.delete(teamMembers).where(
        and(eq(teamMembers.teamId, Number(id)), eq(teamMembers.id, Number(memberId)))
      );
    } else if (userId) {
      await db.delete(teamMembers).where(
        and(eq(teamMembers.teamId, Number(id)), eq(teamMembers.userId, Number(userId)))
      );
    } else {
      return NextResponse.json({ error: "Missing memberId or userId" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/teams/[id]/members error:", err);
    return NextResponse.json({ error: "Failed to remove member" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || !user.roles.includes("admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const { memberId, role } = await req.json();

    if (!memberId || !role) {
      return NextResponse.json({ error: "Missing memberId or role" }, { status: 400 });
    }

    const [member] = await db
      .update(teamMembers)
      .set({ role })
      .where(and(eq(teamMembers.teamId, Number(id)), eq(teamMembers.id, Number(memberId))))
      .returning();

    return NextResponse.json({ success: true, member });
  } catch (err) {
    console.error("PUT /api/teams/[id]/members error:", err);
    return NextResponse.json({ error: "Failed to update member" }, { status: 500 });
  }
}
