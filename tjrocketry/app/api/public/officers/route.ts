import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

// Leadership positions sort first, in this order; anything else after, by name.
const POSITION_ORDER = ["president", "captain", "vice president", "treasurer", "secretary"];

function rank(position: string | null) {
  if (!position) return POSITION_ORDER.length + 1;
  const p = position.toLowerCase();
  const i = POSITION_ORDER.findIndex(o => p.includes(o));
  return i === -1 ? POSITION_ORDER.length : i;
}

// Public: everyone with the officer role, with the photo/bio they set on their profile.
export async function GET() {
  try {
    const rows = await db
      .select({ id: users.id, name: users.name, position: users.position, bio: users.bio, pfpUrl: users.pfpUrl })
      .from(users)
      .where(sql`'officer' = ANY(${users.roles})`);

    const officers = rows
      .filter(o => o.name)
      .sort((a, b) => rank(a.position) - rank(b.position) || a.name!.localeCompare(b.name!));

    return NextResponse.json({ officers });
  } catch (error) {
    console.error("GET /api/public/officers error:", error);
    return NextResponse.json({ officers: [] });
  }
}
