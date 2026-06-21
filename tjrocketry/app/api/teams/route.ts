import { NextRequest, NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { teams, teamMembers } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isArcOrOfficerOrAdmin = user.roles.some(r =>
    ["admin", "sponsor", "officer", "ARCmember"].includes(r)
  );

  if (!isArcOrOfficerOrAdmin) {
    const userTeams = await db
      .select({
        id: teams.id,
        name: teams.name,
        arcId: teams.arcId,
        createdAt: teams.createdAt,
      })
      .from(teamMembers)
      .innerJoin(teams, eq(teamMembers.teamId, teams.id))
      .orderBy(teams.id);

    return NextResponse.json({ teams: userTeams });
  }

  try {
    const allTeams = await db
      .select({
        id: teams.id,
        name: teams.name,
        arcId: teams.arcId,
        createdAt: teams.createdAt,
      })
      .from(teams)
      .orderBy(teams.name);

    return NextResponse.json({ teams: allTeams });
  } catch (err) {
    console.error("GET /api/teams error:", err);
    return NextResponse.json({ error: "Failed to fetch teams" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.roles.includes("admin")) {
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
