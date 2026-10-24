import { NextRequest, NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { inventoryLogs } from "@/lib/db/schema";
import { getCurrentUser, isStaff } from "@/lib/auth";

// GET — recent inventory activity across all items (staff only)
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !isStaff(user.roles)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const limit = Math.min(Number(new URL(req.url).searchParams.get("limit")) || 100, 500);
  try {
    const logs = await db.query.inventoryLogs.findMany({
      orderBy: desc(inventoryLogs.timestamp),
      limit,
      with: {
        user: { columns: { name: true, username: true } },
        item: { columns: { id: true, name: true } },
      },
    });
    return NextResponse.json({ logs });
  } catch (error) {
    console.error("Failed to fetch logs:", error);
    return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 });
  }
}
