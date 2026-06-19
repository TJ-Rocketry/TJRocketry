import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const launches = await prisma.launchEvent.findMany({
      orderBy: { date: "desc" },
      take: 10,
    });
    return NextResponse.json({ launches });
  } catch {
    return NextResponse.json({ error: "Failed to fetch launches" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.roles.some(r => ["admin", "sponsor", "officer"].includes(r))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { title, date, startTime, endTime, notes, location } = await req.json();
    if (!title || !date) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const launch = await prisma.launchEvent.create({
      data: {
        title,
        date: new Date(date),
        startTime: startTime || null,
        endTime: endTime || null,
        notes: notes || null,
        location: location || null,
      },
    });

    return NextResponse.json({ success: true, launch });
  } catch (e: any) {
    return NextResponse.json({ error: "Failed to create launch", details: e?.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.roles.some(r => ["admin", "sponsor", "officer"].includes(r))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { id, title, date, startTime, endTime, notes, location } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const launch = await prisma.launchEvent.update({
      where: { id: Number(id) },
      data: {
        ...(title && { title }),
        ...(date && { date: new Date(date) }),
        ...(startTime !== undefined && { startTime }),
        ...(endTime !== undefined && { endTime }),
        ...(notes !== undefined && { notes }),
        ...(location !== undefined && { location }),
      },
    });

    return NextResponse.json({ success: true, launch });
  } catch {
    return NextResponse.json({ error: "Failed to update launch" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.roles.some(r => ["admin", "sponsor", "officer"].includes(r))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    await prisma.launchEvent.delete({
      where: { id: Number(id) },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete launch" }, { status: 500 });
  }
}
