import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { teams, teamMembers, users } from "@/lib/db/schema";

export async function GET() {
  try {
    const allTeams = await db
      .select({ id: teams.id, name: teams.name })
      .from(teams)
      .orderBy(teams.name);

    const result = await Promise.all(
      allTeams.map(async t => {
        const members = await db
          .select({
            id: teamMembers.id,
            userId: teamMembers.userId,
            role: teamMembers.role,
            name: users.name,
            username: users.username,
          })
          .from(teamMembers)
          .leftJoin(users, eq(teamMembers.userId, users.id))
          .where(eq(teamMembers.teamId, t.id));

        return { ...t, members };
      })
    );

    return NextResponse.json({ teams: result });
  } catch (err) {
    console.error("GET /api/public/teams error:", err);
    return NextResponse.json({ error: "Failed to fetch teams" }, { status: 500 });
  }
}
