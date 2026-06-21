import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { teams, teamMembers } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth";

async function canEditTeam(userId: number, teamId: number): Promise<boolean> {
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

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const teamId = Number(id);

    const isAdmin = user.roles.includes("admin");
    const isCaptain = await canEditTeam(user.id, teamId);

    if (!isAdmin && !isCaptain) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const updateData: Record<string, any> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.arcId !== undefined) updateData.arcId = body.arcId;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    const [team] = await db
      .update(teams)
      .set(updateData)
      .where(eq(teams.id, teamId))
      .returning();

    return NextResponse.json({ success: true, team });
  } catch (err) {
    console.error("PUT /api/teams/[id] error:", err);
    return NextResponse.json({ error: "Failed to update team" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || !user.roles.includes("admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { id } = await params;
    await db.delete(teams).where(eq(teams.id, Number(id)));
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/teams/[id] error:", err);
    return NextResponse.json({ error: "Failed to delete team" }, { status: 500 });
  }
}
