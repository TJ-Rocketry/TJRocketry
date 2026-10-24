import { NextRequest, NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { teams, teamMembers, users } from "@/lib/db/schema";
import { getCurrentUser, isAdmin } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const seesAll = user.roles.some(r => ["admin", "sponsor", "officer", "ARCmember"].includes(r));

  try {
    const teamRows = seesAll
      ? await db.select({ id: teams.id, name: teams.name, arcId: teams.arcId }).from(teams).orderBy(teams.name)
      : await db
          .select({ id: teams.id, name: teams.name, arcId: teams.arcId })
          .from(teamMembers)
          .innerJoin(teams, eq(teamMembers.teamId, teams.id))
          .where(eq(teamMembers.userId, user.id))
          .orderBy(teams.name);

    const members = teamRows.length
      ? await db
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
          .where(inArray(teamMembers.teamId, teamRows.map(t => t.id)))
          .orderBy(users.name)
      : [];

    return NextResponse.json({
      teams: teamRows.map(t => ({ ...t, members: members.filter(m => m.teamId === t.id) })),
    });
  } catch (err) {
    console.error("GET /api/teams error:", err);
    return NextResponse.json({ error: "Failed to fetch teams" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user.roles)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { name, arcId } = body;
    if (!name) {
      return NextResponse.json({ error: "Team name required" }, { status: 400 });
    }

    const [team] = await db.insert(teams).values({ name, arcId: arcId || null }).returning();
    return NextResponse.json({ success: true, team });
  } catch (err) {
    console.error("POST /api/teams error:", err);
    return NextResponse.json({ error: "Failed to create team" }, { status: 500 });
  }
}
