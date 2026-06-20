import { NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { count } from "drizzle-orm";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const [unreadResult] = await db
      .select({ count: count() })
      .from(notifications)
      .where(
        eq(notifications.userId, user.id) && eq(notifications.read, false),
      );
    const unreadCount = unreadResult?.count ?? 0;

    const items = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, user.id))
      .orderBy(desc(notifications.createdAt))
      .limit(50);

    return NextResponse.json({ notifications: items, unreadCount });
  } catch {
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}

export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await db.delete(notifications).where(eq(notifications.userId, user.id));
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to clear notifications" }, { status: 500 });
  }
}
