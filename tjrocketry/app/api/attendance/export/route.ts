import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { attendanceRecords } from "@/lib/db/schema";
import { checkAdminSponsorOrOfficerAccess } from "@/lib/auth";
import { dayKey, formatMoment } from "@/lib/dates";

function csvEscape(v: unknown) {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function lastNameKey(name: string | null | undefined) {
  const parts = (name ?? "").trim().split(/\s+/);
  return parts[parts.length - 1].toLowerCase();
}

export async function GET(request: Request) {
  if (!(await checkAdminSponsorOrOfficerAccess())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const blockId = new URL(request.url).searchParams.get("blockId");

  try {
    const records = await db.query.attendanceRecords.findMany({
      where: blockId ? eq(attendanceRecords.blockId, Number(blockId)) : undefined,
      with: { user: true, block: true },
    });

    // Newest block first, then by last name within a block.
    records.sort((a, b) => {
      const byDate = dayKey(b.block.date).localeCompare(dayKey(a.block.date));
      if (byDate !== 0) return byDate;
      if (a.block.id !== b.block.id) return a.block.blockType.localeCompare(b.block.blockType);
      return lastNameKey(a.user.name).localeCompare(lastNameKey(b.user.name));
    });

    const lines = [["Name", "Username", "Email", "Class Year", "Block", "Date", "Marked At"].join(",")];
    for (const r of records) {
      lines.push([
        r.user.name,
        r.user.username,
        r.user.email,
        r.user.classYear,
        r.block.blockType,
        dayKey(r.block.date),
        formatMoment(r.timestamp),
      ].map(csvEscape).join(","));
    }

    return new NextResponse(lines.join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="attendance${blockId ? `-${blockId}` : ""}.csv"`,
      },
    });
  } catch (error) {
    console.error("Failed to export CSV:", error);
    return NextResponse.json({ error: "Failed to export CSV" }, { status: 500 });
  }
}
