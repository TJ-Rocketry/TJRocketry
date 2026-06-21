import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { appSettings } from "@/lib/db/schema";

export async function GET() {
  try {
    const rows = await db.select().from(appSettings);
    const settings: Record<string, string | null> = {};
    rows.forEach(r => { settings[r.key] = r.value; });
    return NextResponse.json({ settings });
  } catch (err) {
    console.error("GET /api/public/settings error:", err);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}
