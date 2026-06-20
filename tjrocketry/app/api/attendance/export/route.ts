import { NextResponse } from "next/server";
import { eq, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { attendanceRecords, users } from "@/lib/db/schema";
import { checkAdminOrSponsorAccess } from "@/lib/auth";

export async function GET(request: Request) {
  const isAuthorized = await checkAdminOrSponsorAccess();
  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const blockId = searchParams.get("blockId");

  try {
    let records;

    if (blockId) {
      records = await db.query.attendanceRecords.findMany({
        where: eq(attendanceRecords.blockId, Number(blockId)),
        with: { user: true },
        orderBy: asc(users.name),
      });
    } else {
      records = await db.query.attendanceRecords.findMany({
        with: { user: true },
        orderBy: asc(users.name),
      });
    }

    const csvRows = ["Name,Email,Username,Class Year"];

    for (const record of records) {
      const name = record.user.name || "N/A";
      const email = record.user.email || "N/A";
      const username = record.user.username || "N/A";
      const classYear = record.user.classYear || "N/A";
      csvRows.push(`"${name}","${email}","${username}","${classYear}"`);
    }

    const csv = csvRows.join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="attendance${blockId ? `-${blockId}` : ""}.csv"`,
      },
    });
  } catch (error) {
    console.error("Failed to export CSV:", error);
    return NextResponse.json({ error: "Failed to export CSV" }, { status: 500 });
  }
}
